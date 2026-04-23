namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public interface IExchangeRateClient
{
    Task<ExchangeRateResponse?> GetRatesAsync(DateTime date, string baseCurrency, string[] targetCurrencies, CancellationToken ct = default);

    // Default: loop day-by-day. Frankfurter overrides with a single HTTP range call.
    async Task<Dictionary<DateTime, ExchangeRateResponse>> GetRatesForRangeAsync(
        DateTime start, DateTime end, string baseCurrency, string[] targetCurrencies, CancellationToken ct = default)
    {
        var result = new Dictionary<DateTime, ExchangeRateResponse>();
        for (var d = start.Date; d <= end.Date; d = d.AddDays(1))
        {
            var rates = await GetRatesAsync(d, baseCurrency, targetCurrencies, ct);
            if (rates is not null) result[d] = rates;
        }
        return result;
    }
}