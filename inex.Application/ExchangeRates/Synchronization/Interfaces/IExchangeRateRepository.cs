namespace inex.Application.ExchangeRates.Synchronization.Interfaces;

using inex.Domain.ExchangeRates;

public interface IExchangeRateRepository
{
    Task<IReadOnlyCollection<ExchangeRate>> GetExistingAsync(
        string baseCurrencyCode,
        IReadOnlyCollection<string> quoteCurrencyCodes,
        IReadOnlyCollection<DateOnly> dates,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<ExchangeRate>> GetLatestActualBeforeAsync(
        DateOnly beforeDate,
        string baseCurrencyCode,
        IReadOnlyCollection<string> quoteCurrencyCodes,
        CancellationToken cancellationToken);

    Task UpsertRangeAsync(
        IReadOnlyCollection<ExchangeRate> exchangeRates,
        CancellationToken cancellationToken);
}
