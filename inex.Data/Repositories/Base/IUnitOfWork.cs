namespace inex.Data.Repositories.Base;

public interface IUnitOfWork : IDisposable
{
    Task<int> SaveAsync(CancellationToken ct = default);
}
