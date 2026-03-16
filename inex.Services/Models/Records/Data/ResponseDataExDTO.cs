namespace inex.Services.Models.Records.Data;

public record ResponseDataExDTO<T, K> : ResponseDataDTO<T>
{
    public K Metadata { get; init; } = default!;
}