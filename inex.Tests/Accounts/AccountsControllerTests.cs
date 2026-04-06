using System.Net.Http.Json;
using inex.Tests.Infrastructure;

namespace inex.Tests.Accounts;

[Collection(Infrastructure.IntegrationTestCollection.Name)]
public class AccountsControllerTests : IClassFixture<InExWebApplicationFactory>
{
    private readonly InExWebApplicationFactory _factory;

    public AccountsControllerTests(InExWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ── GET /api/accounts ────────────────────────────────────────────────────

    [Fact]
    public async Task List_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/accounts?mode=ALL");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task List_Authenticated_Returns200()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        var response = await client.GetAsync("/api/accounts?mode=ALL");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ── POST /api/accounts ────────────────────────────────────────────────────

    [Fact]
    public async Task Create_ValidAccount_Returns200WithId()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        var response = await client.PostAsJsonAsync("/api/accounts", new
        {
            key         = "savings",
            name        = "Savings",
            description = "My savings account",
            currencyId  = 1,
            isEnabled   = true,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("id").GetInt32() > 0);
    }

    [Fact]
    public async Task Create_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/accounts", new
        {
            key        = "savings",
            name       = "Savings",
            currencyId = 1,
            isEnabled  = true,
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── PUT /api/accounts/{id} ────────────────────────────────────────────────

    [Fact]
    public async Task Update_ExistingAccount_Returns200WithUpdatedName()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        // Create
        var createResponse = await client.PostAsJsonAsync("/api/accounts", new
        {
            key        = "original",
            name       = "Original",
            currencyId = 1,
            isEnabled  = true,
        });
        createResponse.EnsureSuccessStatusCode();
        var createBody = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        int id = createBody.GetProperty("id").GetInt32();

        // Update
        var updateResponse = await client.PutAsJsonAsync($"/api/accounts/{id}", new
        {
            id,
            key        = "original",
            name       = "Renamed",
            currencyId = 1,
            isEnabled  = true,
        });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var body = await updateResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Renamed", body.GetProperty("name").GetString());
    }

    // ── DELETE /api/accounts/{id} ─────────────────────────────────────────────

    [Fact]
    public async Task Delete_ExistingAccount_Returns200()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        var createResponse = await client.PostAsJsonAsync("/api/accounts", new
        {
            key        = "to-delete",
            name       = "ToDelete",
            currencyId = 1,
            isEnabled  = true,
        });
        createResponse.EnsureSuccessStatusCode();
        var body = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        int id = body.GetProperty("id").GetInt32();

        var deleteResponse = await client.DeleteAsync($"/api/accounts/{id}");

        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task Delete_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.DeleteAsync("/api/accounts/1");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
