using inex.Data;
using inex.Data.Models;
using inex.Services.Models.Records.Transaction;
using inex.Services.Services;
using Microsoft.EntityFrameworkCore;
using Xunit.Abstractions;

namespace inex.Services.Tests.Services;

public class TransactionInternalTransferSummaryTests(ITestOutputHelper output)
{
    private static readonly DateTime Day = new(2026, 10, 10);

    [Fact]
    public void BucketsKeepDirectionsSeparateAndGroupByOperationDateAndCurrency()
    {
        var rows = Query(
            Posting(100, Day.AddHours(1)), Posting(-25, Day.AddHours(2)), Posting(-75, Day),
            Posting(7.25m, Day, "EUR"), Posting(-3.5m, Day.AddDays(1)));

        Assert.Equal(3, rows.Count);
        var usd = rows.Single(row => row.Date == Day && row.Currency == "USD");
        Assert.Equal(100m, usd.AmountReceived);
        Assert.Equal(100m, usd.AmountSent);
        Assert.Equal(3, usd.RecordCount);
        Assert.Equal(7.25m, rows.Single(row => row.Currency == "EUR").AmountReceived);
        Assert.Equal(3.5m, rows.Single(row => row.Date == Day.AddDays(1)).AmountSent);
    }

    [Fact]
    public void BucketsCountZeroPostingsAndExcludeOrdinaryTransferCorrectionAndNonSystemLookalikes()
    {
        var ordinary = Posting(100, Day); ordinary.Category.IsSystem = false;
        var transfer = Posting(100, Day); transfer.Category.SystemCode = "transfer";
        var correction = Posting(-100, Day); correction.Category.SystemCode = "correction";
        var bucket = Assert.Single(Query(Posting(0, Day), ordinary, transfer, correction));

        Assert.Equal(1, bucket.RecordCount);
        Assert.Equal(0, bucket.AmountReceived);
        Assert.Equal(0, bucket.AmountSent);
        Assert.Empty(Query(ordinary, transfer, correction));
    }

    [Fact]
    public void BucketsRespectExistingOwnerAccountDateAndTypeFilters()
    {
        var foreign = Posting(999, Day); foreign.UserId = 2;
        var otherAccount = Posting(888, Day); otherAccount.AccountId = 2;
        var postings = new[] { Posting(-10, Day), Posting(20, Day.AddDays(1)),
            Posting(777, Day.AddMonths(-1)), foreign, otherAccount }.AsQueryable();
        var filter = new TransactionFilterQuery
        {
            AccountIds = new[] { 1 }, StartDate = Day, EndDate = Day.AddDays(1), Type = "all"
        };
        var scoped = TransactionService.ApplyFilters(postings.Where(row => row.UserId == 1), filter);
        var buckets = TransactionService.QueryInternalTransferBuckets(scoped).ToList();

        Assert.Equal(2, buckets.Sum(bucket => bucket.RecordCount));
        Assert.Equal(20, buckets.Sum(bucket => bucket.AmountReceived));
        Assert.Equal(10, buckets.Sum(bucket => bucket.AmountSent));
        Assert.Empty(TransactionService.QueryInternalTransferBuckets(
            TransactionService.ApplyFilters(scoped, filter with { Type = "income" })));
    }

    [Fact]
    public void QueryTranslatesToMySqlWithScopedServerSideDateCurrencyAggregation()
    {
        using var db = new InExDbContext(new DbContextOptionsBuilder<InExDbContext>()
            .UseMySql("Server=localhost;Database=translation_only;User=test;Password=test;",
                new MySqlServerVersion(new Version(8, 0, 0))).Options);
        var scoped = TransactionService.ApplyFilters(db.Transactions.AsNoTracking().Where(item => item.UserId == 0),
            new TransactionFilterQuery { AccountIds = new[] { 0 }, StartDate = Day, EndDate = Day.AddDays(1) });
        string sql = TransactionService.QueryInternalTransferBuckets(scoped).ToQueryString();

        Assert.Contains("GROUP BY", sql);
        Assert.Contains("CONVERT(", sql);
        Assert.Contains("SUM(", sql);
        Assert.Contains("COUNT(", sql);
        Assert.Contains("`user_fk`", sql);
        Assert.Contains("`account_fk`", sql);
        Assert.Contains("internal-transfer", sql);
        output.WriteLine(sql);
    }

    private static List<TransactionInternalTransferBucket> Query(params Transaction[] postings) =>
        TransactionService.QueryInternalTransferBuckets(postings.AsQueryable()).ToList();

    private static Transaction Posting(decimal value, DateTime created, string currency = "USD") => new()
    {
        UserId = 1, AccountId = 1, Value = value, Created = created,
        Account = new Account { Id = 1, UserId = 1, IsEnabled = true, Currency = new Currency { Key = currency } },
        Category = new Category { UserId = 1, IsSystem = true, SystemCode = "internal-transfer" },
    };
}
