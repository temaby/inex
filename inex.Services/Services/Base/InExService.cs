using inex.Data.Repositories.Base;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public abstract class InExService : Service, IInExService
{
    #region Constructors

    public InExService(IInExUnitOfWork uowInEx) : base(uowInEx)
    {
    }

    #endregion Constructors

    #region Public Interface

    public virtual async Task DeleteAsync(int id, int userId, CancellationToken ct = default)
    {
        await DeleteAsync(new int[] { id }, userId, ct);
    }

    public abstract Task DeleteAsync(IEnumerable<int> ids, int userId, CancellationToken ct = default);

    #endregion Public Interface
}
