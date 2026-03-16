using System;

namespace inex.Services.Models.Records.Transaction;

public record TransactionCreateDTO
{
    public int AccountId { get; init; }
    public int CategoryId { get; init; }
    public DateTime Created { get; init; }
    public decimal Amount { get; init; }
    public string? Comment { get; init; }
}