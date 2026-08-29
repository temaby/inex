namespace inex.Services.Models.Records.Report;

public record InternalTransferSummary
{
    public decimal AmountReceived { get; init; }
    public decimal AmountSent { get; init; }
    public decimal NetChange { get; init; }
    public int TransactionCount { get; init; }
}
