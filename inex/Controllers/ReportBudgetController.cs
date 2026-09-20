using inex.Controllers.Base;
using Microsoft.AspNetCore.Authorization;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Report;
using inex.Services.Services.Base;
using inex.Services.Services.Authorization;
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
    private readonly ILinkedAccountReadScopeResolver _readScopeResolver;

    public ReportBudgetController(
        IBudgetReportService budgetReportService,
        ILinkedAccountReadScopeResolver readScopeResolver)
    {
        _budgetReportService = budgetReportService;
        _readScopeResolver = readScopeResolver;
    }

    /// <summary>Get budget comparison report</summary>
    /// <param name="year">Year</param>
    /// <param name="month">Month</param>
    /// <param name="currency">Currency</param>
    /// <param name="linkedUserId">Optional actively linked user whose budget comparison should be read</param>
    /// <returns>Budget comparison report</returns>
    [HttpGet]
    [Route(GetComparisonRoute)]
    [ProducesResponseType(typeof(PagedResponse<BudgetComparisonResponse, ReportMetadata>), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetComparison(
        int year,
        int month,
        string currency = "USD",
        int? linkedUserId = null,
        CancellationToken ct = default)
    {
        int readableUserId = _readScopeResolver.Resolve(CurrentUserId, linkedUserId);
        var result = await _budgetReportService.GetBudgetComparison(readableUserId, year, month, currency, ct);
        return Ok(result);
    }
}
