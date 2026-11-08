using System.Linq.Expressions;
using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Exceptions;
using inex.Services.Infrastructure.Time;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.ExchangeRate;
using inex.Services.Models.Records.Transaction;
using inex.Services.Services;
using inex.Services.Services.Base;
using inex.Services.Tests.Helpers;

namespace inex.Services.Tests.Services;

public class FamilyStatisticsTests
{
    private static readonly DateTime Today = new(2026, 11, 7);

    [Fact]
    public async Task CombinesActiveDirectFamilyAndKeepsCurrentBalanceForHistoricalMonth()
    {
        var fixture = new Fixture();
        fixture.Links.AddRange([
            new() { MasterUserId = 1, LinkedUserId = 3, Status = UserAccountLinkStatus.Active },
            new() { MasterUserId = 2, LinkedUserId = 4, Status = UserAccountLinkStatus.Active },
            new() { MasterUserId = 1, LinkedUserId = 5, Status = UserAccountLinkStatus.Pending },
            new() { MasterUserId = 1, LinkedUserId = 6, Status = UserAccountLinkStatus.Revoked },
            new() { MasterUserId = 7, LinkedUserId = 1, Status = UserAccountLinkStatus.Active }
        ]);
        fixture.Accounts[1] = [Account(10), Account(11, enabled: false)];
        fixture.Accounts[2] = [Account(20, "EUR")];
        fixture.Accounts[3] = [Account(30)];
        fixture.Categories[3] = [new() { Id = 9, Name = "Food" }];
        fixture.Transactions[1] = [Posting(10, 100m, new(2022, 10, 5)), Posting(10, 30m, Today), Posting(11, 999m, Today)];
        fixture.Transactions[2] = [Posting(20, -60m, new(2022, 10, 5))];
        fixture.Transactions[3] = [Posting(30, 10m, new(2022, 10, 5))];
        fixture.Rates.AddRange([Rate("EUR", 3m, new(2022, 10, 5)), Rate("EUR", 7m, new(2024, 5, 1)), Rate("EUR", 2m, Today)]);

        var report = await fixture.Service.GetFamilyStatistics(1, 2022, 10);

        Assert.Equal("USD", report.Currency);
        Assert.Equal(Today, report.BalanceDate);
        Assert.Equal([1, 2, 3], report.Participants.Select(participant => participant.UserId));
        Assert.Equal(110m, report.Totals.Income);
        Assert.Equal(20m, report.Totals.Expenses);
        Assert.Equal(90m, report.Totals.Surplus);
        Assert.Equal(110m, report.Totals.Balance);
        Assert.True(report.Totals.CashFlowComplete);
        fixture.AccountService.Verify(service => service.Get(It.Is<int>(id => id > 3), It.IsAny<ActivityMode>()), Times.Never);
        fixture.ExchangeRates.Verify(service => service.GetCached(1, new DateTime(2022, 10, 1), new DateTime(2022, 10, 31), "USD", It.IsAny<CancellationToken>()), Times.Once);
        fixture.ExchangeRates.Verify(service => service.GetCached(1, Today, Today, "USD", It.IsAny<CancellationToken>()), Times.Once);
        fixture.ExchangeRates.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task PreservesOwnerCategoryIdentityPathsAndSmallAmountsWithoutMerging()
    {
        var fixture = new Fixture();
        fixture.Categories[1] = [new() { Id = 8, Name = "Home" }, new() { Id = 9, ParentId = 8, Name = "Food", IsEnabled = false }];
        fixture.Categories[2] = [new() { Id = 8, Name = "Home" }, new() { Id = 9, ParentId = 8, Name = "Food" }];
        fixture.Transactions[1] = [Posting(10, -1.25m, Today)];
        fixture.Transactions[2] = [Posting(20, -2.50m, Today)];

        var report = await fixture.Service.GetFamilyStatistics(1);

        Assert.Equal(3.75m, report.Totals.Expenses);
        Assert.NotNull(report.ExpenseCategories);
        Assert.Equal(2, report.ExpenseCategories.Count);
        Assert.All(report.ExpenseCategories, category => Assert.Equal("Home / Food", category.Path));
        Assert.Equal([2, 1], report.ExpenseCategories.Select(category => category.UserId));
        Assert.All(report.ExpenseCategories, category => Assert.Equal(9, category.CategoryId));
    }

    [Fact]
    public async Task SystemTransfersAffectActualBalancesButNeverCashFlow()
    {
        var fixture = new Fixture();
        foreach (int owner in new[] { 1, 2 }) fixture.Categories[owner] = [new() { Id = 9, IsSystem = true, SystemCode = "internal-transfer", Name = "Transfer" }];
        fixture.Transactions[1] = [Posting(10, -50m, Today), Posting(10, -7m, Today), Posting(10, -3m, Today), Posting(10, 2m, Today)];
        fixture.Transactions[2] = [Posting(20, 50m, Today)];

        var report = await fixture.Service.GetFamilyStatistics(1);

        Assert.Equal(-8m, report.Totals.Balance);
        Assert.Equal(0m, report.Totals.Income);
        Assert.Equal(0m, report.Totals.Expenses);
        Assert.Empty(report.IncomeCategories!);
        Assert.Empty(report.ExpenseCategories!);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-2)]
    public async Task MissingOrNonpositiveMonthlyRateInvalidatesFlowIndependently(decimal rate)
    {
        var fixture = new Fixture();
        fixture.Accounts[2] = [Account(20, "EUR")];
        fixture.Transactions[1] = [Posting(10, 100m, new(2026, 10, 5))];
        fixture.Transactions[2] = [Posting(20, -30m, new(2026, 10, 5))];
        fixture.Rates.Add(Rate("EUR", 2m, Today));
        if (rate != 0) fixture.Rates.Add(Rate("EUR", rate, new(2026, 10, 5)));

        var report = await fixture.Service.GetFamilyStatistics(1, 2026, 10);

        Assert.Equal(85m, report.Totals.Balance);
        Assert.True(report.Totals.BalanceComplete);
        Assert.False(report.Totals.CashFlowComplete);
        Assert.Null(report.Totals.Income);
        Assert.Null(report.Totals.Expenses);
        Assert.Null(report.Totals.Surplus);
        Assert.Null(report.IncomeCategories);
        Assert.Null(report.ExpenseCategories);
        var missing = Assert.Single(report.MissingRates);
        Assert.Equal("cashFlow", missing.Scope);
        Assert.Equal(new DateTime(2026, 10, 5), missing.Date);
        Assert.Equal(100m, report.Participants[0].Totals.Income);
    }

