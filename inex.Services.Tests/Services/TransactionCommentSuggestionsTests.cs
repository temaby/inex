using inex.Data;
using inex.Services.Helpers;
using inex.Data.Models;
using Microsoft.EntityFrameworkCore;
using Xunit.Abstractions;

namespace inex.Services.Tests.Services;

public class TransactionCommentSuggestionsTests(ITestOutputHelper output)
{
    [Fact]
    public void QueryTranslatesToMySqlWithOwnershipAndServerSideAggregation()
    {
        using var db = new InExDbContext(new DbContextOptionsBuilder<InExDbContext>()
            .UseMySql("Server=localhost;Database=translation_only;User=test;Password=test;",
                new MySqlServerVersion(new Version(8, 0, 0))).Options);
        string sql = TransactionCommentSuggestions.Query(db.Set<Tag>().AsNoTracking(), 0, TagType.TAG, "gro").ToQueryString();
        Assert.Contains("GROUP BY", sql);
        Assert.Contains("MAX(", sql);
        Assert.Contains("SUM(", sql);
        Assert.Contains("LIMIT 5", sql);
        Assert.True(sql.Split("`user_fk`").Length >= 3, sql);
        output.WriteLine(sql);
    }
}
