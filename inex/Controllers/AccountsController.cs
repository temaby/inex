using inex.Controllers.Base;
using inex.Services.Extensions;
using Microsoft.AspNetCore.Authorization;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Data;
using inex.Services.Services.Base;
using inex.Services.Services.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Controllers;

[Route(RoutePrefix)]
[Authorize]
[Produces("application/json")]
[ApiController]
public class AccountsController : ApiControllerBase
{
    #region Routes

    public const string RoutePrefix = "api/accounts";

    public const string GetSingleRoute = "{id}";
    public const string GetAllRoute = "";
    public const string GetStatusRoute = "details";

    public const string PostAddRoute = "";

    public const string PutUpdateRoute = "{id}";

    public const string DeleteRoute = "{id}";
    public const string DeleteListRoute = "";

    #endregion Routes

    #region Constructors

    public AccountsController(
        IAccountService accountService,
        ILinkedAccountReadScopeResolver readScopeResolver)
    {
        _accountService = accountService;
        _readScopeResolver = readScopeResolver;
    }

    #endregion Constructors

    /// <summary>Get account details</summary>
    /// <param name="id">Account id</param>
    /// <returns>Account details</returns>
    [HttpGet]
    [Route(GetSingleRoute)]
    [ProducesResponseType(typeof(AccountResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult> Single(int id, CancellationToken ct)
    {
        AccountResponse resultDTO = await _accountService.GetAsync(id, CurrentUserId, ct);
        return Ok(resultDTO);
    }

    /// <summary>Get list of accounts for a user</summary>
    /// <param name="mode">Activity mode (all, active, inactive)</param>
    /// <param name="linkedUserId">Optional actively linked user whose accounts should be read</param>
    /// <returns>List of accounts</returns>
    [HttpGet]
    [Route(GetAllRoute)]
    [ProducesResponseType(typeof(ListResponse<AccountResponse>), StatusCodes.Status200OK)]
    public ActionResult List(string mode, int? linkedUserId)
    {
        ActivityMode activityMode = mode.ToEnum(ActivityMode.ALL);
        int readableUserId = _readScopeResolver.Resolve(CurrentUserId, linkedUserId);
        ListResponse<AccountResponse> resultsDTO = _accountService.Get(readableUserId, activityMode);
        return Ok(resultsDTO);
    }

    /// <summary>Get details for a list of accounts for a user</summary>
    /// <param name="ids">Account ids</param>
    /// <param name="linkedUserId">Optional actively linked user whose account summaries should be read</param>
    /// <returns>List of accounts with status</returns>
    [HttpGet]
    [Route(GetStatusRoute)]
    [ProducesResponseType(typeof(ListResponse<AccountSummary>), StatusCodes.Status200OK)]
    public ActionResult DetailsForList([FromQuery] IEnumerable<int> ids, int? linkedUserId)
    {
        int readableUserId = _readScopeResolver.Resolve(CurrentUserId, linkedUserId);
        ListResponse<AccountSummary> resultsDTO = _accountService.GetDetails(readableUserId, ids);
        return Ok(resultsDTO);
    }

    /// <summary>Add a new account</summary>
    /// <param name="itemDTO">Account details</param>
    /// <returns>Id of a new account</returns>
    [HttpPost]
    [Route(PostAddRoute)]
    [ProducesResponseType(typeof(CreatedResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult> Add(CreateAccountRequest itemDTO, CancellationToken ct)
    {
        CreatedResponse resultDTO = await _accountService.CreateAsync(itemDTO, CurrentUserId, ct);
        return Ok(resultDTO);
    }

    /// <summary>Update an existing account with new details</summary>
    /// <param name="id">Account id</param>
    /// <param name="itemDTO">Account details</param>
    /// <returns>Updated account details</returns>
    [HttpPut]
    [Route(PutUpdateRoute)]
    [ProducesResponseType(typeof(AccountResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult> Update(int id, UpdateAccountRequest itemDTO, CancellationToken ct)
    {
        AccountResponse resultDTO = await _accountService.UpdateAsync(id, itemDTO, CurrentUserId, ct);
        return Ok(resultDTO);
    }

    /// <summary>Delete an account</summary>
    /// <param name="id">Account id</param>
    [HttpDelete]
    [Route(DeleteRoute)]
    public async Task<ActionResult> Delete(int id, CancellationToken ct)
    {
        await _accountService.DeleteAsync(id, CurrentUserId, ct);
        return Ok();
    }

    /// <summary>Delete a list of accounts</summary>
    /// <param name="ids">Account ids</param>
    [HttpDelete]
    [Route(DeleteListRoute)]
    public async Task<ActionResult> DeleteList([FromQuery] IEnumerable<int> ids, CancellationToken ct)
    {
        await _accountService.DeleteAsync(ids, CurrentUserId, ct);
        return Ok();
    }

    #region Private Fields

    private readonly IAccountService _accountService;
    private readonly ILinkedAccountReadScopeResolver _readScopeResolver;

    #endregion Private Fields
}
