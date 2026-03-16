using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Report;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public interface IBudgetReportService
{
    Task<ResponseDataExDTO<BudgetComparisonDTO, ReportMetadataDTO>> GetBudgetComparison(int userId, int year, int month, string currency);
}
