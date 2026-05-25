using inex.Data.Models;
using inex.Services.Models.Records.Base;

namespace inex.Services.Models.Mappers;

public static class CurrencyMapper
{
    public static NamedResponse ToNamedResponse(this Currency source)
    {
        return new NamedResponse
        {
            Id = source.Id,
            Key = source.Key,
            Name = source.Name,
            Description = source.Description
        };
    }
}
