namespace inex.Services.Services.Base;

public interface IUserOnboardingService
{
    Task SeedAsync(int userId, int currencyId, string? languageCode = null, CancellationToken ct = default);
}
