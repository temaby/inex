namespace inex.Services.Models.Records.Transaction;

public record TransactionDefaultAccountsResponse
{
    public int? ExpenseAccountId { get; init; }
    public int? IncomeAccountId { get; init; }
}
