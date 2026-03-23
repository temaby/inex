using System.Net.Http.Json;

namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public class FrankfurterApiClient : IExchangeRateClient
{
    private readonly HttpClient _httpClient;

    public FrankfurterApiClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<ExchangeRateResponse?> GetRatesAsync(DateTime date, string baseCurrency, string[] targetCurrencies)
    {
        var symbols = string.Join(",", targetCurrencies);
        var url = $"v1/{date:yyyy-MM-dd}?base={baseCurrency}&symbols={symbols}";

        var response = await _httpClient.GetFromJsonAsync<FrankfurterApiResponse>(url);

        if (response?.Rates is null || response.Rates.Count == 0)
        {
            return null;
        }

        // Convert Frankfurter response format to our standard CurrencyApiResponse format
        return new ExchangeRateResponse
        {
            Data = response.Rates.ToDictionary(
                kvp => kvp.Key,
                kvp => new ExchangeDateData { Code = kvp.Key, Value = kvp.Value }
            )
        };
    }

    // Frankfurter API specific response model
    private class FrankfurterApiResponse
    {
        public string Base { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public Dictionary<string, decimal> Rates { get; set; } = new();
    }
}
