using Microsoft.EntityFrameworkCore;
using inex.Data.Models;
using inex.Data.Repositories.Base;

namespace inex.Data.Repositories;

public class TransactionRepository : EditableRepository<Transaction>
{
    #region Constructors

    public TransactionRepository(InExDbContext context) : base(context)
    {
    }

    #endregion Constructors

    #region Public Interface

    public async override Task<Transaction?> GetAsync(int id)
    {
        return await Db.Set<Transaction>()
            .Include(i => i.TransactionTagDetails)
            .ThenInclude(i => i.Tag)
            .FirstOrDefaultAsync(i => i.Id == id);
    }

    #endregion Public Interface
}
