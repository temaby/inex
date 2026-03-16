using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using inex.Data.Models.Base;

namespace inex.Data.Models;

[Table("user")]
public class User : AuditableEntity
{
    [Key]
    [Column("user_pk", Order = 1)]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [Column("currency_fk")]
    public int CurrencyId { get; set; }

    [Required]
    [Column("username")]
    [MaxLength(255)]
    public string Username { get; set; } = null!;

    [Required]
    [Column("email")]
    [MaxLength(255)]
    public string Email { get; set; } = null!;

    [Required]
    [Column("password")]
    [MaxLength(255)]
    public string Password { get; set; } = null!;

    [Required]
    [Column("role", TypeName = "VARCHAR(5)")]
    public Role Role { get; set; }

    public Currency Currency { get; set; } = null!;
    public ICollection<Account> Accounts { get; } = new List<Account>();
    public ICollection<Category> Categories { get; } = new List<Category>();
    public ICollection<Budget> Budgets { get; } = new List<Budget>();
    public ICollection<Tag> Tags { get; } = new List<Tag>();
    public ICollection<Transaction> Transactions { get; } = new List<Transaction>();
}

