using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Report;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public interface IReportService : IDisposable
{
    Task<ResponseDataExDTO<CategoryListDetailsDTO, ReportMetadataDTO>> GetCategoriesReportData(int userId, string currency, IDictionary<string, string> filters);
    Task<ResponseDataDTO<MonthlyHistoryDTO>> GetMonthlyHistory(int userId, int year, string currency);
}