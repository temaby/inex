namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public interface ICurrencyApiClient
{
    Task<CurrencyApiResponse?> GetRatesAsync(DateTime date, string baseCurrency, string[] targetCurrencies);
}