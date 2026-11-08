using System.Globalization;
using inex.Data.Models;
using inex.Services.Exceptions;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.ExchangeRate;
using inex.Services.Models.Records.Report;

namespace inex.Services.Services;

public partial class ReportService
{
    /// <summary>Read current balances and selected-month activity for the master's active direct family.</summary>
    public async Task<FamilyStatisticsResponse> GetFamilyStatistics(
        int userId, int? year = null, int? month = null, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        int[] linkedUserIds = DbInEx.UserAccountLinkRepository.Get(true,
                link => link.MasterUserId == userId && link.Status == UserAccountLinkStatus.Active)
            .Select(link => link.LinkedUserId).Distinct().ToArray();
        if (linkedUserIds.Length == 0)
        {
            throw new ResourceNotFoundException("Requested family is unavailable.");
        }

        DateTime today = _clock.UtcNow.Date;
        int reportYear = year ?? today.Year;
        int reportMonth = month ?? today.Month;
        if (reportYear is < 2 or > 9998 || reportMonth is < 1 or > 12)
        {
            throw new ValidationFailedException("The requested report period is invalid.");
        }

        DateTime monthStart = new(reportYear, reportMonth, 1);
        if (monthStart > new DateTime(today.Year, today.Month, 1))
        {
            throw new ValidationFailedException("A family report cannot use a future month.");
        }

        DateTime monthEndExclusive = monthStart.AddMonths(1);
        DateTime balanceEndExclusive = today.AddDays(1);
        string currency = GetUserBaseCurrency(userId);
        int[] participantIds = new[] { userId }.Concat(linkedUserIds.Order()).Distinct().ToArray();
        var names = DbInEx.UserRepository.Get(true, user => participantIds.Contains(user.Id))
            .Select(user => new { user.Id, user.UserName }).ToDictionary(user => user.Id, user => user.UserName ?? string.Empty);
        bool historicalMonth = monthEndExclusive <= today;
        DateTime cashFlowRateEnd = historicalMonth ? monthEndExclusive.AddDays(-1) : today;
        var cachedRates = (await _exchangeRateService.GetCached(userId, monthStart, cashFlowRateEnd, currency, ct)).Data.ToList();
        if (historicalMonth)
        {
            cachedRates.AddRange((await _exchangeRateService.GetCached(userId, today, today, currency, ct)).Data);
        }
        var rates = cachedRates
            .Where(rate => string.Equals(rate.CurrencyFrom, currency, StringComparison.OrdinalIgnoreCase))
            .GroupBy(rate => (rate.CurrencyTo.ToUpperInvariant(), rate.Date.Date))
            .ToDictionary(group => group.Key, group => group.OrderBy(rate => rate.IsTemporary).ThenByDescending(rate => rate.Id).First());
        var missingRates = new HashSet<FamilyMissingRateResponse>();
        var participants = new List<FamilyParticipantResponse>();
        var incomeCategories = new List<FamilyCategoryResponse>();
        var expenseCategories = new List<FamilyCategoryResponse>();

        foreach (int participantId in participantIds)
        {
            ct.ThrowIfCancellationRequested();
            string username = names.GetValueOrDefault(participantId, string.Empty);
            var accounts = _accountService.Get(participantId, ActivityMode.ACTIVE).Data
                .Where(account => account.IsEnabled).ToDictionary(account => account.Id);
            var categories = _categoryService.Get(participantId, ActivityMode.ALL).Data.ToDictionary(category => category.Id);
            var filters = new Dictionary<string, string>
            {
                ["end"] = balanceEndExclusive.AddTicks(-1).ToString("yyyy-MM-dd HH:mm:ss.fffffff", CultureInfo.InvariantCulture)
            };
            var transactions = _transactionService.Get(participantId, ActivityMode.ALL, filters).Data
                .Where(transaction => accounts.ContainsKey(transaction.AccountId) && transaction.Created < balanceEndExclusive).ToList();
            var balances = accounts.Keys.ToDictionary(id => id, _ => 0m);
            decimal income = 0, expenses = 0, balance = 0;
            bool balanceComplete = true, cashFlowComplete = true;
            var categoryAmounts = new Dictionary<(int CategoryId, bool Income), decimal>();

            foreach (var transaction in transactions)
            {
                balances[transaction.AccountId] += transaction.Amount;
                if (transaction.Created < monthStart || transaction.Created >= monthEndExclusive
                    || !categories.TryGetValue(transaction.CategoryId, out CategoryResponse? category) || category.IsSystem)
                {
                    continue;
                }

                if (!TryConvertFamilyAmount(transaction.Amount, accounts[transaction.AccountId].Currency,
                        transaction.Created.Date, currency, rates, out decimal amount))
                {
                    cashFlowComplete = false;
                    missingRates.Add(new("cashFlow", accounts[transaction.AccountId].Currency, transaction.Created.Date));
                    continue;
                }

                if (amount == 0) continue;
                bool isIncome = amount > 0;
                if (isIncome) income += amount;
                else expenses += Math.Abs(amount);
                var key = (category.Id, isIncome);
                categoryAmounts[key] = categoryAmounts.GetValueOrDefault(key) + Math.Abs(amount);
            }

            foreach (var account in accounts.Values)
            {
                if (!TryConvertFamilyAmount(balances[account.Id], account.Currency, today, currency, rates, out decimal amount))
                {
                    balanceComplete = false;
                    missingRates.Add(new("balance", account.Currency, today));
                    continue;
                }
                balance += amount;
            }

            foreach (var (key, amount) in categoryAmounts)
            {
                var slice = new FamilyCategoryResponse(participantId, username, key.CategoryId,
                    BuildCategoryPath(categories[key.CategoryId], categories), amount);
                (key.Income ? incomeCategories : expenseCategories).Add(slice);
            }

            participants.Add(new(participantId, username, participantId == userId,
                new(balanceComplete ? balance : null, cashFlowComplete ? income : null,
                    cashFlowComplete ? expenses : null, cashFlowComplete ? income - expenses : null,
                    balanceComplete, cashFlowComplete)));
        }

        bool allBalancesComplete = participants.All(participant => participant.Totals.BalanceComplete);
        bool allCashFlowsComplete = participants.All(participant => participant.Totals.CashFlowComplete);
        var totals = new FamilyTotalsResponse(
            allBalancesComplete ? participants.Sum(participant => participant.Totals.Balance.GetValueOrDefault()) : null,
            allCashFlowsComplete ? participants.Sum(participant => participant.Totals.Income.GetValueOrDefault()) : null,
            allCashFlowsComplete ? participants.Sum(participant => participant.Totals.Expenses.GetValueOrDefault()) : null,
            allCashFlowsComplete ? participants.Sum(participant => participant.Totals.Surplus.GetValueOrDefault()) : null,
            allBalancesComplete, allCashFlowsComplete);
        return new(reportYear, reportMonth, currency, today, totals, participants,
            allCashFlowsComplete ? incomeCategories.OrderByDescending(category => category.Amount).ThenBy(category => category.UserId).ThenBy(category => category.CategoryId).ToArray() : null,
            allCashFlowsComplete ? expenseCategories.OrderByDescending(category => category.Amount).ThenBy(category => category.UserId).ThenBy(category => category.CategoryId).ToArray() : null,
            missingRates.OrderBy(rate => rate.Scope, StringComparer.Ordinal).ThenBy(rate => rate.Currency, StringComparer.Ordinal).ThenBy(rate => rate.Date).ToArray());
    }

    private static bool TryConvertFamilyAmount(decimal amount, string accountCurrency, DateTime date, string currency,
        IReadOnlyDictionary<(string, DateTime), ExchangeRateResponse> rates, out decimal converted)
    {
        converted = amount;
        if (amount == 0 || string.Equals(accountCurrency, currency, StringComparison.OrdinalIgnoreCase)) return true;
        if (string.IsNullOrWhiteSpace(accountCurrency)
            || !rates.TryGetValue((accountCurrency.ToUpperInvariant(), date.Date), out var rate) || rate.Rate <= 0)
        {
            converted = 0;
            return false;
        }
        converted = amount / rate.Rate;
        return true;
    }
}
