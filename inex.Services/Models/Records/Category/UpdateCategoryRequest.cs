namespace inex.Services.Models.Records.Category;

public record UpdateCategoryRequest : CreateCategoryRequest
{
    public int Id { get; init; }
}
