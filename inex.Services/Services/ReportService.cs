using inex.Data.Repositories.Base;
using inex.Services.Helpers;
using inex.Services.Models.Mappers;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.ExchangeRate;
using inex.Services.Models.Records.Transaction;
using inex.Services.Models.Records.Report;
using inex.Services.Infrastructure.Time;
using inex.Services.Exceptions;
using inex.Services.Reports;
using inex.Services.Services.Base;
using QuestPDF.Fluent;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace inex.Services.Services;

public class ReportService : Service, IReportService
{
    #region Constructors

    public ReportService(IInExUnitOfWork uowInEx, IAccountService accountService, ICategoryService categoryService, ITransactionService transactionService, IExchangeRateService exchangeRateService, IClock clock) : base(uowInEx)
    {
        _accountService = accountService;
        _categoryService = categoryService;
        _transactionService = transactionService;
        _exchangeRateService = exchangeRateService;
        _clock = clock;
    }

    #endregion Constructors

    #region Public Interface

    public async Task<ListResponse<MonthlyHistoryResponse>> GetMonthlyHistory(int userId, int year, string currency, CancellationToken ct = default)
    {
        var start = new DateTime(year, 1, 1);
        var end = new DateTime(year, 12, 31);

        // 1. Get all transactions for the year
        var filters = new Dictionary<string, string>
            {
                { "start", start.ToString("yyyy-MM-dd") },
                { "end", end.ToString("yyyy-MM-dd") }
            };
        var transactions = _transactionService.Get(userId, ActivityMode.ALL, filters).Data;

        // 2. Get Exchange Rates for the entire year
        var rates = (await _exchangeRateService.Get(userId, start, end, currency, ct)).Data;
        var rateMap = new Dictionary<(string, DateTime), ExchangeRateResponse>();
        foreach (var r in rates) rateMap.TryAdd((r.CurrencyTo, r.Date.Date), r);

        // 3. Get Accounts (to know transaction currency)
        var accounts = _accountService.Get(userId, ActivityMode.ALL).Data.ToDictionary(a => a.Id);

        // 4. Get Categories (to exclude system transfers)
        var categories = _categoryService.Get(userId, ActivityMode.ALL).Data;
        var systemCategoryIds = categories.Where(c => c.IsSystem).Select(c => c.Id).ToList();

        var result = new List<MonthlyHistoryResponse>();

        for (int month = 1; month <= 12; month++)
        {
            var monthTransactions = transactions
                .Where(t => t.Created.Month == month && !systemCategoryIds.Contains(t.CategoryId));

            decimal income = 0;
            decimal expense = 0;

            foreach (var t in monthTransactions)
            {
                // Determine transaction currency
                accounts.TryGetValue(t.AccountId, out var account);
                var tCurrency = account?.Currency ?? currency;

                // Convert amount if needed
                decimal amount = t.Amount;
                if (tCurrency != currency)
                {
                    rateMap.TryGetValue((tCurrency, t.Created.Date), out var rate);
                    if (rate != null && rate.Rate != 0)
                        amount = t.Amount / rate.Rate;
                }

                if (amount > 0) income += amount;
                else expense += amount;
            }

            result.Add(new MonthlyHistoryResponse
            {
                Month = month,
                MonthName = new DateTime(year, month, 1).ToString("MMM"),
                Income = income,
                Expense = expense
            });
        }

        return new ListResponse<MonthlyHistoryResponse> { Data = result };
    }

