using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using inex.Data.Models.Base;

namespace inex.Data.Models;

[Table("currency")]
public class Currency : NamedEntity
{
    [Key]
    [Column("currency_pk", Order = 1)]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    public ICollection<User> Users { get; } = new List<User>();
    public ICollection<Account> Accounts { get; } = new List<Account>();
}
