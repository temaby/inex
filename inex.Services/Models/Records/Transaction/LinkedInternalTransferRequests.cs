namespace inex.Services.Models.Records.Transaction;

public record CreateLinkedInternalTransferRequest : CreateInternalTransferRequest
{
    public int LinkedUserId { get; init; }
    public string SubmissionKey { get; init; } = string.Empty;
}
public record AcceptInternalTransferRequest(int AccountId);
public record InternalTransferRequestResponse(
    int Id, int MasterUserId, int LinkedUserId, string MasterUsername, string LinkedUsername, string Status,
    decimal MasterValue, string Currency, DateTime OperationDate, string? Comment,
    int? MasterTransactionId, int? LinkedTransactionId, DateTime RequestedAt,
    DateTime? DecidedAt, int? DecidedBy, bool CanAccept);
public record InternalTransferRequestPage(IEnumerable<InternalTransferRequestResponse> Data, int TotalItems, int TotalPending, int Page, int PageSize);
