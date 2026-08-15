using System.Collections.Concurrent;
using inex.Application.ExchangeRates.Synchronization.Interfaces;

namespace inex.Infrastructure.ExchangeRates.Synchronization;

public sealed class ExchangeRateSynchronizationLock : IExchangeRateSynchronizationLock
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> Locks = new(StringComparer.Ordinal);

    public async Task<IDisposable> AcquireAsync(
        string baseCurrencyCode,
        IReadOnlyCollection<DateOnly> dates,
        CancellationToken cancellationToken)
    {
        List<string> keys = dates
            .Select(date => $"{baseCurrencyCode.ToUpperInvariant()}:{date:yyyy-MM-dd}")
            .Distinct(StringComparer.Ordinal)
            .OrderBy(key => key, StringComparer.Ordinal)
            .ToList();
        var acquiredLocks = new List<SemaphoreSlim>();

        try
        {
            foreach (string key in keys)
            {
                SemaphoreSlim synchronizationLock = Locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
                await synchronizationLock.WaitAsync(cancellationToken);
                acquiredLocks.Add(synchronizationLock);
            }
        }
        catch
        {
            Release(acquiredLocks);
            throw;
        }

        return new Releaser(acquiredLocks);
    }

    private static void Release(IEnumerable<SemaphoreSlim> synchronizationLocks)
    {
        foreach (SemaphoreSlim synchronizationLock in synchronizationLocks.Reverse())
        {
            synchronizationLock.Release();
        }
    }

    private sealed class Releaser : IDisposable
    {
        private List<SemaphoreSlim>? _locks;

        public Releaser(List<SemaphoreSlim> synchronizationLocks)
        {
            _locks = synchronizationLocks;
        }

        public void Dispose()
        {
            List<SemaphoreSlim>? synchronizationLocks = Interlocked.Exchange(ref _locks, null);
            if (synchronizationLocks is not null)
            {
                Release(synchronizationLocks);
            }
        }
    }
}
