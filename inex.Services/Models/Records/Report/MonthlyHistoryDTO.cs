namespace inex.Services.Models.Records.Report;

public record MonthlyHistoryDTO
{
    public int Month { get; init; }
    public string MonthName { get; init; } = null!;
    public decimal Income { get; init; }
    public decimal Expense { get; init; }
    public decimal Savings => Income + Expense;
}