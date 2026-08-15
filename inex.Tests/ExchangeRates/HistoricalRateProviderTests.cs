using System.Net;
using System.Net.Http;
using System.Text;
using inex.Infrastructure.ExchangeRates.Synchronization;
using inex.Services.Infrastructure.ExternalClients.ExchangeRate;
using Microsoft.Extensions.Logging.Abstractions;

namespace inex.Tests.ExchangeRates;

public sealed class HistoricalRateProviderTests
{
    [Fact]
    public async Task GetHistoricalRatesAsync_WhenFrankfurterFails_UsesCurrencyApiFallback()
    {
        var date = new DateOnly(2026, 8, 5);
        using var currencyApiHttpClient = new HttpClient(new StubHttpMessageHandler(_ =>
            CreateJsonResponse("""{"data":{"EUR":{"code":"EUR","value":0.92}}}""")))
        {
            BaseAddress = new Uri("https://currency.test/")
        };
        using var frankfurterHttpClient = new HttpClient(new StubHttpMessageHandler(_ =>
            new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)))
        {
            BaseAddress = new Uri("https://frankfurter.test/")
        };
        var provider = new HistoricalRateProvider(
            new CurrencyApiClient(currencyApiHttpClient),
            new FrankfurterApiClient(frankfurterHttpClient),
            new EmptyNbrbApiClient(),
            NullLogger<HistoricalRateProvider>.Instance);

        var result = await provider.GetHistoricalRatesAsync(
            new[] { date },
            "USD",
            new[] { "EUR" },
            CancellationToken.None);

        var quote = Assert.Single(result);
        Assert.Equal("USD", quote.BaseCurrencyCode);
        Assert.Equal("EUR", quote.QuoteCurrencyCode);
        Assert.Equal(date, quote.Date);
        Assert.Equal(0.92m, quote.Rate);
    }

    [Fact]
    public async Task GetHistoricalRatesAsync_WhenFrankfurterOmitsADate_UsesCurrencyApiForTheUncoveredDate()
    {
        var missingDate = new DateOnly(2026, 8, 1);
        var returnedDate = missingDate.AddDays(1);
        var currencyApiRequests = new List<string>();
        using var currencyApiHttpClient = new HttpClient(new StubHttpMessageHandler(request =>
        {
            currencyApiRequests.Add(request.RequestUri!.Query);
            return CreateJsonResponse("""{"data":{"EUR":{"code":"EUR","value":0.91}}}""");
        }))
        {
            BaseAddress = new Uri("https://currency.test/")
        };
        using var frankfurterHttpClient = new HttpClient(new StubHttpMessageHandler(_ =>
            CreateJsonResponse("{\"rates\":{\"" + returnedDate.ToString("yyyy-MM-dd") + "\":{\"EUR\":0.92}}}")))
        {
            BaseAddress = new Uri("https://frankfurter.test/")
        };
        var provider = new HistoricalRateProvider(
            new CurrencyApiClient(currencyApiHttpClient),
            new FrankfurterApiClient(frankfurterHttpClient),
            new EmptyNbrbApiClient(),
            NullLogger<HistoricalRateProvider>.Instance);

        var result = await provider.GetHistoricalRatesAsync(
            new[] { missingDate, returnedDate },
            "USD",
            new[] { "EUR" },
            CancellationToken.None);

        Assert.Equal(2, result.Count);
        Assert.Contains(currencyApiRequests, query => query.Contains("date=2026-08-01", StringComparison.Ordinal));
        Assert.DoesNotContain(currencyApiRequests, query => query.Contains("date=2026-08-02", StringComparison.Ordinal));
    }

    private static HttpResponseMessage CreateJsonResponse(string content) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(content, Encoding.UTF8, "application/json")
    };

    private sealed class EmptyNbrbApiClient : INbrbApiClient
    {
        public Task<Dictionary<DateTime, ExchangeRateResponse>> GetRatesForRangeAsync(
            DateTime start,
            DateTime end,
            string baseCurrency,
            string targetCurrency,
            CancellationToken ct = default) =>
            Task.FromResult(new Dictionary<DateTime, ExchangeRateResponse>());
    }

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _send;

        public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> send)
        {
            _send = send;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(_send(request));
    }
}
