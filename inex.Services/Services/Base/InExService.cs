using AutoMapper;
using inex.Data.Repositories.Base;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public abstract class InExService : Service, IInExService
{
    #region Constructors        

    public InExService(IInExUnitOfWork uowInEx, IMapper mapper) : base(uowInEx, mapper)
    {
    }

    #endregion Constructors

    #region Public Interface

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        await DeleteAsync(new int[] { id }, ct);
    }

    public abstract Task DeleteAsync(IEnumerable<int> ids, CancellationToken ct = default);

    #endregion Public Interface
}