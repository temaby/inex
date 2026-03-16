using AutoMapper;
using System.Collections.Generic;
using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Models.Records.Base;
using inex.Services.Services.Base;

namespace inex.Services.Services;

public class CurrencyService : Service, ICurrencyService
{
    #region Constructors

    public CurrencyService(IInExUnitOfWork uowInEx, IMapper mapper) : base(uowInEx, mapper)
    {

    }

    #endregion Constructors

    public IEnumerable<NamedDTO> Get()
    {
        IEnumerable<Currency> items = DbInEx.CurrencyRepository.Get(true);
        return Mapper.Map<IEnumerable<NamedDTO>>(items);
    }
}