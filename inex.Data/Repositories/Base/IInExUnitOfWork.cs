using inex.Data.Models;

namespace inex.Data.Repositories.Base;

public interface IInExUnitOfWork : IUnitOfWork
{
    IRepository<Currency> CurrencyRepository { get; }
    IRepository<AppUser> UserRepository { get; }
    IEditableRepository<Category> CategoryRepository { get; }
    IEditableRepository<Budget> BudgetRepository { get; }
    IEditableRepository<Account> AccountRepository { get; }
    IEditableRepository<Tag> TagRepository { get; }
    IEditableRepository<Transaction> TransactionRepository { get; }
    IEditableRepository<ExchangeRate> ExchangeRateRepository { get; }
    IEditableRepository<BudgetCategory> BudgetCategoryRepository { get; }
}
