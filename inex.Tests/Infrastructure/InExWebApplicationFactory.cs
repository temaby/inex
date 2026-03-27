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
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Satisfy ValidateOnStart() for external API settings and the connection string
        // without requiring real infrastructure.
        builder.ConfigureAppConfiguration((_, cfg) =>
        {
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:InExConnection"] = "Server=localhost;Database=test;User=test;Password=test;",
                ["CurrencyApiSettings:BaseUrl"] = "https://dummy.invalid/",
                ["CurrencyApiSettings:ApiKey"] = "test-key",
                ["FrankfurterApiSettings:BaseUrl"] = "https://dummy.invalid/",
            });
        });

        builder.ConfigureTestServices(services =>
        {
            // Remove the MySQL DbContextOptions registered by AddInExData
            var descriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(DbContextOptions<InExDbContext>));
            if (descriptor != null)
                services.Remove(descriptor);

            // Register an isolated in-memory database per factory instance
            services.AddDbContext<InExDbContext>(options =>
                options.UseInMemoryDatabase("InExTestDb_" + Guid.NewGuid()));
        });
    }
}
