using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using inex.Data.Models.Base;

namespace inex.Data.Models;

[Table("transaction")]
public class Transaction : AuditableEntity
{
    [Key]
    [Column("transaction_pk", Order = 1)]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [Column("account_fk")]
    public int AccountId { get; set; }

    [Required]
    [Column("category_fk")]
    public int CategoryId { get; set; }

    [Required]
    [Column("user_fk")]
    public int UserId { get; set; }

    [Column("comment")]
    [MaxLength(255)]
    public string? Comment { get; set; }

    [Required]
    [Column("value", TypeName = "DECIMAL(12, 2)")]
    public decimal Value { get; set; }

    public AppUser User { get; set; } = null!;
    public Account Account { get; set; } = null!;
    public Category Category { get; set; } = null!;

    public ICollection<TransactionTagMap> TransactionTagDetails { get; } = new List<TransactionTagMap>();
}
