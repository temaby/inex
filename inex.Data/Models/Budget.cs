using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using inex.Data.Models.Base;

namespace inex.Data.Models;

[Table("budget")]
public class Budget : NamedEntity
{
    [Key]
    [Column("budget_pk", Order = 1)]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [Column("user_fk")]
    public int UserId { get; set; }

    [Required]
    [Column("year")]
    public int Year { get; set; }

    [Required]
    [Column("month")]
    public int Month { get; set; }

    [Required]
    [Column("value", TypeName = "DECIMAL(12, 2)")]
    public decimal Value { get; set; }

    public User User { get; set; } = null!;
    public ICollection<BudgetCategory> BudgetCategories { get; } = new List<BudgetCategory>();
}
