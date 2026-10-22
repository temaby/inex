using inex.Data.Models.Base;
namespace inex.Data.Models;

public enum InternalTransferRequestStatus { Pending, Accepted, Rejected, Cancelled }

/// <summary>Immutable original terms, independent of the mutable ledger postings.</summary>
public class InternalTransferRequest : AuditableEntity
{
    public int Id { get; set; }
    public int MasterUserId { get; set; }
    public int LinkedUserId { get; set; }
    public string MasterUsername { get; set; } = string.Empty;
    public string LinkedUsername { get; set; } = string.Empty;
    public int? AcceptedAccountId { get; set; }
    public int LinkId { get; set; }
    public string SubmissionKey { get; set; } = string.Empty;
    public int OriginalAccountId { get; set; }
    public int CurrencyId { get; set; }
    public string Currency { get; set; } = string.Empty;
    public decimal MasterValue { get; set; }
    public DateTime OperationDate { get; set; }
    public string? OriginalComment { get; set; }
    public int? MasterTransactionId { get; set; }
    public int? LinkedTransactionId { get; set; }
    public Transaction? MasterTransaction { get; set; }
    public Transaction? LinkedTransaction { get; set; }
    public InternalTransferRequestStatus Status { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime? DecidedAt { get; set; }
    public int? DecidedBy { get; set; }
    public Guid Version { get; set; } = Guid.NewGuid();
}
