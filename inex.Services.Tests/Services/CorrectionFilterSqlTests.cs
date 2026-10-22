using inex.Data;
using inex.Services.Models.Records.Transaction;
using inex.Services.Services;
using Microsoft.EntityFrameworkCore;

namespace inex.Services.Tests.Services;

public class CorrectionFilterSqlTests
{
    [Theory]
    [InlineData("correction")]
    [InlineData("transfer")]
    public void TypeFilter_TranslatesToExactOwnerScopedMySqlPredicate(string type)
    {
        var options = new DbContextOptionsBuilder<InExDbContext>()
            .UseMySql("Server=localhost;Database=inex;User=unused", new MySqlServerVersion(new Version(8, 0, 0))).Options;
        using var db = new InExDbContext(options);
        string sql = TransactionService.ApplyFilters(db.Transactions.Where(item => item.UserId == 0),
            new TransactionFilterQuery { Type = type }).Select(item => item.Id).ToQueryString();
        Assert.Contains("`user_fk` = 0", sql);
        Assert.Contains($"`system_code` = '{type}'", sql);
        Assert.DoesNotContain("<>", sql);
        if (Environment.GetEnvironmentVariable("INEX_CORRECTION_SQL_OUTPUT") is string directory)
        {
            Directory.CreateDirectory(directory);
            File.WriteAllText(Path.Combine(directory, $"{type}.sql"), sql);
        }
    }
}
