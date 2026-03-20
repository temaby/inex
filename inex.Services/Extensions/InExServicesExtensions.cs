using Microsoft.Extensions.DependencyInjection;
using inex.Data.Extensions;
using inex.Services.Services.Base;
using inex.Services.Services;
using Microsoft.Extensions.Configuration;
using inex.Services.Infrastructure.ExternalClients.ExchangeRate;
using Microsoft.Extensions.Options;

namespace inex.Services.Extensions;

public static class InExServicesExtensions
{
    public static IServiceCollection AddInExServices(this IServiceCollection services, IConfiguration config)
    {
        string inexConnectionString = config.GetConnectionString("InExConnection")
        ?? throw new InvalidOperationException("InExConnection connection string is not configured.");

        services.AddOptions<ExchangeApiSettings>().BindConfiguration("ExchangeApiSettings").ValidateDataAnnotations().ValidateOnStart();
        services.AddOptions<FrankfurterApiSettings>().BindConfiguration("FrankfurterApiSettings").ValidateDataAnnotations().ValidateOnStart();

        services.AddAutoMapper(typeof(InExServicesExtensions).Assembly);

        services.AddInExData(inexConnectionString);

        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<IBudgetService, BudgetService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ICurrencyService, CurrencyService>();
        services.AddScoped<ITransactionService, TransactionService>();
        services.AddScoped<IExchangeRateService, ExchangeRateService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IBudgetReportService, BudgetReportService>();
        services.AddHttpClient<ICurrencyApiClient, CurrencyApiClient>((serviceProvider, client) =>
        {
            var settings = serviceProvider.GetRequiredService<IOptions<ExchangeApiSettings>>().Value;
            if (string.IsNullOrEmpty(settings.BaseUrl))
                throw new InvalidOperationException("CurrencyAPI BaseUrl is not configured.");
            client.BaseAddress = new Uri(settings.BaseUrl);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        });
        services.AddHttpClient<FrankfurterApiClient>((serviceProvider, client) =>
        {
            var settings = serviceProvider.GetRequiredService<IOptions<FrankfurterApiSettings>>().Value;
            if (string.IsNullOrEmpty(settings.BaseUrl))
                throw new InvalidOperationException("Frankfurter API BaseUrl is not configured.");
            client.BaseAddress = new Uri(settings.BaseUrl);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        });

        return services;
    }
}