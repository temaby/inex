namespace inex.Data.Repositories.Base;

public interface IUnitOfWork : IDisposable
{
    Task<int> SaveAsync(CancellationToken ct = default);
    Task BulkSaveAsync(int batchSize);
}
