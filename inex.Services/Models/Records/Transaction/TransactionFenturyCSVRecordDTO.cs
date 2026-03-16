using System;

namespace inex.Services.Models.Records.Transaction;

public record TransactionFenturyCSVRecordDTO
{
    public DateTime Date { get; init; }
    public string Category { get; init; } = null!;
    public string Account { get; init; } = null!;
    public decimal Amount { get; init; }
    public string Currency { get; init; } = null!;
    public string Status { get; init; } = null!;
    public string? Tags { get; init; }
    public string? Description { get; init; }
}