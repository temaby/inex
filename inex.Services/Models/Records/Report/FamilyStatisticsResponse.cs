namespace inex.Services.Models.Records.Report;

public sealed record FamilyStatisticsResponse(
    int Year,
    int Month,
    string Currency,
    DateTime BalanceDate,
    FamilyTotalsResponse Totals,
    IReadOnlyList<FamilyParticipantResponse> Participants,
    IReadOnlyList<FamilyCategoryResponse>? IncomeCategories,
    IReadOnlyList<FamilyCategoryResponse>? ExpenseCategories,
    IReadOnlyList<FamilyMissingRateResponse> MissingRates);

public sealed record FamilyTotalsResponse(
    decimal? Balance,
    decimal? Income,
    decimal? Expenses,
    decimal? Surplus,
    bool BalanceComplete,
    bool CashFlowComplete);

public sealed record FamilyParticipantResponse(int UserId, string Username, bool IsMaster, FamilyTotalsResponse Totals);

public sealed record FamilyCategoryResponse(int UserId, string Username, int CategoryId, string Path, decimal Amount);

public sealed record FamilyMissingRateResponse(string Scope, string Currency, DateTime Date);
