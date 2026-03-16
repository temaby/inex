using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace inex.Data;

public class InExDbContextFactory : IDesignTimeDbContextFactory<InExDbContext>
{
    public InExDbContext CreateDbContext(string[] args)
    {
        // For design-time migrations, get connection string from environment variable
        // This is intentionally explicit - migrations must be run with proper configuration
        string? connectionString = Environment.GetEnvironmentVariable("INEX_CONNECTION_STRING");

        if (string.IsNullOrEmpty(connectionString))
        {
            throw new InvalidOperationException(
                "INEX_CONNECTION_STRING environment variable not set.\n\n" +
                "To run migrations, set the connection string via user-secrets:\n" +
                "  dotnet user-secrets set \"ConnectionStrings:InExConnection\" \"<connection-string>\"\n\n" +
                "Then set the environment variable before running migrations:\n" +
                "  set INEX_CONNECTION_STRING=\"<connection-string>\" (Windows)\n" +
                "  export INEX_CONNECTION_STRING=\"<connection-string>\" (Unix)\n\n" +
                "Or use a PowerShell helper:\n" +
                "  $conn = dotnet user-secrets list | findstr 'InExConnection' | cut -d= -f2\n" +
                "  $env:INEX_CONNECTION_STRING = $conn\n" +
                "  dotnet ef migrations add <MigrationName>\n\n" +
                "Connection string example:\n" +
                "server=localhost;port=3306;user=root;password=XXX;database=inex_dev;Convert Zero Datetime=True");
        }

        var optionsBuilder = new DbContextOptionsBuilder<InExDbContext>();
        optionsBuilder.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString));
        return new InExDbContext(optionsBuilder.Options);
    }
}

