using inex.Data.Models;
using inex.Services.Models.Mappers;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Budget;
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
}
