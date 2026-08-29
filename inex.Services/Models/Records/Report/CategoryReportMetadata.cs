using inex.Services.Models.Records.Data;

namespace inex.Services.Models.Records.Report;

public record CategoryReportMetadata : ReportMetadata
{
    public InternalTransferSummary InternalTransfers { get; init; } = new();
}
