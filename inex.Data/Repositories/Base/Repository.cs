using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace inex.Data.Repositories.Base;

public class Repository<T> : IRepository<T> where T : class
{
    #region Constructors

    public Repository(DbContext context)
    {
        Db = context;
    }

    #endregion Constructors

    #region Public Interface

    #region Properties

    protected DbContext Db { get; }

    #endregion Properties

    public virtual T? Get(int id)
    {
        return Db.Find<T>(id);
    }

    public virtual async Task<T?> GetAsync(int id, CancellationToken ct = default)
    {
        return await Db.FindAsync<T>(new object[] { id }, ct);
    }

    public IQueryable<T> Get(bool isReadOnly, Expression<Func<T, bool>>? predicate = null, params Expression<Func<T, object>>[] includeExpressions)
    {
        IQueryable<T> set = isReadOnly ? Db.Set<T>().AsNoTracking() : Db.Set<T>();

        if (predicate != null)
        {
            set = set.Where(predicate);
        }

        foreach (var includeExpression in includeExpressions)
        {
            set = set.Include(includeExpression);
        }

        return set;
    }

    public virtual void Dispose()
    {
        Db?.Dispose();
    }

    #endregion Public Interface
}

