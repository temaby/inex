namespace inex.Services.Services.Base;

public interface IUserOnboardingService
{
    Task SeedAsync(int userId, int currencyId, CancellationToken ct = default);
}
