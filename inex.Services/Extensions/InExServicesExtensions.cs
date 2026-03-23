using Microsoft.Extensions.DependencyInjection;
using inex.Data.Extensions;
using inex.Services.Services.Base;
using inex.Services.Services;
using Microsoft.Extensions.Configuration;
using inex.Services.Infrastructure.ExternalClients.ExchangeRate;
using Microsoft.Extensions.Options;
using AutoMapper;
using inex.Data.Repositories.Base;
using Microsoft.Extensions.Logging;
using Polly;
using inex.Services.Infrastructure.Resilience;

namespace inex.Services.Extensions;

public static class InExServicesExtensions
{
    public static IServiceCollection AddInExServices(this IServiceCollection services, IConfiguration config)
    {
        string inexConnectionString = config.GetConnectionString("InExConnection")
        ?? throw new InvalidOperationException("InExConnection connection string is not configured.");

        services.AddOptions<CurrencyApiSettings>().BindConfiguration(CurrencyApiSettings.SectionName).ValidateDataAnnotations().ValidateOnStart();
        services.AddOptions<FrankfurterApiSettings>().BindConfiguration(FrankfurterApiSettings.SectionName).ValidateDataAnnotations().ValidateOnStart();

        services.AddAutoMapper(typeof(InExServicesExtensions).Assembly);

        services.AddInExData(inexConnectionString);

        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<IBudgetService, BudgetService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ICurrencyService, CurrencyService>();
        services.AddScoped<ITransactionService, TransactionService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IBudgetReportService, BudgetReportService>();

        // Pre-create retry policies as singletons — logger and policy are built once, not per request
        services.AddKeyedSingleton<IAsyncPolicy<HttpResponseMessage>>(
            "CurrencyApiRetry",
            (sp, _) =>
            {
                var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("InEx.Resilience");
                return HttpResiliencePolicyFactory.CreateRetryPolicy(logger, "CurrencyApiClient");
            });
        services.AddKeyedSingleton<IAsyncPolicy<HttpResponseMessage>>(
            "FrankfurterApiRetry",
            (sp, _) =>
            {
                var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("InEx.Resilience");
                return HttpResiliencePolicyFactory.CreateRetryPolicy(logger, "FrankfurterApiClient");
            });

        services.AddHttpClient<CurrencyApiClient>((serviceProvider, client) =>
        {
            var settings = serviceProvider.GetRequiredService<IOptions<CurrencyApiSettings>>().Value;
            if (string.IsNullOrEmpty(settings.BaseUrl))
                throw new InvalidOperationException("CurrencyAPI BaseUrl is not configured.");
            client.BaseAddress = new Uri(settings.BaseUrl);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.DefaultRequestHeaders.Add("apikey", settings.ApiKey);
            client.Timeout = Timeout.InfiniteTimeSpan; // Rely on Polly timeout policy
        })
        .AddPolicyHandler((sp, _) => sp.GetRequiredKeyedService<IAsyncPolicy<HttpResponseMessage>>("CurrencyApiRetry"))
        .AddPolicyHandler(HttpResiliencePolicyFactory.CreateTimeoutPolicy());

        services.AddHttpClient<FrankfurterApiClient>((serviceProvider, client) =>
        {
            var settings = serviceProvider.GetRequiredService<IOptions<FrankfurterApiSettings>>().Value;
            if (string.IsNullOrEmpty(settings.BaseUrl))
                throw new InvalidOperationException("Frankfurter API BaseUrl is not configured.");
            client.BaseAddress = new Uri(settings.BaseUrl);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.Timeout = Timeout.InfiniteTimeSpan; // Rely on Polly timeout policy
        })
        .AddPolicyHandler((sp, _) => sp.GetRequiredKeyedService<IAsyncPolicy<HttpResponseMessage>>("FrankfurterApiRetry"))
        .AddPolicyHandler(HttpResiliencePolicyFactory.CreateTimeoutPolicy());

        // Register ExchangeRateService with manual resolution of both clients
        services.AddScoped<IExchangeRateService>(serviceProvider =>
        {
            var uow = serviceProvider.GetRequiredService<IInExUnitOfWork>();
            var mapper = serviceProvider.GetRequiredService<IMapper>();
            var primaryClient = serviceProvider.GetRequiredService<CurrencyApiClient>();
            var fallbackClient = serviceProvider.GetRequiredService<FrankfurterApiClient>();
            var logger = serviceProvider.GetRequiredService<ILogger<ExchangeRateService>>();
            return new ExchangeRateService(uow, mapper, primaryClient, fallbackClient, logger);
        });

        return services;
    }
}