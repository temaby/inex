using System.Collections.Generic;

namespace inex.Services.Models.Records.Transaction;

public record TransactionTypeCounts
{
    public int All { get; init; }
    public int Income { get; init; }
    public int Expense { get; init; }
    public int Transfer { get; init; }
    public int InternalTransfer { get; init; }
}

public record TransactionCurrencySummary
{
    public string Currency { get; init; } = string.Empty;
    public decimal Income { get; init; }
    public decimal Expense { get; init; }
    public decimal Net { get; init; }
}

public record TransactionSummaryPeriod
{
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
}

public record TransactionCashFlowBucket
{
    public DateTime Date { get; init; }
    public string Currency { get; init; } = string.Empty;
    public decimal Income { get; init; }
    public decimal Expense { get; init; }
    public int RecordCount { get; init; }
}

public record TransactionSummaryScope
{
    public int TotalCount { get; init; }
    public TransactionTypeCounts TypeCounts { get; init; } = new();
    public TransactionSummaryPeriod? Period { get; init; }
    public IEnumerable<TransactionCashFlowBucket> CashFlowBuckets { get; init; } = new List<TransactionCashFlowBucket>();
}

public record TransactionSummaryResponse
{
    public int TotalCount { get; init; }
    public TransactionTypeCounts TypeCounts { get; init; } = new();
    public TransactionTypeCounts ViewTypeCounts { get; init; } = new();
    public IEnumerable<TransactionCurrencySummary> CurrencySummaries { get; init; } = new List<TransactionCurrencySummary>();
    public string BaseCurrency { get; init; } = string.Empty;
    public TransactionSummaryScope CurrentScope { get; init; } = new();
    public TransactionSummaryScope? PreviousScope { get; init; }
}
