using inex.Controllers.Base;
using inex.Services.Models.Exceptions;
using inex.Services.Services.Base;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;
using inex.Services.Models.Records.Budget;
using inex.Services.Models.Records.Data;
using System.Collections.Generic;
using inex.Services.Models.Records.Base;

namespace inex.Controllers;

[Route(RoutePrefix)]
[Produces("application/json")]
[ApiController]
public class BudgetsController : ApiControllerBase
{
    #region Routes

    public const string RoutePrefix = "api/budgets";

    public const string GetSingleRoute = "{id}";
    public const string GetAllRoute = "";

    public const string PostAddRoute = "";
    public const string PostCopyRoute = "copy";

    public const string PutUpdateRoute = "{id}";

    public const string DeleteRoute = "{id}";
    public const string DeleteListRoute = "";

    #endregion Routes

    #region Constructors

    public BudgetsController(IBudgetService budgetService)
    {
        _budgetService = budgetService;
    }

    #endregion Constructors

    /// <summary>Get budget details</summary>
    /// <param name="id">Budget id</param>
    /// <returns>Budget details</returns>
    [HttpGet]
    [Route(GetSingleRoute)]
    [ProducesResponseType(typeof(BudgetDetailsDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Single(int id)
    {
        try
        {
            BudgetDetailsDTO resultDTO = await _budgetService.GetAsync(id);
            return Ok(resultDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>Get list of budgets for a user</summary>
    /// <returns>List of budgets with pagination metadata</returns>
    [HttpGet]
    [Route(GetAllRoute)]
    [ProducesResponseType(typeof(IEnumerable<BudgetDetailsDTO>), StatusCodes.Status200OK)]
    public ActionResult List(int? year = null, int? month = null)
    {
        try
        {
            ResponseDataDTO<BudgetDetailsDTO> resultsDTO = _budgetService.Get(CurrentUserId, year, month);
            return Ok(resultsDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>Add a new budget</summary>
    /// <param name="itemDTO">Budget details</param>
    /// <returns>Id of a new budget</returns>
    [HttpPost]
    [Route(PostAddRoute)]
    [ProducesResponseType(typeof(ResponseCreateDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Add(BudgetCreateDTO itemDTO)
    {
        try
        {
            ResponseCreateDTO resultDTO = await _budgetService.CreateAsync(itemDTO, CurrentUserId);
            return Ok(resultDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>Copy budgets from one month to another</summary>
    [HttpPost]
    [Route(PostCopyRoute)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult> Copy(int sourceYear, int sourceMonth, int targetYear, int targetMonth)
    {
        try
        {
            await _budgetService.CopyBudgetsAsync(CurrentUserId, sourceYear, sourceMonth, targetYear, targetMonth);
            return Ok();
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>Update an existing budget with new details</summary>
    /// <param name="id">Budget id</param>
    /// <param name="itemDTO">Budget details</param>
    /// <returns>Updated budget details</returns>
    [HttpPut]
    [Route(PutUpdateRoute)]
    [ProducesResponseType(typeof(BudgetDetailsDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Update(int id, BudgetUpdateDTO itemDTO)
    {
        try
        {
            BudgetDetailsDTO resultDTO = await _budgetService.UpdateAsync(id, itemDTO, CurrentUserId);
            return Ok(resultDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>Delete a budget</summary>
    /// <param name="id">Budget id</param>
    [HttpDelete]
    [Route(DeleteRoute)]
    public async Task<ActionResult> Delete(int id)
    {
        try
        {
            await _budgetService.DeleteAsync(id);
            return Ok();
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>Delete a list of budgets</summary>
    /// <param name="ids">List of budget ids</param>
    [HttpDelete]
    [Route(DeleteListRoute)]
    public async Task<ActionResult> DeleteList([FromQuery] IEnumerable<int> ids)
    {
        try
        {
            await _budgetService.DeleteAsync(ids);
            return Ok();
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    #region Private Fields

    private readonly IBudgetService _budgetService;

    #endregion Private Fields
}
