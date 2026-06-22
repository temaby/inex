using System.Collections.Generic;

namespace inex.Services.Models.Records.Transaction;

public record TransactionTypeCounts
{
    public int All { get; init; }
    public int Income { get; init; }
    public int Expense { get; init; }
    public int Transfer { get; init; }
}

public record TransactionCurrencySummary
{
    public string Currency { get; init; } = string.Empty;
    public decimal Income { get; init; }
    public decimal Expense { get; init; }
    public decimal Net { get; init; }
}

public record TransactionSummaryResponse
{
    public int TotalCount { get; init; }
    public TransactionTypeCounts TypeCounts { get; init; } = new();
    public IEnumerable<TransactionCurrencySummary> CurrencySummaries { get; init; } = new List<TransactionCurrencySummary>();
}
