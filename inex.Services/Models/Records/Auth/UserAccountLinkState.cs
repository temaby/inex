namespace inex.Services.Models.Records.Auth;

public record UserAccountSummary(int Id, string Username, string? Email, string BaseCurrency);

public record UserAccountLinkState(
    string State,
    UserAccountSummary? MasterAccount,
    IReadOnlyList<UserAccountSummary> LinkedAccounts);
