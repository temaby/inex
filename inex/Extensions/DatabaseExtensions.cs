using Microsoft.EntityFrameworkCore;
using inex.Data;

namespace inex.Extensions;

/// <summary>
/// Extension methods for database initialization and migration
/// </summary>
public static class DatabaseExtensions
{
    /// <summary>
    /// Ensures the database is created and all migrations are applied.
    /// Call this in Configure() method during application startup for Production environments.
    /// </summary>
    /// <param name="app">The application builder</param>
    /// <returns>The application builder for chaining</returns>
    public static IApplicationBuilder EnsureDatabaseInitialized(this IApplicationBuilder app)
    {
        using (var scope = app.ApplicationServices.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();

            try
            {
                // Apply any pending migrations
                db.Database.Migrate();
                Console.WriteLine("✓ Database migrations applied successfully");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Database migration failed: {ex.Message}");
                throw;
            }
        }

        return app;
    }

    /// <summary>
    /// Ensures the database is created (for development).
    /// This does not apply migrations, just ensures the database exists.
    /// </summary>
    public static IApplicationBuilder EnsureDatabaseCreated(this IApplicationBuilder app)
    {
        using (var scope = app.ApplicationServices.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();

            try
            {
                db.Database.EnsureCreated();
                Console.WriteLine("✓ Database created or already exists");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Database creation failed: {ex.Message}");
                throw;
            }
        }

        return app;
    }
}
