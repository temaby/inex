using inex.Data.Repositories.Base;
using inex.Data.Models;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.ExchangeRate;
using inex.Services.Models.Records.Report;
using inex.Services.Models.Records.Transaction;
using inex.Services.Infrastructure.Time;
using inex.Services.Exceptions;
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
    public async Task GetMonthlyFinancialReport_CalculatesTotalsBalancesAndExcludesTransfers()
    {
        var incomeCategory = Category(id: 10, name: "Salary");
        var expenseCategory = Category(id: 11, name: "Groceries");
        var transferCategory = Category(id: 12, name: "Transfer", isSystem: true);
        var service = CreateService(
            categories: [incomeCategory, expenseCategory, transferCategory],
            accounts: [Account(id: 20, currency: "USD"), Account(id: 21, currency: "USD")],
            transactions:
            [
                Transaction(id: 1, accountId: 20, categoryId: incomeCategory.Id, amount: 50m, created: Start.AddDays(-1)),
                Transaction(id: 2, accountId: 20, categoryId: incomeCategory.Id, amount: 300m, created: Start.AddDays(1)),
                Transaction(id: 3, accountId: 20, categoryId: expenseCategory.Id, amount: -70m, created: Start.AddDays(2)),
                Transaction(id: 4, accountId: 20, categoryId: transferCategory.Id, amount: -100m, created: Start.AddDays(3)),
                Transaction(id: 5, accountId: 21, categoryId: transferCategory.Id, amount: 100m, created: Start.AddDays(3)),
                Transaction(id: 6, accountId: 20, categoryId: expenseCategory.Id, amount: -999m, created: End.AddDays(1))
            ],
            rates: []);

        MonthlyFinancialReport report = await service.GetMonthlyFinancialReport(UserId, 2026, 5);

        Assert.Equal("USD", report.Currency);
        Assert.Equal(300m, report.TotalIncome);
        Assert.Equal(70m, report.TotalExpenses);
        Assert.Equal(230m, report.SurplusOrDeficit);
        Assert.Equal(50m, report.OpeningBalance);
        Assert.Equal(280m, report.ClosingBalance);
        Assert.Equal(70m / 300m * 100m, report.SpentIncomePercentage);
        Assert.Single(report.IncomeCategories);
        Assert.Equal("Salary", report.IncomeCategories[0].Name);
        Assert.Single(report.ExpenseCategories);
        Assert.Equal("Groceries", report.ExpenseCategories[0].Name);
        Assert.DoesNotContain(typeof(MonthlyFinancialReport).GetProperties(), property => property.Name.Contains("Transaction", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GetMonthlyFinancialReport_UsesFullCategoryPathsAndGroupsOnlySubThresholdTotals()
    {
        var incomeParent = Category(id: 10, name: "Income");
        var salary = Category(id: 11, name: "Salary", parentId: incomeParent.Id);
        var dividends = Category(id: 12, name: "Dividends", parentId: incomeParent.Id);
        var transport = Category(id: 20, name: "Transport");
        var maintenance = Category(id: 21, name: "Maintenance", parentId: transport.Id);
        var tolls = Category(id: 22, name: "Tolls", parentId: transport.Id);
        var groceries = Category(id: 23, name: "Groceries");
        var service = CreateService(
            categories: [incomeParent, salary, dividends, transport, maintenance, tolls, groceries],
            accounts: [Account(id: 30, currency: "USD")],
            transactions:
            [
                Transaction(id: 1, accountId: 30, categoryId: salary.Id, amount: 100m),
                Transaction(id: 2, accountId: 30, categoryId: dividends.Id, amount: 9.99m),
                Transaction(id: 3, accountId: 30, categoryId: maintenance.Id, amount: -10m),
                Transaction(id: 4, accountId: 30, categoryId: tolls.Id, amount: -9.99m),
                Transaction(id: 5, accountId: 30, categoryId: groceries.Id, amount: -4m)
            ],
            rates: []);

        MonthlyFinancialReport report = await service.GetMonthlyFinancialReport(UserId, 2026, 5);

        Assert.Collection(
            report.IncomeCategories,
            category => Assert.Equal(new MonthlyReportCategory("Income / Salary", 100m), category),
            category => Assert.Equal(new MonthlyReportCategory("Other", 9.99m), category));
        Assert.Collection(
            report.ExpenseCategories,
            category => Assert.Equal(new MonthlyReportCategory("Transport / Maintenance", 10m), category),
            category => Assert.Equal(new MonthlyReportCategory("Other", 13.99m), category));
        Assert.DoesNotContain(report.IncomeCategories, category => category.Name == "Income / Dividends");
        Assert.DoesNotContain(report.ExpenseCategories, category => category.Name is "Transport / Tolls" or "Groceries");
    }

    [Fact]
    public async Task GetMonthlyFinancialReport_KeepsAScopedOtherBucketDistinctFromAnExistingCategory()
    {
        var other = Category(id: 10, name: "Other");
        var groceries = Category(id: 11, name: "Groceries");
        var service = CreateService(
            categories: [other, groceries],
            accounts: [Account(id: 20, currency: "USD")],
            transactions:
            [
                Transaction(id: 1, accountId: 20, categoryId: other.Id, amount: -10m),
                Transaction(id: 2, accountId: 20, categoryId: groceries.Id, amount: -1m)
            ],
            rates: []);

        MonthlyFinancialReport report = await service.GetMonthlyFinancialReport(UserId, 2026, 5);

        Assert.Collection(
            report.ExpenseCategories,
            category => Assert.Equal(new MonthlyReportCategory("Other", 10m), category),
            category => Assert.Equal(new MonthlyReportCategory("Other (small categories)", 1m), category));
    }

    [Fact]
    public async Task GetMonthlyFinancialReport_UsesUnavailableSpentIncomeWhenIncomeIsZero()
    {
        var expenseCategory = Category(id: 10, name: "Utilities");
        var service = CreateService(
            categories: [expenseCategory],
            accounts: [Account(id: 20, currency: "USD")],
            transactions: [Transaction(id: 1, accountId: 20, categoryId: expenseCategory.Id, amount: -45m)],
            rates: []);

        MonthlyFinancialReport report = await service.GetMonthlyFinancialReport(UserId, 2026, 5);

        Assert.Equal(0m, report.TotalIncome);
        Assert.Equal(45m, report.TotalExpenses);
        Assert.Null(report.SpentIncomePercentage);
    }

    [Fact]
    public async Task GetMonthlyFinancialReport_UsesTodayRateForCurrentMonthClosingBalance()
    {
        var service = CreateService(
            categories: [Category(id: 10, name: "Salary")],
            accounts: [Account(id: 20, currency: "EUR")],
            transactions: [Transaction(id: 1, accountId: 20, categoryId: 10, amount: 120m, created: ClockNow.Date.AddDays(-2))],
            rates:
            [
                Rate(currencyTo: "EUR", rate: 2m, date: ClockNow.Date.AddDays(-2)),
                Rate(currencyTo: "EUR", rate: 2m, date: ClockNow.Date)
            ],
            clock: new FakeClock(ClockNow));

        MonthlyFinancialReport report = await service.GetMonthlyFinancialReport(UserId, ClockNow.Year, ClockNow.Month);

        Assert.Equal(60m, report.TotalIncome);
        Assert.Equal(60m, report.ClosingBalance);
    }

    [Fact]
    public async Task GetMonthlyFinancialReport_ThrowsWhenAnActiveForeignCurrencyRateIsUnavailable()
    {
        var service = CreateService(
            categories: [Category(id: 10, name: "Salary")],
            accounts: [Account(id: 20, currency: "EUR")],
            transactions: [Transaction(id: 1, accountId: 20, categoryId: 10, amount: 120m)],
            rates: []);

        await Assert.ThrowsAsync<ValidationFailedException>(() => service.GetMonthlyFinancialReport(UserId, 2026, 5));
    }

    [Fact]
    public async Task GetMonthlyFinancialReport_RejectsFutureMonthsBeforeCalculatingTheMonthEnd()
    {
        var service = CreateService(categories: [], accounts: [], transactions: [], rates: [], clock: new FakeClock(ClockNow));

        await Assert.ThrowsAsync<ValidationFailedException>(() => service.GetMonthlyFinancialReport(UserId, 9998, 12));
    }

    [Fact]
    public async Task GetMonthlyFinancialReport_UsesTheRequestedUserIdForEveryDataSource()
    {
        const int requestedUserId = 77;
        var uow = new Mock<IInExUnitOfWork>();
        var accountService = new Mock<IAccountService>();
        var categoryService = new Mock<ICategoryService>();
        var transactionService = new Mock<ITransactionService>();
        var exchangeRateService = new Mock<IExchangeRateService>();
        var userRepository = new Mock<IRepository<AppUser>>();

        userRepository.Setup(repository => repository.Get(
                true,
                It.IsAny<Expression<Func<AppUser, bool>>?>(),
                It.IsAny<Expression<Func<AppUser, object>>[]>()))
            .Returns(new[]
            {
                new AppUser { Id = requestedUserId, Currency = new Currency { Key = "USD", Name = "US Dollar" } }
            }.AsQueryable());
        uow.Setup(unitOfWork => unitOfWork.UserRepository).Returns(userRepository.Object);
        accountService.Setup(service => service.Get(requestedUserId, ActivityMode.ACTIVE))
            .Returns(new ListResponse<AccountResponse> { Data = [] });
        categoryService.Setup(service => service.Get(requestedUserId, ActivityMode.ALL))
            .Returns(new ListResponse<CategoryResponse> { Data = [] });
        transactionService.Setup(service => service.Get(requestedUserId, ActivityMode.ALL, It.IsAny<IDictionary<string, string>>()))
            .Returns(new ListResponse<TransactionResponse> { Data = [] });
        exchangeRateService.Setup(service => service.Get(requestedUserId, It.IsAny<DateTime>(), It.IsAny<DateTime>(), "USD", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ListResponse<ExchangeRateResponse> { Data = [] });

        var service = new ReportService(
            uow.Object,
            accountService.Object,
            categoryService.Object,
            transactionService.Object,
            exchangeRateService.Object,
            new FakeClock(ClockNow));

        await service.GetMonthlyFinancialReport(requestedUserId, 2026, 5);

        accountService.Verify(service => service.Get(requestedUserId, ActivityMode.ACTIVE), Times.Once);
        categoryService.Verify(service => service.Get(requestedUserId, ActivityMode.ALL), Times.Once);
        transactionService.Verify(service => service.Get(requestedUserId, ActivityMode.ALL, It.IsAny<IDictionary<string, string>>()), Times.Once);
        exchangeRateService.Verify(service => service.Get(requestedUserId, It.IsAny<DateTime>(), It.IsAny<DateTime>(), "USD", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetMonthlyFinancialReportPdf_ExcludesInactiveByrHistoricalBalanceAndRetainsInactiveCategory()
    {
        var inactiveCategory = Category(id: 10, name: "Salary", isEnabled: false);
        var service = CreateService(
            categories: [inactiveCategory],
            accounts:
            [
                Account(id: 20, currency: "USD"),
                Account(id: 21, currency: "BYR", isEnabled: false)
            ],
            transactions:
            [
                Transaction(id: 1, accountId: 21, categoryId: 10, amount: 500m, created: new DateTime(2026, 4, 15)),
                Transaction(id: 2, accountId: 20, categoryId: 10, amount: 500m)
            ],
            rates: []);

        MonthlyFinancialReport report = await service.GetMonthlyFinancialReport(UserId, 2026, 5);
        byte[] pdf = await service.GetMonthlyFinancialReportPdf(UserId, 2026, 5);

        Assert.Equal(500m, report.TotalIncome);
        Assert.Equal(0m, report.OpeningBalance);
        Assert.Equal(500m, report.ClosingBalance);
        Assert.Single(report.IncomeCategories);
        Assert.Equal(inactiveCategory.Name, report.IncomeCategories[0].Name);
        Assert.True(pdf.Length > 4);
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(pdf, 0, 4));
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
    public async Task GetNetWorthHistory_ConvertsEachMonthUsingAvailableReportDate()
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
                Rate(currencyTo: "EUR", rate: 3m, date: ClockNow.Date)
            ],
            clock: new FakeClock(ClockNow));

        var result = await service.GetNetWorthHistory(UserId, 2);
        var rows = result.Data.ToList();

        Assert.Equal(160m, rows[0].NetWorth);
        Assert.Equal(160m, rows[1].NetWorth);
    }

    [Fact]
    public async Task GetNetWorthHistory_ConvertsCurrentMonthUsingTodayRate()
    {
        var service = CreateService(
            categories: [],
            accounts: [Account(id: 20, currency: "EUR")],
            transactions: [Transaction(id: 1, accountId: 20, categoryId: 10, amount: 120m, created: new DateTime(2026, 5, 10))],
            rates:
            [
                Rate(currencyTo: "EUR", rate: 3m, date: ClockNow.Date)
            ],
            clock: new FakeClock(ClockNow));

        var result = await service.GetNetWorthHistory(UserId, 1);
        var row = Assert.Single(result.Data);

        Assert.Equal("2026-05", row.Month);
        Assert.Equal(new DateTime(2026, 5, 31), row.MonthEnd);
        Assert.Equal(40m, row.NetWorth);
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

    [Fact]
    public async Task GetNetWorthHistory_ReturnsZeroRowsForEmptyHistory()
    {
        var service = CreateService(
            categories: [],
            accounts: [],
            transactions: [],
            rates: [],
            clock: new FakeClock(ClockNow));

        var result = await service.GetNetWorthHistory(UserId, 2);
        var rows = result.Data.ToList();

        Assert.Equal(["2026-04", "2026-05"], rows.Select(row => row.Month));
        Assert.All(rows, row =>
        {
            Assert.Equal(0m, row.NetWorth);
            Assert.Equal("USD", row.Currency);
        });
    }

    [Fact]
    public async Task GetNetWorthHistory_UsesBaseCurrencyWhenAccountCurrencyIsMissing()
    {
        var service = CreateService(
            categories: [],
            accounts: [Account(id: 20, currency: "")],
            transactions: [Transaction(id: 1, accountId: 20, categoryId: 10, amount: 75m, created: new DateTime(2026, 5, 10))],
            rates: [],
            clock: new FakeClock(ClockNow));

        var result = await service.GetNetWorthHistory(UserId, 1);
        var row = Assert.Single(result.Data);

        Assert.Equal(75m, row.NetWorth);
        Assert.Equal("USD", row.Currency);
    }

    [Fact]
    public async Task GetNetWorthHistory_SkipsBalancesWhenConversionRateIsMissing()
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
                Transaction(id: 1, accountId: 20, categoryId: 10, amount: 100m, created: new DateTime(2026, 5, 10)),
                Transaction(id: 2, accountId: 21, categoryId: 10, amount: 60m, created: new DateTime(2026, 5, 10))
            ],
            rates: [],
            clock: new FakeClock(ClockNow));

        var result = await service.GetNetWorthHistory(UserId, 1);
        var row = Assert.Single(result.Data);

        Assert.Equal(100m, row.NetWorth);
    }

    [Fact]
    public async Task GetNetWorthHistory_SkipsBalancesWhenConversionRateIsZero()
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
                Transaction(id: 1, accountId: 20, categoryId: 10, amount: 100m, created: new DateTime(2026, 5, 10)),
                Transaction(id: 2, accountId: 21, categoryId: 10, amount: 60m, created: new DateTime(2026, 5, 10))
            ],
            rates:
            [
                Rate(currencyTo: "EUR", rate: 0m, date: ClockNow.Date)
            ],
            clock: new FakeClock(ClockNow));

        var result = await service.GetNetWorthHistory(UserId, 1);
        var row = Assert.Single(result.Data);

        Assert.Equal(100m, row.NetWorth);
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

        accountService
            .Setup(service => service.Get(UserId, ActivityMode.ACTIVE))
            .Returns(new ListResponse<AccountResponse> { Data = accounts.Where(account => account.IsEnabled) });

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

    private static CategoryResponse Category(int id, string name, bool isEnabled = true, bool isSystem = false, int? parentId = null) => new()
    {
        Id = id,
        ParentId = parentId,
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
