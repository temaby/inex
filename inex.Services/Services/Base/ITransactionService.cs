using System.Collections.Generic;
using System.Threading.Tasks;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Transaction;

namespace inex.Services.Services.Base;

public interface ITransactionService : IInExService
{
    Task<TransactionResponse> GetAsync(int id, int userId, CancellationToken ct = default);
    ListResponse<TransactionResponse> Get(int userId, ActivityMode mode, IDictionary<string, string> filters);
    PagedResponse<TransactionResponse, PaginationMetadata> Get(int userId, ActivityMode mode, int pageSize, int pageNumber, IDictionary<string, string> filters);
    Task<CreatedResponse> CreateAsync(CreateTransactionRequest itemDTO, int userId, CancellationToken ct = default);
    Task<TransferResponse> CreateAsync(CreateTransferRequest itemDTO, int userId, CancellationToken ct = default);
    Task<TransactionResponse> UpdateAsync(int id, UpdateTransactionRequest itemDTO, int userId, CancellationToken ct = default);
}
