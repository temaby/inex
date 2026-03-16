using System;

namespace inex.Services.Models.Records.Transaction;

public record TransferToCreateDTO
{
    public int AccountToId { get; set; }
    public DateTime Created { get; set; }
    public decimal AmountTo { get; set; }
    public string? Comment { get; set; }
}