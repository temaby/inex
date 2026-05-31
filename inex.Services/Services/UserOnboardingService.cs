using inex.Data.Models;
using inex.Data.Models.Base;
using inex.Data.Repositories.Base;
using inex.Services.Infrastructure.Time;
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
    private readonly IClock _clock;

    public UserOnboardingService(IInExUnitOfWork db, IClock clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task SeedAsync(int userId, int currencyId, string? languageCode = null, CancellationToken ct = default)
    {
        await SeedCategoriesAsync(userId, languageCode, ct);
        await SeedAccountAsync(userId, currencyId, languageCode, ct);
        await _db.SaveAsync(ct);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task SeedCategoriesAsync(int userId, string? languageCode, CancellationToken ct)
    {
        var now   = _clock.UtcNow;
        var names = languageCode == "ru" ? CategoryNamesRu : CategoryNamesEn;

        foreach (var proto in CategorySeed)
        {
            await _db.CategoryRepository.CreateAsync(new Category
            {
                Key        = proto.Key,
                Name       = names.GetValueOrDefault(proto.Key, proto.Key),
                IsEnabled  = true,
                IsSystem   = proto.IsSystem,
                SystemCode = proto.SystemCode,
                UserId     = userId,
                CreatedBy  = userId,
                UpdatedBy  = userId,
                Created    = now,
                Updated    = now,
            }, ct);
        }
    }

    private async Task SeedAccountAsync(int userId, int currencyId, string? languageCode, CancellationToken ct)
    {
        var now         = _clock.UtcNow;
        var accountName = languageCode == "ru" ? "Основной счёт" : "Main Account";

        await _db.AccountRepository.CreateAsync(new Account
        {
            Key        = "main-account",
            Name       = accountName,
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

    private record CategoryProto(string Key, bool IsSystem = false, string? SystemCode = null);

    private static readonly CategoryProto[] CategorySeed =
    [
        // System — required for built-in features; cannot be deleted
        new("transfer",     IsSystem: true, SystemCode: "transfer"),
        new("correction",   IsSystem: true, SystemCode: "correction"),

        // Income
        new("salary"),
        new("freelance"),
        new("other-income"),

        // Expenses
        new("food"),
        new("transport"),
        new("housing"),
        new("utilities"),
        new("health"),
        new("entertainment"),
        new("shopping"),
        new("other"),
    ];

    private static readonly Dictionary<string, string> CategoryNamesEn = new()
    {
        ["transfer"]      = "Transfer",
        ["correction"]    = "Correction",
        ["salary"]        = "Salary",
        ["freelance"]     = "Freelance",
        ["other-income"]  = "Other Income",
        ["food"]          = "Food & Groceries",
        ["transport"]     = "Transport",
        ["housing"]       = "Housing",
        ["utilities"]     = "Utilities",
        ["health"]        = "Health",
        ["entertainment"] = "Entertainment",
        ["shopping"]      = "Shopping",
        ["other"]         = "Other",
    };

    private static readonly Dictionary<string, string> CategoryNamesRu = new()
    {
        ["transfer"]      = "Перевод",
        ["correction"]    = "Корректировка",
        ["salary"]        = "Зарплата",
        ["freelance"]     = "Фриланс",
        ["other-income"]  = "Прочий доход",
        ["food"]          = "Еда и продукты",
        ["transport"]     = "Транспорт",
        ["housing"]       = "Жильё",
        ["utilities"]     = "Коммунальные услуги",
        ["health"]        = "Здоровье",
        ["entertainment"] = "Развлечения",
        ["shopping"]      = "Покупки",
        ["other"]         = "Прочее",
    };
}
