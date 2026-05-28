namespace inex.Data.Models;

public class RefreshToken
{
    public int Id { get; set; }
    public string Token { get; set; } = null!;
    public int UserId { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByToken { get; set; }
    public string ConcurrencyStamp { get; set; } = Guid.NewGuid().ToString("N");

    public AppUser User { get; set; } = null!;
}
