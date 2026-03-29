using System.Collections.Generic;

namespace inex.Services.Models.Records.Data;

public record ListResponse<T>
{
    public IEnumerable<T> Data { get; init; } = new List<T>();
}
