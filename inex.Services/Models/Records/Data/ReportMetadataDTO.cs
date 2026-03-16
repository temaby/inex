using System;
using System.Collections.Generic;
using System.Runtime.Serialization;

namespace inex.Services.Models.Records.Data;

public record ReportMetadataDTO
{
    public static readonly IReadOnlyList<string> FieldsList = new List<string>()
            {
                nameof(Start),
                nameof(End)
            };

    public string Name { get; init; } = null!;
    public string Currency { get; init; } = null!;
    public DateTime? Start { get; init; }
    public DateTime? End { get; init; }
    public decimal TotalIncome { get; init; }
    public decimal TotalOutcome { get; init; }
}