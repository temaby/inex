using inex.Data.Models;
using inex.Services.Models.Records.Transaction;

namespace inex.Services.Models.Mappers;

public static class TransactionMapper
{
    public static Transaction ToEntity(this CreateTransactionRequest source)
    {
        return new Transaction
        {
            AccountId = source.AccountId,
            CategoryId = source.CategoryId,
            Value = source.Amount,
            Comment = source.Comment,
            Created = source.Created
        };
    }

    public static TransferFromData ToTransferFromData(this CreateTransferRequest source)
    {
        return new TransferFromData
        {
            AccountFromId = source.AccountFromId,
            AmountFrom = source.AmountFrom,
            Comment = source.Comment,
            Created = source.Created
        };
    }

    public static TransferToData ToTransferToData(this CreateTransferRequest source)
    {
        return new TransferToData
        {
            AccountToId = source.AccountToId,
            AmountTo = source.AmountTo,
            Comment = source.Comment,
            Created = source.Created
        };
    }

    public static Transaction ToEntity(this TransferFromData source)
    {
        return new Transaction
        {
            AccountId = source.AccountFromId,
            Value = -source.AmountFrom,
            Comment = source.Comment,
            Created = source.Created
        };
    }

    public static Transaction ToEntity(this TransferToData source)
    {
        return new Transaction
        {
            AccountId = source.AccountToId,
            Value = source.AmountTo,
            Comment = source.Comment,
            Created = source.Created
        };
    }

    public static Transaction ApplyTo(this UpdateTransactionRequest source, Transaction destination)
    {
        destination.AccountId = source.AccountId;
        destination.CategoryId = source.CategoryId;
        destination.Value = source.Amount;
        destination.Comment = source.Comment;
        destination.Created = source.Created;

        return destination;
    }

    public static TransactionResponse ToResponse(this Transaction source)
    {
        return new TransactionResponse
        {
            Id = source.Id,
            AccountId = source.AccountId,
            CategoryId = source.CategoryId,
            Amount = source.Value,
            Comment = source.Comment,
            Created = source.Created,
            AccountCurrency = source.Account?.Currency?.Key ?? string.Empty
        };
    }
}
