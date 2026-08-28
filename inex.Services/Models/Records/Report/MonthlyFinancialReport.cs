namespace inex.Services.Models.Records.Report;

public record MonthlyFinancialReport
{
    public int Year { get; init; }
    public int Month { get; init; }
    public string Currency { get; init; } = null!;
    public decimal TotalIncome { get; init; }
    public decimal TotalExpenses { get; init; }
    public decimal OpeningBalance { get; init; }
    public decimal ClosingBalance { get; init; }
    public decimal SurplusOrDeficit => TotalIncome - TotalExpenses;
    public decimal? SpentIncomePercentage => TotalIncome == 0 ? null : TotalExpenses / TotalIncome * 100;
    public IReadOnlyList<MonthlyReportCategory> IncomeCategories { get; init; } = [];
    public IReadOnlyList<MonthlyReportCategory> ExpenseCategories { get; init; } = [];
}

public record MonthlyReportCategory(string Name, decimal Amount);
