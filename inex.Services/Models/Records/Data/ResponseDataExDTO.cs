namespace inex.Services.Models.Records.Data;

public record PagedResponse<T, TMeta> : ListResponse<T>
{
    public TMeta Metadata { get; init; } = default!;
}
