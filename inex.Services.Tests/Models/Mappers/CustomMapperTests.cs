using inex.Data.Models;
using inex.Services.Models.Mappers;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Budget;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Transaction;

namespace inex.Services.Tests.Models.Mappers;

public class CustomMapperTests
{
    [Fact]
    public void Account_ToResponse_WhenCurrencyNavigationIsMissing_ReturnsEmptyCurrency()
    {
        var account = new Account
        {
            Id = 12,
            CurrencyId = 1,
            Key = "cash",
            Name = "Cash",
            IsEnabled = true
        };

        AccountResponse response = account.ToResponse();

        Assert.Equal(12, response.Id);
        Assert.Equal(string.Empty, response.Currency);
        Assert.True(response.IsFavourite);
    }

    [Fact]
    public void UpdateAccountRequest_ApplyTo_Preserves_ExistingTransactionsVisibility_When_Omitted()
    {
        var request = new UpdateAccountRequest
        {
            CurrencyId = 1,
            Key = "cash",
            Name = "Cash",
            IsEnabled = true,
        };
        var account = new Account { IsFavourite = false };

        request.ApplyTo(account);

        Assert.False(account.IsFavourite);
    }

    [Fact]
    public void Budget_ToEntity_WhenNameIsNull_UsesKeyAsName()
    {
        var request = new CreateBudgetRequest
        {
            Key = "groceries",
            Name = null,
            Year = 2026,
            Month = 5,
            Value = 500
        };

        Budget budget = request.ToEntity();

        Assert.Equal("groceries", budget.Name);
    }

    [Fact]
    public void TransferFrom_ToEntity_NegatesAmount()
    {
        var transfer = new TransferFromData
        {
            AccountFromId = 3,
            AmountFrom = 42,
            Created = new DateTime(2026, 5, 23),
            Comment = "move"
        };

        Transaction transaction = transfer.ToEntity();

        Assert.Equal(3, transaction.AccountId);
        Assert.Equal(-42, transaction.Value);
        Assert.Equal("move", transaction.Comment);
    }

    [Fact]
    public void CategoryResponse_ToSummary_CopiesResponseFields()
    {
        var response = new CategoryResponse
        {
            Id = 7,
            ParentId = 3,
            Key = "groceries",
            Name = "Groceries",
            Description = "Food shopping",
            IsEnabled = true,
            IsSystem = false,
            SystemCode = null
        };

        CategorySummary summary = response.ToSummary();

        Assert.Equal(response.Id, summary.Id);
        Assert.Equal(response.ParentId, summary.ParentId);
        Assert.Equal(response.Key, summary.Key);
        Assert.Equal(response.Name, summary.Name);
        Assert.Equal(response.Description, summary.Description);
        Assert.Equal(response.IsEnabled, summary.IsEnabled);
        Assert.Equal(response.IsSystem, summary.IsSystem);
        Assert.Equal(response.SystemCode, summary.SystemCode);
        Assert.Equal(0, summary.Value);
    }
}
