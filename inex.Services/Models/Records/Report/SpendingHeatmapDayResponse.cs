namespace inex.Services.Models.Records.Report;

public record SpendingHeatmapDayResponse
{
    public DateTime Date { get; init; }
    public decimal TotalSpend { get; init; }
    public string Currency { get; init; } = null!;
}
