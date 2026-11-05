using inex.Data;
using inex.Data.Models;
using inex.Services.Helpers;
using Microsoft.EntityFrameworkCore;
using Xunit.Abstractions;

namespace inex.Services.Tests.Services;

public class DefaultAccountRecommendationsTests(ITestOutputHelper output)
{
    private static readonly DateTime Today = new(2026, 11, 5);

    [Fact]
    public void FrequencyIsSeparateByDirectionAndIndependentOfAmount()
    {
        var rows = Query(
            Posting(1, -1, Today.AddDays(-2)), Posting(1, -1, Today.AddDays(-1)),
            Posting(2, -10000, Today), Posting(1, 10000, Today),
            Posting(2, 1, Today.AddDays(-2)), Posting(2, 1, Today.AddDays(-1)));

        Assert.Equal(1, DefaultAccountRecommendations.Choose(rows, true, null));
        Assert.Equal(2, DefaultAccountRecommendations.Choose(rows, false, null));
    }

    [Fact]
    public void ThirtyCalendarDaysIncludeLowerBoundaryAndAllOfTodayButNotTomorrow()
    {
        var rows = Query(Posting(1, -1, Today.AddDays(-29)), Posting(1, -1, Today.AddHours(23)),
            Posting(2, -1, Today.AddDays(-30)), Posting(2, -1, Today.AddDays(1)), Posting(3, 0, Today));

        Assert.Equal(2, rows.Single(row => row.AccountId == 1).RecentCount);
        Assert.Equal(0, rows.Single(row => row.AccountId == 2).RecentCount);
        Assert.DoesNotContain(rows, row => row.AccountId == 3);
        Assert.Equal(1, DefaultAccountRecommendations.Choose(rows, true, null));
    }

    [Fact]
    public void EqualCountsUseLatestDateThenStableAccountId()
    {
        var rows = Query(Posting(1, -1, Today.AddDays(-1)), Posting(2, -1, Today), Posting(3, -1, Today));
        Assert.Equal(2, DefaultAccountRecommendations.Choose(rows, true, null));
    }

    [Fact]
    public void WithoutRecentHistoryUseLastHistoricalPostingRatherThanHistoricalFrequency()
    {
        var rows = Query(Posting(1, -1, Today.AddDays(-31)), Posting(1, -1, Today.AddDays(-32)),
            Posting(2, -1, Today.AddDays(-30)), Posting(3, -1, Today.AddDays(1)));

        Assert.Equal(2, DefaultAccountRecommendations.Choose(rows, true, null));
        Assert.Null(DefaultAccountRecommendations.Choose(rows, false, null));
        Assert.Equal(7, DefaultAccountRecommendations.Choose(rows, false, 7));
    }

    [Fact]
    public void IgnoreSystemPostingsDisabledAccountsAndEveryForeignOwnershipPath()
    {
        var system = Posting(2, -1, Today); system.Category.IsSystem = true;
        var disabled = Posting(3, -1, Today); disabled.Account.IsEnabled = false;
        var foreignPosting = Posting(4, -1, Today); foreignPosting.UserId = 9;
        var foreignAccount = Posting(5, -1, Today); foreignAccount.Account.UserId = 9;
        var foreignCategory = Posting(6, -1, Today); foreignCategory.Category.UserId = 9;
        var disabledCategory = Posting(1, -1, Today); disabledCategory.Category.IsEnabled = false;

        var rows = Query(system, disabled, foreignPosting, foreignAccount, foreignCategory, disabledCategory);
        Assert.Equal(1, Assert.Single(rows).AccountId);
    }

    [Fact]
    public void QueryTranslatesToMySqlWithOwnershipAndServerSideAggregation()
    {
        using var db = new InExDbContext(new DbContextOptionsBuilder<InExDbContext>()
            .UseMySql("Server=localhost;Database=translation_only;User=test;Password=test;",
                new MySqlServerVersion(new Version(8, 0, 0))).Options);
        string sql = DefaultAccountRecommendations.Query(db.Transactions.AsNoTracking(), 0, Today).ToQueryString();

        Assert.Contains("GROUP BY", sql);
        Assert.Contains("MAX(", sql);
        Assert.Contains("COUNT(CASE", sql);
        Assert.Contains("`is_system`", sql);
        Assert.Contains("`is_enabled`", sql);
        Assert.True(sql.Split("`user_fk`").Length >= 4, sql);
        output.WriteLine(sql);
    }

    private static List<DefaultAccountRecommendations.Usage> Query(params Transaction[] postings) =>
        DefaultAccountRecommendations.Query(postings.AsQueryable(), 1, Today).ToList();

    private static Transaction Posting(int accountId, decimal value, DateTime created) => new()
    {
        AccountId = accountId, UserId = 1, Value = value, Created = created,
        Account = new Account { Id = accountId, UserId = 1, IsEnabled = true },
        Category = new Category { UserId = 1, IsEnabled = true },
    };
}
