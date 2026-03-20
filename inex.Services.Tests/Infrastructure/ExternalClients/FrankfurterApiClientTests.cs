using System.Net;
using System.Text;
using System.Text.Json;
using inex.Services.Infrastructure.ExternalClients.ExchangeRate;
using Moq;
using Moq.Protected;

namespace inex.Services.Tests.Infrastructure.ExternalClients;

/// <summary>
/// Unit tests for <see cref="FrankfurterApiClient"/>.
/// Tests verify that Frankfurter API responses are correctly converted to the standard CurrencyApiResponse format.
/// </summary>
public class FrankfurterApiClientTests
{
    [Fact]
    public async Task GetRatesAsync_WithValidResponse_ReturnsConvertedData()
    {
        // Arrange
        var date = new DateTime(2026, 3, 15);
        var baseCurrency = "EUR";
        var targetCurrencies = new[] { "USD", "GBP" };

        var frankfurterResponse = new
        {
            @base = "EUR",
            date = "2026-03-15",
            rates = new Dictionary<string, decimal>
            {
                ["USD"] = 1.08m,
                ["GBP"] = 0.86m
            }
        };

        var httpClient = CreateMockHttpClient(frankfurterResponse, HttpStatusCode.OK);
        var client = new FrankfurterApiClient(httpClient);

        // Act
        var result = await client.GetRatesAsync(date, baseCurrency, targetCurrencies);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Data.Count);
        Assert.True(result.Data.ContainsKey("USD"));
        Assert.True(result.Data.ContainsKey("GBP"));
        Assert.Equal("USD", result.Data["USD"].Code);
        Assert.Equal(1.08m, result.Data["USD"].Value);
        Assert.Equal("GBP", result.Data["GBP"].Code);
        Assert.Equal(0.86m, result.Data["GBP"].Value);
    }

    [Fact]
    public async Task GetRatesAsync_WithEmptyRates_ReturnsNull()
    {
        // Arrange
        var date = new DateTime(2026, 3, 15);
        var baseCurrency = "EUR";
        var targetCurrencies = new[] { "USD" };

        var frankfurterResponse = new
        {
            @base = "EUR",
            date = "2026-03-15",
            rates = new Dictionary<string, decimal>()
        };

        var httpClient = CreateMockHttpClient(frankfurterResponse, HttpStatusCode.OK);
        var client = new FrankfurterApiClient(httpClient);

        // Act
        var result = await client.GetRatesAsync(date, baseCurrency, targetCurrencies);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetRatesAsync_WithNullResponse_ReturnsNull()
    {
        // Arrange
        var date = new DateTime(2026, 3, 15);
        var baseCurrency = "EUR";
        var targetCurrencies = new[] { "USD" };

        var httpClient = CreateMockHttpClient<object?>(null, HttpStatusCode.OK);
        var client = new FrankfurterApiClient(httpClient);

        // Act
        var result = await client.GetRatesAsync(date, baseCurrency, targetCurrencies);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetRatesAsync_FormatsUrlCorrectly()
    {
        // Arrange
        var date = new DateTime(2026, 3, 15);
        var baseCurrency = "USD";
        var targetCurrencies = new[] { "EUR", "GBP", "JPY" };

        var frankfurterResponse = new
        {
            @base = "USD",
            date = "2026-03-15",
            rates = new Dictionary<string, decimal>
            {
                ["EUR"] = 0.92m,
                ["GBP"] = 0.79m,
                ["JPY"] = 149.5m
            }
        };

        string? capturedUrl = null;
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync((HttpRequestMessage request, CancellationToken _) =>
            {
                capturedUrl = request.RequestUri?.ToString();
                var json = JsonSerializer.Serialize(frankfurterResponse);
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(json, Encoding.UTF8, "application/json")
                };
            });

        var httpClient = new HttpClient(mockHandler.Object)
        {
            BaseAddress = new Uri("https://api.frankfurter.dev/")
        };

        var client = new FrankfurterApiClient(httpClient);

        // Act
        await client.GetRatesAsync(date, baseCurrency, targetCurrencies);

        // Assert
        Assert.NotNull(capturedUrl);
        Assert.Contains("v1/2026-03-15", capturedUrl);
        Assert.Contains("base=USD", capturedUrl);
        Assert.Contains("symbols=EUR,GBP,JPY", capturedUrl);
    }

    // --- Helper Methods ---

    private static HttpClient CreateMockHttpClient<T>(T responseObject, HttpStatusCode statusCode)
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                var json = JsonSerializer.Serialize(responseObject);
                return new HttpResponseMessage
                {
                    StatusCode = statusCode,
                    Content = new StringContent(json, Encoding.UTF8, "application/json")
                };
            });

        return new HttpClient(mockHandler.Object)
        {
            BaseAddress = new Uri("https://api.frankfurter.dev/")
        };
    }
}
