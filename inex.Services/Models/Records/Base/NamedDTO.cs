namespace inex.Services.Models.Records.Base;

public record NamedDTO
{
    public int Id { get; init; }
    public string Key { get; init; } = null!;
    public string Name { get; init; } = null!;
    public string? Description { get; init; }
}
