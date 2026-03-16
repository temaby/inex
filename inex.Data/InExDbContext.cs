using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using inex.Data.Configurations;
using inex.Data.Models;

namespace inex.Data;

public class InExDbContext : DbContext
{
    public InExDbContext(DbContextOptions<InExDbContext> options) : base(options)
    {
    }

    public static readonly ILoggerFactory InExLoggerFactory = LoggerFactory.Create(builder => { builder.AddConsole(); });

    public DbSet<Account> Accounts { get; set; } = null!;
    public DbSet<Category> Categories { get; set; } = null!;
    public DbSet<Budget> Budgets { get; set; } = null!;
    public DbSet<BudgetCategory> BudgetCategories { get; set; } = null!;
    public DbSet<Currency> Currencies { get; set; } = null!;
    public DbSet<ExchangeRate> ExchangeRates { get; set; } = null!;
    public DbSet<Tag> Tags { get; set; } = null!;
    public DbSet<Transaction> Transactions { get; set; } = null!;
    public DbSet<TransactionTagMap> TransactionTagDetails { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.ApplyConfiguration(new AccountConfiguration());
        builder.ApplyConfiguration(new CategoryConfiguration());
        builder.ApplyConfiguration(new BudgetConfiguration());
        builder.ApplyConfiguration(new BudgetCategoryConfiguration());
        builder.ApplyConfiguration(new CurrencyConfiguration());
        builder.ApplyConfiguration(new ExchangeRateConfiguration());
        builder.ApplyConfiguration(new TagConfiguration());
        builder.ApplyConfiguration(new TransactionConfiguration());
        builder.ApplyConfiguration(new TransactionTagMapConfiguration());
        builder.ApplyConfiguration(new UserConfiguration());
    }
}
