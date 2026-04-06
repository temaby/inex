using inex.Data;
using inex.Data.Models;
using inex.Services.Exceptions;
using inex.Services.Models.Records.Auth;
using inex.Services.Services.Auth;
using inex.Services.Services.Base;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using JwtOptions = inex.Services.Options.JwtOptions;
using InviteOptions = inex.Services.Options.InviteOptions;

namespace inex.Services.Tests.Services.Auth;

/// <summary>
/// Unit tests for AuthService.
///
/// Strategy:
/// - UserManager is mocked — we test AuthService logic, not Identity internals.
/// - InExDbContext uses an in-memory database — RefreshToken persistence is real.
/// - ITokenService is mocked to return predictable, controllable token strings.
///
/// Each test gets its own database instance (Guid-keyed) to prevent state bleed.
/// </summary>
public class AuthServiceTests
{
    // ── Fixtures ──────────────────────────────────────────────────────────────

    private static InExDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<InExDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static IOptions<JwtOptions> CreateJwtOptions(int graceSeconds = 30) =>
        Microsoft.Extensions.Options.Options.Create(new JwtOptions
        {
            Secret                    = "test-secret-minimum-32-characters!",
            Issuer                    = "test-issuer",
            Audience                  = "test-audience",
            AccessTokenExpiryMinutes  = 15,
            RefreshTokenExpiryDays    = 7,
            RefreshGraceWindowSeconds = graceSeconds,
        });

    /// <summary>
    /// Creates a Mock&lt;UserManager&gt; with the minimum constructor arguments.
    /// UserManager has no parameterless constructor — IUserStore is required.
    /// </summary>
    private static Mock<UserManager<AppUser>> CreateUserManagerMock()
    {
        var store = new Mock<IUserStore<AppUser>>();
        return new Mock<UserManager<AppUser>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
    }

    private static Mock<ITokenService> CreateTokenServiceMock(
        string accessToken   = "access-token",
        string refreshToken  = "refresh-token")
    {
        var mock = new Mock<ITokenService>();
        mock.Setup(t => t.GenerateAccessToken(It.IsAny<AppUser>())).Returns(accessToken);
        mock.Setup(t => t.GenerateRefreshToken()).Returns(refreshToken);
        return mock;
    }

    private static IOptions<InviteOptions> CreateInviteOptions(string token = "test-invite-token") =>
        Microsoft.Extensions.Options.Options.Create(new InviteOptions { Token = token });

    private static AuthService CreateService(
        InExDbContext db,
        Mock<UserManager<AppUser>>? userManager  = null,
        Mock<ITokenService>?        tokenService = null,
        int graceSeconds = 30,
        string inviteToken = "test-invite-token")
    {
        var onboarding = new Mock<IUserOnboardingService>();
        onboarding.Setup(s => s.SeedAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);

        return new AuthService(
            (userManager  ?? CreateUserManagerMock()).Object,
            db,
            (tokenService ?? CreateTokenServiceMock()).Object,
            onboarding.Object,
            CreateJwtOptions(graceSeconds),
            CreateInviteOptions(inviteToken));
    }

    // ── LoginAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task LoginAsync_ValidCredentials_SavesRefreshTokenAndReturnsAuthResult()
    {
        using var db   = CreateContext();
        var user       = new AppUser { Id = 1, UserName = "alice", Email = "alice@example.com" };
        var userManager = CreateUserManagerMock();
        userManager.Setup(m => m.FindByEmailAsync("alice@example.com")).ReturnsAsync(user);
        userManager.Setup(m => m.CheckPasswordAsync(user, "pass")).ReturnsAsync(true);

        var tokenService = CreateTokenServiceMock(
            accessToken: "at-alice", refreshToken: "rt-alice");
        var service = CreateService(db, userManager, tokenService);

        var result = await service.LoginAsync(new LoginRequest { Email = "alice@example.com", Password = "pass" });

        Assert.Equal("at-alice", result.AccessToken);
        Assert.Equal("rt-alice", result.RefreshToken);

        // RefreshToken must be persisted in the database
        var stored = await db.RefreshTokens.SingleAsync();
        Assert.Equal("rt-alice", stored.Token);
        Assert.Equal(1, stored.UserId);
        Assert.Null(stored.RevokedAt);
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsAuthenticationFailedException()
    {
        using var db    = CreateContext();
        var user        = new AppUser { Id = 1, Email = "bob@example.com" };
        var userManager = CreateUserManagerMock();
        userManager.Setup(m => m.FindByEmailAsync("bob@example.com")).ReturnsAsync(user);
        userManager.Setup(m => m.CheckPasswordAsync(user, "wrong")).ReturnsAsync(false);

        var service = CreateService(db, userManager);

        await Assert.ThrowsAsync<AuthenticationFailedException>(
            () => service.LoginAsync(new LoginRequest { Email = "bob@example.com", Password = "wrong" }));
    }

    [Fact]
    public async Task LoginAsync_UnknownEmail_ThrowsAuthenticationFailedException()
    {
        using var db    = CreateContext();
        var userManager = CreateUserManagerMock();
        userManager.Setup(m => m.FindByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((AppUser?)null);

        var service = CreateService(db, userManager);

        await Assert.ThrowsAsync<AuthenticationFailedException>(
            () => service.LoginAsync(new LoginRequest { Email = "ghost@example.com", Password = "pass" }));
    }

    // ── RegisterAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ThrowsConflictException()
    {
        using var db    = CreateContext();
        var existing    = new AppUser { Id = 1, Email = "existing@example.com" };
        var userManager = CreateUserManagerMock();
        userManager.Setup(m => m.FindByEmailAsync("existing@example.com")).ReturnsAsync(existing);

        var service = CreateService(db, userManager);

        await Assert.ThrowsAsync<ConflictException>(
            () => service.RegisterAsync(
                new RegisterRequest { Username = "user", Email = "existing@example.com", Password = "Password1!", InviteToken = "test-invite-token", CurrencyId = 1 }));
    }

    // ── RefreshAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task RefreshAsync_ValidToken_RotatesRefreshToken()
    {
        using var db = CreateContext();

        // Seed a user and an active refresh token directly — no UserManager needed
        var user = new AppUser { Id = 1, UserName = "alice", Email = "alice@example.com" };
        db.Users.Add(user);

        var oldToken = new RefreshToken
        {
            Token     = "old-rt",
            UserId    = 1,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };
        db.RefreshTokens.Add(oldToken);
        await db.SaveChangesAsync();

        var seq          = 0;
        var tokenService = new Mock<ITokenService>();
        tokenService.Setup(t => t.GenerateAccessToken(It.IsAny<AppUser>())).Returns("new-at");
        tokenService.Setup(t => t.GenerateRefreshToken()).Returns(() => $"new-rt-{++seq}");

        var service = CreateService(db, tokenService: tokenService);

        var result = await service.RefreshAsync("old-rt");

        Assert.Equal("new-at",  result.AccessToken);
        Assert.Equal("new-rt-1", result.RefreshToken);

        // Old token must be marked as used with a pointer to the replacement
        var stored = await db.RefreshTokens.FindAsync(oldToken.Id);
        Assert.NotNull(stored!.UsedAt);
        Assert.Equal("new-rt-1", stored.ReplacedByToken);

        // New token must exist in the database
        var newStored = await db.RefreshTokens.SingleAsync(t => t.Token == "new-rt-1");
        Assert.Equal(1, newStored.UserId);
        Assert.Null(newStored.RevokedAt);
    }

    [Fact]
    public async Task RefreshAsync_ExpiredToken_ThrowsAuthenticationFailedException()
    {
        using var db = CreateContext();
        var user = new AppUser { Id = 1, UserName = "u", Email = "u@e.com" };
        db.Users.Add(user);
        db.RefreshTokens.Add(new RefreshToken
        {
            Token     = "expired-rt",
            UserId    = 1,
            ExpiresAt = DateTime.UtcNow.AddDays(-1), // already expired
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);

        await Assert.ThrowsAsync<AuthenticationFailedException>(
            () => service.RefreshAsync("expired-rt"));
    }

    [Fact]
    public async Task RefreshAsync_RevokedToken_ThrowsAuthenticationFailedException()
    {
        using var db = CreateContext();
        var user = new AppUser { Id = 1, UserName = "u", Email = "u@e.com" };
        db.Users.Add(user);
        db.RefreshTokens.Add(new RefreshToken
        {
            Token     = "revoked-rt",
            UserId    = 1,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            RevokedAt = DateTime.UtcNow.AddHours(-1), // revoked
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);

        await Assert.ThrowsAsync<AuthenticationFailedException>(
            () => service.RefreshAsync("revoked-rt"));
    }

    [Fact]
    public async Task RefreshAsync_WithinGraceWindow_ReturnsCachedToken()
    {
        // Grace window: two parallel requests both arrive with the same refresh token.
        // The first one marks it UsedAt and stores ReplacedByToken.
        // The second arrives within the grace window — should get the same new token
        // rather than throwing a "token reuse detected" error.
        using var db = CreateContext();
        var user = new AppUser { Id = 1, UserName = "u", Email = "u@e.com" };
        db.Users.Add(user);
        db.RefreshTokens.Add(new RefreshToken
        {
            Token           = "shared-rt",
            UserId          = 1,
            ExpiresAt       = DateTime.UtcNow.AddDays(7),
            UsedAt          = DateTime.UtcNow.AddSeconds(-5), // used 5 seconds ago
            ReplacedByToken = "already-issued-rt",            // replacement already issued
        });
        await db.SaveChangesAsync();

        var service = CreateService(db, graceSeconds: 30);

        // Second request within the grace window
        var result = await service.RefreshAsync("shared-rt");

        Assert.Equal("already-issued-rt", result.RefreshToken);
    }

    [Fact]
    public async Task RefreshAsync_OutsideGraceWindow_RevokesAllUserTokensAndThrows()
    {
        // Token reuse detected outside grace window — potential theft.
        // All active tokens for the user must be revoked as a security measure.
        using var db = CreateContext();
        var user = new AppUser { Id = 1, UserName = "u", Email = "u@e.com" };
        db.Users.Add(user);

        // The reused token (already used long ago — outside grace window)
        db.RefreshTokens.Add(new RefreshToken
        {
            Token           = "reused-rt",
            UserId          = 1,
            ExpiresAt       = DateTime.UtcNow.AddDays(7),
            UsedAt          = DateTime.UtcNow.AddMinutes(-5), // used 5 minutes ago
            ReplacedByToken = "replacement-rt",
        });

        // A separate active token the attacker might also try to use
        db.RefreshTokens.Add(new RefreshToken
        {
            Token     = "other-active-rt",
            UserId    = 1,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        await db.SaveChangesAsync();

        var service = CreateService(db, graceSeconds: 30);

        await Assert.ThrowsAsync<AuthenticationFailedException>(
            () => service.RefreshAsync("reused-rt"));

        // Both tokens must be revoked
        var tokens = await db.RefreshTokens.ToListAsync();
        Assert.All(tokens, t => Assert.NotNull(t.RevokedAt));
    }

    // ── RevokeAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task RevokeAsync_ValidToken_SetsRevokedAt()
    {
        using var db = CreateContext();
        var user = new AppUser { Id = 1, UserName = "u", Email = "u@e.com" };
        db.Users.Add(user);
        db.RefreshTokens.Add(new RefreshToken
        {
            Token     = "active-rt",
            UserId    = 1,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        await service.RevokeAsync("active-rt");

        var stored = await db.RefreshTokens.SingleAsync();
        Assert.NotNull(stored.RevokedAt);
    }

    [Fact]
    public async Task RevokeAsync_AlreadyRevoked_IsIdempotent()
    {
        using var db      = CreateContext();
        var revokedAt     = DateTime.UtcNow.AddHours(-1);
        var user = new AppUser { Id = 1, UserName = "u", Email = "u@e.com" };
        db.Users.Add(user);
        db.RefreshTokens.Add(new RefreshToken
        {
            Token     = "already-revoked",
            UserId    = 1,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            RevokedAt = revokedAt,
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);

        // Should not throw — logout must be safe to call multiple times
        var ex = await Record.ExceptionAsync(() => service.RevokeAsync("already-revoked"));
        Assert.Null(ex);

        // RevokedAt must not be overwritten
        var stored = await db.RefreshTokens.SingleAsync();
        Assert.Equal(revokedAt, stored.RevokedAt);
    }
}
