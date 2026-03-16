using System.Collections.Generic;
using inex.Services.Models.Records.Base;

namespace inex.Services.Models.Records.Data;

public record ResponseDataDTO<T> : ResponseDTO
{
    public IEnumerable<T> Data { get; init; } = new List<T>();
}