using inex.Application.ExchangeRates.Synchronization.Interfaces;
using inex.Application.ExchangeRates.Synchronization.Models;
using inex.Data.Repositories.Base;
using Microsoft.EntityFrameworkCore;

namespace inex.Infrastructure.ExchangeRates.Synchronization;

public sealed class ExchangeRateUserScopeReader : IExchangeRateUserScopeReader
{
    private readonly IInExUnitOfWork _unitOfWork;

    public ExchangeRateUserScopeReader(IInExUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ExchangeRateUserScope> GetAsync(int userId, CancellationToken cancellationToken)
    {
        string? baseCurrencyCode = await _unitOfWork.UserRepository
            .Get(true, user => user.Id == userId, user => user.Currency)
            .Select(user => user.Currency.Key)
            .SingleOrDefaultAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(baseCurrencyCode))
        {
            throw new InvalidOperationException("The authenticated user does not have a base currency.");
        }

        List<string> quoteCurrencyCodes = await _unitOfWork.AccountRepository
            .Get(true, account => account.UserId == userId && account.IsEnabled, account => account.Currency)
            .Select(account => account.Currency.Key)
            .Where(currencyCode => currencyCode != baseCurrencyCode)
            .Distinct()
            .OrderBy(currencyCode => currencyCode)
            .ToListAsync(cancellationToken);

        return new ExchangeRateUserScope(baseCurrencyCode, quoteCurrencyCodes);
    }
}
