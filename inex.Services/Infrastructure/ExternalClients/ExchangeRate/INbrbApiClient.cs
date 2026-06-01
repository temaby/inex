namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public interface INbrbApiClient
{
    Task<Dictionary<DateTime, ExchangeRateResponse>> GetRatesForRangeAsync(
        DateTime start,
        DateTime end,
        string baseCurrency,
        string targetCurrency,
        CancellationToken ct = default);
}
