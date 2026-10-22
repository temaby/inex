using inex.Controllers.Base;
using inex.Services.Models.Records.Transaction;
using inex.Services.Services.Base;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace inex.Controllers;

[Authorize]
[ApiController]
[Route("api/internal-transfer-requests")]
public sealed class InternalTransferRequestsController(IInternalTransferRequestService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<InternalTransferRequestPage>> List(CancellationToken ct, int page = 1, int pageSize = 20) =>
        Ok(await service.GetAsync(CurrentUserId, page, pageSize, ct));
    [HttpPost]
    public async Task<ActionResult<InternalTransferRequestResponse>> Create(CreateLinkedInternalTransferRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, CurrentUserId, ct);
        return Created($"/api/internal-transfer-requests/{result.Id}", result);
    }
    [HttpPost("{id:int}/accept")]
    public async Task<ActionResult<InternalTransferRequestResponse>> Accept(int id, AcceptInternalTransferRequest request, CancellationToken ct) =>
        Ok(await service.DecideAsync(id, "accept", request.AccountId, CurrentUserId, ct));
    [HttpPost("{id:int}/reject")]
    public async Task<ActionResult<InternalTransferRequestResponse>> Reject(int id, CancellationToken ct) =>
        Ok(await service.DecideAsync(id, "reject", null, CurrentUserId, ct));
    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<InternalTransferRequestResponse>> Cancel(int id, CancellationToken ct) =>
        Ok(await service.DecideAsync(id, "cancel", null, CurrentUserId, ct));
}
