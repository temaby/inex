namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public class ExchangeRateResponse
{
    public Dictionary<string, ExchangeDateData> Data { get; set; } = new();
}

public class ExchangeDateData
{
    public string Code { get; set; } = string.Empty;
    public decimal Value { get; set; }
}