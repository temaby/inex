using System.Net.Http.Headers;
using System.Net.Http.Json;
using inex.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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
