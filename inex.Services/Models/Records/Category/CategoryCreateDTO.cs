namespace inex.Services.Models.Records.Category;

public record CategoryCreateDTO
{
    public int? ParentId { get; init; }

    public string Key { get; init; } = null!;
    public string Name { get; init; } = null!;
    public string? Description { get; init; }
    public bool IsEnabled { get; init; }
    public bool IsSystem { get; init; }
    public string? SystemCode { get; init; }
}