using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using inex.Controllers.Base;
using inex.Extensions;
using inex.Services.Extensions;
using inex.Services.Models.Enums;
using inex.Services.Models.Exceptions;
using inex.Services.Models.Exceptions.Base;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Transaction;
using inex.Services.Services.Base;
using inex.Services.Helpers;

namespace inex.Controllers;

[Route(RoutePrefix)]
[Produces("application/json")]
[ApiController]
public class TransactionsController : ApiControllerBase
{
    #region Routes

    public const string RoutePrefix = "api/transactions";

    public const string GetSingleRoute = "{id}";
    public const string GetAllRoute = "";

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

    /// <summary>
    /// Get transaction details
    /// </summary>
    /// <param name="id">Transaction id</param>
    /// <returns>
    /// Transaction details
    /// </returns>
    [HttpGet]
    [Route(GetSingleRoute)]
    [ProducesResponseType(typeof(TransactionDetailsDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Single(int id)
    {
        try
        {
            TransactionDetailsDTO resultDTO = await _transactionService.GetAsync(id);
            return Ok(resultDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>
    /// Get list of transactions for a user
    /// </summary>
    /// <param name="mode">Activity mode (all, active, inactive)</param>
    /// <param name="pageSize">Amount of items per page</param>
    /// <param name="pageNumber">Current page number</param>
    /// <param name="filter">Filter items (filter=field1:value;field2:value2). Supported fields: AccountId, CategoryId, Start, End</param>
    /// <returns>
    /// List of transactions with pagination metadata
    /// </returns>
    [HttpGet]
    [Route(GetAllRoute)]
    [ProducesResponseType(typeof(IEnumerable<TransactionDetailsDTO>), StatusCodes.Status200OK)]
    public ActionResult List(string? mode, int pageSize, int pageNumber, string? filter)
    {
        try
        {
            IDictionary<string, string> filters = FilterHelper.ParseFilter(filter, TransactionDetailsDTO.FieldsList);
            ActivityMode activityMode = mode.ToEnum(ActivityMode.ALL);

            ResponseDataExDTO<TransactionDetailsDTO, PaginationMetadataDTO> resultsDTO = _transactionService.Get(CurrentUserId, activityMode, pageSize, pageNumber, filters);
            return Ok(resultsDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>
    /// Add a new transaction
    /// </summary>
    /// <param name="itemDTO">Transaction details</param>
    /// <returns>
    /// Id of a new transaction
    /// </returns>
    [HttpPost]
    [Route(PostAddRoute)]
    [ProducesResponseType(typeof(ResponseCreateDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Add(TransactionCreateDTO itemDTO)
    {
        try
        {
            ResponseCreateDTO resultDTO = await _transactionService.CreateAsync(itemDTO, CurrentUserId);
            return Ok(resultDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>
    /// Add a new transfer transaction
    /// </summary>
    /// <param name="itemDTO">Transfer details</param>
    /// <returns>
    /// Id of a new transaction
    /// </returns>
    [HttpPost]
    [Route(PostAddTransferRoute)]
    [ProducesResponseType(typeof(ResponseTransferDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Add(TransferCreateDTO itemDTO)
    {
        try
        {
            ResponseTransferDTO resultDTO = await _transactionService.CreateAsync(itemDTO, CurrentUserId);
            return Ok(resultDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>
    /// Update an existing transaction with new details
    /// </summary>
    /// <param name="id">Transaction id</param>
    /// <param name="itemDTO">Transaction details</param>
    /// <returns>
    /// Updated transaction details
    /// </returns>
    [HttpPut]
    [Route(PutUpdateRoute)]
    [ProducesResponseType(typeof(TransactionDetailsDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Update(int id, TransactionUpdateDTO itemDTO)
    {
        try
        {
            TransactionDetailsDTO resultDTO = await _transactionService.UpdateAsync(id, itemDTO, CurrentUserId);
            return Ok(resultDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>
    /// Delete a transaction
    /// </summary>
    /// <param name="id">Transaction id</param>
    [HttpDelete]
    [Route(DeleteRoute)]
    public async Task<ActionResult> Delete(int id)
    {
        try
        {
            await _transactionService.DeleteAsync(id);
            return Ok();
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>
    /// Delete a transaction
    /// </summary>
    /// <param name="ids">Transaction ids</param>
    [HttpDelete]
    [Route(DeleteListRoute)]
    public async Task<ActionResult> DeleteList([FromQuery] IEnumerable<int> ids)
    {
        try
        {
            await _transactionService.DeleteAsync(ids);
            return Ok();
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    #region Private Fields

    private readonly ITransactionService _transactionService;

    #endregion Private Fields
}

