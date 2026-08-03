using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using inex.Controllers.Base;
using inex.Extensions;
using inex.Services.Extensions;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Transaction;
using inex.Services.Services.Base;

namespace inex.Controllers;

[Route(RoutePrefix)]
[Authorize]
[Produces("application/json")]
[ApiController]
public class TransactionsController : ApiControllerBase
{
    #region Routes

    public const string RoutePrefix = "api/transactions";

    public const string GetSingleRoute = "{id}";
    public const string GetAllRoute = "";
    public const string GetSummaryRoute = "summary";

    public const string PostAddRoute = "";
    public const string PostAddTransferRoute = "transfer";

    public const string PutUpdateRoute = "{id}";

    public const string DeleteRoute = "{id}";
    public const string DeleteListRoute = "";

    #endregion Routes

    #region Constructors

    public TransactionsController(ITransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    #endregion Constructors

    /// <summary>Get transaction details</summary>
    /// <param name="id">Transaction id</param>
    /// <returns>Transaction details</returns>
    [HttpGet]
    [Route(GetSingleRoute)]
    [ProducesResponseType(typeof(TransactionResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult> Single(int id, CancellationToken ct)
    {
        TransactionResponse resultDTO = await _transactionService.GetAsync(id, CurrentUserId, ct);
        return Ok(resultDTO);
    }

    /// <summary>Get list of transactions for a user</summary>
    /// <param name="mode">Activity mode (all, active, inactive)</param>
    /// <param name="pageSize">Amount of items per page</param>
    /// <param name="page">Current page number</param>
    /// <param name="filter">Typed query filters. Supported query parameters: accountId, categoryId, tag, ref, startDate, endDate, type, search.</param>
    /// <returns>List of transactions with pagination metadata</returns>
    [HttpGet]
    [Route(GetAllRoute)]
    [ProducesResponseType(typeof(IEnumerable<TransactionResponse>), StatusCodes.Status200OK)]
    public ActionResult List(string? mode, int pageSize, int page, [FromQuery] TransactionFilterQuery filter)
    {
        ActivityMode activityMode = mode.ToEnum(ActivityMode.ALL);
        PagedResponse<TransactionResponse, PaginationMetadata> resultsDTO = _transactionService.Get(CurrentUserId, activityMode, pageSize, page, filter);
        return Ok(resultsDTO);
    }

    /// <summary>Get transaction summary for a user</summary>
    /// <param name="mode">Activity mode (all, active, inactive)</param>
    /// <param name="filter">Typed query filters. Supported query parameters: accountId, categoryId, tag, ref, startDate, endDate, type, search.</param>
    /// <returns>Transaction summary for the filtered scope</returns>
    [HttpGet]
    [Route(GetSummaryRoute)]
    [ProducesResponseType(typeof(TransactionSummaryResponse), StatusCodes.Status200OK)]
    public ActionResult Summary(string? mode, [FromQuery] TransactionFilterQuery filter)
    {
        ActivityMode activityMode = mode.ToEnum(ActivityMode.ALL);
        TransactionSummaryResponse resultDTO = _transactionService.GetSummary(CurrentUserId, activityMode, filter);
        return Ok(resultDTO);
    }

    /// <summary>Add a new transaction</summary>
    /// <param name="itemDTO">Transaction details</param>
    /// <returns>Id of a new transaction</returns>
    [HttpPost]
    [Route(PostAddRoute)]
    [ProducesResponseType(typeof(CreatedResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult> Add(CreateTransactionRequest itemDTO, CancellationToken ct)
    {
        CreatedResponse resultDTO = await _transactionService.CreateAsync(itemDTO, CurrentUserId, ct);
        return Ok(resultDTO);
    }

    /// <summary>Add a new transfer transaction</summary>
    /// <param name="itemDTO">Transfer details</param>
    /// <returns>Id of a new transaction</returns>
    [HttpPost]
    [Route(PostAddTransferRoute)]
    [ProducesResponseType(typeof(TransferResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult> Add(CreateTransferRequest itemDTO, CancellationToken ct)
    {
        TransferResponse resultDTO = await _transactionService.CreateAsync(itemDTO, CurrentUserId, ct);
        return Ok(resultDTO);
    }

    /// <summary>Update an existing transaction with new details</summary>
    /// <param name="id">Transaction id</param>
    /// <param name="itemDTO">Transaction details</param>
    /// <returns>Updated transaction details</returns>
    [HttpPut]
    [Route(PutUpdateRoute)]
    [ProducesResponseType(typeof(TransactionResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult> Update(int id, UpdateTransactionRequest itemDTO, CancellationToken ct)
    {
        TransactionResponse resultDTO = await _transactionService.UpdateAsync(id, itemDTO, CurrentUserId, ct);
        return Ok(resultDTO);
    }

    /// <summary>Delete a transaction</summary>
    /// <param name="id">Transaction id</param>
    [HttpDelete]
    [Route(DeleteRoute)]
    public async Task<ActionResult> Delete(int id, CancellationToken ct)
    {
        await _transactionService.DeleteAsync(id, CurrentUserId, ct);
        return Ok();
    }

    /// <summary>Delete a list of transactions</summary>
    /// <param name="ids">Transaction ids</param>
    [HttpDelete]
    [Route(DeleteListRoute)]
    public async Task<ActionResult> DeleteList([FromQuery] IEnumerable<int> ids, CancellationToken ct)
    {
        await _transactionService.DeleteAsync(ids, CurrentUserId, ct);
        return Ok();
    }

    #region Private Fields

    private readonly ITransactionService _transactionService;

    #endregion Private Fields
}