    public async Task<PagedResponse<CategorySummary, ReportMetadata>> GetCategoriesReportData(int userId, string currency, IDictionary<string, string> filters, CancellationToken ct = default)
    {
        DateTime start = FilterHelper.GetDateTimeFromFilter(filters, nameof(ReportMetadata.Start), new DateTime(2014, 01, 01));
        DateTime end = FilterHelper.GetDateTimeFromFilter(filters, nameof(ReportMetadata.End), new DateTime(2014, 01, 01));

        IEnumerable<ExchangeRateResponse> rates = (await _exchangeRateService.Get(userId, start, end, currency, ct)).Data;
        var rateMap = new Dictionary<(string, DateTime), ExchangeRateResponse>();
        foreach (var r in rates) rateMap.TryAdd((r.CurrencyTo, r.Date.Date), r);

        var accounts = _accountService.Get(userId, ActivityMode.ALL).Data.ToDictionary(a => a.Id);
        var allCategories = _categoryService.Get(userId, ActivityMode.ALL).Data.ToList();
        var categories = allCategories.Where(i => !i.IsSystem).ToList();
        var categoryIds = categories.Select(c => c.Id).ToHashSet();
        IEnumerable<TransactionResponse> transactions = _transactionService.Get(userId, ActivityMode.ALL, filters).Data;

        var categoryValues = new Dictionary<int, decimal>();
        decimal totalIncome = 0;
        decimal totalOutcome = 0;

        foreach (TransactionResponse transaction in transactions)
        {
            if (!accounts.TryGetValue(transaction.AccountId, out var account)) continue;

            var transactionCurrency = account.Currency ?? transaction.AccountCurrency;
            decimal amount = transaction.Amount;
            if (!string.Equals(transactionCurrency, currency, StringComparison.InvariantCultureIgnoreCase)
                && rateMap.TryGetValue((transactionCurrency, transaction.Created.Date), out ExchangeRateResponse? rate)
                && rate.Rate != 0)
            {
                amount = transaction.Amount / rate.Rate;
            }

            if (categoryIds.Contains(transaction.CategoryId))
            {
                if (amount > 0)
                {
                    totalIncome += amount;
                }
                else
                {
                    totalOutcome += Math.Abs(amount);
                }
            }

            if (categoryIds.Contains(transaction.CategoryId))
            {
                categoryValues[transaction.CategoryId] = categoryValues.GetValueOrDefault(transaction.CategoryId) + amount;
            }
        }

        return new PagedResponse<CategorySummary, ReportMetadata>
        {
            Metadata = new ReportMetadata
            {
                Name = "reports.categoryReport",
                Currency = currency,
                Start = start,
                End = end,
                TotalIncome = totalIncome,
                TotalOutcome = totalOutcome
            },
            Data = categories
                .Select(CategoryMapper.ToSummary)
                .Select(i => i with { Value = categoryValues.GetValueOrDefault(i.Id) })
                .Where(i => i.Value != 0)
        };
    }

    public async Task<PagedResponse<SpendingHeatmapDayResponse, ReportMetadata>> GetSpendingHeatmap(int userId, DateTime start, DateTime end, CancellationToken ct = default)
    {
        DateTime startDate = start.Date;
        DateTime endDate = end.Date;
        if (endDate < startDate)
        {
            throw new ArgumentException("End date must be on or after start date.", nameof(end));
        }

        string baseCurrency = DbInEx.UserRepository
            .Get(true, null, i => i.Currency)
            .First(i => i.Id == userId)
            .Currency
            .Key;

        var filters = new Dictionary<string, string>
        {
            { "start", startDate.ToString("yyyy-MM-dd") },
            { "end", endDate.AddDays(1).AddTicks(-1).ToString("yyyy-MM-dd HH:mm:ss.fffffff") }
        };

        var rates = (await _exchangeRateService.Get(userId, startDate, endDate, baseCurrency, ct)).Data;
        var rateMap = new Dictionary<(string Currency, DateTime Date), ExchangeRateResponse>();
        foreach (var rate in rates)
        {
            rateMap.TryAdd((rate.CurrencyTo, rate.Date.Date), rate);
        }

        var accounts = _accountService.Get(userId, ActivityMode.ALL).Data.ToDictionary(account => account.Id);
        var systemCategoryIds = _categoryService
            .Get(userId, ActivityMode.ALL)
            .Data
            .Where(category => category.IsSystem)
            .Select(category => category.Id)
            .ToHashSet();
        var transactions = _transactionService.Get(userId, ActivityMode.ALL, filters).Data;

        var spendByDate = Enumerable
            .Range(0, (endDate - startDate).Days + 1)
            .Select(offset => startDate.AddDays(offset))
            .ToDictionary(date => date, _ => 0m);

        foreach (var transaction in transactions)
        {
            DateTime transactionDate = transaction.Created.Date;
            if (transactionDate < startDate || transactionDate > endDate)
            {
                continue;
            }

            if (transaction.Amount >= 0 || systemCategoryIds.Contains(transaction.CategoryId))
            {
                continue;
            }

            if (!accounts.TryGetValue(transaction.AccountId, out var account))
            {
                continue;
            }

            string transactionCurrency = account.Currency ?? transaction.AccountCurrency;
            decimal amount = Math.Abs(transaction.Amount);

            if (!string.Equals(transactionCurrency, baseCurrency, StringComparison.InvariantCultureIgnoreCase))
            {
                if (!rateMap.TryGetValue((transactionCurrency, transactionDate), out ExchangeRateResponse? rate) || rate.Rate == 0)
                {
                    continue;
                }

                amount /= rate.Rate;
            }

            spendByDate[transactionDate] += amount;
        }

        return new PagedResponse<SpendingHeatmapDayResponse, ReportMetadata>
        {
            Metadata = new ReportMetadata
            {
                Name = "reports.heatmapReport",
                Currency = baseCurrency,
                Start = startDate,
                End = endDate,
                TotalOutcome = spendByDate.Values.Sum()
            },
            Data = spendByDate
                .OrderBy(item => item.Key)
                .Select(item => new SpendingHeatmapDayResponse
                {
                    Date = item.Key,
                    TotalSpend = item.Value,
                    Currency = baseCurrency
                })
        };
    }

