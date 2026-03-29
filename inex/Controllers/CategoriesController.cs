using inex.Controllers.Base;
using inex.Services.Extensions;
using Microsoft.AspNetCore.Authorization;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Services.Base;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Controllers;

[Route(RoutePrefix)]
[Authorize]
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

    /// <summary>Get category details</summary>
    /// <param name="id">Category id</param>
    /// <returns>Category details</returns>
    [HttpGet]
    [Route(GetSingleRoute)]
    [ProducesResponseType(typeof(CategoryDetailsDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Single(int id)
    {
        CategoryDetailsDTO resultDTO = await _categoryService.GetAsync(id);
        return Ok(resultDTO);
    }

    /// <summary>Get list of categories for a user</summary>
    /// <param name="mode">Activity mode (all, active, inactive)</param>
    /// <returns>List of categories</returns>
    [HttpGet]
    [Route(GetAllRoute)]
    [ProducesResponseType(typeof(IEnumerable<CategoryDetailsDTO>), StatusCodes.Status200OK)]
    public ActionResult List(string mode)
    {
        ActivityMode activityMode = mode.ToEnum(ActivityMode.ALL);
        ListResponse<CategoryDetailsDTO> resultsDTO = _categoryService.Get(CurrentUserId, activityMode);
        return Ok(resultsDTO);
    }

    /// <summary>Add a new category</summary>
    /// <param name="itemDTO">Category details</param>
    /// <returns>Id of a new category</returns>
    [HttpPost]
    [Route(PostAddRoute)]
    [ProducesResponseType(typeof(CreatedResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult> Add(CategoryCreateDTO itemDTO)
    {
        CreatedResponse resultDTO = await _categoryService.CreateAsync(itemDTO, CurrentUserId);
        return Ok(resultDTO);
    }

    /// <summary>Update an existing category with new details</summary>
    /// <param name="id">Category id</param>
    /// <param name="itemDTO">Category details</param>
    /// <returns>Updated category details</returns>
    [HttpPut]
    [Route(PutUpdateRoute)]
    [ProducesResponseType(typeof(CategoryDetailsDTO), StatusCodes.Status200OK)]
    public async Task<ActionResult> Update(int id, CategoryUpdateDTO itemDTO)
    {
        CategoryDetailsDTO resultDTO = await _categoryService.UpdateAsync(id, itemDTO, CurrentUserId);
        return Ok(resultDTO);
    }

    /// <summary>Delete a category</summary>
    /// <param name="id">Category id</param>
    [HttpDelete]
    [Route(DeleteRoute)]
    public async Task<ActionResult> Delete(int id)
    {
        await _categoryService.DeleteAsync(id);
        return Ok();
    }

    /// <summary>Delete a list of categories</summary>
    /// <param name="ids">Category ids</param>
    [HttpDelete]
    [Route(DeleteListRoute)]
    public async Task<ActionResult> DeleteList([FromQuery] IEnumerable<int> ids)
    {
        await _categoryService.DeleteAsync(ids);
        return Ok();
    }

    #region Private Fields

    private readonly ICategoryService _categoryService;

    #endregion Private Fields
}
