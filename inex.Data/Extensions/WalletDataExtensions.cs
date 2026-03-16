using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace inex.Data.Extensions;

public static class InExDataExtensions
{
    public static IServiceCollection AddInExData(this IServiceCollection services, string inexConnectionString)
    {
        services.AddDbContext<InExDbContext>(options =>
        {
#if DEBUG
            //options.LogTo(Console.WriteLine);
            options.UseLoggerFactory(InExDbContext.InExLoggerFactory);
            options.EnableSensitiveDataLogging();
#endif
            options.UseMySql(inexConnectionString, ServerVersion.AutoDetect(inexConnectionString));
        }, ServiceLifetime.Scoped);
        return services;
    }
}
