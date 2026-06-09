namespace inex.Services.Models.Records.Category;

public record CategorySummary : CategoryResponse
{
    public CategorySummary()
    {
    }

    public CategorySummary(CategoryResponse source)
        : base(source)
    {
    }

    public decimal Value { get; init; }
}
