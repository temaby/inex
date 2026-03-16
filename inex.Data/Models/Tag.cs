using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using inex.Data.Models.Base;

namespace inex.Data.Models;

[Table("tag")]
public class Tag : NamedEntity
{
    [Key]
    [Column("tag_pk", Order = 1)]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [Column("user_fk")]
    public int UserId { get; set; }

    [Required]
    [Column("tag_type", TypeName = "VARCHAR(5)")]
    public TagType Type { get; set; }

    public User User { get; set; } = null!;

    public ICollection<TransactionTagMap> TagTransactionDetails { get; } = new List<TransactionTagMap>();
}
