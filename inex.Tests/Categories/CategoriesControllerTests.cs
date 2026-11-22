using System.Net.Http.Json;
using inex.Data;
using inex.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

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
    public async Task Create_SystemManagedCategory_Returns422()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/categories", new
        {
            key = "attempted-system-category",
            name = "Attempted system category",
            isEnabled = true,
            isSystem = true,
            systemCode = "internal-transfer",
        });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var errors = body.GetProperty("errors");
        Assert.Contains("is_system.system_managed", errors.GetProperty("IsSystem").EnumerateArray().Select(error => error.GetString()));
        Assert.Contains("system_code.system_managed", errors.GetProperty("SystemCode").EnumerateArray().Select(error => error.GetString()));
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
    public async Task Single_OtherUsersCategory_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int id = await CreateCategoryAsync(userB, "other-get");

        var response = await userA.GetAsync($"/api/categories/{id}");

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

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

    [Fact]
    public async Task Update_OtherUsersCategory_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int id = await CreateCategoryAsync(userB, "other-put");

        var response = await userA.PutAsJsonAsync($"/api/categories/{id}", new
        {
            id,
            key       = "other-put",
            name      = "Attempted Rename",
            isEnabled = true,
            isSystem  = false,
        });

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
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
    public async Task Delete_ParentWithUnselectedChild_PreservesBothCategories()
    {
        using var client = await CreateAuthenticatedClientAsync();
        int parentId = await CreateCategoryAsync(client, "delete-parent");
        int childId = await CreateCategoryAsync(client, "delete-child", parentId);

        await AssertDeleteRuleAsync(await client.DeleteAsync($"/api/categories/{parentId}"), "category-delete-has-children");

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/categories/{parentId}")).StatusCode);
        var child = await client.GetFromJsonAsync<JsonElement>($"/api/categories/{childId}");
        Assert.Equal(parentId, child.GetProperty("parentId").GetInt32());
    }

    [Fact]
    public async Task Delete_CategoryWithLegacyCrossOwnerChild_HidesDependencyType()
    {
        using var owner = await CreateAuthenticatedClientAsync();
        using var otherUser = await CreateAuthenticatedClientAsync();
        int parentId = await CreateCategoryAsync(owner, "cross-owner-parent");
        int childId = await CreateCategoryAsync(otherUser, "cross-owner-child");
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
            var child = await db.Categories.SingleAsync(category => category.Id == childId);
            child.ParentCategoryId = parentId;
            await db.SaveChangesAsync();
        }

        await AssertDeleteRuleAsync(await owner.DeleteAsync($"/api/categories/{parentId}"), "category-delete-unavailable");

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(await owner.GetAsync($"/api/categories/{childId}"));
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync($"/api/categories/{parentId}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await otherUser.GetAsync($"/api/categories/{childId}")).StatusCode);
    }

    [Fact]
    public async Task Delete_CategoryWithTransaction_PreservesFinancialRecord()
    {
        using var client = await CreateAuthenticatedClientAsync();
        int categoryId = await CreateCategoryAsync(client, "used-by-transaction");
        var accountResponse = await client.PostAsJsonAsync("/api/accounts", new
        {
            key = "category-deletion-account",
            name = "Category deletion account",
            currencyId = 1,
            isEnabled = true,
        });
        accountResponse.EnsureSuccessStatusCode();
        int accountId = (await accountResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var create = await client.PostAsJsonAsync("/api/transactions", new
        {
            accountId,
            categoryId,
            created = "2026-05-01",
            amount = -25m,
        });
        create.EnsureSuccessStatusCode();
        int transactionId = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();

        await AssertDeleteRuleAsync(await client.DeleteAsync($"/api/categories/{categoryId}"), "category-delete-has-transactions");

        var transaction = await client.GetFromJsonAsync<JsonElement>($"/api/transactions/{transactionId}");
        Assert.Equal(categoryId, transaction.GetProperty("categoryId").GetInt32());
        Assert.Equal(-25m, transaction.GetProperty("amount").GetDecimal());
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/categories/{categoryId}")).StatusCode);
    }

    [Fact]
    public async Task DeleteList_CategoryWithBudget_PreservesBudgetAndEntireRequestedBatch()
    {
        using var client = await CreateAuthenticatedClientAsync();
        int unusedId = await CreateCategoryAsync(client, "unused-in-delete-batch");
        int categoryId = await CreateCategoryAsync(client, "used-by-budget");
        var create = await client.PostAsJsonAsync("/api/budgets", new
        {
            key = "category-deletion-budget",
            name = "Category deletion budget",
            year = 2026,
            month = 5,
            value = 100m,
            categoryIds = new[] { categoryId },
        });
        create.EnsureSuccessStatusCode();
        int budgetId = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();

        var response = await client.DeleteAsync($"/api/categories?ids={unusedId}&ids={categoryId}");
        await AssertDeleteRuleAsync(response, "category-delete-has-budgets");

        var budget = await client.GetFromJsonAsync<JsonElement>($"/api/budgets/{budgetId}");
        Assert.Contains(budget.GetProperty("categoryIds").EnumerateArray(), item => item.GetInt32() == categoryId);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/categories/{unusedId}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/categories/{categoryId}")).StatusCode);
    }

    [Fact]
    public async Task DeleteList_ParentAndChildWithoutFinancialLinks_Returns200()
    {
        using var client = await CreateAuthenticatedClientAsync();
        int parentId = await CreateCategoryAsync(client, "delete-complete-branch");
        int childId = await CreateCategoryAsync(client, "delete-complete-branch-child", parentId);

        var response = await client.DeleteAsync($"/api/categories?ids={parentId}&ids={childId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(await client.GetAsync($"/api/categories/{parentId}"));
        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(await client.GetAsync($"/api/categories/{childId}"));
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
    public async Task Delete_OtherUsersCategory_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int id = await CreateCategoryAsync(userB, "other-delete");

        var response = await userA.DeleteAsync($"/api/categories/{id}");

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task Delete_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.DeleteAsync("/api/categories/1");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private Task<HttpClient> CreateAuthenticatedClientAsync() =>
        _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

    private static async Task AssertDeleteRuleAsync(HttpResponseMessage response, string rule)
    {
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(rule, problem.GetProperty("rule").GetString());
    }

    private static async Task<int> CreateCategoryAsync(HttpClient client, string key, int? parentId = null)
    {
        var createResponse = await client.PostAsJsonAsync("/api/categories", new
        {
            key,
            name      = key,
            parentId,
            isEnabled = true,
            isSystem  = false,
        });
        createResponse.EnsureSuccessStatusCode();

        var body = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetInt32();
    }
}
