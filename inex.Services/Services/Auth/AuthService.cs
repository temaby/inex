using inex.Data;
using inex.Data.Models;
using inex.Services.Exceptions;
using inex.Services.Models.Records.Auth;
using inex.Services.Options;
using inex.Services.Services.Base;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace inex.Services.Services.Auth;

public class AuthService : IAuthService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly InExDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly IUserOnboardingService _onboarding;
    private readonly JwtOptions _jwt;
    private readonly InviteOptions _invite;

    public AuthService(
        UserManager<AppUser> userManager,
        InExDbContext db,
        ITokenService tokenService,
        IUserOnboardingService onboarding,
        IOptions<JwtOptions> jwtOptions,
        IOptions<InviteOptions> inviteOptions)
    {
        _userManager = userManager;
        _db = db;
        _tokenService = tokenService;
        _onboarding = onboarding;
        _jwt = jwtOptions.Value;
        _invite = inviteOptions.Value;
    }

    public async Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        if (!string.Equals(request.InviteToken, _invite.Token, StringComparison.Ordinal))
            throw new AccessDeniedException("Registration requires a valid invite token.", reason: "invalid-invite-token");

        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
            throw new ConflictException($"Email '{request.Email}' is already registered.");

        var user = new AppUser
        {
            UserName   = request.Username,
            Email      = request.Email,
            CurrencyId = request.CurrencyId,
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            throw new ValidationFailedException(
                "Registration failed.",
                result.Errors.Select(e => e.Description).ToList());

        await _onboarding.SeedAsync(user.Id, request.CurrencyId, ct);

        return await IssueTokenPairAsync(user, ct);
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
            throw new AuthenticationFailedException("Invalid credentials.");

        return await IssueTokenPairAsync(user, ct);
    }

    public async Task<AuthResult> RefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        var stored = await _db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == refreshToken, ct);

        if (stored is null || stored.RevokedAt is not null)
            throw new AuthenticationFailedException("Invalid refresh token.");

        if (stored.ExpiresAt < DateTime.UtcNow)
            throw new AuthenticationFailedException("Refresh token has expired.");

        // Grace window: parallel requests may reuse the same token within the configured window
        if (stored.UsedAt is not null)
        {
            var withinGraceWindow = DateTime.UtcNow - stored.UsedAt.Value < TimeSpan.FromSeconds(_jwt.RefreshGraceWindowSeconds);
            if (withinGraceWindow && stored.ReplacedByToken is not null)
                return new AuthResult(
                    _tokenService.GenerateAccessToken(stored.User),
                    stored.ReplacedByToken,
                    _jwt.AccessTokenExpirySeconds);

            // Reuse outside grace window — potential token theft
            await RevokeAllUserTokensAsync(stored.UserId, ct);
            throw new AuthenticationFailedException("Token reuse detected. All sessions have been revoked.");
        }

        // Normal rotation: mark old token as used, issue new one
        var newRefreshToken = _tokenService.GenerateRefreshToken();
        stored.UsedAt = DateTime.UtcNow;
        stored.ReplacedByToken = newRefreshToken;

        _db.RefreshTokens.Add(new RefreshToken
        {
            Token = newRefreshToken,
            UserId = stored.UserId,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays)
        });

        await _db.SaveChangesAsync(ct);

        return new AuthResult(
            _tokenService.GenerateAccessToken(stored.User),
            newRefreshToken,
            _jwt.AccessTokenExpirySeconds);
    }

    public async Task RevokeAsync(string refreshToken, CancellationToken ct = default)
    {
        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == refreshToken, ct);

        if (stored is null || stored.RevokedAt is not null)
            return; // idempotent — logout is safe to call multiple times

        stored.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    // --- Private helpers ---

    private async Task<AuthResult> IssueTokenPairAsync(AppUser user, CancellationToken ct = default)
    {
        var refreshToken = _tokenService.GenerateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            Token = refreshToken,
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays)
        });

        await _db.SaveChangesAsync(ct);

        return new AuthResult(
            _tokenService.GenerateAccessToken(user),
            refreshToken,
            _jwt.AccessTokenExpirySeconds);
    }

    private async Task RevokeAllUserTokensAsync(int userId, CancellationToken ct = default)
    {
        var tokens = await _db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        foreach (var token in tokens)
            token.RevokedAt = now;

        await _db.SaveChangesAsync(ct);
    }
}
