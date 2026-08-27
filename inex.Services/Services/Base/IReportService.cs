using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Report;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public interface IReportService : IDisposable
{
    Task<PagedResponse<CategorySummary, ReportMetadata>> GetCategoriesReportData(int userId, string currency, IDictionary<string, string> filters, CancellationToken ct = default);
    Task<ListResponse<MonthlyHistoryResponse>> GetMonthlyHistory(int userId, int year, string currency, CancellationToken ct = default);
    Task<PagedResponse<SpendingHeatmapDayResponse, ReportMetadata>> GetSpendingHeatmap(int userId, DateTime start, DateTime end, CancellationToken ct = default);
    Task<ListResponse<NetWorthHistoryPointResponse>> GetNetWorthHistory(int userId, int months, string currency = "", CancellationToken ct = default);
    Task<MonthlyFinancialReport> GetMonthlyFinancialReport(int userId, int? year = null, int? month = null, CancellationToken ct = default);
    Task<byte[]> GetMonthlyFinancialReportPdf(int userId, int? year = null, int? month = null, CancellationToken ct = default);
}
