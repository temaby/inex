using inex.Data;
using inex.Data.Repositories;
using inex.Services.Models.Records.Budget;
using inex.Services.Services;
using inex.Services.Tests.Helpers;
using Microsoft.EntityFrameworkCore;

namespace inex.Services.Tests.Services;

public class BudgetServiceTests
{
    [Fact]
    public async Task CreateAsync_WhenYearAndMonthAreZero_UsesInjectedUtcClock()
    {
        await using var db = CreateContext();
        var clock = new FakeClock(new DateTime(2030, 12, 15, 8, 30, 0, DateTimeKind.Utc));
        var service = new BudgetService(new InExUnitOfWork(db), clock);

        await service.CreateAsync(new CreateBudgetRequest
        {
            Key = "default-period",
            Name = "Default Period",
            Value = 100m,
            Year = 0,
            Month = 0,
            CategoryIds = []
        }, userId: 42);

        var saved = await db.Budgets.SingleAsync();
        Assert.Equal(2030, saved.Year);
        Assert.Equal(12, saved.Month);
    }

    private static InExDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<InExDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
}
