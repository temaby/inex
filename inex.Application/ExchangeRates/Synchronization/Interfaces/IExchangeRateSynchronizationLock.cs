namespace inex.Application.ExchangeRates.Synchronization.Interfaces;

/// <summary>Coordinates exchange-rate cache writes across all synchronization entry points in a process.</summary>
public interface IExchangeRateSynchronizationLock
{
    Task<IDisposable> AcquireAsync(
        string baseCurrencyCode,
        IReadOnlyCollection<DateOnly> dates,
        CancellationToken cancellationToken);
}
