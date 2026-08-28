using System;

namespace inex.Services.Models.Records.Transaction;

/// <summary>
/// Records one user-owned side of a transfer between separately managed users.
/// </summary>
public record CreateInternalTransferRequest
{
    public int AccountId { get; init; }
    public DateTime Created { get; init; }
    public decimal Amount { get; init; }
    public string Direction { get; init; } = string.Empty;
    public string? Comment { get; init; }
}
