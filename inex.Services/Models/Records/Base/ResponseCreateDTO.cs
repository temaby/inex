namespace inex.Services.Models.Records.Base;

public record ResponseCreateDTO : ResponseDTO
{
    public int Id { get; init; }
}