using Microsoft.AspNetCore.Mvc;
using System;

namespace inex.Services.Models.Records.Transaction;

public record TransactionFilterQuery
{
    [FromQuery(Name = "accountId")]
    public int[]? AccountIds { get; init; }

    [FromQuery(Name = "categoryId")]
    public int[]? CategoryIds { get; init; }

    [FromQuery(Name = "tag")]
    public string[]? Tags { get; init; }

    [FromQuery(Name = "ref")]
    public string[]? Refs { get; init; }

    [FromQuery(Name = "startDate")]
    public DateTime? StartDate { get; init; }

    [FromQuery(Name = "endDate")]
    public DateTime? EndDate { get; init; }

    [FromQuery(Name = "type")]
    public string? Type { get; init; }

    [FromQuery(Name = "search")]
    public string? Search { get; init; }
}
