using Microsoft.Extensions.DependencyInjection;
using inex.Data.Extensions;
using inex.Services.Services.Base;
using inex.Services.Services;
using Microsoft.Extensions.Configuration;
using inex.Services.Infrastructure.ExternalClients.ExchangeRate;
using Microsoft.Extensions.Options;
using AutoMapper;
using inex.Data.Repositories.Base;
using Polly;
using Polly.Extensions.Http;
using Microsoft.Extensions.Logging;

namespace inex.Services.Extensions;

public static class InExServicesExtensions
{
    public static IServiceCollection AddInExServices(this IServiceCollection services, IConfiguration config)
    {
        string inexConnectionString = config.GetConnectionString("InExConnection")
        ?? throw new InvalidOperationException("InExConnection connection string is not configured.");

        services.AddOptions<ExchangeApiSettings>().BindConfiguration(ExchangeApiSettings.SectionName).ValidateDataAnnotations().ValidateOnStart();
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

        // Register both currency API clients with resilience policies
        services.AddHttpClient<CurrencyApiClient>((serviceProvider, client) =>
        {
            var settings = serviceProvider.GetRequiredService<IOptions<ExchangeApiSettings>>().Value;
            if (string.IsNullOrEmpty(settings.BaseUrl))
                throw new InvalidOperationException("CurrencyAPI BaseUrl is not configured.");
            client.BaseAddress = new Uri(settings.BaseUrl);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.Timeout = TimeSpan.FromSeconds(30);
        })
        .AddPolicyHandler((services, request) => GetRetryPolicy(services, "CurrencyApiClient"))
        .AddPolicyHandler((services, request) => GetCircuitBreakerPolicy(services, "CurrencyApiClient"))
        .AddPolicyHandler(GetTimeoutPolicy());

        services.AddHttpClient<FrankfurterApiClient>((serviceProvider, client) =>
        {
            var settings = serviceProvider.GetRequiredService<IOptions<FrankfurterApiSettings>>().Value;
            if (string.IsNullOrEmpty(settings.BaseUrl))
                throw new InvalidOperationException("Frankfurter API BaseUrl is not configured.");
            client.BaseAddress = new Uri(settings.BaseUrl);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.Timeout = TimeSpan.FromSeconds(30);
        })
        .AddPolicyHandler((services, request) => GetRetryPolicy(services, "FrankfurterApiClient"))
        .AddPolicyHandler((services, request) => GetCircuitBreakerPolicy(services, "FrankfurterApiClient"))
        .AddPolicyHandler(GetTimeoutPolicy());

        // Register ExchangeRateService with manual resolution of both clients
        services.AddScoped<IExchangeRateService>(serviceProvider =>
        {
            var uow = serviceProvider.GetRequiredService<IInExUnitOfWork>();
            var mapper = serviceProvider.GetRequiredService<IMapper>();
            var primaryClient = serviceProvider.GetRequiredService<CurrencyApiClient>();
            var fallbackClient = serviceProvider.GetRequiredService<FrankfurterApiClient>();
            return new ExchangeRateService(uow, mapper, primaryClient, fallbackClient);
        });

        return services;
    }

    /// <summary>
    /// Creates a retry policy with exponential backoff for transient HTTP failures.
    /// Retries up to 3 times with delays of 2s, 4s, and 8s respectively.
    /// Handles 5xx errors, 408 Request Timeout, and 429 Too Many Requests.
    /// </summary>
    private static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy(IServiceProvider services, string clientName)
    {
        return HttpPolicyExtensions
            .HandleTransientHttpError() // Handles 5xx and 408
            .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.TooManyRequests) // 429
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                onRetry: (outcome, timespan, retryCount, context) =>
                {
                    var loggerFactory = services.GetRequiredService<ILoggerFactory>();
                    var logger = loggerFactory.CreateLogger("InEx.Resilience");
                    logger.LogWarning(
                        "Retry {RetryCount} for {ClientName} after {Delay}ms due to {Reason}. Status: {StatusCode}",
                        retryCount,
                        clientName,
                        timespan.TotalMilliseconds,
                        outcome.Exception?.Message ?? "HTTP error",
                        outcome.Result?.StatusCode.ToString() ?? "N/A"
                    );
                });
    }

    /// <summary>
    /// Creates a circuit breaker policy that opens after 5 consecutive failures.
    /// Circuit stays open for 30 seconds before attempting to close.
    /// Prevents overwhelming a failing service with requests.
    /// </summary>
    private static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy(IServiceProvider services, string clientName)
    {
        return HttpPolicyExtensions
            .HandleTransientHttpError()
            .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            .CircuitBreakerAsync(
                handledEventsAllowedBeforeBreaking: 5,
                durationOfBreak: TimeSpan.FromSeconds(30),
                onBreak: (outcome, duration) =>
                {
                    var loggerFactory = services.GetRequiredService<ILoggerFactory>();
                    var logger = loggerFactory.CreateLogger("InEx.Resilience");
                    logger.LogError(
                        "Circuit breaker opened for {ClientName} for {Duration}s due to {Reason}. Status: {StatusCode}",
                        clientName,
                        duration.TotalSeconds,
                        outcome.Exception?.Message ?? "HTTP error",
                        outcome.Result?.StatusCode.ToString() ?? "N/A"
                    );
                },
                onReset: () =>
                {
                    var loggerFactory = services.GetRequiredService<ILoggerFactory>();
                    var logger = loggerFactory.CreateLogger("InEx.Resilience");
                    logger.LogInformation("Circuit breaker reset for {ClientName}", clientName);
                },
                onHalfOpen: () =>
                {
                    var loggerFactory = services.GetRequiredService<ILoggerFactory>();
                    var logger = loggerFactory.CreateLogger("InEx.Resilience");
                    logger.LogInformation("Circuit breaker half-open for {ClientName}, testing service", clientName);
                });
    }

    /// <summary>
    /// Creates a timeout policy of 10 seconds per request.
    /// This is separate from the HttpClient timeout to allow for proper cancellation.
    /// </summary>
    private static IAsyncPolicy<HttpResponseMessage> GetTimeoutPolicy()
    {
        return Policy.TimeoutAsync<HttpResponseMessage>(TimeSpan.FromSeconds(10));
    }
}