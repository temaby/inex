namespace inex.Services.Models.Records.Report;

public sealed record NetWorthHistoryPointResponse
{
    public string Month { get; init; } = string.Empty;
    public DateTime MonthEnd { get; init; }
    public decimal NetWorth { get; init; }
    public string Currency { get; init; } = string.Empty;
}
