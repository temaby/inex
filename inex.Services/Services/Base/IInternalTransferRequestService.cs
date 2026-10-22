using inex.Services.Models.Records.Transaction;
namespace inex.Services.Services.Base;
public interface IInternalTransferRequestService : IInExService
{
    Task<InternalTransferRequestResponse> CreateAsync(CreateLinkedInternalTransferRequest request, int userId, CancellationToken ct);
    Task<InternalTransferRequestPage> GetAsync(int userId, int page, int pageSize, CancellationToken ct);
    Task<InternalTransferRequestResponse> DecideAsync(int id, string decision, int? accountId, int userId, CancellationToken ct);
}
