using inex.Data.Models;
using inex.Data.Repositories.Base;

namespace inex.Data.Repositories;

public sealed partial class InExUnitOfWork : UnitOfWork, IInExUnitOfWork
{
    #region Constructors

    public InExUnitOfWork(InExDbContext db)
    {
        _db = db;
    }

    #endregion Constructors

    #region Public Interface

    #region Properties

    public IRepository<Currency> CurrencyRepository => _currencyRepository ?? (_currencyRepository = new Repository<Currency>((InExDbContext)_db));
    public IEditableRepository<User> UserRepository => _userRepository ?? (_userRepository = new EditableRepository<User>((InExDbContext)_db));
    public IEditableRepository<Category> CategoryRepository => _categoryRepository ?? (_categoryRepository = new EditableRepository<Category>((InExDbContext)_db));
    public IEditableRepository<Budget> BudgetRepository => _budgetRepository ?? (_budgetRepository = new BudgetRepository((InExDbContext)_db));
    public IEditableRepository<Account> AccountRepository => _accountRepository ?? (_accountRepository = new EditableRepository<Account>((InExDbContext)_db));
    public IEditableRepository<Tag> TagRepository => _tagRepository ?? (_tagRepository = new EditableRepository<Tag>((InExDbContext)_db));
    public IEditableRepository<Transaction> TransactionRepository => _transactionRepository ?? (_transactionRepository = new TransactionRepository((InExDbContext)_db));
    public IEditableRepository<ExchangeRate> ExchangeRateRepository => _exchangeRateRepository ?? (_exchangeRateRepository = new EditableRepository<ExchangeRate>((InExDbContext)_db));
    public IEditableRepository<BudgetCategory> BudgetCategoryRepository => _budgetCategoryRepository ?? (_budgetCategoryRepository = new EditableRepository<BudgetCategory>((InExDbContext)_db));

    #endregion Properties

    public override void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                _currencyRepository?.Dispose();
                _userRepository?.Dispose();
                _categoryRepository?.Dispose();
                _budgetRepository?.Dispose();
                _accountRepository?.Dispose();
                _tagRepository?.Dispose();
                _transactionRepository?.Dispose();
                _exchangeRateRepository?.Dispose();
                _budgetCategoryRepository?.Dispose();
            }
            _disposed = true;
        }
    }

    #endregion Public Interface

    #region Private Fields

    private IRepository<Currency>? _currencyRepository;
    private IEditableRepository<User>? _userRepository;
    private IEditableRepository<Category>? _categoryRepository;
    private IEditableRepository<Budget>? _budgetRepository;
    private IEditableRepository<Account>? _accountRepository;
    private IEditableRepository<Tag>? _tagRepository;
    private IEditableRepository<Transaction>? _transactionRepository;
    private IEditableRepository<ExchangeRate>? _exchangeRateRepository;
    private IEditableRepository<BudgetCategory>? _budgetCategoryRepository;

    private bool _disposed = false;

    #endregion Private Fields
}
