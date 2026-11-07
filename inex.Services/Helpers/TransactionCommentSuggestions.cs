using inex.Data.Models;

namespace inex.Services.Helpers;

internal static class TransactionCommentSuggestions
{
    internal static IQueryable<string> Query(IQueryable<Tag> catalog, int userId, TagType type, string query)
    {
        string search = query.Trim().ToLowerInvariant();
        // Left join retains historical catalog entries. Links only rank values;
        // they do not define whether a marker is present in a comment.
        var usage = from tag in catalog
                    where tag.UserId == userId && tag.Type == type && tag.Key != "" && tag.Key.ToLower().Contains(search)
                    from link in tag.TagTransactionDetails.Where(link => link.Transaction.UserId == userId).DefaultIfEmpty()
                    select new { tag.Key, Normalized = tag.Key.ToLower(), Used = link == null ? 0 : 1,
                        LastUsed = link == null ? (DateTime?)null : link.Transaction.Created };
        return usage.GroupBy(item => item.Normalized)
            .Select(group => new { Normalized = group.Key, Key = group.Min(item => item.Key),
                Count = group.Sum(item => item.Used), LastUsed = group.Max(item => item.LastUsed) })
            .OrderByDescending(item => item.Normalized.StartsWith(search))
            .ThenByDescending(item => item.Count).ThenByDescending(item => item.LastUsed)
            .ThenBy(item => item.Normalized).ThenBy(item => item.Key)
            .Take(5).Select(item => item.Key ?? string.Empty);
    }
}
