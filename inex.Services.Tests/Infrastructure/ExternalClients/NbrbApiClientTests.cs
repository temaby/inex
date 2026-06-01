using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json;
using inex.Services.Infrastructure.ExternalClients.ExchangeRate;
using inex.Services.Infrastructure.Resilience;
using Microsoft.Extensions.Logging.Abstractions;
using Moq.Protected;

namespace inex.Services.Tests.Infrastructure.ExternalClients;

public class NbrbApiClientTests
{
    [Fact]
    public async Task GetRatesForRangeAsync_BynToRub_FormatsUrlsAndConvertsScale()
    {
        var capturedUrls = new List<string>();
        var httpClient = CreateMockHttpClient(request =>
        {
            capturedUrls.Add(request.RequestUri!.ToString());
            if (request.RequestUri!.AbsolutePath.EndsWith("/exrates/currencies", StringComparison.OrdinalIgnoreCase))
            {
                return JsonResponse(new[]
                {
                    new
                    {
                        Cur_ID = 456,
                        Cur_Abbreviation = "RUB",
                        Cur_Scale = 100,
                        Cur_DateStart = "2020-01-01T00:00:00",
                        Cur_DateEnd = "2099-12-31T00:00:00"
                    }
                });
            }

            return JsonResponse(new[]
            {
                new { Cur_ID = 456, Date = "2026-03-15T00:00:00", Cur_OfficialRate = 3.2m }
            });
        });

        var client = new NbrbApiClient(httpClient);

        var result = await client.GetRatesForRangeAsync(new DateTime(2026, 3, 15), new DateTime(2026, 3, 15), "BYN", "RUB");

        Assert.Equal(2, capturedUrls.Count);
        Assert.Equal("https://api.nbrb.by/exrates/currencies", capturedUrls[0]);
        Assert.Equal("https://api.nbrb.by/exrates/rates/dynamics/456?startdate=2026-03-15&enddate=2026-03-15", capturedUrls[1]);
        Assert.Equal(31.25m, result[new DateTime(2026, 3, 15)].Data["RUB"].Value);
    }

    [Fact]
    public async Task GetRatesForRangeAsync_RubToByn_ConvertsScaleInOppositeDirection()
    {
        var httpClient = CreateMockHttpClient(request =>
            request.RequestUri!.AbsolutePath.EndsWith("/exrates/currencies", StringComparison.OrdinalIgnoreCase)
                ? JsonResponse(new[]
                {
                    new
                    {
                        Cur_ID = 456,
                        Cur_Abbreviation = "RUB",
                        Cur_Scale = 100,
                        Cur_DateStart = "2020-01-01T00:00:00",
                        Cur_DateEnd = "2099-12-31T00:00:00"
                    }
                })
                : JsonResponse(new[]
                {
                    new { Cur_ID = 456, Date = "2026-03-15T00:00:00", Cur_OfficialRate = 3.2m }
                }));

        var client = new NbrbApiClient(httpClient);

        var result = await client.GetRatesForRangeAsync(new DateTime(2026, 3, 15), new DateTime(2026, 3, 15), "RUB", "BYN");

        Assert.Equal(0.032m, result[new DateTime(2026, 3, 15)].Data["BYN"].Value);
    }

    [Fact]
    public async Task GetRatesForRangeAsync_WhenRangeExceeds365Days_SplitsDynamicsRequests()
    {
        var capturedDynamicsUrls = new List<string>();
        var httpClient = CreateMockHttpClient(request =>
        {
            if (request.RequestUri!.AbsolutePath.EndsWith("/exrates/currencies", StringComparison.OrdinalIgnoreCase))
            {
                return JsonResponse(new[]
                {
                    new
                    {
                        Cur_ID = 456,
                        Cur_Abbreviation = "RUB",
                        Cur_Scale = 100,
                        Cur_DateStart = "2020-01-01T00:00:00",
                        Cur_DateEnd = "2099-12-31T00:00:00"
                    }
                });
            }

            capturedDynamicsUrls.Add(request.RequestUri.ToString());
            return JsonResponse(Array.Empty<object>());
        });

        var client = new NbrbApiClient(httpClient);

        await client.GetRatesForRangeAsync(new DateTime(2026, 1, 1), new DateTime(2027, 1, 5), "BYN", "RUB");

        Assert.Equal(2, capturedDynamicsUrls.Count);
        Assert.Contains("startdate=2026-01-01&enddate=2026-12-31", capturedDynamicsUrls[0]);
        Assert.Contains("startdate=2027-01-01&enddate=2027-01-05", capturedDynamicsUrls[1]);
    }

