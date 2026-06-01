using System.Text.Json.Serialization;

namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public class NbrbRateResponse
{
    [JsonPropertyName("Cur_ID")]
    public int CurId { get; set; }

    [JsonPropertyName("Date")]
    public DateTime Date { get; set; }

    [JsonPropertyName("Cur_OfficialRate")]
    public decimal CurOfficialRate { get; set; }
}
