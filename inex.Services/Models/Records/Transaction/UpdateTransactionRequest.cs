namespace inex.Services.Models.Records.Transaction;

public record UpdateTransactionRequest : CreateTransactionRequest
{
    public int Id { get; init; }
}
