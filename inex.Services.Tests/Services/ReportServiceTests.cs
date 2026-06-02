using inex.Data.Repositories.Base;
using inex.Data.Models;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.ExchangeRate;
using inex.Services.Models.Records.Transaction;
using inex.Services.Infrastructure.Time;
using inex.Services.Tests.Helpers;
using inex.Services.Services;
using inex.Services.Services.Base;
using System.Linq.Expressions;

namespace inex.Services.Tests.Services;

public class ReportServiceTests
{
    private const int UserId = 42;
    private static readonly DateTime Start = new(2026, 5, 1);
    private static readonly DateTime End = new(2026, 5, 31);
    private static readonly DateTime ClockNow = new(2026, 5, 15, 10, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task GetCategoriesReportData_IncludesInactiveUserCategoriesAndExcludesUnknownCategories()
    {
        var inactiveCategory = Category(id: 10, name: "Old Groceries", isEnabled: false);
        var otherUserCategoryId = 999;

        var service = CreateService(
            categories: [inactiveCategory],
            accounts: [Account(id: 20, currency: "USD")],
            transactions:
            [
                Transaction(id: 1, accountId: 20, categoryId: inactiveCategory.Id, amount: -25m),
                Transaction(id: 2, accountId: 20, categoryId: otherUserCategoryId, amount: -100m)
            ],
            rates: []);

        var result = await service.GetCategoriesReportData(UserId, "USD", Filters());
        var rows = result.Data.ToList();

        Assert.Single(rows);
        Assert.Equal(inactiveCategory.Id, rows[0].Id);
        Assert.Equal(-25m, rows[0].Value);
        Assert.Equal(25m, result.Metadata.TotalOutcome);
    }

    [Fact]
    public async Task GetCategoriesReportData_PopulatesConvertedTotalsForNonSystemTransactions()
    {
        var expenseCategory = Category(id: 10, name: "Groceries");
        var incomeCategory = Category(id: 11, name: "Salary");
        var systemCategory = Category(id: 12, name: "Transfer", isSystem: true);

        var service = CreateService(
            categories: [expenseCategory, incomeCategory, systemCategory],
            accounts: [Account(id: 20, currency: "EUR")],
            transactions:
            [
                Transaction(id: 1, accountId: 20, categoryId: expenseCategory.Id, amount: -50m),
                Transaction(id: 2, accountId: 20, categoryId: incomeCategory.Id, amount: 100m),
                Transaction(id: 3, accountId: 20, categoryId: systemCategory.Id, amount: -200m)
            ],
            rates:
            [
                Rate(currencyTo: "EUR", rate: 2m, date: Start.AddDays(1)),
                Rate(currencyTo: "EUR", rate: 2m, date: Start.AddDays(2)),
                Rate(currencyTo: "EUR", rate: 2m, date: Start.AddDays(3))
            ]);

        var result = await service.GetCategoriesReportData(UserId, "USD", Filters());

        Assert.Equal(50m, result.Metadata.TotalIncome);
        Assert.Equal(25m, result.Metadata.TotalOutcome);
        Assert.DoesNotContain(result.Data, row => row.Id == systemCategory.Id);
    }

    [Fact]
    public async Task GetCategoriesReportData_UsesTranslationKeyForMetadataName()
    {
        var service = CreateService(
            categories: [Category(id: 10, name: "Groceries")],
            accounts: [Account(id: 20, currency: "USD")],
            transactions: [Transaction(id: 1, accountId: 20, categoryId: 10, amount: -25m)],
            rates: []);

        var result = await service.GetCategoriesReportData(UserId, "USD", Filters());

        Assert.Equal("reports.categoryReport", result.Metadata.Name);
        Assert.NotEqual("Расходы по категориям", result.Metadata.Name);
    }

    [Fact]
    public async Task GetSpendingHeatmap_ReturnsZeroFilledDailyRows()
    {
        var service = CreateService(
            categories: [Category(id: 10, name: "Groceries")],
            accounts: [Account(id: 20, currency: "USD")],
            transactions: [Transaction(id: 1, accountId: 20, categoryId: 10, amount: -25m)],
            rates: []);

        var result = await service.GetSpendingHeatmap(UserId, Start, Start.AddDays(2));
        var rows = result.Data.ToList();

        Assert.Equal(3, rows.Count);
        Assert.All(rows, row => Assert.Equal("USD", row.Currency));
        Assert.Equal(Start, result.Metadata.Start);
        Assert.Equal(Start.AddDays(2), result.Metadata.End);
        Assert.Equal(0m, rows[0].TotalSpend);
        Assert.Equal(25m, rows[1].TotalSpend);
        Assert.Equal(0m, rows[2].TotalSpend);
    }

    [Fact]
    public async Task GetSpendingHeatmap_AggregatesExpensesOnlyAndExcludesSystemTransfers()
    {
        var expenseCategory = Category(id: 10, name: "Groceries");
        var incomeCategory = Category(id: 11, name: "Salary");
        var systemCategory = Category(id: 12, name: "Transfer", isSystem: true);

        var service = CreateService(
            categories: [expenseCategory, incomeCategory, systemCategory],
            accounts: [Account(id: 20, currency: "USD")],
            transactions:
            [
                Transaction(id: 1, accountId: 20, categoryId: expenseCategory.Id, amount: -30m),
                Transaction(id: 2, accountId: 20, categoryId: expenseCategory.Id, amount: -20m, created: Start.AddDays(1)),
                Transaction(id: 3, accountId: 20, categoryId: incomeCategory.Id, amount: 100m, created: Start.AddDays(1)),
                Transaction(id: 4, accountId: 20, categoryId: systemCategory.Id, amount: -200m, created: Start.AddDays(1))
            ],
            rates: []);

        var result = await service.GetSpendingHeatmap(UserId, Start, Start.AddDays(1));
        var rows = result.Data.ToList();

        Assert.Equal(50m, rows.Single(row => row.Date == Start.AddDays(1)).TotalSpend);
    }

    [Fact]
    public async Task GetSpendingHeatmap_ConvertsMixedCurrenciesUsingHistoricalRates()
    {
        var expenseCategory = Category(id: 10, name: "Groceries");

        var service = CreateService(
            categories: [expenseCategory],
            accounts:
            [
                Account(id: 20, currency: "USD"),
                Account(id: 21, currency: "EUR")
            ],
            transactions:
            [
                Transaction(id: 1, accountId: 20, categoryId: expenseCategory.Id, amount: -30m),
                Transaction(id: 2, accountId: 21, categoryId: expenseCategory.Id, amount: -50m, created: Start.AddDays(1))
            ],
            rates:
            [
                Rate(currencyTo: "EUR", rate: 2m, date: Start.AddDays(1))
            ]);

        var result = await service.GetSpendingHeatmap(UserId, Start, Start.AddDays(1));
        var rows = result.Data.ToList();

        Assert.Equal(55m, rows.Single(row => row.Date == Start.AddDays(1)).TotalSpend);
    }

    [Fact]
    public async Task GetSpendingHeatmap_IncludesTransactionsOnEndDateAfterMidnight()
    {
        var expenseCategory = Category(id: 10, name: "Groceries");

        var service = CreateService(
            categories: [expenseCategory],
            accounts: [Account(id: 20, currency: "USD")],
            transactions:
            [
                Transaction(id: 1, accountId: 20, categoryId: expenseCategory.Id, amount: -15m, created: Start.AddDays(1).AddHours(18))
            ],
            rates: []);

        var result = await service.GetSpendingHeatmap(UserId, Start, Start.AddDays(1));
        var rows = result.Data.ToList();

        Assert.Equal(15m, rows.Single(row => row.Date == Start.AddDays(1)).TotalSpend);
    }

    [Fact]
    public async Task GetNetWorthHistory_UsesClockForCurrentMonthWindow()
    {
        var service = CreateService(
            categories: [],
            accounts: [Account(id: 20, currency: "USD")],
            transactions: [Transaction(id: 1, accountId: 20, categoryId: 10, amount: 100m, created: new DateTime(2026, 4, 10))],
            rates: [],
            clock: new FakeClock(ClockNow));

        var result = await service.GetNetWorthHistory(UserId, 2);
        var rows = result.Data.ToList();

        Assert.Equal(["2026-04", "2026-05"], rows.Select(row => row.Month));
        Assert.Equal(new DateTime(2026, 4, 30), rows[0].MonthEnd);
        Assert.Equal(new DateTime(2026, 5, 31), rows[1].MonthEnd);
    }

    [Fact]
    public async Task GetNetWorthHistory_IncludesInactiveAccountsWithHistoricalBalances()
    {
        var service = CreateService(
            categories: [],
            accounts: [Account(id: 20, currency: "USD", isEnabled: false)],
            transactions: [Transaction(id: 1, accountId: 20, categoryId: 10, amount: 125m, created: new DateTime(2026, 3, 12))],
            rates: [],
            clock: new FakeClock(ClockNow));

        var result = await service.GetNetWorthHistory(UserId, 3);
        var rows = result.Data.ToList();

        Assert.All(rows, row => Assert.Equal(125m, row.NetWorth));
    }

    [Fact]
    public async Task GetNetWorthHistory_ConvertsEachMonthUsingThatMonthEndRate()
    {
        var service = CreateService(
            categories: [],
            accounts:
            [
                Account(id: 20, currency: "USD"),
                Account(id: 21, currency: "EUR")
            ],
            transactions:
            [
                Transaction(id: 1, accountId: 20, categoryId: 10, amount: 100m, created: new DateTime(2026, 4, 10)),
                Transaction(id: 2, accountId: 21, categoryId: 10, amount: 120m, created: new DateTime(2026, 4, 10)),
                Transaction(id: 3, accountId: 21, categoryId: 10, amount: 60m, created: new DateTime(2026, 5, 10))
            ],
            rates:
            [
                Rate(currencyTo: "EUR", rate: 2m, date: new DateTime(2026, 4, 30)),
                Rate(currencyTo: "EUR", rate: 3m, date: new DateTime(2026, 5, 31))
            ],
            clock: new FakeClock(ClockNow));

        var result = await service.GetNetWorthHistory(UserId, 2);
        var rows = result.Data.ToList();

        Assert.Equal(160m, rows[0].NetWorth);
        Assert.Equal(160m, rows[1].NetWorth);
    }

    [Fact]
    public async Task GetNetWorthHistory_RequestsRatesForBynAndRubAccountsThroughExchangeRateService()
    {
        var exchangeRateService = new Mock<IExchangeRateService>();
        var service = CreateService(
            categories: [],
            accounts:
            [
                Account(id: 20, currency: "BYN"),
                Account(id: 21, currency: "RUB")
            ],
            transactions:
            [
                Transaction(id: 1, accountId: 20, categoryId: 10, amount: 100m, created: new DateTime(2026, 5, 10)),
                Transaction(id: 2, accountId: 21, categoryId: 10, amount: 200m, created: new DateTime(2026, 5, 10))
            ],
            rates:
            [
                Rate(currencyTo: "BYN", rate: 2m, date: new DateTime(2026, 5, 31)),
                Rate(currencyTo: "RUB", rate: 100m, date: new DateTime(2026, 5, 31))
            ],
            clock: new FakeClock(ClockNow),
            exchangeRateServiceOverride: exchangeRateService);

        await service.GetNetWorthHistory(UserId, 1);

        exchangeRateService.Verify(
            serviceMock => serviceMock.Get(
                UserId,
                new DateTime(2026, 5, 1),
                new DateTime(2026, 5, 31),
                "USD",
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    private static ReportService CreateService(
        IEnumerable<CategoryResponse> categories,
        IEnumerable<AccountResponse> accounts,
        IEnumerable<TransactionResponse> transactions,
        IEnumerable<ExchangeRateResponse> rates,
        IClock? clock = null,
        Mock<IExchangeRateService>? exchangeRateServiceOverride = null)
    {
        var uow = new Mock<IInExUnitOfWork>();
        var accountService = new Mock<IAccountService>();
        var categoryService = new Mock<ICategoryService>();
        var transactionService = new Mock<ITransactionService>();
        var exchangeRateService = exchangeRateServiceOverride ?? new Mock<IExchangeRateService>();
        var userRepository = new Mock<IRepository<AppUser>>();

        userRepository
            .Setup(repository => repository.Get(
                true,
                It.IsAny<Expression<Func<AppUser, bool>>?>(),
                It.IsAny<Expression<Func<AppUser, object>>[]>()))
            .Returns(new[]
            {
                new AppUser
                {
                    Id = UserId,
                    CurrencyId = 1,
                    Currency = new Currency { Id = 1, Key = "USD", Name = "US Dollar" }
                }
            }.AsQueryable());

        uow
            .Setup(unitOfWork => unitOfWork.UserRepository)
            .Returns(userRepository.Object);

        accountService
            .Setup(service => service.Get(UserId, ActivityMode.ALL))
            .Returns(new ListResponse<AccountResponse> { Data = accounts });

        categoryService
            .Setup(service => service.Get(UserId, ActivityMode.ALL))
            .Returns(new ListResponse<CategoryResponse> { Data = categories });

        transactionService
            .Setup(service => service.Get(UserId, ActivityMode.ALL, It.IsAny<IDictionary<string, string>>()))
            .Returns((int _, ActivityMode _, IDictionary<string, string> filters) =>
            {
                IEnumerable<TransactionResponse> filteredTransactions = transactions;
                if (filters.TryGetValue("start", out string? startValue) && DateTime.TryParse(startValue, out DateTime start))
                {
                    filteredTransactions = filteredTransactions.Where(transaction => transaction.Created >= start);
                }

                if (filters.TryGetValue("end", out string? endValue) && DateTime.TryParse(endValue, out DateTime end))
                {
                    filteredTransactions = filteredTransactions.Where(transaction => transaction.Created <= end);
                }

                return new ListResponse<TransactionResponse> { Data = filteredTransactions };
            });

        exchangeRateService
            .Setup(service => service.Get(UserId, Start, End, "USD", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ListResponse<ExchangeRateResponse> { Data = rates });

        exchangeRateService
            .Setup(service => service.Get(UserId, It.IsAny<DateTime>(), It.IsAny<DateTime>(), "USD", It.IsAny<CancellationToken>()))
            .ReturnsAsync((int _, DateTime rangeStart, DateTime rangeEnd, string _, CancellationToken _) =>
                new ListResponse<ExchangeRateResponse>
                {
                    Data = rates
                        .Where(rate => rate.Date.Date >= rangeStart.Date && rate.Date.Date <= rangeEnd.Date)
                        .ToList()
                });

        return new ReportService(
            uow.Object,
            accountService.Object,
            categoryService.Object,
            transactionService.Object,
            exchangeRateService.Object,
            clock ?? new FakeClock(ClockNow));
    }

    private static Dictionary<string, string> Filters() => new()
    {
        ["start"] = Start.ToString("yyyy-MM-dd"),
        ["end"] = End.ToString("yyyy-MM-dd")
    };

    private static CategoryResponse Category(int id, string name, bool isEnabled = true, bool isSystem = false) => new()
    {
        Id = id,
        Key = name.ToLowerInvariant().Replace(" ", "-"),
        Name = name,
        IsEnabled = isEnabled,
        IsSystem = isSystem
    };

    private static AccountResponse Account(int id, string currency, bool isEnabled = true) => new()
    {
        Id = id,
        Key = $"account-{id}",
        Name = $"Account {id}",
        Currency = currency,
        IsEnabled = isEnabled
    };

    private static TransactionResponse Transaction(int id, int accountId, int categoryId, decimal amount, DateTime? created = null) => new()
    {
        Id = id,
        AccountId = accountId,
        CategoryId = categoryId,
        Amount = amount,
        Created = created ?? Start.AddDays(id),
        AccountCurrency = "USD"
    };

    private static ExchangeRateResponse Rate(string currencyTo, decimal rate, DateTime? date = null) => new()
    {
        CurrencyFrom = "USD",
        CurrencyTo = currencyTo,
        Date = date ?? Start.AddDays(1),
        Rate = rate
    };
}
