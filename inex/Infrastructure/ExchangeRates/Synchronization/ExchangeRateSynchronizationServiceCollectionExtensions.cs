using inex.Application.ExchangeRates.Synchronization;
using inex.Application.ExchangeRates.Synchronization.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace inex.Infrastructure.ExchangeRates.Synchronization;

public static class ExchangeRateSynchronizationServiceCollectionExtensions
{
    public static IServiceCollection AddExchangeRateSynchronization(this IServiceCollection services)
    {
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IExchangeRateSynchronizationLock, ExchangeRateSynchronizationLock>();
        services.AddScoped<IHistoricalRateProvider, HistoricalRateProvider>();
        services.AddScoped<IExchangeRateUserScopeReader, ExchangeRateUserScopeReader>();
        services.AddScoped<IExchangeRateRepository, ExchangeRateRepository>();
        services.AddScoped<SynchronizeExchangeRatesCommandHandler>();

        return services;
    }
}
