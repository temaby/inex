using System.Text.Json.Serialization;

namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public class NbrbCurrencyResponse
{
    [JsonPropertyName("Cur_ID")]
    public int CurId { get; set; }

    [JsonPropertyName("Cur_Abbreviation")]
    public string CurAbbreviation { get; set; } = string.Empty;

    [JsonPropertyName("Cur_Scale")]
    public int CurScale { get; set; }

    [JsonPropertyName("Cur_DateStart")]
    public DateTime CurDateStart { get; set; }

    [JsonPropertyName("Cur_DateEnd")]
    public DateTime? CurDateEnd { get; set; }
}
