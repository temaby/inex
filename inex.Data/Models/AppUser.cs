using Microsoft.AspNetCore.Identity;

namespace inex.Data.Models;

public class AppUser : IdentityUser<int>
{
    public int CurrencyId { get; set; }

    public Currency Currency { get; set; } = null!;
    public ICollection<Account> Accounts { get; } = new List<Account>();
    public ICollection<Category> Categories { get; } = new List<Category>();
    public ICollection<Budget> Budgets { get; } = new List<Budget>();
    public ICollection<Tag> Tags { get; } = new List<Tag>();
    public ICollection<Transaction> Transactions { get; } = new List<Transaction>();
    public ICollection<RefreshToken> RefreshTokens { get; } = new List<RefreshToken>();
}
