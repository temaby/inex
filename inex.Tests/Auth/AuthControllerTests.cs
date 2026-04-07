using System.Net.Http.Json;
using inex.Tests.Infrastructure;
using static inex.Tests.Infrastructure.InExWebApplicationFactory;

namespace inex.Tests.Auth;

/// <summary>
/// Integration tests for AuthController — exercises the full ASP.NET Core pipeline
/// including Identity, JWT middleware, cookie handling, and token rotation.
///
/// Each test that registers a user uses a unique email (Guid-based) to avoid
/// conflicts within the shared in-memory database for this fixture.
/// </summary>
[Collection(Infrastructure.IntegrationTestCollection.Name)]
public class AuthControllerTests : IClassFixture<InExWebApplicationFactory>
{
    private readonly InExWebApplicationFactory _factory;

    public AuthControllerTests(InExWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ── Register ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Register_ValidRequest_Returns200WithAccessToken()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            username    = $"user-{Guid.NewGuid():N}",
            email       = $"{Guid.NewGuid()}@example.com",
            password    = "Password1!",
            inviteToken = TestInviteToken,
            currencyId  = 1,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrEmpty(body.GetProperty("accessToken").GetString()));
        Assert.True(body.GetProperty("expiresIn").GetInt32() > 0);
    }

    [Fact]
    public async Task Register_SetsRefreshTokenCookie()
    {
        var client = _factory.CreateCookieClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            username    = $"user-{Guid.NewGuid():N}",
            email       = $"{Guid.NewGuid()}@example.com",
            password    = "Password1!",
            inviteToken = TestInviteToken,
            currencyId  = 1,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // The cookie is httpOnly and scoped to /api/auth — verify it was issued
        var setCookie = response.Headers
            .FirstOrDefault(h => h.Key.Equals("Set-Cookie", StringComparison.OrdinalIgnoreCase))
            .Value?.FirstOrDefault() ?? string.Empty;

        Assert.Contains("refreshToken", setCookie);
        Assert.Contains("HttpOnly", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Path=/api/auth", setCookie, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409Conflict()
    {
        var client = _factory.CreateClient();
        var email  = $"{Guid.NewGuid()}@example.com";

        // Unique usernames prevent Identity's username-uniqueness check from
        // rejecting either request independently of the email conflict we're testing.
        var first = await client.PostAsJsonAsync("/api/auth/register", new
        {
            username    = $"user-{Guid.NewGuid():N}",
            email,
            password    = "Password1!",
            inviteToken = TestInviteToken,
            currencyId  = 1,
        });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        // Second registration with the same email — different username, same email
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            username    = $"user-{Guid.NewGuid():N}",
            email,
            password    = "Password1!",
            inviteToken = TestInviteToken,
            currencyId  = 1,
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("/errors/conflict", body.GetProperty("type").GetString());
    }

    [Fact]
    public async Task Register_WithoutInviteToken_Returns422()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            username   = $"user-{Guid.NewGuid():N}",
            email      = $"{Guid.NewGuid()}@example.com",
            password   = "Password1!",
            currencyId = 1,
            // inviteToken omitted — [Required] triggers model binding 422
        });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task Register_WithWrongInviteToken_Returns403()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            username    = $"user-{Guid.NewGuid():N}",
            email       = $"{Guid.NewGuid()}@example.com",
            password    = "Password1!",
            inviteToken = "definitely-wrong-token",
            currencyId  = 1,
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("/errors/access-denied", body.GetProperty("type").GetString());
        Assert.Equal("invalid-invite-token", body.GetProperty("reason").GetString());
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_ValidCredentials_Returns200WithAccessToken()
    {
        var client = _factory.CreateClient();
        var email  = $"{Guid.NewGuid()}@example.com";

        await client.PostAsJsonAsync("/api/auth/register", new
        {
            username    = $"user-{Guid.NewGuid():N}",
            email,
            password    = "Password1!",
            inviteToken = TestInviteToken,
            currencyId  = 1,
        });

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "Password1!",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrEmpty(body.GetProperty("accessToken").GetString()));
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        var client = _factory.CreateClient();
        var email  = $"{Guid.NewGuid()}@example.com";

        await client.PostAsJsonAsync("/api/auth/register", new
        {
            username    = $"user-{Guid.NewGuid():N}",
            email,
            password    = "Password1!",
            inviteToken = TestInviteToken,
            currencyId  = 1,
        });

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "WrongPassword9!",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_UnknownEmail_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email    = "nobody@nowhere.com",
            password = "Password1!",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Refresh ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Refresh_WithValidCookie_Returns200WithNewToken()
    {
        // Use a cookie-aware client so the refreshToken cookie from /register
        // is automatically included in the /refresh request.
        var client = _factory.CreateCookieClient();

        var loginResponse = await client.PostAsJsonAsync("/api/auth/register", new
        {
            username    = $"user-{Guid.NewGuid():N}",
            email       = $"{Guid.NewGuid()}@example.com",
            password    = "Password1!",
            inviteToken = TestInviteToken,
            currencyId  = 1,
        });
        loginResponse.EnsureSuccessStatusCode();

        var firstToken = (await loginResponse.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("accessToken").GetString()!;

        // Refresh — cookie sent automatically because HandleCookies = true
        var refreshResponse = await client.PostAsync("/api/auth/refresh", null);

        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);

        var newToken = (await refreshResponse.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("accessToken").GetString()!;

        // A new access token is issued on each refresh (new Jti claim)
        Assert.False(string.IsNullOrEmpty(newToken));
    }

    [Fact]
    public async Task Refresh_WithNoCookie_Returns401()
    {
        var client = _factory.CreateClient(); // no cookie handling

        var response = await client.PostAsync("/api/auth/refresh", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Me ────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Me_WithValidToken_Returns200WithUserProfile()
    {
        var email  = $"{Guid.NewGuid()}@example.com";
        var client = await _factory.CreateAuthenticatedClientAsync(email: email, username: "meuser");

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("meuser", body.GetProperty("username").GetString());
        Assert.Equal(email, body.GetProperty("email").GetString());
        Assert.True(body.GetProperty("id").GetInt32() > 0);
        Assert.Equal(1, body.GetProperty("currencyId").GetInt32());
    }

    [Fact]
    public async Task Me_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── UpdateProfile ─────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateProfile_WithValidToken_Returns200WithNewToken()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        var response = await client.PutAsJsonAsync("/api/auth/me", new
        {
            username   = "updated-username",
            currencyId = 1,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrEmpty(body.GetProperty("accessToken").GetString()));
        Assert.True(body.GetProperty("expiresIn").GetInt32() > 0);
    }

    [Fact]
    public async Task UpdateProfile_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PutAsJsonAsync("/api/auth/me", new
        {
            username   = "anon",
            currencyId = 1,
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── ChangePassword ────────────────────────────────────────────────────────

    [Fact]
    public async Task ChangePassword_WithValidCredentials_Returns204()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        var response = await client.PostAsJsonAsync("/api/auth/change-password", new
        {
            currentPassword = "Password1!",
            newPassword     = "NewPassword2@",
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WithWrongCurrentPassword_Returns422()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        var response = await client.PostAsJsonAsync("/api/auth/change-password", new
        {
            currentPassword = "WrongPassword1!",
            newPassword     = "NewPassword2@",
        });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/change-password", new
        {
            currentPassword = "Password1!",
            newPassword     = "NewPassword2@",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Logout_Returns204AndClearsRefreshTokenCookie()
    {
        var client = _factory.CreateCookieClient();

        await client.PostAsJsonAsync("/api/auth/register", new
        {
            username    = $"user-{Guid.NewGuid():N}",
            email       = $"{Guid.NewGuid()}@example.com",
            password    = "Password1!",
            inviteToken = TestInviteToken,
            currencyId  = 1,
        });

        var response = await client.PostAsync("/api/auth/logout", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // After logout the refresh endpoint should return 401 even with the
        // now-revoked cookie, because the token is marked RevokedAt in the DB
        var refreshAfterLogout = await client.PostAsync("/api/auth/refresh", null);
        Assert.Equal(HttpStatusCode.Unauthorized, refreshAfterLogout.StatusCode);
    }
}