    public async Task<ListResponse<NetWorthHistoryPointResponse>> GetNetWorthHistory(int userId, int months, string currency = "", CancellationToken ct = default)
    {
        int monthCount = Math.Clamp(months, 1, 60);
        string baseCurrency = string.IsNullOrWhiteSpace(currency)
            ? GetUserBaseCurrency(userId)
            : currency;

        DateTime today = _clock.UtcNow.Date;
        DateTime currentMonth = new(today.Year, today.Month, 1);
        DateTime startMonth = currentMonth.AddMonths(-(monthCount - 1));
        DateTime startDate = startMonth.Date;
        DateTime endDate = GetMonthEnd(currentMonth);

        var monthEnds = Enumerable
            .Range(0, monthCount)
            .Select(offset => GetMonthEnd(startMonth.AddMonths(offset)))
            .ToList();

        var rates = (await _exchangeRateService.Get(userId, startDate, endDate, baseCurrency, ct)).Data;
        var rateMap = new Dictionary<(string Currency, DateTime Date), ExchangeRateResponse>();
        foreach (var rate in rates)
        {
            rateMap.TryAdd((rate.CurrencyTo, rate.Date.Date), rate);
        }

        var accounts = _accountService.Get(userId, ActivityMode.ALL).Data.ToDictionary(account => account.Id);
        var filters = new Dictionary<string, string>
        {
            { "end", endDate.AddDays(1).AddTicks(-1).ToString("yyyy-MM-dd HH:mm:ss.fffffff") }
        };
        var transactions = _transactionService.Get(userId, ActivityMode.ALL, filters).Data.ToList();
        var balancesByAccount = accounts.Keys.ToDictionary(accountId => accountId, _ => 0m);
        var orderedTransactions = transactions
            .Where(transaction => accounts.ContainsKey(transaction.AccountId))
            .OrderBy(transaction => transaction.Created)
            .ToList();

        int transactionIndex = 0;
        var points = new List<NetWorthHistoryPointResponse>();

        foreach (DateTime monthEnd in monthEnds)
        {
            DateTime inclusiveMonthEnd = monthEnd.AddDays(1).AddTicks(-1);
            while (transactionIndex < orderedTransactions.Count && orderedTransactions[transactionIndex].Created <= inclusiveMonthEnd)
            {
                TransactionResponse transaction = orderedTransactions[transactionIndex];
                balancesByAccount[transaction.AccountId] += transaction.Amount;
                transactionIndex++;
            }

            decimal netWorth = 0;
            foreach ((int accountId, decimal balance) in balancesByAccount)
            {
                if (balance == 0)
                {
                    continue;
                }

                var account = accounts[accountId];
                string accountCurrency = string.IsNullOrWhiteSpace(account.Currency)
                    ? baseCurrency
                    : account.Currency;

                DateTime conversionDate = monthEnd > today ? today : monthEnd;
                if (TryConvertToBaseCurrency(balance, accountCurrency, baseCurrency, conversionDate, rateMap, out decimal convertedBalance))
                {
                    netWorth += convertedBalance;
                }
            }

            points.Add(new NetWorthHistoryPointResponse
            {
                Month = monthEnd.ToString("yyyy-MM"),
                MonthEnd = monthEnd,
                NetWorth = netWorth,
                Currency = baseCurrency
            });
        }

        return new ListResponse<NetWorthHistoryPointResponse> { Data = points };
    }

