using inex.Data;
using inex.Data.Models;
using inex.Services.Exceptions;
using inex.Services.Models.Records.Auth;
using inex.Services.Options;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace inex.Services.Services.Auth;

public class AuthService : IAuthService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly InExDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly JwtOptions _jwt;

    public AuthService(
        UserManager<AppUser> userManager,
        InExDbContext db,
        ITokenService tokenService,
        IOptions<JwtOptions> jwtOptions)
    {
        _userManager = userManager;
        _db = db;
        _tokenService = tokenService;
        _jwt = jwtOptions.Value;
    }

    public async Task<TokenResponse> RegisterAsync(RegisterRequest request)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
            throw new ConflictException($"Email '{request.Email}' is already registered.");

        var user = new AppUser
        {
            UserName = request.Username,
            Email = request.Email,
            CurrencyId = AppUser.DefaultCurrencyId
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            throw new ValidationFailedException(
                "Registration failed.",
                result.Errors.Select(e => e.Description).ToList());

        return await IssueTokenPairAsync(user);
    }

    public async Task<TokenResponse> LoginAsync(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
            throw new AuthenticationFailedException("Invalid credentials.");

        return await IssueTokenPairAsync(user);
    }

    public async Task<TokenResponse> RefreshAsync(string refreshToken)
    {
        var stored = await _db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == refreshToken);

        if (stored is null || stored.RevokedAt is not null)
            throw new AuthenticationFailedException("Invalid refresh token.");

        if (stored.ExpiresAt < DateTime.UtcNow)
            throw new AuthenticationFailedException("Refresh token has expired.");

        // Grace window: parallel requests may reuse the same token within the configured window
        if (stored.UsedAt is not null)
        {
            var withinGraceWindow = DateTime.UtcNow - stored.UsedAt.Value < TimeSpan.FromSeconds(_jwt.RefreshGraceWindowSeconds);
            if (withinGraceWindow && stored.ReplacedByToken is not null)
                return new TokenResponse(
                    _tokenService.GenerateAccessToken(stored.User),
                    _jwt.AccessTokenExpirySeconds);

            // Reuse outside grace window — potential token theft
            await RevokeAllUserTokensAsync(stored.UserId);
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

        await _db.SaveChangesAsync();

        return new TokenResponse(
            _tokenService.GenerateAccessToken(stored.User),
            _jwt.AccessTokenExpirySeconds);
    }

    public async Task RevokeAsync(string refreshToken)
    {
        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == refreshToken);

        if (stored is null || stored.RevokedAt is not null)
            return; // idempotent — logout is safe to call multiple times

        stored.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    // --- Private helpers ---

    private async Task<TokenResponse> IssueTokenPairAsync(AppUser user)
    {
        var refreshToken = _tokenService.GenerateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            Token = refreshToken,
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays)
        });

        await _db.SaveChangesAsync();

        return new TokenResponse(
            _tokenService.GenerateAccessToken(user),
            _jwt.AccessTokenExpirySeconds);
    }

    private async Task RevokeAllUserTokensAsync(int userId)
    {
        var tokens = await _db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var token in tokens)
            token.RevokedAt = now;

        await _db.SaveChangesAsync();
    }
}
