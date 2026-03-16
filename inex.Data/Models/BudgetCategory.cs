using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using inex.Data.Models.Base;

namespace inex.Data.Models;

[Table("budget_category_map")]
public class BudgetCategory : AuditableEntity
{
    [Required]
    [Column("budget_fk")]
    public int BudgetId { get; set; }

    [Required]
    [Column("category_fk")]
    public int CategoryId { get; set; }

    public Budget Budget { get; set; } = null!;
    public Category Category { get; set; } = null!;
}
