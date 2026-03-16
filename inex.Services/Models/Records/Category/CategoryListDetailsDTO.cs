namespace inex.Services.Models.Records.Category;

public record CategoryListDetailsDTO : CategoryDetailsDTO
{
    public decimal Value { get; init; }
}