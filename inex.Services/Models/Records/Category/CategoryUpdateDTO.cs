namespace inex.Services.Models.Records.Category;

public record CategoryUpdateDTO : CategoryCreateDTO
{
    public int Id { get; init; }
}