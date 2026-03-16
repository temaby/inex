using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace inex.Data.Repositories.Base;

public interface IEditableRepository<T> : IRepository<T> where T : class
{
    EntityEntry<T> Create(T entity);
    Task<EntityEntry<T>> CreateAsync(T entity);
    void Create(IEnumerable<T> entities);
    Task CreateAsync(IEnumerable<T> entities);
    EntityEntry<T> Update(T entity);
    void Update(IEnumerable<T> entities);
    EntityEntry<T> Delete(T entity);
    void Delete(IEnumerable<T> entities);
}
