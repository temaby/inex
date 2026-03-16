using inex.Controllers.Base;
using inex.Services.Helpers;
using inex.Services.Models.Exceptions;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Report;
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
public class ReportsController : ApiControllerBase
{
    #region Routes

    public const string RoutePrefix = "api/reports";

    public const string GetCategoryReportRoute = "category";
    public const string GetMonthlyHistoryRoute = "history/{year}";

    #endregion Routes

    #region Constructors

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    #endregion Constructors        

    /// <summary>
    /// Get category report details
    /// </summary>        
    ///<param name="currency">Currency for report</param>
    /// <param name="filter">Filter items (filter=field1:value;field2:value2). Supported fields: Start, End</param>
    /// <returns>
    /// Category report details
    /// </returns>
    [HttpGet]
    [Route(GetCategoryReportRoute)]
    [ProducesResponseType(typeof(ResponseDataExDTO<CategoryListDetailsDTO, ReportMetadataDTO>), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetCategoryReport(string currency = "USD", string filter = "")
    {
        try
        {
            IDictionary<string, string> filters = FilterHelper.ParseFilter(filter, ReportMetadataDTO.FieldsList);
            ResponseDataExDTO<CategoryListDetailsDTO, ReportMetadataDTO> resultsDTO = await _reportService.GetCategoriesReportData(CurrentUserId, currency, filters);
            return Ok(resultsDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    /// <summary>
    /// Get monthly history report
    /// </summary>
    /// <param name="year">Year for report</param>
    /// <param name="currency">Currency for report</param>
    /// <returns>Monthly history details</returns>
    [HttpGet]
    [Route(GetMonthlyHistoryRoute)]
    [ProducesResponseType(typeof(ResponseDataDTO<MonthlyHistoryDTO>), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetMonthlyHistory(int year, string currency = "USD")
    {
        try
        {
            return Ok(await _reportService.GetMonthlyHistory(CurrentUserId, year, currency));
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    #region Private Fields

    private readonly IReportService _reportService;

    #endregion Private Fields
}
