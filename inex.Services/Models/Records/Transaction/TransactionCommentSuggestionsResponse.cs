namespace inex.Services.Models.Records.Transaction;

public record TransactionCommentSuggestionsResponse
{
    public IReadOnlyList<string> Suggestions { get; init; } = Array.Empty<string>();
}

public record TransactionCommentSuggestionsQuery
{
    public string? Type { get; init; }
    public string? Query { get; init; }
}
