namespace inex.Data.Repositories.Base;

public interface IUnitOfWork : IDisposable
{
    Task<int> SaveAsync();
    Task BulkSaveAsync(int batchSize);
}
