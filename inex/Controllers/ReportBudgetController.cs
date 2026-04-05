using inex.Controllers.Base;
using Microsoft.AspNetCore.Authorization;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Report;
using inex.Services.Services.Base;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace inex.Controllers;

[Route(RoutePrefix)]
[Authorize]
[Produces("application/json")]
[ApiController]
public class ReportBudgetController : ApiControllerBase
{
    #region Routes

    public const string RoutePrefix = "api/reports/budget";

    public const string GetComparisonRoute = "comparison";

    #endregion Routes

    private readonly IBudgetReportService _budgetReportService;

    public ReportBudgetController(IBudgetReportService budgetReportService)
    {
        _budgetReportService = budgetReportService;
    }

    /// <summary>Get budget comparison report</summary>
    /// <param name="year">Year</param>
    /// <param name="month">Month</param>
    /// <param name="currency">Currency</param>
    /// <returns>Budget comparison report</returns>
    [HttpGet]
    [Route(GetComparisonRoute)]
    [ProducesResponseType(typeof(PagedResponse<BudgetComparisonDTO, ReportMetadataDTO>), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetComparison(int year, int month, string currency = "USD", CancellationToken ct = default)
    {
        var result = await _budgetReportService.GetBudgetComparison(CurrentUserId, year, month, currency, ct);
        return Ok(result);
    }
}
