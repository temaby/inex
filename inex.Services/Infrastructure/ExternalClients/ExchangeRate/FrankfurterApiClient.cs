using System.Net.Http.Json;

namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public class FrankfurterApiClient : IExchangeRateClient
{
    private readonly HttpClient _httpClient;

    public FrankfurterApiClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<ExchangeRateResponse?> GetRatesAsync(DateTime date, string baseCurrency, string[] targetCurrencies, CancellationToken ct = default)
    {
        var symbols = string.Join(",", targetCurrencies);
        var url = $"v1/{date:yyyy-MM-dd}?base={baseCurrency}&symbols={symbols}";

        var response = await _httpClient.GetFromJsonAsync<FrankfurterApiResponse>(url, ct);

        if (response?.Rates is null || response.Rates.Count == 0)
        {
            return null;
        }

        // Convert Frankfurter response format to our standard ExchangeRateResponse format
        return new ExchangeRateResponse
        {
            Data = response.Rates.ToDictionary(
                kvp => kvp.Key,
                kvp => new ExchangeDateData { Code = kvp.Key, Value = kvp.Value }
            )
        };
    }

    public async Task<Dictionary<DateTime, ExchangeRateResponse>> GetRatesForRangeAsync(
        DateTime start, DateTime end, string baseCurrency, string[] targetCurrencies, CancellationToken ct = default)
    {
        var symbols = string.Join(",", targetCurrencies);
        var url = $"v1/{start:yyyy-MM-dd}..{end:yyyy-MM-dd}?base={baseCurrency}&symbols={symbols}";

        var response = await _httpClient.GetFromJsonAsync<FrankfurterRangeResponse>(url, ct);

        if (response?.Rates is null)
            return new Dictionary<DateTime, ExchangeRateResponse>();

        return response.Rates.ToDictionary(
            kvp => DateTime.Parse(kvp.Key),
            kvp => new ExchangeRateResponse
            {
                Data = kvp.Value.ToDictionary(
                    r => r.Key,
                    r => new ExchangeDateData { Code = r.Key, Value = r.Value })
            });
    }

    private class FrankfurterApiResponse
    {
        public string Base { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public Dictionary<string, decimal> Rates { get; set; } = new();
    }

    private class FrankfurterRangeResponse
    {
        public Dictionary<string, Dictionary<string, decimal>> Rates { get; set; } = new();
    }
}
