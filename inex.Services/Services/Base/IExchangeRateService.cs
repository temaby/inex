using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.ExchangeRate;
using System;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public interface IExchangeRateService
{
    Task<ListResponse<ExchangeRateDTO>> Get(int userId, DateTime date, string baseCurrency = "", CancellationToken ct = default);
    Task<ListResponse<ExchangeRateDTO>> Get(int userId, DateTime start, DateTime end, string baseCurrency = "", CancellationToken ct = default);
}