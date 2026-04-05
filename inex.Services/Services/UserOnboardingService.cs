using inex.Data.Models;
using inex.Data.Models.Base;
using inex.Data.Repositories.Base;
using inex.Services.Services.Base;

namespace inex.Services.Services;

/// <summary>
/// Seeds the minimal data a new user needs so the UI is immediately usable:
/// a Transfer system category (required for transfers to work), a set of common
/// income/expense categories, and one default account.
/// </summary>
public class UserOnboardingService : IUserOnboardingService
{
    private readonly IInExUnitOfWork _db;

    public UserOnboardingService(IInExUnitOfWork db)
    {
        _db = db;
    }

    public async Task SeedAsync(int userId, int currencyId, CancellationToken ct = default)
    {
        await SeedCategoriesAsync(userId, ct);
        await SeedAccountAsync(userId, currencyId, ct);
        await _db.SaveAsync(ct);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task SeedCategoriesAsync(int userId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        foreach (var proto in CategorySeed)
        {
            await _db.CategoryRepository.CreateAsync(new Category
            {
                Key         = proto.Key,
                Name        = proto.Name,
                IsEnabled   = true,
                IsSystem    = proto.IsSystem,
                SystemCode  = proto.SystemCode,
                UserId      = userId,
                CreatedBy   = userId,
                UpdatedBy   = userId,
                Created     = now,
                Updated     = now,
            }, ct);
        }
    }

    private async Task SeedAccountAsync(int userId, int currencyId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        await _db.AccountRepository.CreateAsync(new Account
        {
            Key        = "main-account",
            Name       = "Main Account",
            IsEnabled  = true,
            CurrencyId = currencyId,
            UserId     = userId,
            CreatedBy  = userId,
            UpdatedBy  = userId,
            Created    = now,
            Updated    = now,
        }, ct);
    }

    // ── Seed data ─────────────────────────────────────────────────────────────

    private record CategoryProto(string Key, string Name, bool IsSystem = false, string? SystemCode = null);

    private static readonly CategoryProto[] CategorySeed =
    [
        // System — required for built-in features; cannot be deleted
        new("transfer",    "Transfer",    IsSystem: true, SystemCode: "transfer"),
        new("correction",  "Correction",  IsSystem: true, SystemCode: "correction"),

        // Income
        new("salary",       "Salary"),
        new("freelance",    "Freelance"),
        new("other-income", "Other Income"),

        // Expenses
        new("food",         "Food & Groceries"),
        new("transport",    "Transport"),
        new("housing",      "Housing"),
        new("utilities",    "Utilities"),
        new("health",       "Health"),
        new("entertainment","Entertainment"),
        new("shopping",     "Shopping"),
        new("other",        "Other"),
    ];
}
