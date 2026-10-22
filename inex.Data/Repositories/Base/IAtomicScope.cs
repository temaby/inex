namespace inex.Data.Repositories.Base;
public interface IAtomicScope : IAsyncDisposable
{
    Task CommitAsync(CancellationToken ct);
}
