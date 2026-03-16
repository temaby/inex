using inex.Data.Models;
using inex.Data.Repositories.Base;
using Microsoft.EntityFrameworkCore;

namespace inex.Data.Repositories;

public class BudgetRepository : EditableRepository<Budget>
{
    #region Constructors

    public BudgetRepository(InExDbContext context) : base(context)
    {
    }

    #endregion Constructors

    #region Public Interface

    public async override Task<Budget?> GetAsync(int id)
    {
        return await Db.Set<Budget>()
            .Include(i => i.BudgetCategories)
            .FirstOrDefaultAsync(i => i.Id == id);
    }

    #endregion Public Interface
}
