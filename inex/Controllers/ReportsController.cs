using inex.Controllers.Base;
using inex.Services.Helpers;
using Microsoft.AspNetCore.Authorization;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Report;
using inex.Services.Services.Base;
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
    public const string GetSpendingHeatmapRoute = "spending-heatmap";
    public const string GetNetWorthRoute = "net-worth";
    public const string GetMonthlyFinancialPdfRoute = "monthly-pdf";

    #endregion Routes

    #region Constructors

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    #endregion Constructors

    /// <summary>Get category report details</summary>
    /// <param name="currency">Currency for report</param>
    /// <param name="filter">Filter items (filter=field1:value;field2:value2). Supported fields: Start, End</param>
    /// <returns>Category report details</returns>
    [HttpGet]
    [Route(GetCategoryReportRoute)]
    [ProducesResponseType(typeof(PagedResponse<CategorySummary, ReportMetadata>), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetCategoryReport(string currency = "USD", string filter = "", CancellationToken ct = default)
    {
        IDictionary<string, string> filters = FilterHelper.ParseFilter(filter, ReportMetadata.FieldsList);
        PagedResponse<CategorySummary, ReportMetadata> resultsDTO = await _reportService.GetCategoriesReportData(CurrentUserId, currency, filters, ct);
        return Ok(resultsDTO);
    }

    /// <summary>Get monthly history report</summary>
    /// <param name="year">Year for report</param>
    /// <param name="currency">Currency for report</param>
    /// <returns>Monthly history details</returns>
    [HttpGet]
    [Route(GetMonthlyHistoryRoute)]
    [ProducesResponseType(typeof(ListResponse<MonthlyHistoryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetMonthlyHistory(int year, string currency = "USD", CancellationToken ct = default)
    {
        return Ok(await _reportService.GetMonthlyHistory(CurrentUserId, year, currency, ct));
    }

    /// <summary>Get daily spending heatmap report</summary>
    /// <param name="start">Inclusive start date</param>
    /// <param name="end">Inclusive end date</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Daily spending totals in the user's base currency</returns>
    [HttpGet]
    [Route(GetSpendingHeatmapRoute)]
    [ProducesResponseType(typeof(PagedResponse<SpendingHeatmapDayResponse, ReportMetadata>), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetSpendingHeatmap(DateTime? start = null, DateTime? end = null, CancellationToken ct = default)
    {
        DateTime endDate = (end ?? DateTime.UtcNow).Date;
        DateTime startDate = (start ?? endDate.AddMonths(-12)).Date;
        return Ok(await _reportService.GetSpendingHeatmap(CurrentUserId, startDate, endDate, ct));
    }

    /// <summary>Get monthly historical net-worth report</summary>
    /// <param name="months">Number of months to include, from 1 to 60</param>
    /// <param name="currency">Optional report currency. Defaults to user's base currency.</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Monthly net-worth points in the selected currency</returns>
    [HttpGet]
    [Route(GetNetWorthRoute)]
    [ProducesResponseType(typeof(ListResponse<NetWorthHistoryPointResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetNetWorth([Range(1, 60)] int months = 12, string currency = "", CancellationToken ct = default)
    {
        return Ok(await _reportService.GetNetWorthHistory(CurrentUserId, months, currency, ct));
    }

    /// <summary>Download a monthly financial report as a PDF document.</summary>
    /// <param name="year">Optional report year.</param>
    /// <param name="month">Optional report month.</param>
    /// <param name="accountIds">Optional active account IDs to include. Defaults to all active accounts.</param>
    /// <param name="ct">Cancellation token.</param>
    [HttpGet]
    [Route(GetMonthlyFinancialPdfRoute)]
    [Produces("application/pdf")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMonthlyFinancialPdf([Range(2, 9998)] int? year = null, [Range(1, 12)] int? month = null, [FromQuery] int[]? accountIds = null, CancellationToken ct = default)
    {
        byte[] pdf = await _reportService.GetMonthlyFinancialReportPdf(CurrentUserId, year, month, ct, accountIds);
        string period = $"{year ?? DateTime.UtcNow.Year:D4}-{month ?? DateTime.UtcNow.Month:D2}";
        return File(pdf, "application/pdf", $"inex-monthly-financial-report-{period}.pdf");
    }

    #region Private Fields

    private readonly IReportService _reportService;

    #endregion Private Fields
}
