using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.RateLimiting;
using inex.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace inex.Tests.Infrastructure;

/// <summary>
/// Spins up the real ASP.NET Core pipeline with MySQL replaced by an in-memory database.
/// Used by all integration / contract tests.
/// </summary>
public class InExWebApplicationFactory : WebApplicationFactory<Program>
{
    /// <summary>
    /// Known JWT secret used in tests.
    /// Must be ≥32 characters to pass JwtOptions [MinLength(32)] validation.
    /// </summary>
    internal const string TestJwtSecret = "test-secret-key-minimum-32-chars!!";

    /// <summary>Invite token used in tests — matches InviteOptions:Token in test config.</summary>
    internal const string TestInviteToken = "test-invite-token";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, cfg) =>
        {
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:InExConnection"] = "Server=localhost;Database=test;User=test;Password=test;",
                ["CurrencyApiSettings:BaseUrl"]       = "https://dummy.invalid/",
                ["CurrencyApiSettings:ApiKey"]        = "test-key",
                ["FrankfurterApiSettings:BaseUrl"]    = "https://dummy.invalid/",
                // Provide a real secret so JWT middleware can sign and validate tokens
                ["JwtOptions:Secret"]                 = TestJwtSecret,
                ["JwtOptions:Issuer"]                 = "inex-api",
                ["JwtOptions:Audience"]               = "inex-client",
                ["InviteOptions:Token"]               = TestInviteToken,
            });
        });

        builder.ConfigureTestServices(services =>
        {
            // Remove the MySQL DbContextOptions registered by AddInExData
            var descriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(DbContextOptions<InExDbContext>));
            if (descriptor != null)
                services.Remove(descriptor);

            // Isolated in-memory database per factory instance.
            // All clients created from the same factory share this database.
            // The name must be captured outside the lambda — if evaluated inside,
            // Guid.NewGuid() runs on every scope (every request), giving each
            // request its own empty database and breaking cross-request state.
            var dbName = "InExTestDb_" + Guid.NewGuid();
            services.AddDbContext<InExDbContext>(options =>
                options.UseInMemoryDatabase(dbName));

            // Disable rate limiting in tests — multiple test classes share the same
            // IP (::1) and would exceed the 5/min limit. Remove the production
            // IConfigureOptions<RateLimiterOptions> descriptor and re-register with
            // a no-op policy so AddPolicy doesn't throw "already exists".
            var rateLimiterConfigDescriptors = services
                .Where(d => d.ServiceType == typeof(IConfigureOptions<RateLimiterOptions>))
                .ToList();
            foreach (var d in rateLimiterConfigDescriptors)
                services.Remove(d);

            services.Configure<RateLimiterOptions>(options =>
                options.AddPolicy(inex.Infrastructure.RateLimitPolicies.AuthFixedWindow, _ =>
                    RateLimitPartition.GetNoLimiter("test")));
        });
    }

    /// <summary>
    /// Creates an HttpClient pre-loaded with a valid Bearer token.
    /// Registers a fresh test user via the real auth endpoint so Identity
    /// infrastructure (password hashing, UserManager) is exercised.
    /// </summary>
    /// <param name="email">
    /// Must be unique per factory instance — pass a Guid-based value when
    /// calling this multiple times from the same test class.
    /// </param>
    public async Task<HttpClient> CreateAuthenticatedClientAsync(
        string email    = "testuser@example.com",
        string username = "testuser",
        string password = "Password1!")
    {
        var anonClient = CreateClient();

        var response = await anonClient.PostAsJsonAsync("/api/auth/register", new
        {
            username,
            email,
            password,
            inviteToken = TestInviteToken,
            currencyId  = 1, // in-memory DB has no FK enforcement; any positive int is valid
        });
        response.EnsureSuccessStatusCode();

        var body  = await response.Content.ReadFromJsonAsync<JsonElement>();
        var token = body.GetProperty("accessToken").GetString()!;

        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    /// <summary>
    /// Creates an HttpClient that automatically manages cookies.
    /// Use this when testing endpoints that depend on the httpOnly refresh
    /// token cookie (e.g. POST /api/auth/refresh).
    /// </summary>
    public HttpClient CreateCookieClient() =>
        CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
}
