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
}