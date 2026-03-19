namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public class CurrencyApiResponse
{
    public Dictionary<string, CurrencyData> Data { get; set; } = new();
}

public class CurrencyData
{
    public string Code { get; set; } = string.Empty;
    public decimal Value { get; set; }
}