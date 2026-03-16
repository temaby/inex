namespace inex.Services.Models.Records.Budget;

public record BudgetCreateDTO
{
    public string Key { get; init; } = null!;
    public string? Name { get; init; }
    public string? Description { get; init; }
    public int Year { get; init; }
    public int Month { get; init; }
    public decimal Value { get; init; }
    public IReadOnlyList<int> CategoryIds { get; init; } = [];
}
