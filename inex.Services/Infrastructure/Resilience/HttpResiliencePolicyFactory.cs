using Microsoft.Extensions.Logging;
using Polly;
using Polly.Extensions.Http;
using Polly.Timeout;

namespace inex.Services.Infrastructure.Resilience;

public sealed record HttpResiliencePolicyOptions(
    int RetryCount,
    Func<int, TimeSpan> RetryDelayProvider,
    TimeSpan TimeoutPerAttempt
)
{
    public static HttpResiliencePolicyOptions Default { get; } = new(
        RetryCount: 3,
        RetryDelayProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
        TimeoutPerAttempt: TimeSpan.FromSeconds(10)
    );
}

public static class HttpResiliencePolicyFactory
{
    public static IAsyncPolicy<HttpResponseMessage> CreateRetryPolicy(
        ILogger logger,
        string clientName,
        HttpResiliencePolicyOptions? options = null)
    {
        options ??= HttpResiliencePolicyOptions.Default;

        return HttpPolicyExtensions
            .HandleTransientHttpError() // Handles 5xx and 408
            .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.TooManyRequests) // 429
            .Or<TimeoutRejectedException>() // Polly timeout
            .WaitAndRetryAsync(
                retryCount: options.RetryCount,
                sleepDurationProvider: options.RetryDelayProvider,
                onRetry: (outcome, timespan, retryCount, _) =>
                {
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

    public static IAsyncPolicy<HttpResponseMessage> CreateTimeoutPolicy(HttpResiliencePolicyOptions? options = null)
    {
        options ??= HttpResiliencePolicyOptions.Default;
        return Policy.TimeoutAsync<HttpResponseMessage>(options.TimeoutPerAttempt);
    }
}