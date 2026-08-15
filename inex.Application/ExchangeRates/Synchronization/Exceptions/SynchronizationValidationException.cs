namespace inex.Application.ExchangeRates.Synchronization.Exceptions;

public class SynchronizationValidationException : Exception
{
    public string Code { get; }
    public SynchronizationValidationException(string code, string message) : base(message)
    {
        Code = code;
    }
}
