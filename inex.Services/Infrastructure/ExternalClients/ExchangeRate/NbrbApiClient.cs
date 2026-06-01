using System.Net.Http.Json;

namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public class NbrbApiClient : INbrbApiClient
{
    private const string DomesticCurrency = "BYN";
    private const string RubCurrency = "RUB";
    private const int MaxInclusiveRangeDays = 365;

    private readonly HttpClient _httpClient;

    public NbrbApiClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<Dictionary<DateTime, ExchangeRateResponse>> GetRatesForRangeAsync(
        DateTime start,
        DateTime end,
        string baseCurrency,
        string targetCurrency,
        CancellationToken ct = default)
    {
        if (end < start)
        {
            throw new ArgumentException("End date must be on or after start date.", nameof(end));
        }

        if (!IsBynRubPath(baseCurrency, targetCurrency))
        {
            return new Dictionary<DateTime, ExchangeRateResponse>();
        }

        var currencies = await _httpClient.GetFromJsonAsync<List<NbrbCurrencyResponse>>("exrates/currencies", ct)
                         ?? new List<NbrbCurrencyResponse>();

        var metadataRanges = currencies
            .Where(c => string.Equals(c.CurAbbreviation, RubCurrency, StringComparison.OrdinalIgnoreCase))
            .Select(c => new
            {
                Currency = c,
                Start = c.CurDateStart.Date > start.Date ? c.CurDateStart.Date : start.Date,
                End = (c.CurDateEnd?.Date ?? DateTime.MaxValue.Date) < end.Date ? c.CurDateEnd!.Value.Date : end.Date
            })
            .Where(c => c.Start <= c.End && c.Currency.CurScale > 0)
            .OrderBy(c => c.Start)
            .ToList();

        var result = new Dictionary<DateTime, ExchangeRateResponse>();
        foreach (var metadataRange in metadataRanges)
        {
            for (var segmentStart = metadataRange.Start; segmentStart <= metadataRange.End; segmentStart = segmentStart.AddDays(MaxInclusiveRangeDays))
            {
                var segmentEnd = segmentStart.AddDays(MaxInclusiveRangeDays - 1);
                if (segmentEnd > metadataRange.End)
                {
                    segmentEnd = metadataRange.End;
                }

                var url = $"exrates/rates/dynamics/{metadataRange.Currency.CurId}?startdate={segmentStart:yyyy-MM-dd}&enddate={segmentEnd:yyyy-MM-dd}";
                var rates = await _httpClient.GetFromJsonAsync<List<NbrbRateResponse>>(url, ct)
                            ?? new List<NbrbRateResponse>();

                foreach (var rate in rates)
                {
                    if (rate.CurOfficialRate <= 0)
                    {
                        continue;
                    }

                    var date = rate.Date.Date;
                    result[date] = new ExchangeRateResponse
                    {
                        Data = new Dictionary<string, ExchangeDateData>
                        {
                            [targetCurrency.ToUpperInvariant()] = new()
                            {
                                Code = targetCurrency.ToUpperInvariant(),
                                Value = ConvertRate(baseCurrency, targetCurrency, rate.CurOfficialRate, metadataRange.Currency.CurScale)
                            }
                        }
                    };
                }
            }
        }

        return result;
    }

    private static bool IsBynRubPath(string baseCurrency, string targetCurrency) =>
        string.Equals(baseCurrency, DomesticCurrency, StringComparison.OrdinalIgnoreCase)
        && string.Equals(targetCurrency, RubCurrency, StringComparison.OrdinalIgnoreCase)
        || string.Equals(baseCurrency, RubCurrency, StringComparison.OrdinalIgnoreCase)
        && string.Equals(targetCurrency, DomesticCurrency, StringComparison.OrdinalIgnoreCase);

    private static decimal ConvertRate(string baseCurrency, string targetCurrency, decimal officialRate, int scale)
    {
        if (string.Equals(baseCurrency, RubCurrency, StringComparison.OrdinalIgnoreCase)
            && string.Equals(targetCurrency, DomesticCurrency, StringComparison.OrdinalIgnoreCase))
        {
            return officialRate / scale;
        }

        return scale / officialRate;
    }
}
