namespace inex.Services.Models.Records.Category;

public record CategorySummary : CategoryResponse
{
    public decimal Value { get; init; }
}
