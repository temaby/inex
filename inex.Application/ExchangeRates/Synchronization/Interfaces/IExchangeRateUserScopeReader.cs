namespace inex.Application.ExchangeRates.Synchronization.Interfaces;

using inex.Application.ExchangeRates.Synchronization.Models;

public interface IExchangeRateUserScopeReader
{
    Task<ExchangeRateUserScope> GetAsync(int userId, CancellationToken cancellationToken);
}
