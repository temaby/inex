using inex.Application.ExchangeRates.Synchronization.Models;

namespace inex.Application.ExchangeRates.Synchronization.Interfaces;

public interface IHistoricalRateProvider
{
    Task<IReadOnlyCollection<ExchangeRateQuote>> GetHistoricalRatesAsync(
        IReadOnlyCollection<DateOnly> dates,
        string baseCurrencyCode,
        IReadOnlyCollection<string> quoteCurrencyCodes,
        CancellationToken cancellationToken);
}
