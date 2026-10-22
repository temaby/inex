namespace inex.Services.Models.Records.Transaction;

public record CreateCorrectionRequest
{
    public int AccountId { get; init; }
    public DateTime Created { get; init; }
    public decimal Amount { get; init; }
    public string Direction { get; init; } = string.Empty;
    public string Comment { get; init; } = string.Empty;
}

public static class CorrectionDirection
{
    public const string Increase = "increase";
    public const string Decrease = "decrease";
    public static bool IsValid(string? value) => value is Increase or Decrease;
}