    public async Task<MonthlyFinancialReport> GetMonthlyFinancialReport(int userId, int? year = null, int? month = null, CancellationToken ct = default)
    {
        DateTime currentDate = _clock.UtcNow.Date;
        int reportYear = year ?? currentDate.Year;
        int reportMonth = month ?? currentDate.Month;
        DateTime monthStart = new(reportYear, reportMonth, 1);
        if (monthStart > new DateTime(currentDate.Year, currentDate.Month, 1))
        {
            throw new ValidationFailedException("A monthly financial report cannot be generated for a future month.");
        }
        DateTime monthEnd = monthStart.AddMonths(1).AddTicks(-1);
        string currency = GetUserBaseCurrency(userId);

        var accounts = _accountService.Get(userId, ActivityMode.ACTIVE).Data.ToDictionary(account => account.Id);
        var categories = _categoryService.Get(userId, ActivityMode.ALL).Data.ToDictionary(category => category.Id);
        var filters = new Dictionary<string, string>
        {
            ["end"] = monthEnd.ToString("yyyy-MM-dd HH:mm:ss.fffffff")
        };
        var transactions = _transactionService
            .Get(userId, ActivityMode.ALL, filters)
            .Data
            .Where(transaction => accounts.ContainsKey(transaction.AccountId))
            .ToList();
        var rates = (await _exchangeRateService.Get(userId, monthStart.AddDays(-1), monthEnd, currency, ct)).Data;
        var rateMap = new Dictionary<(string, DateTime), ExchangeRateResponse>(StringTupleDateComparer.Instance);
        foreach (ExchangeRateResponse rate in rates)
        {
            rateMap.TryAdd((rate.CurrencyTo, rate.Date.Date), rate);
        }

        decimal ConvertAmount(decimal amount, int accountId, DateTime date)
        {
            if (amount == 0)
            {
                return 0;
            }

            string accountCurrency = accounts[accountId].Currency;
            if (string.Equals(accountCurrency, currency, StringComparison.InvariantCultureIgnoreCase))
            {
                return amount;
            }

            if (!rateMap.TryGetValue((accountCurrency, date.Date), out ExchangeRateResponse? rate) || rate.Rate == 0)
            {
                throw new ValidationFailedException($"A {accountCurrency} exchange rate is unavailable for {date:yyyy-MM-dd}.");
            }

            return amount / rate.Rate;
        }

        var reportTransactions = transactions
            .Where(transaction => transaction.Created >= monthStart && transaction.Created <= monthEnd)
            .Where(transaction => categories.TryGetValue(transaction.CategoryId, out CategoryResponse? category) && !category.IsSystem)
            .Select(transaction => new MonthlyReportTransaction(
                transaction.CategoryId,
                ConvertAmount(transaction.Amount, transaction.AccountId, transaction.Created)))
            .ToList();

        decimal totalIncome = reportTransactions.Where(transaction => transaction.Amount > 0).Sum(transaction => transaction.Amount);
        decimal totalExpenses = Math.Abs(reportTransactions.Where(transaction => transaction.Amount < 0).Sum(transaction => transaction.Amount));

        var incomeCategories = BuildCategorySummaries(reportTransactions, categories, transaction => transaction.Amount > 0);
        var expenseCategories = BuildCategorySummaries(reportTransactions, categories, transaction => transaction.Amount < 0);

        var openingBalances = accounts.Keys.ToDictionary(accountId => accountId, _ => 0m);
        var closingBalances = accounts.Keys.ToDictionary(accountId => accountId, _ => 0m);
        foreach (var transaction in transactions)
        {
            if (transaction.Created < monthStart)
            {
                openingBalances[transaction.AccountId] += transaction.Amount;
            }

            closingBalances[transaction.AccountId] += transaction.Amount;
        }

        decimal openingBalance = openingBalances.Sum(balance => ConvertAmount(balance.Value, balance.Key, monthStart.AddDays(-1)));
        DateTime closingBalanceDate = monthEnd.Date > currentDate ? currentDate : monthEnd.Date;
        decimal closingBalance = closingBalances.Sum(balance => ConvertAmount(balance.Value, balance.Key, closingBalanceDate));

        return new MonthlyFinancialReport
        {
            Year = reportYear,
            Month = reportMonth,
            Currency = currency,
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses,
            OpeningBalance = openingBalance,
            ClosingBalance = closingBalance,
            IncomeCategories = incomeCategories,
            ExpenseCategories = expenseCategories
        };
    }

