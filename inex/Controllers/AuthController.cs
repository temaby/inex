using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using inex.Services.Models.Records.Auth;
using inex.Services.Options;
using inex.Services.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace inex.Controllers;

[Route("api/auth")]
[Produces("application/json")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly JwtOptions _jwt;
    private readonly IHostEnvironment _env;

    public AuthController(IAuthService authService, IOptions<JwtOptions> jwtOptions, IHostEnvironment env)
    {
        _authService = authService;
        _jwt = jwtOptions.Value;
        _env = env;
    }

    /// <summary>Register a new user account</summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<TokenResponse>> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);
        SetRefreshTokenCookie(result.RefreshToken);
        return Ok(new TokenResponse(result.AccessToken, result.ExpiresIn));
    }

    /// <summary>Authenticate with email and password</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<TokenResponse>> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        SetRefreshTokenCookie(result.RefreshToken);
        return Ok(new TokenResponse(result.AccessToken, result.ExpiresIn));
    }

    /// <summary>
    /// Issue a new access token using the httpOnly refresh token cookie.
    /// Implements token rotation — the old refresh token is invalidated.
    /// </summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<TokenResponse>> Refresh()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized();

        var result = await _authService.RefreshAsync(refreshToken);
        SetRefreshTokenCookie(result.RefreshToken);
        return Ok(new TokenResponse(result.AccessToken, result.ExpiresIn));
    }

    /// <summary>Revoke the current session and clear the refresh token cookie</summary>
    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (!string.IsNullOrEmpty(refreshToken))
            await _authService.RevokeAsync(refreshToken);

        ClearRefreshTokenCookie();
        return NoContent();
    }

    /// <summary>Return the profile of the currently authenticated user from JWT claims</summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserProfile), StatusCodes.Status200OK)]
    public ActionResult<UserProfile> Me()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var email = User.FindFirstValue(JwtRegisteredClaimNames.Email)!;
        var username = User.FindFirstValue(JwtRegisteredClaimNames.Name)!;

        return Ok(new UserProfile(userId, username, email));
    }

    // ── Private helpers ──

    private void SetRefreshTokenCookie(string token)
    {
        Response.Cookies.Append("refreshToken", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = !_env.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays),
            // Scope cookie to auth endpoints — frontend never needs to read it
            Path = "/api/auth"
        });
    }

    private void ClearRefreshTokenCookie()
    {
        Response.Cookies.Delete("refreshToken", new CookieOptions
        {
            HttpOnly = true,
            Secure = !_env.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = "/api/auth"
        });
    }
}
