using System.Net.Http.Json;
using inex.Tests.Infrastructure;

namespace inex.Tests.Budgets;

[Collection(Infrastructure.IntegrationTestCollection.Name)]
public class BudgetsControllerTests : IClassFixture<InExWebApplicationFactory>
{
    private readonly InExWebApplicationFactory _factory;

    public BudgetsControllerTests(InExWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Single_OwnerBudget_Returns200()
    {
        var client = await CreateAuthenticatedClientAsync();
        int id = await CreateBudgetAsync(client, "owner-get");

        var response = await client.GetAsync($"/api/budgets/{id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Single_OtherUsersBudget_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int id = await CreateBudgetAsync(userB, "other-get");

        var response = await userA.GetAsync($"/api/budgets/{id}");

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task Update_OwnerBudget_Returns200()
    {
        var client = await CreateAuthenticatedClientAsync();
        int id = await CreateBudgetAsync(client, "owner-put");

        var response = await client.PutAsJsonAsync($"/api/budgets/{id}", new
        {
            id,
            key         = "owner-put",
            name        = "Renamed Budget",
            description = "Updated",
            year        = 2026,
            month       = 5,
            value       = 250m,
            categoryIds = Array.Empty<int>(),
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Update_OtherUsersBudget_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int id = await CreateBudgetAsync(userB, "other-put");

        var response = await userA.PutAsJsonAsync($"/api/budgets/{id}", new
        {
            id,
            key         = "other-put",
            name        = "Attempted Rename",
            description = "Updated",
            year        = 2026,
            month       = 5,
            value       = 250m,
            categoryIds = Array.Empty<int>(),
        });

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task Create_WithOtherUsersCategory_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int categoryId = await CreateCategoryAsync(userB, "other-create-category");

        var response = await userA.PostAsJsonAsync("/api/budgets", new
        {
            key         = "cross-category-create",
            name        = "Cross Category Create",
            description = "Attempted",
            year        = 2026,
            month       = 5,
            value       = 100m,
            categoryIds = new[] { categoryId },
        });

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task Update_WithOtherUsersCategory_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int budgetId = await CreateBudgetAsync(userA, "cross-category-update-budget");
        int categoryId = await CreateCategoryAsync(userB, "other-update-category");

        var response = await userA.PutAsJsonAsync($"/api/budgets/{budgetId}", new
        {
            id          = budgetId,
            key         = "cross-category-update-budget",
            name        = "Cross Category Update",
            description = "Attempted",
            year        = 2026,
            month       = 5,
            value       = 250m,
            categoryIds = new[] { categoryId },
        });

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task Delete_OwnerBudget_Returns200()
    {
        var client = await CreateAuthenticatedClientAsync();
        int id = await CreateBudgetAsync(client, "owner-delete");

        var response = await client.DeleteAsync($"/api/budgets/{id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Delete_OtherUsersBudget_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int id = await CreateBudgetAsync(userB, "other-delete");

        var response = await userA.DeleteAsync($"/api/budgets/{id}");

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    private Task<HttpClient> CreateAuthenticatedClientAsync() =>
        _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

    private static async Task<int> CreateBudgetAsync(HttpClient client, string key)
    {
        var createResponse = await client.PostAsJsonAsync("/api/budgets", new
        {
            key,
            name        = key,
            description = key,
            year        = 2026,
            month       = 5,
            value       = 100m,
            categoryIds = Array.Empty<int>(),
        });
        createResponse.EnsureSuccessStatusCode();

        var body = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetInt32();
    }

    private static async Task<int> CreateCategoryAsync(HttpClient client, string key)
    {
        var createResponse = await client.PostAsJsonAsync("/api/categories", new
        {
            key,
            name      = key,
            isEnabled = true,
            isSystem  = false,
        });
        createResponse.EnsureSuccessStatusCode();

        var body = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetInt32();
    }
}
