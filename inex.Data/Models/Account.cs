using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using inex.Data.Models.Base;

namespace inex.Data.Models;

[Table("account")]
public class Account : NamedEntity
{
    [Key]
    [Column("account_pk", Order = 1)]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [Column("user_fk")]
    public int UserId { get; set; }

    [Required]
    [Column("currency_fk")]
    public int CurrencyId { get; set; }

    [Required]
    [Column("is_enabled")]
    public bool IsEnabled { get; set; }

    public User User { get; set; } = null!;
    public Currency Currency { get; set; } = null!;

    public ICollection<Transaction> Transactions { get; } = new List<Transaction>();
}

