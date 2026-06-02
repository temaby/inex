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
using inex.Services.Services.Base;
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

        DateTime currentMonth = new(_clock.UtcNow.Year, _clock.UtcNow.Month, 1);
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
                string accountCurrency = account.Currency ?? baseCurrency;
                netWorth += ConvertToBaseCurrency(balance, accountCurrency, baseCurrency, monthEnd, rateMap);
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

    private static decimal ConvertToBaseCurrency(
        decimal amount,
        string accountCurrency,
        string baseCurrency,
        DateTime date,
        IReadOnlyDictionary<(string Currency, DateTime Date), ExchangeRateResponse> rateMap)
    {
        if (string.Equals(accountCurrency, baseCurrency, StringComparison.InvariantCultureIgnoreCase))
        {
            return amount;
        }

        if (!rateMap.TryGetValue((accountCurrency, date.Date), out ExchangeRateResponse? rate) || rate.Rate == 0)
        {
            throw new InvalidOperationException($"Missing exchange rate for {accountCurrency} on {date:yyyy-MM-dd}.");
        }

        return amount / rate.Rate;
    }

    #endregion Private Methods

    #region Private Fields

    private IAccountService _accountService;
    private ICategoryService _categoryService;
    private ITransactionService _transactionService;
    private IExchangeRateService _exchangeRateService;
    private IClock _clock;

    #endregion Private Fields
}
