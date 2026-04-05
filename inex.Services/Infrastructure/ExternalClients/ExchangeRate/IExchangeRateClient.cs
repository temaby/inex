namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public interface IExchangeRateClient
{
    Task<ExchangeRateResponse?> GetRatesAsync(DateTime date, string baseCurrency, string[] targetCurrencies, CancellationToken ct = default);
}