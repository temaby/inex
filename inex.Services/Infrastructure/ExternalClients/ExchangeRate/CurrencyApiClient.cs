using System.Net.Http.Json;
using inex.Services.Models;
using Microsoft.Extensions.Configuration;

namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public class CurrencyApiClient : ICurrencyApiClient
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    public CurrencyApiClient(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _apiKey = config["ExchangeApiSettings:ApiKey"]
                  ?? throw new ArgumentNullException("ExchangeApiSettings:ApiKey is missing");
    }

    public async Task<CurrencyApiResponse?> GetRatesAsync(DateTime date, string baseCurrency, string[] targetCurrencies)
    {
        var codes = string.Join(",", targetCurrencies);
        var url = $"historical?date={date:yyyy-MM-dd}&base_currency={baseCurrency}&currencies={codes}&apikey={_apiKey}";

        return await _httpClient.GetFromJsonAsync<CurrencyApiResponse>(url);
    }
}