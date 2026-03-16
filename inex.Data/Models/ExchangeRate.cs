using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using inex.Data.Models.Base;

namespace inex.Data.Models;

[Table("exchange_rate")]
public class ExchangeRate : AuditableEntity
{
    [Key]
    [Column("exchange_rate_pk", Order = 1)]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [Column("from_code")]
    [MaxLength(3)]
    public string FromCode { get; set; } = null!;

    [Required]
    [Column("to_code")]
    [MaxLength(3)]
    public string ToCode { get; set; } = null!;

    [Required]
    [Column("rate")]
    public decimal Rate { get; set; }

    [Required]
    [Column("is_temporary")]
    public bool IsTemporary { get; set; }
}
