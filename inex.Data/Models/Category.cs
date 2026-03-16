using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using inex.Data.Models.Base;

namespace inex.Data.Models;

[Table("category")]
public class Category : NamedEntity
{
    [Key]
    [Column("category_pk", Order = 1)]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [Column("user_fk")]
    public int UserId { get; set; }

    [Column("parent_fk")]
    public int? ParentCategoryId { get; set; }

    [Required]
    [Column("is_enabled")]
    public bool IsEnabled { get; set; }

    [Required]
    [Column("is_system")]
    public bool IsSystem { get; set; }

    [Column("system_code")]
    [MaxLength(15)]
    public string? SystemCode { get; set; }

    public User User { get; set; } = null!;
    public Category? ParentCategory { get; set; }

    public ICollection<Category> SubCategories { get; } = new List<Category>();
    public ICollection<Transaction> Transactions { get; } = new List<Transaction>();
    public ICollection<BudgetCategory> BudgetCategories { get; } = new List<BudgetCategory>();
}
