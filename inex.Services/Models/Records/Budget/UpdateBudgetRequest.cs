namespace inex.Services.Models.Records.Budget;

public record UpdateBudgetRequest : CreateBudgetRequest
{
    public int Id { get; init; }
}
