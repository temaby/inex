namespace inex.Application.ExchangeRates.Synchronization.Exceptions;

public class SynchronizationProviderResponseException : Exception
{
    public string Code { get; }
    public SynchronizationProviderResponseException(string code, string message) : base(message)
    {
        Code = code;
    }
}
