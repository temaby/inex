namespace inex.Services.Models.Records.Transaction;

public record ResponseTransferDTO
{
    public int FromId { get; set; }
    public int ToId { get; set; }
}
