using Microsoft.EntityFrameworkCore;

namespace inex.Data.Repositories.Base;

public abstract class UnitOfWork : IUnitOfWork
{
    #region Public Interface

    public async Task<int> SaveAsync(CancellationToken ct = default)
    {
        return await _db.SaveChangesAsync(ct);
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    public abstract void Dispose(bool disposing);

    #endregion Public Interface

    #region Private Fields

    protected DbContext _db = null!;

    #endregion Private Fields
}
