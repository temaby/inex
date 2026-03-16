using Microsoft.EntityFrameworkCore.ChangeTracking;
using inex.Data.Models.Base;

namespace inex.Data.Repositories.Base;

public class EditableRepository<T> : Repository<T>, IEditableRepository<T> where T : AuditableEntity
{
    #region Constructors

    public EditableRepository(InExDbContext context) : base(context)
    {
    }


    #endregion Constructors

    #region Public Interface

    public virtual EntityEntry<T> Create(T entity)
    {
        return Db.Add(entity);
    }

    public virtual async Task<EntityEntry<T>> CreateAsync(T entity)
    {
        return await Db.AddAsync(entity);
    }

    public virtual void Create(IEnumerable<T> entities)
    {
        Db.AddRange(entities);
    }

    public virtual async Task CreateAsync(IEnumerable<T> entities)
    {
        await Db.AddRangeAsync(entities);
    }

    public virtual EntityEntry<T> Update(T entity)
    {
        return Db.Update(entity);
    }

    public virtual void Update(IEnumerable<T> entities)
    {
        Db.UpdateRange(entities);
    }

    public virtual EntityEntry<T> Delete(T entity)
    {
        return Db.Remove(entity);
    }

    public virtual void Delete(IEnumerable<T> entities)
    {
        Db.RemoveRange(entities);
    }

    #endregion Public Interface
}

