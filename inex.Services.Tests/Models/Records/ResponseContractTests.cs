using System.Text.Json;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Category;

namespace inex.Services.Tests.Models.Records;

public class ResponseContractTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public void AccountResponse_SerializesExpectedApiShape()
    {
        var response = new AccountResponse
        {
            Id = 12,
            CurrencyId = 1,
            Key = "cash",
            Name = "Cash",
            Description = "Daily wallet",
            IsEnabled = true,
            IsFavourite = false,
            Currency = "USD"
        };

        JsonElement json = JsonSerializer.SerializeToElement(response, JsonOptions);

        AssertJsonProperties(json,
            "id",
            "currencyId",
            "key",
            "name",
            "description",
            "isEnabled",
            "isFavourite",
            "currency");
        Assert.Equal(12, json.GetProperty("id").GetInt32());
        Assert.Equal(1, json.GetProperty("currencyId").GetInt32());
        Assert.Equal("cash", json.GetProperty("key").GetString());
        Assert.Equal("Cash", json.GetProperty("name").GetString());
        Assert.Equal("Daily wallet", json.GetProperty("description").GetString());
        Assert.True(json.GetProperty("isEnabled").GetBoolean());
        Assert.False(json.GetProperty("isFavourite").GetBoolean());
        Assert.Equal("USD", json.GetProperty("currency").GetString());
    }

    [Fact]
    public void CategoryResponse_DoesNotInheritRequestContracts()
    {
        Assert.Equal(typeof(object), typeof(CategoryResponse).BaseType);
    }

    [Fact]
    public void CategoryResponse_SerializesExpectedApiShape()
    {
        var response = new CategoryResponse
        {
            Id = 7,
            ParentId = 3,
            Key = "groceries",
            Name = "Groceries",
            Description = "Food shopping",
            IsEnabled = true,
            IsSystem = false,
            SystemCode = null
        };

        JsonElement json = JsonSerializer.SerializeToElement(response, JsonOptions);

        AssertJsonProperties(json,
            "id",
            "parentId",
            "key",
            "name",
            "description",
            "isEnabled",
            "isSystem",
            "systemCode");
        Assert.Equal(7, json.GetProperty("id").GetInt32());
        Assert.Equal(3, json.GetProperty("parentId").GetInt32());
        Assert.Equal("groceries", json.GetProperty("key").GetString());
        Assert.Equal("Groceries", json.GetProperty("name").GetString());
        Assert.Equal("Food shopping", json.GetProperty("description").GetString());
        Assert.True(json.GetProperty("isEnabled").GetBoolean());
        Assert.False(json.GetProperty("isSystem").GetBoolean());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("systemCode").ValueKind);
    }

    private static void AssertJsonProperties(JsonElement json, params string[] expectedNames)
    {
        string[] actualNames = json.EnumerateObject()
            .Select(property => property.Name)
            .OrderBy(name => name)
            .ToArray();

        Assert.Equal(expectedNames.OrderBy(name => name), actualNames);
    }
}
