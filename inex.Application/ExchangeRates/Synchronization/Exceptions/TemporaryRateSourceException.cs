namespace inex.Application.ExchangeRates.Synchronization.Exceptions;

public class TemporaryRateSourceException : Exception
{
    public string Code { get; }
    public TemporaryRateSourceException(string code, string message) : base(message)
    {
        Code = code;
    }
}
