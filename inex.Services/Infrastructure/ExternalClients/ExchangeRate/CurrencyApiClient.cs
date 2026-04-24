using System.Net.Http.Json;

namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public class CurrencyApiClient : IExchangeRateClient
{
    private readonly HttpClient _httpClient;

    public CurrencyApiClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<ExchangeRateResponse?> GetRatesAsync(DateTime date, string baseCurrency, string[] targetCurrencies, CancellationToken ct = default)
    {
        var codes = string.Join(",", targetCurrencies);
        var url = $"historical?date={date:yyyy-MM-dd}&base_currency={baseCurrency}&currencies={codes}";

        return await _httpClient.GetFromJsonAsync<ExchangeRateResponse>(url, ct);
    }

    // CurrencyAPI has no range endpoint — return empty so FrankfurterApiClient handles range fetches in one HTTP call.
    public Task<Dictionary<DateTime, ExchangeRateResponse>> GetRatesForRangeAsync(
        DateTime start, DateTime end, string baseCurrency, string[] targetCurrencies, CancellationToken ct = default)
        => Task.FromResult(new Dictionary<DateTime, ExchangeRateResponse>());
}