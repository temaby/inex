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
    public async Task GetHistoricalRatesAsync_UsesCurrencyApiWithoutCallingFrankfurterOrNbrb()
    {
        var date = new DateOnly(2026, 8, 5);
        var currencyApiRequestCount = 0;
        using var currencyApiHttpClient = new HttpClient(new StubHttpMessageHandler(_ =>
        {
            currencyApiRequestCount++;
            return CreateJsonResponse("""{"data":{"EUR":{"code":"EUR","value":0.92}}}""");
        }))
        {
            BaseAddress = new Uri("https://currency.test/")
        };
        var provider = new HistoricalRateProvider(
            new CurrencyApiClient(currencyApiHttpClient),
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
        Assert.Equal(1, currencyApiRequestCount);
    }

    [Fact]
    public async Task GetHistoricalRatesAsync_WhenSynchronizingBynRub_UsesCurrencyApi()
    {
        var date = new DateOnly(2026, 8, 1);
        var currencyApiRequests = new List<string>();
        using var currencyApiHttpClient = new HttpClient(new StubHttpMessageHandler(request =>
        {
            currencyApiRequests.Add(request.RequestUri!.Query);
            return CreateJsonResponse("""{"data":{"RUB":{"code":"RUB","value":27.8}}}""");
        }))
        {
            BaseAddress = new Uri("https://currency.test/")
        };
        var provider = new HistoricalRateProvider(
            new CurrencyApiClient(currencyApiHttpClient),
            NullLogger<HistoricalRateProvider>.Instance);

        var result = await provider.GetHistoricalRatesAsync(
            new[] { date },
            "BYN",
            new[] { "RUB" },
            CancellationToken.None);

        var quote = Assert.Single(result);
        Assert.Equal("RUB", quote.QuoteCurrencyCode);
        Assert.Equal(27.8m, quote.Rate);
        Assert.Contains(currencyApiRequests, query => query.Contains("date=2026-08-01", StringComparison.Ordinal));
        Assert.Contains(currencyApiRequests, query => query.Contains("base_currency=BYN", StringComparison.Ordinal));
        Assert.Contains(currencyApiRequests, query => query.Contains("currencies=RUB", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GetHistoricalRatesAsync_WhenCurrencyApiFails_ReturnsNoQuote()
    {
        var date = new DateOnly(2026, 8, 1);
        using var currencyApiHttpClient = new HttpClient(new StubHttpMessageHandler(_ =>
            new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)))
        {
            BaseAddress = new Uri("https://currency.test/")
        };
        var provider = new HistoricalRateProvider(
            new CurrencyApiClient(currencyApiHttpClient),
            NullLogger<HistoricalRateProvider>.Instance);

        var result = await provider.GetHistoricalRatesAsync(
            new[] { date },
            "USD",
            new[] { "EUR" },
            CancellationToken.None);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetHistoricalRatesAsync_WhenRequestIsCancelled_PropagatesCancellation()
    {
        var date = new DateOnly(2026, 8, 1);
        using var cancellationTokenSource = new CancellationTokenSource();
        cancellationTokenSource.Cancel();
        using var currencyApiHttpClient = new HttpClient(new StubHttpMessageHandler(_ =>
            CreateJsonResponse("""{"data":{"EUR":{"code":"EUR","value":0.92}}}""")))
        {
            BaseAddress = new Uri("https://currency.test/")
        };
        var provider = new HistoricalRateProvider(
            new CurrencyApiClient(currencyApiHttpClient),
            NullLogger<HistoricalRateProvider>.Instance);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => provider.GetHistoricalRatesAsync(
            new[] { date },
            "USD",
            new[] { "EUR" },
            cancellationTokenSource.Token));
    }

    private static HttpResponseMessage CreateJsonResponse(string content) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(content, Encoding.UTF8, "application/json")
    };

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
