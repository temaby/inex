using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using inex.Data.Models;
using inex.Services.Services.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using JwtOptions = inex.Services.Options.JwtOptions;

namespace inex.Services.Tests.Services.Auth;

/// <summary>
/// Unit tests for TokenService.
/// No infrastructure needed — just IOptions&lt;JwtOptions&gt; with a real secret.
/// </summary>
public class TokenServiceTests
{
    private static readonly JwtOptions TestJwt = new()
    {
        Secret   = "test-secret-minimum-32-characters!",
        Issuer   = "test-issuer",
        Audience = "test-audience",
        AccessTokenExpiryMinutes  = 15,
        RefreshTokenExpiryDays    = 7,
        RefreshGraceWindowSeconds = 30,
    };

    private static TokenService CreateService() =>
        new(Microsoft.Extensions.Options.Options.Create(TestJwt));

    private static AppUser CreateUser(int id = 1) => new()
    {
        Id         = id,
        UserName   = "testuser",
        Email      = "test@example.com",
        CurrencyId = 5,
    };

    // ── GenerateAccessToken ───────────────────────────────────────────────────

    [Fact]
    public void GenerateAccessToken_ContainsExpectedClaims()
    {
        var service = CreateService();
        var user    = CreateUser(id: 42);

        var token  = service.GenerateAccessToken(user);
        var claims = ParseClaims(token);

        // sub and NameIdentifier both carry the user id
        Assert.Equal("42", claims.FindFirstValue(JwtRegisteredClaimNames.Sub));
        Assert.Equal("42", claims.FindFirstValue(ClaimTypes.NameIdentifier));
        Assert.Equal("test@example.com", claims.FindFirstValue(JwtRegisteredClaimNames.Email));
        Assert.Equal("testuser",         claims.FindFirstValue(JwtRegisteredClaimNames.Name));

        Assert.Equal("5", claims.FindFirstValue("currency_id"));

        // jti must be present and non-empty (used for token uniqueness)
        var jti = claims.FindFirstValue(JwtRegisteredClaimNames.Jti);
        Assert.False(string.IsNullOrEmpty(jti));
    }

    [Fact]
    public void GenerateAccessToken_ExpiresAtConfiguredTime()
    {
        var service = CreateService();
        var before  = DateTime.UtcNow;

        var token = service.GenerateAccessToken(CreateUser());

        var handler = new JwtSecurityTokenHandler();
        var jwt     = handler.ReadJwtToken(token);

        var expectedExpiry = before.AddMinutes(TestJwt.AccessTokenExpiryMinutes);
        // Allow a 5-second window for test execution time
        Assert.InRange(jwt.ValidTo, expectedExpiry.AddSeconds(-5), expectedExpiry.AddSeconds(5));
    }

    [Fact]
    public void GenerateAccessToken_SignedWithConfiguredSecret()
    {
        var service = CreateService();
        var token   = service.GenerateAccessToken(CreateUser());

        // Validate the signature — will throw if secret does not match
        var parameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwt.Secret)),
            ValidIssuer              = TestJwt.Issuer,
            ValidAudience            = TestJwt.Audience,
            ValidateLifetime         = true,
            ClockSkew                = TimeSpan.Zero,
        };

        var handler    = new JwtSecurityTokenHandler();
        var principal  = handler.ValidateToken(token, parameters, out _);
        Assert.NotNull(principal);
    }

    // ── GenerateRefreshToken ──────────────────────────────────────────────────

    [Fact]
    public void GenerateRefreshToken_ReturnsDifferentValueEachCall()
    {
        var service = CreateService();

        var token1 = service.GenerateRefreshToken();
        var token2 = service.GenerateRefreshToken();

        Assert.NotEqual(token1, token2);
    }

    [Fact]
    public void GenerateRefreshToken_IsValidBase64()
    {
        var service = CreateService();
        var token   = service.GenerateRefreshToken();

        // Should not throw — value must be valid Base64
        var bytes = Convert.FromBase64String(token);
        Assert.Equal(64, bytes.Length); // 64 random bytes → 88 Base64 chars
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ClaimsPrincipal ParseClaims(string token)
    {
        // Clear the default inbound claim type map so JWT claim names (sub, email, name)
        // are preserved as-is instead of being remapped to legacy WS-Fed URIs.
        // Without this, JwtRegisteredClaimNames.Sub ("sub") would be remapped to
        // ClaimTypes.NameIdentifier and FindFirstValue("sub") would return null.
        var handler = new JwtSecurityTokenHandler();
        handler.InboundClaimTypeMap.Clear();

        var parameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwt.Secret)),
            ValidIssuer              = TestJwt.Issuer,
            ValidAudience            = TestJwt.Audience,
            ValidateLifetime         = false, // not under test here
        };
        return handler.ValidateToken(token, parameters, out _);
    }
}
