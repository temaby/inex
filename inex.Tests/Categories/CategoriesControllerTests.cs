using System.Net.Http.Json;
using inex.Tests.Infrastructure;

namespace inex.Tests.Categories;

[Collection(Infrastructure.IntegrationTestCollection.Name)]
public class CategoriesControllerTests : IClassFixture<InExWebApplicationFactory>
{
    private readonly InExWebApplicationFactory _factory;

    public CategoriesControllerTests(InExWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ── GET /api/categories ───────────────────────────────────────────────────

    [Fact]
    public async Task List_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/categories?mode=ALL");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task List_Authenticated_Returns200WithSeededCategories()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        var response = await client.GetAsync("/api/categories?mode=ALL");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Onboarding seeds Transfer + Correction + income/expense categories
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("data").GetArrayLength() > 0);
    }

    // ── POST /api/categories ──────────────────────────────────────────────────

    [Fact]
    public async Task Create_ValidCategory_Returns200WithId()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        var response = await client.PostAsJsonAsync("/api/categories", new
        {
            key       = "groceries",
            name      = "Groceries",
            isEnabled = true,
            isSystem  = false,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("id").GetInt32() > 0);
    }

    [Fact]
    public async Task Create_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/categories", new
        {
            key       = "groceries",
            name      = "Groceries",
            isEnabled = true,
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── PUT /api/categories/{id} ──────────────────────────────────────────────

    [Fact]
    public async Task Update_ExistingCategory_Returns200WithUpdatedName()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        var createResponse = await client.PostAsJsonAsync("/api/categories", new
        {
            key       = "original",
            name      = "Original",
            isEnabled = true,
            isSystem  = false,
        });
        createResponse.EnsureSuccessStatusCode();
        var createBody = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        int id = createBody.GetProperty("id").GetInt32();

        var updateResponse = await client.PutAsJsonAsync($"/api/categories/{id}", new
        {
            id,
            key       = "original",
            name      = "Renamed",
            isEnabled = true,
            isSystem  = false,
        });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var body = await updateResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Renamed", body.GetProperty("name").GetString());
    }

    // ── DELETE /api/categories/{id} ───────────────────────────────────────────

    [Fact]
    public async Task Delete_UserCategory_Returns200()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        var createResponse = await client.PostAsJsonAsync("/api/categories", new
        {
            key       = "to-delete",
            name      = "ToDelete",
            isEnabled = true,
            isSystem  = false,
        });
        createResponse.EnsureSuccessStatusCode();
        var body = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        int id = body.GetProperty("id").GetInt32();

        var deleteResponse = await client.DeleteAsync($"/api/categories/{id}");

        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task Delete_SystemCategory_Returns422()
    {
        // Each user gets seeded system categories via onboarding
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        // Find the seeded Transfer system category for this user
        var listResponse = await client.GetAsync("/api/categories?mode=ALL");
        listResponse.EnsureSuccessStatusCode();
        var listBody = await listResponse.Content.ReadFromJsonAsync<JsonElement>();
        var transfer = listBody.GetProperty("data").EnumerateArray()
            .FirstOrDefault(c =>
                c.GetProperty("isSystem").GetBoolean() &&
                c.GetProperty("systemCode").GetString() == "transfer");

        Assert.NotEqual(default, transfer);

        int transferId = transfer.GetProperty("id").GetInt32();

        var deleteResponse = await client.DeleteAsync($"/api/categories/{transferId}");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, deleteResponse.StatusCode);

        var errorBody = await deleteResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("system-category-delete", errorBody.GetProperty("rule").GetString());
    }

    [Fact]
    public async Task Delete_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.DeleteAsync("/api/categories/1");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
