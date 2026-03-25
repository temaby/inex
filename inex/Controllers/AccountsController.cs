using inex.Controllers.Base;
using inex.Services.Extensions;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Data;
using inex.Services.Services.Base;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Controllers;

[Route(RoutePrefix)]
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

    public AccountsController(IAccountService accountService)
    {
        _accountService = accountService;
    }

    #endregion Constructors

    /// <summary>Get account details</summary>
    /// <param name="id">Account id</param>
    /// <returns>Account details</returns>
    [HttpGet]
    [Route(GetSingleRoute)]
    [ProducesResponseType(typeof(AccountDetailsDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Single(int id)
    {
        AccountDetailsDTO resultDTO = await _accountService.GetAsync(id);
        return Ok(resultDTO);
    }

    /// <summary>Get list of accounts for a user</summary>
    /// <param name="mode">Activity mode (all, active, inactive)</param>
    /// <returns>List of accounts</returns>
    [HttpGet]
    [Route(GetAllRoute)]
    [ProducesResponseType(typeof(ResponseDataDTO<AccountDetailsDTO>), StatusCodes.Status200OK)]
    public ActionResult List(string mode)
    {
        ActivityMode activityMode = mode.ToEnum(ActivityMode.ALL);
        ResponseDataDTO<AccountDetailsDTO> resultsDTO = _accountService.Get(CurrentUserId, activityMode);
        return Ok(resultsDTO);
    }

    /// <summary>Get details for a list of accounts for a user</summary>
    /// <param name="ids">Account ids</param>
    /// <returns>List of accounts with status</returns>
    [HttpGet]
    [Route(GetStatusRoute)]
    [ProducesResponseType(typeof(ResponseDataDTO<AccountListDetailsDTO>), StatusCodes.Status200OK)]
    public ActionResult DetailsForList([FromQuery] IEnumerable<int> ids)
    {
        ResponseDataDTO<AccountListDetailsDTO> resultsDTO = _accountService.GetDetails(CurrentUserId, ids);
        return Ok(resultsDTO);
    }

    /// <summary>Add a new account</summary>
    /// <param name="itemDTO">Account details</param>
    /// <returns>Id of a new account</returns>
    [HttpPost]
    [Route(PostAddRoute)]
    [ProducesResponseType(typeof(ResponseCreateDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Add(AccountCreateDTO itemDTO)
    {
        ResponseCreateDTO resultDTO = await _accountService.CreateAsync(itemDTO, CurrentUserId);
        return Ok(resultDTO);
    }

    /// <summary>Update an existing account with new details</summary>
    /// <param name="id">Account id</param>
    /// <param name="itemDTO">Account details</param>
    /// <returns>Updated account details</returns>
    [HttpPut]
    [Route(PutUpdateRoute)]
    [ProducesResponseType(typeof(AccountDetailsDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Update(int id, AccountUpdateDTO itemDTO)
    {
        AccountDetailsDTO resultDTO = await _accountService.UpdateAsync(id, itemDTO, CurrentUserId);
        return Ok(resultDTO);
    }

    /// <summary>Delete an account</summary>
    /// <param name="id">Account id</param>
    [HttpDelete]
    [Route(DeleteRoute)]
    public async Task<ActionResult> Delete(int id)
    {
        await _accountService.DeleteAsync(id);
        return Ok();
    }

    /// <summary>Delete a list of accounts</summary>
    /// <param name="ids">Account ids</param>
    [HttpDelete]
    [Route(DeleteListRoute)]
    public async Task<ActionResult> DeleteList([FromQuery] IEnumerable<int> ids)
    {
        await _accountService.DeleteAsync(ids);
        return Ok();
    }

    #region Private Fields

    private readonly IAccountService _accountService;

    #endregion Private Fields
}
