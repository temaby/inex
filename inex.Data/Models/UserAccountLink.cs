using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace inex.Data.Models;

public enum UserAccountLinkStatus
{
    Pending = 0,
    Active = 1,
    Rejected = 2,
    Revoked = 3,
}

[Table("user_account_link")]
public class UserAccountLink
{
    [Key]
    [Column("user_account_link_pk")]
    public int Id { get; set; }

    [Required]
    [Column("master_user_fk")]
    public int MasterUserId { get; set; }

    [Required]
    [Column("linked_user_fk")]
    public int LinkedUserId { get; set; }

    [Required]
    [Column("status")]
    public UserAccountLinkStatus Status { get; set; } = UserAccountLinkStatus.Pending;

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("accepted_at")]
    public DateTime? AcceptedAt { get; set; }

    [Column("revoked_at")]
    public DateTime? RevokedAt { get; set; }

    public AppUser MasterUser { get; set; } = null!;
    public AppUser LinkedUser { get; set; } = null!;
}
