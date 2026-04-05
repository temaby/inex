using System.Linq.Expressions;

namespace inex.Data.Repositories.Base;

public interface IRepository<T> : IDisposable
{
    T? Get(int id);
    Task<T?> GetAsync(int id, CancellationToken ct = default);
    IQueryable<T> Get(bool isReadOnly, Expression<Func<T, bool>>? predicate = null, params Expression<Func<T, object>>[] includeExpressions);
}
