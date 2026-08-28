namespace inex.Services.Models.Records.Transaction;

public static class InternalTransferDirection
{
    public const string Outgoing = "outgoing";
    public const string Incoming = "incoming";

    public static bool IsValid(string? value) =>
        value is not null &&
        (value.Equals(Outgoing, StringComparison.OrdinalIgnoreCase) ||
         value.Equals(Incoming, StringComparison.OrdinalIgnoreCase));

    public static bool IsOutgoing(string value) =>
        value.Equals(Outgoing, StringComparison.OrdinalIgnoreCase);
}