    public async Task<byte[]> GetMonthlyFinancialReportPdf(int userId, int? year = null, int? month = null, CancellationToken ct = default)
    {
        MonthlyFinancialReport report = await GetMonthlyFinancialReport(userId, year, month, ct);
        return new MonthlyFinancialReportDocument(report).GeneratePdf();
    }

    #endregion Public Interface

    #region Private Methods

    private string GetUserBaseCurrency(int userId)
    {
        return DbInEx.UserRepository
            .Get(true, null, i => i.Currency)
            .First(i => i.Id == userId)
            .Currency
            .Key;
    }

    private static DateTime GetMonthEnd(DateTime month)
    {
        return new DateTime(month.Year, month.Month, 1).AddMonths(1).AddDays(-1);
    }

    private static IReadOnlyList<MonthlyReportCategory> BuildCategorySummaries(
        IEnumerable<MonthlyReportTransaction> transactions,
        IReadOnlyDictionary<int, CategoryResponse> categories,
        Func<MonthlyReportTransaction, bool> includeTransaction)
    {
        const decimal otherCategoryThreshold = 10m;
        var categoryTotals = transactions
            .Where(includeTransaction)
            .GroupBy(transaction => transaction.CategoryId)
            .Select(group => new MonthlyReportCategory(
                BuildCategoryPath(categories[group.Key], categories),
                Math.Abs(group.Sum(transaction => transaction.Amount))))
            .OrderByDescending(category => category.Amount)
            .ThenBy(category => category.Name, StringComparer.InvariantCulture)
            .ToList();

        var individuallyVisibleCategories = categoryTotals
            .Where(category => category.Amount >= otherCategoryThreshold)
            .ToList();
        decimal otherTotal = categoryTotals
            .Where(category => category.Amount < otherCategoryThreshold)
            .Sum(category => category.Amount);
        var summaries = individuallyVisibleCategories
            .OrderByDescending(category => category.Amount)
            .ThenBy(category => category.Name, StringComparer.InvariantCulture)
            .ToList();
        if (otherTotal > 0)
        {
            string otherCategoryName = summaries.Any(category => category.Name == "Other")
                ? "Other (small categories)"
                : "Other";
            summaries.Add(new MonthlyReportCategory(otherCategoryName, otherTotal));
        }

        return summaries;
    }

    private static string BuildCategoryPath(
        CategoryResponse category,
        IReadOnlyDictionary<int, CategoryResponse> categories)
    {
        var categoryNames = new Stack<string>();
        var visitedCategoryIds = new HashSet<int>();
        CategoryResponse? currentCategory = category;

        while (currentCategory is not null && visitedCategoryIds.Add(currentCategory.Id))
        {
            categoryNames.Push(currentCategory.Name);
            currentCategory = currentCategory.ParentId is int parentId && categories.TryGetValue(parentId, out CategoryResponse? parentCategory)
                ? parentCategory
                : null;
        }

        return string.Join(" / ", categoryNames);
    }

    private static bool TryConvertToBaseCurrency(
        decimal amount,
        string accountCurrency,
        string baseCurrency,
        DateTime date,
        IReadOnlyDictionary<(string Currency, DateTime Date), ExchangeRateResponse> rateMap,
        out decimal convertedAmount)
    {
        convertedAmount = amount;

        if (string.Equals(accountCurrency, baseCurrency, StringComparison.InvariantCultureIgnoreCase))
        {
            return true;
        }

        if (!rateMap.TryGetValue((accountCurrency, date.Date), out ExchangeRateResponse? rate) || rate.Rate == 0)
        {
            convertedAmount = 0;
            return false;
        }

        convertedAmount = amount / rate.Rate;
        return true;
    }

    #endregion Private Methods

    #region Private Fields

    private IAccountService _accountService;
    private ICategoryService _categoryService;
    private ITransactionService _transactionService;
    private IExchangeRateService _exchangeRateService;
    private IClock _clock;

    private record MonthlyReportTransaction(int CategoryId, decimal Amount);

    private sealed class StringTupleDateComparer : IEqualityComparer<(string, DateTime)>
    {
        public static readonly StringTupleDateComparer Instance = new();

        public bool Equals((string, DateTime) x, (string, DateTime) y) =>
            string.Equals(x.Item1, y.Item1, StringComparison.InvariantCultureIgnoreCase) && x.Item2 == y.Item2;

        public int GetHashCode((string, DateTime) item) =>
            HashCode.Combine(StringComparer.InvariantCultureIgnoreCase.GetHashCode(item.Item1), item.Item2);
    }

    #endregion Private Fields
}