    [Fact]
    public async Task GetRatesForRangeAsync_WhenNbrbReturnsEmptyArray_ReturnsEmptyDictionary()
    {
        var httpClient = CreateMockHttpClient(request =>
            request.RequestUri!.AbsolutePath.EndsWith("/exrates/currencies", StringComparison.OrdinalIgnoreCase)
                ? JsonResponse(new[]
                {
                    new
                    {
                        Cur_ID = 456,
                        Cur_Abbreviation = "RUB",
                        Cur_Scale = 100,
                        Cur_DateStart = "2020-01-01T00:00:00",
                        Cur_DateEnd = "2099-12-31T00:00:00"
                    }
                })
                : JsonResponse(Array.Empty<object>()));

        var client = new NbrbApiClient(httpClient);

        var result = await client.GetRatesForRangeAsync(new DateTime(2026, 3, 15), new DateTime(2026, 3, 15), "BYN", "RUB");

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetRatesForRangeAsync_WhenRubMetadataMissing_ReturnsEmptyDictionary()
    {
        var httpClient = CreateMockHttpClient(_ => JsonResponse(new[]
        {
            new
            {
                Cur_ID = 999,
                Cur_Abbreviation = "USD",
                Cur_Scale = 1,
                Cur_DateStart = "2020-01-01T00:00:00",
                Cur_DateEnd = "2099-12-31T00:00:00"
            }
        }));

        var client = new NbrbApiClient(httpClient);

        var result = await client.GetRatesForRangeAsync(new DateTime(2026, 3, 15), new DateTime(2026, 3, 15), "BYN", "RUB");

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetRatesForRangeAsync_WhenDynamicsReturns404_ThrowsHttpRequestException()
    {
        var httpClient = CreateMockHttpClient(request =>
            request.RequestUri!.AbsolutePath.EndsWith("/exrates/currencies", StringComparison.OrdinalIgnoreCase)
                ? JsonResponse(new[]
                {
                    new
                    {
                        Cur_ID = 456,
                        Cur_Abbreviation = "RUB",
                        Cur_Scale = 100,
                        Cur_DateStart = "2020-01-01T00:00:00",
                        Cur_DateEnd = "2099-12-31T00:00:00"
                    }
                })
                : new HttpResponseMessage(HttpStatusCode.NotFound));

        var client = new NbrbApiClient(httpClient);

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.GetRatesForRangeAsync(new DateTime(2026, 3, 15), new DateTime(2026, 3, 15), "BYN", "RUB"));
    }

    [Fact]
    public async Task GetRatesForRangeAsync_PropagatesCancellationToken()
    {
        using var cts = new CancellationTokenSource();
        var observedToken = CancellationToken.None;
        var httpClient = CreateMockHttpClient((_, token) =>
        {
            observedToken = token;
            return JsonResponse(Array.Empty<object>());
        });

        var client = new NbrbApiClient(httpClient);

        await client.GetRatesForRangeAsync(new DateTime(2026, 3, 15), new DateTime(2026, 3, 15), "BYN", "RUB", cts.Token);

        Assert.True(observedToken.CanBeCanceled);
    }

    [Fact]
    public async Task NbrbRetryPolicy_When429HasRetryAfter_UsesRetryAfterDelay()
    {
        var attempts = 0;
        var policy = HttpResiliencePolicyFactory.CreateRetryPolicyHonoringRetryAfter(
            NullLogger.Instance,
            "NbrbApiClient",
            new HttpResiliencePolicyOptions(1, _ => TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(10)));

        var stopwatch = Stopwatch.StartNew();

        var response = await policy.ExecuteAsync(() =>
        {
            attempts++;
            if (attempts == 1)
            {
                var tooManyRequests = new HttpResponseMessage(HttpStatusCode.TooManyRequests);
                tooManyRequests.Headers.RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(TimeSpan.FromMilliseconds(1));
                return Task.FromResult(tooManyRequests);
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        });

        stopwatch.Stop();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, attempts);
        Assert.True(stopwatch.Elapsed < TimeSpan.FromSeconds(2));
    }

    private static HttpClient CreateMockHttpClient(Func<HttpRequestMessage, HttpResponseMessage> responseFactory) =>
        CreateMockHttpClient((request, _) => responseFactory(request));

    private static HttpClient CreateMockHttpClient(Func<HttpRequestMessage, CancellationToken, HttpResponseMessage> responseFactory)
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync((HttpRequestMessage request, CancellationToken token) => responseFactory(request, token));

        return new HttpClient(mockHandler.Object)
        {
            BaseAddress = new Uri("https://api.nbrb.by/")
        };
    }

    private static HttpResponseMessage JsonResponse<T>(T value)
    {
        var json = JsonSerializer.Serialize(value);
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
    }
}
