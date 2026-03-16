using Microsoft.EntityFrameworkCore;

namespace inex.Data.Repositories.Base;

public abstract class UnitOfWork : IUnitOfWork
{
    #region Public Interface

    public async Task<int> SaveAsync()
    {
        return await _db.SaveChangesAsync();
    }

    public async Task BulkSaveAsync(int batchSize)
    {
        await _db.BulkSaveChangesAsync(o => o.BatchSize = batchSize);
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