    [Fact]
    public async Task MissingCurrentBalanceRateDoesNotInvalidateMonthlyCashFlowOrUseOtherCurrencyPair()
    {
        var fixture = new Fixture();
        fixture.Accounts[2] = [Account(20, "EUR")];
        fixture.Transactions[2] = [Posting(20, -30m, new(2026, 10, 5))];
        fixture.Rates.Add(Rate("EUR", 3m, new(2026, 10, 5)));
        fixture.Rates.Add(Rate("EUR", 5m, Today) with { CurrencyFrom = "GBP" });

        var report = await fixture.Service.GetFamilyStatistics(1, 2026, 10);

        Assert.Equal(10m, report.Totals.Expenses);
        Assert.True(report.Totals.CashFlowComplete);
        Assert.False(report.Totals.BalanceComplete);
        Assert.Null(report.Totals.Balance);
        Assert.Equal("balance", Assert.Single(report.MissingRates).Scope);
    }

    [Fact]
    public async Task CurrentMonthExcludesFuturePostingsAndRetainsDecimalPrecision()
    {
        var fixture = new Fixture();
        fixture.Accounts[2] = [Account(20, "EUR")];
        fixture.Transactions[1] = [Posting(10, 50m, Today.AddDays(1))];
        fixture.Transactions[2] = [Posting(20, -1m, Today), Posting(20, -1m, Today), Posting(20, -1m, Today)];
        fixture.Rates.Add(Rate("EUR", 3m, Today));

        var report = await fixture.Service.GetFamilyStatistics(1);

        Assert.Equal(0m, report.Totals.Income);
        Assert.Equal(1m, decimal.Round(report.Totals.Expenses.GetValueOrDefault(), 2));
        Assert.Equal(-1m, report.Totals.Balance);
        fixture.ExchangeRates.Verify(service => service.GetCached(1, new DateTime(2026, 11, 1), Today, "USD", It.IsAny<CancellationToken>()), Times.Once);
        fixture.ExchangeRates.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RechecksRevocationAndRejectsFamilyBeforeReadingFinancialSources()
    {
        var fixture = new Fixture();
        await fixture.Service.GetFamilyStatistics(1);
        fixture.AccountService.Invocations.Clear();
        fixture.ExchangeRates.Invocations.Clear();
        fixture.Links[0].Status = UserAccountLinkStatus.Revoked;

        await Assert.ThrowsAsync<ResourceNotFoundException>(() => fixture.Service.GetFamilyStatistics(1));
        fixture.AccountService.VerifyNoOtherCalls();
        fixture.ExchangeRates.VerifyNoOtherCalls();
        await Assert.ThrowsAsync<ResourceNotFoundException>(() => fixture.Service.GetFamilyStatistics(2));
    }

    [Theory]
    [InlineData(2026, 12)]
    [InlineData(1, 1)]
    [InlineData(2026, 0)]
    public async Task RejectsInvalidOrFuturePeriodsBeforeReadingFinancialSources(int year, int month)
    {
        var fixture = new Fixture();
        await Assert.ThrowsAsync<ValidationFailedException>(() => fixture.Service.GetFamilyStatistics(1, year, month));
        fixture.AccountService.VerifyNoOtherCalls();
        fixture.ExchangeRates.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task EmptyAccountsReturnCompleteZerosWithoutRates()
    {
        var fixture = new Fixture();
        fixture.Accounts.Clear();
        var report = await fixture.Service.GetFamilyStatistics(1);
        Assert.Equal(0m, report.Totals.Balance);
        Assert.Equal(0m, report.Totals.Surplus);
        Assert.Empty(report.MissingRates);
        Assert.True(report.Totals.BalanceComplete);
        Assert.True(report.Totals.CashFlowComplete);
    }

    private static AccountResponse Account(int id, string currency = "USD", bool enabled = true) => new()
    { Id = id, Currency = currency, IsEnabled = enabled, IsFavourite = false };

    private static TransactionResponse Posting(int accountId, decimal amount, DateTime date) => new()
    { AccountId = accountId, CategoryId = 9, Amount = amount, Created = date };

    private static ExchangeRateResponse Rate(string currency, decimal rate, DateTime date) => new()
    { CurrencyFrom = "USD", CurrencyTo = currency, Rate = rate, Date = date };

    private sealed class Fixture
    {
        public List<UserAccountLink> Links { get; } = [new() { MasterUserId = 1, LinkedUserId = 2, Status = UserAccountLinkStatus.Active }];
        public Dictionary<int, AccountResponse[]> Accounts { get; } = new() { [1] = [Account(10)], [2] = [Account(20)] };
        public Dictionary<int, CategoryResponse[]> Categories { get; } = new() { [1] = [new() { Id = 9, Name = "Food" }], [2] = [new() { Id = 9, Name = "Food" }] };
        public Dictionary<int, TransactionResponse[]> Transactions { get; } = new();
        public List<ExchangeRateResponse> Rates { get; } = [];
        public Mock<IAccountService> AccountService { get; } = new();
        public Mock<IExchangeRateService> ExchangeRates { get; } = new();
        public ReportService Service { get; }

        public Fixture()
        {
            var uow = new Mock<IInExUnitOfWork>();
            var links = new Mock<IRepository<UserAccountLink>>();
            links.Setup(repository => repository.Get(true, It.IsAny<Expression<Func<UserAccountLink, bool>>?>(), It.IsAny<Expression<Func<UserAccountLink, object>>[]>()))
                .Returns((bool _, Expression<Func<UserAccountLink, bool>>? predicate, Expression<Func<UserAccountLink, object>>[] _) =>
                    predicate is null ? Links.AsQueryable() : Links.AsQueryable().Where(predicate));
            uow.Setup(unit => unit.UserAccountLinkRepository).Returns(links.Object);
            var users = new[] { 1, 2, 3 }.Select(id => new AppUser { Id = id, UserName = $"user-{id}", Currency = new Currency { Key = id == 1 ? "USD" : "GBP" } }).ToArray();
            var userRepository = new Mock<IRepository<AppUser>>();
            userRepository.Setup(repository => repository.Get(true, It.IsAny<Expression<Func<AppUser, bool>>?>(), It.IsAny<Expression<Func<AppUser, object>>[]>()))
                .Returns((bool _, Expression<Func<AppUser, bool>>? predicate, Expression<Func<AppUser, object>>[] _) =>
                    predicate is null ? users.AsQueryable() : users.AsQueryable().Where(predicate));
            uow.Setup(unit => unit.UserRepository).Returns(userRepository.Object);
            AccountService.Setup(service => service.Get(It.IsAny<int>(), ActivityMode.ACTIVE))
                .Returns((int id, ActivityMode _) => new ListResponse<AccountResponse> { Data = Accounts.GetValueOrDefault(id, []) });
            var categories = new Mock<ICategoryService>();
            categories.Setup(service => service.Get(It.IsAny<int>(), ActivityMode.ALL))
                .Returns((int id, ActivityMode _) => new ListResponse<CategoryResponse> { Data = Categories.GetValueOrDefault(id, []) });
            var transactions = new Mock<ITransactionService>();
            transactions.Setup(service => service.Get(It.IsAny<int>(), ActivityMode.ALL, It.IsAny<IDictionary<string, string>>()))
                .Returns((int id, ActivityMode _, IDictionary<string, string> _) => new ListResponse<TransactionResponse> { Data = Transactions.GetValueOrDefault(id, []) });
            ExchangeRates.Setup(service => service.GetCached(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((int _, DateTime start, DateTime end, string _, CancellationToken _) =>
                    new ListResponse<ExchangeRateResponse> { Data = Rates.Where(rate => rate.Date.Date >= start.Date && rate.Date.Date <= end.Date).ToArray() });
            Service = new ReportService(uow.Object, AccountService.Object, categories.Object, transactions.Object, ExchangeRates.Object, new FakeClock(Today));
        }
    }
}
