using inex.Data.Repositories.Base;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Budget;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.ExchangeRate;
using inex.Services.Models.Records.Transaction;
using inex.Services.Services;
using inex.Services.Services.Base;

namespace inex.Services.Tests.Services;

public class BudgetReportServiceTests
{
    private const int UserId = 42;

    [Fact]
    public async Task GetBudgetComparison_IncludesDescendantCategorySpendForParentBudget()
    {
        var service = CreateService(
            budgets:
            [
                Budget(id: 1, name: "Food plan", value: 400m, categoryIds: [1])
            ],
            categories:
            [
                Category(id: 1, name: "Food"),
                Category(id: 2, name: "Groceries", parentId: 1),
                Category(id: 3, name: "Market", parentId: 2),
                Category(id: 4, name: "Travel")
            ],
            transactions:
            [
                Transaction(id: 1, accountId: 10, categoryId: 2, amount: -125m),
                Transaction(id: 2, accountId: 10, categoryId: 3, amount: -75m),
                Transaction(id: 3, accountId: 10, categoryId: 4, amount: -900m)
            ]);

        var result = await service.GetBudgetComparison(UserId, 2026, 6, "PLN");
        var row = Assert.Single(result.Data);

        Assert.Equal(200m, row.SpentAmount);
        Assert.Equal(200m, row.RemainingAmount);
        Assert.Equal(50m, row.PercentageUsed);
        Assert.Equal([1], row.CategoryIds);
    }

    [Fact]
    public async Task GetBudgetComparison_DoesNotDoubleCountDescendantSpendWhenBudgetIncludesParentAndChild()
    {
        var service = CreateService(
            budgets:
            [
                Budget(id: 1, name: "Food plan", value: 400m, categoryIds: [1, 2])
            ],
            categories:
            [
                Category(id: 1, name: "Food"),
                Category(id: 2, name: "Groceries", parentId: 1)
            ],
            transactions:
            [
                Transaction(id: 1, accountId: 10, categoryId: 2, amount: -125m)
            ]);

        var result = await service.GetBudgetComparison(UserId, 2026, 6, "PLN");
        var row = Assert.Single(result.Data);

        Assert.Equal(125m, row.SpentAmount);
        Assert.Equal(275m, row.RemainingAmount);
        Assert.Equal(31.25m, row.PercentageUsed);
        Assert.Equal([1, 2], row.CategoryIds);
    }

    private static BudgetReportService CreateService(
        IEnumerable<BudgetResponse> budgets,
        IEnumerable<CategoryResponse> categories,
        IEnumerable<TransactionResponse> transactions)
    {
        var uow = new Mock<IInExUnitOfWork>();
        var budgetService = new Mock<IBudgetService>();
        var transactionService = new Mock<ITransactionService>();
        var exchangeRateService = new Mock<IExchangeRateService>();
        var accountService = new Mock<IAccountService>();
        var categoryService = new Mock<ICategoryService>();

        budgetService
            .Setup(service => service.Get(UserId, 2026, 6))
            .Returns(new ListResponse<BudgetResponse> { Data = budgets });

        transactionService
            .Setup(service => service.Get(UserId, ActivityMode.ALL, It.IsAny<IDictionary<string, string>>()))
            .Returns(new ListResponse<TransactionResponse> { Data = transactions });

        exchangeRateService
            .Setup(service => service.Get(UserId, It.IsAny<DateTime>(), It.IsAny<DateTime>(), "PLN", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ListResponse<ExchangeRateResponse> { Data = [] });

        accountService
            .Setup(service => service.Get(UserId, ActivityMode.ALL))
            .Returns(new ListResponse<AccountResponse>
            {
                Data = [Account(id: 10, currency: "PLN")]
            });

        categoryService
            .Setup(service => service.Get(UserId, ActivityMode.ALL))
            .Returns(new ListResponse<CategoryResponse> { Data = categories });

        return new BudgetReportService(
            uow.Object,
            budgetService.Object,
            transactionService.Object,
            exchangeRateService.Object,
            accountService.Object,
            categoryService.Object);
    }

    private static BudgetResponse Budget(int id, string name, decimal value, IReadOnlyList<int> categoryIds) => new()
    {
        Id = id,
        Key = name.ToLowerInvariant().Replace(" ", "-"),
        Name = name,
        Year = 2026,
        Month = 6,
        Value = value,
        CategoryIds = categoryIds
    };

    private static CategoryResponse Category(int id, string name, int? parentId = null, bool isSystem = false) => new()
    {
        Id = id,
        ParentId = parentId,
        Key = name.ToLowerInvariant().Replace(" ", "-"),
        Name = name,
        IsEnabled = true,
        IsSystem = isSystem
    };

    private static AccountResponse Account(int id, string currency) => new()
    {
        Id = id,
        Key = $"account-{id}",
        Name = $"Account {id}",
        Currency = currency,
        IsEnabled = true
    };

    private static TransactionResponse Transaction(int id, int accountId, int categoryId, decimal amount) => new()
    {
        Id = id,
        AccountId = accountId,
        CategoryId = categoryId,
        Amount = amount,
        Created = new DateTime(2026, 6, id),
        AccountCurrency = "PLN"
    };
}
