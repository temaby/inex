using System.Net.Http.Json;
using inex.Tests.Infrastructure;

namespace inex.Tests;

/// <summary>
/// Contract tests: verify that all API error responses follow RFC 7807 ProblemDetails
/// with the correct HTTP status code, content-type, and required extension fields.
///
/// IAsyncLifetime lets us await the authenticated client setup before any test runs.
/// The alternative — calling .GetAwaiter().GetResult() in the constructor — works but
/// blocks a thread and is considered bad practice in async codebases.
/// </summary>
[Collection(Infrastructure.IntegrationTestCollection.Name)]
public class ErrorContractTests : IClassFixture<InExWebApplicationFactory>, IAsyncLifetime
{
    private readonly InExWebApplicationFactory _factory;
    private HttpClient _client = null!;

    public ErrorContractTests(InExWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        // Each test method gets its own class instance (xUnit design), so InitializeAsync
        // runs once per test. Using a unique email prevents duplicate-registration conflicts
        // when multiple test instances share the same factory and in-memory database.
        var uid = Guid.NewGuid().ToString("N")[..8];
        _client = await _factory.CreateAuthenticatedClientAsync(
            email: $"contract-{uid}@example.com",
            username: $"contract-{uid}");
    }

    public Task DisposeAsync() => Task.CompletedTask;

    // ── 404 Not Found ────────────────────────────────────────────────────────

    [Theory]
    [InlineData("/api/budgets/99999")]
    [InlineData("/api/accounts/99999")]
    [InlineData("/api/categories/99999")]
    [InlineData("/api/transactions/99999")]
    public async Task GetById_WhenResourceMissing_Returns404ProblemDetails(string url)
    {
        var response = await _client.GetAsync(url);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        AssertIsProblemJson(response);

        var body = await ReadProblemAsync(response);
        Assert.Equal("/errors/not-found", body.GetProperty("type").GetString());
        Assert.Equal(404, body.GetProperty("status").GetInt32());
        Assert.True(body.TryGetProperty("title", out _));
    }

    // ── 422 Validation (model binding) ───────────────────────────────────────

    [Fact]
    public async Task Post_WithTypeInvalidBody_Returns422ProblemDetails()
    {
        // Sending a string where int is expected forces a model-state error
        var response = await _client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = "not-a-number" });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        AssertIsProblemJson(response);

        var body = await ReadProblemAsync(response);
        Assert.Equal("/errors/validation-failed", body.GetProperty("type").GetString());
        Assert.Equal(422, body.GetProperty("status").GetInt32());
        Assert.True(body.TryGetProperty("errors", out _));
    }

    // ── 200 success does NOT return problem+json ──────────────────────────────

    [Theory]
    [InlineData("/api/budgets")]
    [InlineData("/api/categories?mode=all")]
    public async Task GetList_WhenDbEmpty_Returns200Json(string url)
    {
        var response = await _client.GetAsync(url);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain(
            "application/problem+json",
            response.Content.Headers.ContentType?.ToString() ?? string.Empty);
    }

    // ── traceId is present in all error responses ─────────────────────────────

    [Theory]
    [InlineData("/api/budgets/99999")]
    [InlineData("/api/accounts/99999")]
    [InlineData("/api/categories/99999")]
    public async Task ErrorResponse_AlwaysContainsTraceId(string url)
    {
        var response = await _client.GetAsync(url);
        var body = await ReadProblemAsync(response);

        Assert.True(
            body.TryGetProperty("traceId", out var traceId),
            $"traceId extension missing for {url}");
        Assert.False(
            string.IsNullOrWhiteSpace(traceId.GetString()),
            $"traceId is empty for {url}");
    }

    // ── content-type is application/problem+json for all errors ──────────────

    [Theory]
    [InlineData("/api/budgets/99999", HttpStatusCode.NotFound)]
    [InlineData("/api/accounts/99999", HttpStatusCode.NotFound)]
    public async Task ErrorResponse_ContentTypeIsProblemJson(string url, HttpStatusCode expectedStatus)
    {
        var response = await _client.GetAsync(url);

        Assert.Equal(expectedStatus, response.StatusCode);
        AssertIsProblemJson(response);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static void AssertIsProblemJson(HttpResponseMessage response)
    {
        var ct = response.Content.Headers.ContentType?.ToString() ?? string.Empty;
        Assert.Contains("application/problem+json", ct);
    }

    private static async Task<JsonElement> ReadProblemAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(json);
    }
}
