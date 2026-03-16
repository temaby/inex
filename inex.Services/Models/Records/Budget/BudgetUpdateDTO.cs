namespace inex.Services.Models.Records.Budget;

public record BudgetUpdateDTO : BudgetCreateDTO
{
    public int Id { get; init; }
}
