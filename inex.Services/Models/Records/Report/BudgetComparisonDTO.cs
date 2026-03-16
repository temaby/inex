namespace inex.Services.Models.Records.Report;

public record BudgetComparisonDTO
{
    public string? CategoryName { get; init; }
    public List<int> CategoryIds { get; init; } = [];
    public decimal BudgetedAmount { get; init; }
    public decimal SpentAmount { get; init; }
    public decimal RemainingAmount { get; init; }
    public decimal PercentageUsed { get; init; }
}