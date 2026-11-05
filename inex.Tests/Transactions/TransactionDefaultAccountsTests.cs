using System.Net.Http.Json;
using inex.Data;
using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Infrastructure.Time;
using inex.Services.Models.Records.Transaction;
using inex.Services.Services;
using inex.Services.Services.Base;
using inex.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace inex.Tests.Transactions;

[Collection(IntegrationTestCollection.Name)]
public class TransactionDefaultAccountsTests : IClassFixture<DefaultAccountsWebApplicationFactory>
{
    private readonly DefaultAccountsWebApplicationFactory _factory;
    public TransactionDefaultAccountsTests(DefaultAccountsWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task AnonymousRequestRequiresAuthentication()
    {
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await _factory.CreateClient().GetAsync("/api/transactions/default-accounts")).StatusCode);
    }

    [Fact]
    public async Task NoHistoryUsesOnlyTheSoleActiveOwnAccount()
    {
        var (client, userId) = await UserAsync();
        Assert.Equal(new TransactionDefaultAccountsResponse(), await GetAsync(client));
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
        var sole = Account(userId, "sole");
        db.Accounts.AddRange(sole, Account(userId, "disabled", false), Account(userId + 10000, "foreign"));
        await db.SaveChangesAsync();
        Assert.Equal(new TransactionDefaultAccountsResponse { ExpenseAccountId = sole.Id, IncomeAccountId = sole.Id }, await GetAsync(client));
        db.Accounts.Add(Account(userId, "second")); await db.SaveChangesAsync();
        Assert.Equal(new TransactionDefaultAccountsResponse(), await GetAsync(client));
    }

    [Fact]
    public async Task RankingIsOwnerScopedAndIgnoresListFiltersAndLinkedUserOverride()
    {
        var (owner, userId) = await UserAsync();
        var (other, otherId) = await UserAsync();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
        var expenses = Account(userId, "expenses"); var income = Account(userId, "income");
        var disabled = Account(userId, "disabled", false); var foreign = Account(otherId, "foreign");
        var ordinary = new Category { UserId = userId, Key = "ordinary", Name = "Ordinary", IsEnabled = true };
        var system = new Category { UserId = userId, Key = "system", Name = "System", IsSystem = true, IsEnabled = true };
        var foreignCategory = new Category { UserId = otherId, Key = "foreign", Name = "Foreign", IsEnabled = true };
        db.Accounts.AddRange(expenses, income, disabled, foreign);
        db.Categories.AddRange(ordinary, system, foreignCategory); await db.SaveChangesAsync();
        DateTime today = DefaultAccountsWebApplicationFactory.Today;
        void Add(Account account, Category category, int ownerId, decimal value, DateTime date) => db.Transactions.Add(new Transaction
        {
            UserId = ownerId, AccountId = account.Id, CategoryId = category.Id, Value = value, Created = date,
        });
        Add(expenses, ordinary, userId, -1, today.AddDays(-29));
        Add(expenses, ordinary, userId, -1, today.AddHours(23));
        Add(income, ordinary, userId, -9999, today);
        Add(income, ordinary, userId, 1, today);
        Add(income, ordinary, userId, 1, today.AddDays(-1));
        Add(expenses, ordinary, userId, 9999, today);
        for (int i = 0; i < 5; i++)
        {
            Add(income, system, userId, -1, today);
            Add(income, ordinary, userId, -1, today.AddDays(1));
            Add(income, ordinary, userId, -1, today.AddDays(-30));
            Add(income, ordinary, otherId, -1, today);
            Add(disabled, ordinary, userId, -1, today);
            Add(foreign, ordinary, userId, -1, today);
            Add(income, foreignCategory, userId, -1, today);
        }
        Add(foreign, foreignCategory, otherId, -1, today);
        await db.SaveChangesAsync();

        var expected = new TransactionDefaultAccountsResponse { ExpenseAccountId = expenses.Id, IncomeAccountId = income.Id };
        Assert.Equal(expected, await GetAsync(owner));
        Assert.Equal(expected, await owner.GetFromJsonAsync<TransactionDefaultAccountsResponse>(
            $"/api/transactions/default-accounts?linkedUserId={otherId}&userId={otherId}&accountId={foreign.Id}&type=transfer&startDate=2000-01-01"));
        var others = await GetAsync(other);
        Assert.Equal(foreign.Id, others.ExpenseAccountId);
        Assert.Equal(foreign.Id, others.IncomeAccountId);

        // Changes and deletions are reflected by the next recommendation query.
        expenses.IsEnabled = false; await db.SaveChangesAsync();
        Assert.Equal(income.Id, (await GetAsync(owner)).ExpenseAccountId);
        db.Transactions.RemoveRange(db.Transactions.Where(item => item.UserId == userId && item.CategoryId == ordinary.Id));
        await db.SaveChangesAsync();
        Assert.Equal(income.Id, (await GetAsync(owner)).IncomeAccountId);
    }

    private static Account Account(int userId, string key, bool enabled = true) => new()
    {
        UserId = userId, CurrencyId = 1, Key = key, Name = key, IsEnabled = enabled,
    };

    private async Task<(HttpClient Client, int UserId)> UserAsync()
    {
        string name = "defaults-" + Guid.NewGuid().ToString("N");
        var client = await _factory.CreateAuthenticatedClientAsync(name + "@example.test", name);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
        int id = db.Users.Single(user => user.UserName == name).Id;
        // Registration seeds a starter account; each scenario owns its account set.
        db.Accounts.RemoveRange(db.Accounts.Where(account => account.UserId == id));
        await db.SaveChangesAsync();
        return (client, id);
    }

    private static async Task<TransactionDefaultAccountsResponse> GetAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<TransactionDefaultAccountsResponse>("/api/transactions/default-accounts"))!;
}

public class DefaultAccountsWebApplicationFactory : InExWebApplicationFactory
{
    public static readonly DateTime Today = new(2026, 11, 5, 0, 0, 0, DateTimeKind.Utc);
    private sealed class Clock : IClock { public DateTime UtcNow => Today.AddHours(12); }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<ITransactionService>();
            services.AddScoped<ITransactionService>(provider => new TransactionService(
                provider.GetRequiredService<IInExUnitOfWork>(), new Clock()));
        });
    }
}
