using System.Collections.Generic;
using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Models.Mappers;
using inex.Services.Models.Records.Base;
using inex.Services.Services.Base;

namespace inex.Services.Services;

public class CurrencyService : Service, ICurrencyService
{
    #region Constructors

    public CurrencyService(IInExUnitOfWork uowInEx) : base(uowInEx)
    {

    }

    #endregion Constructors

    public IEnumerable<NamedResponse> Get()
    {
        IEnumerable<Currency> items = DbInEx.CurrencyRepository.Get(true);
        return items.Select(CurrencyMapper.ToNamedResponse);
    }
}
