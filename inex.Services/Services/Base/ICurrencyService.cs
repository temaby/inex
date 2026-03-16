using System.Collections.Generic;
using inex.Services.Models.Records.Base;

namespace inex.Services.Services.Base;

public interface ICurrencyService
{
    IEnumerable<NamedDTO> Get();
}
