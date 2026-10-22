namespace inex.Services.Services;

public static class InternalTransferRequestPolicy
{
    // MySQL datetime(6) stores microseconds; canonicalize before storage and idempotency comparison.
    public static DateTime NormalizeOperationDate(DateTime value) => new(value.Ticks - value.Ticks % 10, value.Kind);
}
