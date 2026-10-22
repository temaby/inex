using inex.Data.Models;
using inex.Data.Repositories.Base;
namespace inex.Services.Services;

internal static class TransactionCommentMarkers
{
    public static Transaction Apply(IInExUnitOfWork db, Transaction transaction, int userId)
    {
        // parse lists of tags and refs from description based on marker
        IEnumerable<string> tags = (transaction.Comment ?? string.Empty).Split(" ", StringSplitOptions.RemoveEmptyEntries).Select(i => i.Trim().ToLower()).Where(i => i.StartsWith("#")).Distinct().Select(i => i.Substring(1));
        IEnumerable<string> refs = (transaction.Comment ?? string.Empty).Split(" ", StringSplitOptions.RemoveEmptyEntries).Select(i => i.Trim().ToLower()).Where(i => i.StartsWith("@")).Distinct().Select(i => i.Substring(1));

        // in case tags were found
        if (tags.Any())
        {
            // update transaction with actual items
            UpdateTagRefItems(db, transaction, tags, TagType.TAG, userId);
        }

        // in case refs were found
        if (refs.Any())
        {
            // update transaction with actual items
            UpdateTagRefItems(db, transaction, refs, TagType.REF, userId);
        }

        return transaction;
    }

    private static void UpdateTagRefItems(IInExUnitOfWork db, Transaction transaction, IEnumerable<string> tags, TagType type, int userId)
    {
        // build a list of tags for a user
        IEnumerable<Tag> tagsUser = db.TagRepository.Get(true).Where(i => i.UserId == userId && i.Type == type).ToList();
        // build a list of new tags that were added with the transaction
        IEnumerable<Tag> tagsToAdd = tags.Except(tagsUser.Select(i => i.Key.ToLower())).Select(i => new Tag() { Key = i, Name = i, Description = i, Type = type, CreatedBy = userId, UserId = userId });
        // build a full list of tags
        IEnumerable<Tag> tagsAll = tagsUser.Union(tagsToAdd).ToList();

        // find existing transaction tags — guard against null Tag navigation (set when TagId-only items were added earlier in the same request)
        IEnumerable<string> tagsCurrent = transaction.TransactionTagDetails.Select(i => i.Tag).Where(i => i != null && i.Type == type).Select(i => i.Key.ToLower()).ToList();
        // find tags to add to the transaction
        IEnumerable<string> tagsAdd = tags.Except(tagsCurrent);
        // find tags to remove from the transaction
        IEnumerable<string> tagsRemove = tagsCurrent.Except(tags);

        foreach (string item in tagsAdd)
        {
            Tag tag = tagsAll.First(i => i.Key == item);
            if (tag.Id > 0)
            {
                transaction.TransactionTagDetails.Add(new TransactionTagMap() { TagId = tag.Id, CreatedBy = userId });
            }
            else
            {
                transaction.TransactionTagDetails.Add(new TransactionTagMap() { Tag = tag, CreatedBy = userId });
            }
        }

        // remove obsolete tags from the map
        foreach (string item in tagsRemove)
        {
            transaction.TransactionTagDetails.Remove(transaction.TransactionTagDetails.First(i => i.TagId == tagsAll.First(i => i.Key == item).Id));
        }
    }

}
