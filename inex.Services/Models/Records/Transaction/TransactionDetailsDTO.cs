using System;
using System.Collections.Generic;
using System.Linq;

namespace inex.Services.Models.Records.Transaction;

public record TransactionDetailsDTO : TransactionUpdateDTO
{
    public static readonly IReadOnlyList<string> FieldsList = new List<string>()
            {
                nameof(Id),
                nameof(AccountId),
                nameof(CategoryId),
                nameof(Tags),
                nameof(Refs),
                "Start",
                "End"
            };

    public IEnumerable<string> Refs => Comment?.Split(" ", StringSplitOptions.RemoveEmptyEntries).Select(i => i.Trim()).Where(i => i.StartsWith("@")).Distinct().Select(i => i[1..]) ?? new List<string>();
    public IEnumerable<string> Tags => Comment?.Split(" ", StringSplitOptions.RemoveEmptyEntries).Select(i => i.Trim()).Where(i => i.StartsWith("#")).Distinct().Select(i => i[1..]) ?? new List<string>();

    public string AccountCurrency { get; init; } = null!;
}