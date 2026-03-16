using System;

namespace inex.Services.Models.Records.Transaction;

public record TransferFromCreateDTO
{
    public int AccountFromId { get; set; }
    public DateTime Created { get; set; }
    public decimal AmountFrom { get; set; }
    public string? Comment { get; set; }
}