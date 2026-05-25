using inex.Data.Models;
using ExchangeRateResponse = inex.Services.Models.Records.ExchangeRate.ExchangeRateResponse;

namespace inex.Services.Models.Mappers;

public static class ExchangeRateMapper
{
    public static ExchangeRateResponse ToResponse(this ExchangeRate source)
    {
        return new ExchangeRateResponse
        {
            Id = source.Id,
            Date = source.Created,
            Rate = source.Rate,
            CurrencyFrom = source.FromCode,
            CurrencyTo = source.ToCode,
            IsTemporary = source.IsTemporary
        };
    }
}
