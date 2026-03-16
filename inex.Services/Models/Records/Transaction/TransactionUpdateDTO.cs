namespace inex.Services.Models.Records.Transaction;

public record TransactionUpdateDTO : TransactionCreateDTO
{
    public int Id { get; init; }
}