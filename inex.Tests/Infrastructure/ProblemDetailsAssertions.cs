namespace inex.Tests.Infrastructure;

internal static class ProblemDetailsAssertions
{
    public static async Task AssertNotFoundProblemAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("owner", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("owned", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("forbidden", body, StringComparison.OrdinalIgnoreCase);
    }
}
