using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using inex.Data.Models.Base;

namespace inex.Data.Models;

[Table("transaction_tag_map")]
public class TransactionTagMap : AuditableEntity
{
    [Required]
    [Column("transaction_fk")]
    public int TransactionId { get; set; }

    [Required]
    [Column("tag_fk")]
    public int TagId { get; set; }

    public Transaction Transaction { get; set; } = null!;
    public Tag Tag { get; set; } = null!;
}
