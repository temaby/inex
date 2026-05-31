using inex.Data;
using inex.Data.Models;
using inex.Services.Exceptions;
using inex.Services.Infrastructure.Time;
using inex.Services.Models.Records.Auth;
using inex.Services.Options;
using inex.Services.Services.Base;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace inex.Services.Services.Auth;

public class AuthService : IAuthService
{
    private const int MaxRevocationRetries = 3;

    private readonly UserManager<AppUser> _userManager;
    private readonly InExDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly IUserOnboardingService _onboarding;
    private readonly JwtOptions _jwt;
    private readonly InviteOptions _invite;
    private readonly IClock _clock;

    public AuthService(
        UserManager<AppUser> userManager,
        InExDbContext db,
        ITokenService tokenService,
        IUserOnboardingService onboarding,
        IOptions<JwtOptions> jwtOptions,
        IOptions<InviteOptions> inviteOptions,
        IClock clock)
    {
        _userManager = userManager;
        _db = db;
        _tokenService = tokenService;
        _onboarding = onboarding;
        _jwt = jwtOptions.Value;
        _invite = inviteOptions.Value;
        _clock = clock;
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
            UserName     = request.Username,
            Email        = request.Email,
            CurrencyId   = request.CurrencyId,
            LanguageCode = request.LanguageCode,
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            throw new ValidationFailedException(
                "Registration failed.",
                result.Errors.Select(e => e.Description).ToList());

        await _onboarding.SeedAsync(user.Id, request.CurrencyId, request.LanguageCode, ct);

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

        var now = _clock.UtcNow;

        if (stored.ExpiresAt < now)
            throw new AuthenticationFailedException("Refresh token has expired.");

        if (stored.UsedAt is not null)
        {
            var withinRaceWindow = now - stored.UsedAt.Value < TimeSpan.FromSeconds(_jwt.RefreshGraceWindowSeconds);
            if (withinRaceWindow && stored.ReplacedByToken is not null)
                throw new ConflictException("Refresh token rotation conflict detected.", stored.Id);

            await RevokeAllUserTokensAsync(stored.UserId, ct);
            throw new AuthenticationFailedException("Token reuse detected. All sessions have been revoked.");
        }

        // Normal rotation: mark old token as used, issue new one
        var newRefreshToken = _tokenService.GenerateRefreshToken();
        stored.UsedAt = now;
        stored.ReplacedByToken = newRefreshToken;
        stored.ConcurrencyStamp = CreateConcurrencyStamp();

        var replacement = new RefreshToken
        {
            Token = newRefreshToken,
            UserId = stored.UserId,
            ExpiresAt = now.AddDays(_jwt.RefreshTokenExpiryDays)
        };
        _db.RefreshTokens.Add(replacement);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            await RemoveFailedReplacementAsync(replacement, ct);
            throw new ConflictException("Refresh token rotation conflict detected.", stored.Id);
        }

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

        stored.RevokedAt = _clock.UtcNow;
        stored.ConcurrencyStamp = CreateConcurrencyStamp();
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            _db.ChangeTracker.Clear();
        }
    }

    public async Task<AuthResult> UpdateProfileAsync(int userId, UpdateProfileRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new ResourceNotFoundException($"User {userId} not found.");

        user.UserName = request.Username;
        user.CurrencyId = request.CurrencyId;
        user.LanguageCode = request.LanguageCode;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            throw new ValidationFailedException(
                "Profile update failed.",
                result.Errors.Select(e => e.Description).ToList());

        // Re-issue token pair so JWT claims reflect the new username/currency immediately
        return await IssueTokenPairAsync(user, ct);
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new ResourceNotFoundException($"User {userId} not found.");

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
            throw new ValidationFailedException(
                "Password change failed.",
                result.Errors.Select(e => e.Description).ToList());
    }

    // --- Private helpers ---

    private async Task<AuthResult> IssueTokenPairAsync(AppUser user, CancellationToken ct = default)
    {
        var refreshToken = _tokenService.GenerateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            Token = refreshToken,
            UserId = user.Id,
            ExpiresAt = _clock.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays)
        });

        await _db.SaveChangesAsync(ct);

        return new AuthResult(
            _tokenService.GenerateAccessToken(user),
            refreshToken,
            _jwt.AccessTokenExpirySeconds);
    }

    private async Task RevokeAllUserTokensAsync(int userId, CancellationToken ct = default)
    {
        for (var attempt = 1; attempt <= MaxRevocationRetries; attempt++)
        {
            var tokens = await _db.RefreshTokens
                .Where(t => t.UserId == userId && t.RevokedAt == null)
                .ToListAsync(ct);

            if (tokens.Count == 0)
                return;

            var now = _clock.UtcNow;
            foreach (var token in tokens)
            {
                token.RevokedAt = now;
                token.ConcurrencyStamp = CreateConcurrencyStamp();
            }

            try
            {
                await _db.SaveChangesAsync(ct);
                return;
            }
            catch (DbUpdateConcurrencyException)
            {
                _db.ChangeTracker.Clear();
                if (attempt == MaxRevocationRetries)
                    throw new ConflictException("Refresh token revocation conflict detected.", userId);
            }
        }
    }

    private static string CreateConcurrencyStamp() => Guid.NewGuid().ToString("N");

    private async Task RemoveFailedReplacementAsync(RefreshToken replacement, CancellationToken ct)
    {
        _db.ChangeTracker.Clear();

        var persistedReplacement = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == replacement.Token, ct);

        if (persistedReplacement is null)
            return;

        _db.RefreshTokens.Remove(persistedReplacement);
        await _db.SaveChangesAsync(ct);
    }
}
