namespace inex.Services.Models.Records.Transaction;

public record TransferResponse
{
    public int FromId { get; set; }
    public int ToId { get; set; }
}
