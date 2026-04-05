using System.Collections.Generic;
using System.Threading.Tasks;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Transaction;

namespace inex.Services.Services.Base;

public interface ITransactionService : IInExService
{
    Task<TransactionDetailsDTO> GetAsync(int id, CancellationToken ct = default);
    ListResponse<TransactionDetailsDTO> Get(int userId, ActivityMode mode, IDictionary<string, string> filters);
    PagedResponse<TransactionDetailsDTO, PaginationMetadataDTO> Get(int userId, ActivityMode mode, int pageSize, int pageNumber, IDictionary<string, string> filters);
    Task<CreatedResponse> CreateAsync(TransactionCreateDTO itemDTO, int userId, CancellationToken ct = default);
    Task<ResponseTransferDTO> CreateAsync(TransferCreateDTO itemDTO, int userId, CancellationToken ct = default);
    Task<TransactionDetailsDTO> UpdateAsync(int id, TransactionUpdateDTO itemDTO, int userId, CancellationToken ct = default);
}