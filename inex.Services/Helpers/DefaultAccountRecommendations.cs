using inex.Data.Models;

namespace inex.Services.Helpers;

internal static class DefaultAccountRecommendations
{
    internal sealed record Usage
    {
        public int AccountId { get; init; }
        public bool IsExpense { get; init; }
        public int RecentCount { get; init; }
        public DateTime LastUsed { get; init; }
    }

    internal static IQueryable<Usage> Query(IQueryable<Transaction> transactions, int userId, DateTime today)
    {
        DateTime start = today.AddDays(-29);
        DateTime end = today.AddDays(1);

        return transactions
            .Where(item => item.UserId == userId && item.Account.UserId == userId && item.Account.IsEnabled &&
                item.Category.UserId == userId && !item.Category.IsSystem && item.Value != 0 && item.Created < end)
            .GroupBy(item => new { item.AccountId, IsExpense = item.Value < 0 })
            .Select(group => new Usage
            {
                AccountId = group.Key.AccountId,
                IsExpense = group.Key.IsExpense,
                RecentCount = group.Count(item => item.Created >= start),
                LastUsed = group.Max(item => item.Created),
            });
    }

    internal static int? Choose(IEnumerable<Usage> usage, bool isExpense, int? soleAccountId) => usage
        .Where(item => item.IsExpense == isExpense)
        .OrderByDescending(item => item.RecentCount)
        .ThenByDescending(item => item.LastUsed)
        .ThenBy(item => item.AccountId)
        .Select(item => (int?)item.AccountId)
        .FirstOrDefault() ?? soleAccountId;
}
