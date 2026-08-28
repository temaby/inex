using inex.Services.Models.Records.Transaction;
using inex.Services.Validators.Transaction;

namespace inex.Services.Tests.Validators;

public class TransactionDateValidationTests
{
    [Fact]
    public void Create_DefaultCreated_IsInvalidWithStableErrorCode()
    {
        var result = new TransactionCreateValidator().Validate(new CreateTransactionRequest
        {
            AccountId = 1,
            CategoryId = 1,
            Amount = 1m
        });

        Assert.Contains(result.Errors, error => error.ErrorMessage == "created.required");
    }

    [Fact]
    public void Update_DefaultCreated_IsInvalidWithStableErrorCode()
    {
        var result = new TransactionUpdateValidator().Validate(new UpdateTransactionRequest
        {
            Id = 1,
            AccountId = 1,
            CategoryId = 1,
            Amount = 1m
        });

        Assert.Contains(result.Errors, error => error.ErrorMessage == "created.required");
    }

    [Fact]
    public void Transfer_DefaultCreated_IsInvalidWithStableErrorCode()
    {
        var result = new TransferCreateValidator().Validate(new CreateTransferRequest
        {
            AccountFromId = 1,
            AccountToId = 2,
            AmountFrom = 1m,
            AmountTo = 1m
        });

        Assert.Contains(result.Errors, error => error.ErrorMessage == "created.required");
    }

    [Fact]
    public void InternalTransfer_InvalidDirection_IsInvalidWithStableErrorCode()
    {
        var result = new InternalTransferCreateValidator().Validate(new CreateInternalTransferRequest
        {
            AccountId = 1,
            Amount = 1m,
            Created = DateTime.UtcNow,
            Direction = "sideways"
        });

        Assert.Contains(result.Errors, error => error.ErrorMessage == "direction.invalid");
    }
}
