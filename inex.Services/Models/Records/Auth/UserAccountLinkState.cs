namespace inex.Services.Models.Records.Auth;

public record UserAccountSummary(int Id, string Username, string? Email);

public record UserAccountLinkState(
    string State,
    UserAccountSummary? MasterAccount,
    IReadOnlyList<UserAccountSummary> LinkedAccounts);
