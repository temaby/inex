using inex.Controllers.Base;
using inex.Services.Helpers;
using inex.Services.Exceptions;
using Microsoft.AspNetCore.Authorization;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Report;
using inex.Services.Services.Base;
using inex.Services.Services.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Controllers;

[Route(RoutePrefix)]
[Authorize]
[Produces("application/json")]
[ApiController]
public class ReportsController : ApiControllerBase
{
    #region Routes

    public const string RoutePrefix = "api/reports";

    public const string GetCategoryReportRoute = "category";
    public const string GetMonthlyHistoryRoute = "history/{year}";
    public const string GetNetWorthRoute = "net-worth";
    public const string GetMonthlyFinancialPdfRoute = "monthly-pdf";

    #endregion Routes

    #region Constructors

    public ReportsController(
        IReportService reportService,
        ILinkedAccountReadScopeResolver readScopeResolver)
    {
        _reportService = reportService;
        _readScopeResolver = readScopeResolver;
    }

    #endregion Constructors

    /// <summary>Get category report details</summary>
    /// <param name="currency">Currency for report</param>
    /// <param name="filter">Filter items (filter=field1:value;field2:value2). Supported fields: Start, End</param>
    /// <param name="linkedUserId">Optional actively linked user whose report should be read.</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Category report details</returns>
    [HttpGet]
    [Route(GetCategoryReportRoute)]
    [ProducesResponseType(typeof(PagedResponse<CategorySummary, CategoryReportMetadata>), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetCategoryReport(
        string currency = "USD",
        string filter = "",
        int? linkedUserId = null,
        CancellationToken ct = default)
    {
        int readableUserId = _readScopeResolver.Resolve(CurrentUserId, linkedUserId);
        IDictionary<string, string> filters = FilterHelper.ParseFilter(filter, ReportMetadata.FieldsList);
        PagedResponse<CategorySummary, CategoryReportMetadata> resultsDTO = await _reportService.GetCategoriesReportData(readableUserId, currency, filters, ct);
        return Ok(resultsDTO);
    }

    /// <summary>Get monthly history report</summary>
    /// <param name="year">Year for report</param>
    /// <param name="currency">Currency for report</param>
    /// <param name="linkedUserId">Optional actively linked user whose report should be read.</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Monthly history details</returns>
    [HttpGet]
    [Route(GetMonthlyHistoryRoute)]
    [ProducesResponseType(typeof(ListResponse<MonthlyHistoryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetMonthlyHistory(
        int year,
        string currency = "USD",
        int? linkedUserId = null,
        CancellationToken ct = default)
    {
        int readableUserId = _readScopeResolver.Resolve(CurrentUserId, linkedUserId);
        return Ok(await _reportService.GetMonthlyHistory(readableUserId, year, currency, ct));
    }

    /// <summary>Get monthly historical net-worth report</summary>
    /// <param name="months">Number of months to include, from 1 to 60</param>
    /// <param name="currency">Optional report currency. Defaults to user's base currency.</param>
    /// <param name="linkedUserId">Optional actively linked user whose report should be read.</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Monthly net-worth points in the selected currency</returns>
    [HttpGet]
    [Route(GetNetWorthRoute)]
    [ProducesResponseType(typeof(ListResponse<NetWorthHistoryPointResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetNetWorth(
        [Range(1, 60)] int months = 12,
        string currency = "",
        int? linkedUserId = null,
        CancellationToken ct = default)
    {
        int readableUserId = _readScopeResolver.Resolve(CurrentUserId, linkedUserId);
        return Ok(await _reportService.GetNetWorthHistory(readableUserId, months, currency, ct));
    }

    /// <summary>Download a monthly financial report as a PDF document.</summary>
    /// <param name="year">Optional report year.</param>
    /// <param name="month">Optional report month.</param>
    /// <param name="accountIds">Optional active account IDs to include. Defaults to all active accounts.</param>
    /// <param name="linkedUserId">Optional actively linked user whose own report should be generated.</param>
    /// <param name="linkedUserIds">Optional active linked-user IDs to include. Defaults to none.</param>
    /// <param name="ct">Cancellation token.</param>
    [HttpGet]
    [Route(GetMonthlyFinancialPdfRoute)]
    [Produces("application/pdf")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMonthlyFinancialPdf(
        [Range(2, 9998)] int? year = null,
        [Range(1, 12)] int? month = null,
        [FromQuery] int[]? accountIds = null,
        int? linkedUserId = null,
        [FromQuery] int[]? linkedUserIds = null,
        CancellationToken ct = default)
    {
        if (linkedUserId.HasValue && linkedUserIds is { Length: > 0 })
        {
            throw new ValidationFailedException(
                "Linked view-as mode cannot be combined with linked-user aggregation.");
        }

        int readableUserId = _readScopeResolver.Resolve(CurrentUserId, linkedUserId);
        byte[] pdf = await _reportService.GetMonthlyFinancialReportPdf(
            readableUserId,
            year,
            month,
            ct,
            accountIds,
            linkedUserId.HasValue ? null : linkedUserIds);
        string period = $"{year ?? DateTime.UtcNow.Year:D4}-{month ?? DateTime.UtcNow.Month:D2}";
        return File(pdf, "application/pdf", $"inex-monthly-financial-report-{period}.pdf");
    }

    #region Private Fields

    private readonly IReportService _reportService;
    private readonly ILinkedAccountReadScopeResolver _readScopeResolver;

    #endregion Private Fields
}
