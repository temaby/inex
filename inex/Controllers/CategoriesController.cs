using inex.Controllers.Base;
using inex.Services.Extensions;
using inex.Services.Models.Enums;
using inex.Services.Models.Exceptions;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Services.Base;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Controllers;

[Route(RoutePrefix)]
[Produces("application/json")]
[ApiController]
public class CategoriesController : ApiControllerBase
{
    #region Routes

    public const string RoutePrefix = "api/categories";

    public const string GetSingleRoute = "{id}";
    public const string GetAllRoute = "";

    public const string PostAddRoute = "";

    public const string PutUpdateRoute = "{id}";

    public const string DeleteRoute = "{id}";
    public const string DeleteListRoute = "";

    #endregion Routes

    #region Constructors

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    #endregion Constructors

    /// <summary>
    /// Get category details
    /// </summary>
    /// <param name="id">Category id</param>
    /// <returns>
    /// Category details
    /// </returns>
    [HttpGet]
    [Route(GetSingleRoute)]
    [ProducesResponseType(typeof(CategoryDetailsDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Single(int id)
    {
        try
        {
            CategoryDetailsDTO resultDTO = await _categoryService.GetAsync(id);
            return Ok(resultDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>
    /// Get list of categories for a user
    /// </summary>
    /// <param name="mode">Activity mode (all, active, inactive)</param>
    /// <returns>
    /// List of categories with pagination metadata
    /// </returns>
    [HttpGet]
    [Route(GetAllRoute)]
    [ProducesResponseType(typeof(IEnumerable<CategoryDetailsDTO>), StatusCodes.Status200OK)]
    public ActionResult List(string mode)
    {
        try
        {
            ActivityMode activityMode = mode.ToEnum(ActivityMode.ALL);
            ResponseDataDTO<CategoryDetailsDTO> resultsDTO = _categoryService.Get(CurrentUserId, activityMode);
            return Ok(resultsDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>
    /// Add a new category
    /// </summary>
    /// <param name="itemDTO">Category details</param>
    /// <returns>
    /// Id of a new category
    /// </returns>
    [HttpPost]
    [Route(PostAddRoute)]
    [ProducesResponseType(typeof(ResponseCreateDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Add(CategoryCreateDTO itemDTO)
    {
        try
        {
            ResponseCreateDTO resultDTO = await _categoryService.CreateAsync(itemDTO, CurrentUserId);
            return Ok(resultDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>
    /// Update an existing category with new details
    /// </summary>
    /// <param name="id">Category id</param>
    /// <param name="itemDTO">Category details</param>
    /// <returns>
    /// Updated category details
    /// </returns>
    [HttpPut]
    [Route(PutUpdateRoute)]
    [ProducesResponseType(typeof(CategoryDetailsDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Update(int id, CategoryUpdateDTO itemDTO)
    {
        try
        {
            CategoryDetailsDTO resultDTO = await _categoryService.UpdateAsync(id, itemDTO, CurrentUserId);
            return Ok(resultDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>
    /// Delete a category
    /// </summary>
    /// <param name="id">Category id</param>
    [HttpDelete]
    [Route(DeleteRoute)]
    public async Task<ActionResult> Delete(int id)
    {
        try
        {
            await _categoryService.DeleteAsync(id);
            return Ok();
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>
    /// Delete a category
    /// </summary>
    /// <param name="ids">Category ids</param>
    [HttpDelete]
    [Route(DeleteListRoute)]
    public async Task<ActionResult> DeleteList([FromQuery] IEnumerable<int> ids)
    {
        try
        {
            await _categoryService.DeleteAsync(ids);
            return Ok();
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    #region Private Fields

    private readonly ICategoryService _categoryService;

    #endregion Private Fields
}