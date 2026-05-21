using AutoMapper;
using inex.Data.Repositories.Base;
using inex.Services.Helpers;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.ExchangeRate;
using inex.Services.Models.Records.Transaction;
using inex.Services.Models.Records.Report;
using inex.Services.Services.Base;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace inex.Services.Services;

public class ReportService : Service, IReportService
{
    #region Constructors

    public ReportService(IInExUnitOfWork uowInEx, IAccountService accountService, ICategoryService categoryService, ITransactionService transactionService, IExchangeRateService exchangeRateService, IMapper mapper) : base(uowInEx, mapper)
    {
        _accountService = accountService;
        _categoryService = categoryService;
        _transactionService = transactionService;
        _exchangeRateService = exchangeRateService;
    }

    #endregion Constructors

    #region Public Interface

    public async Task<ListResponse<MonthlyHistoryDTO>> GetMonthlyHistory(int userId, int year, string currency, CancellationToken ct = default)
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
        var rateMap = new Dictionary<(string, DateTime), ExchangeRateDTO>();
        foreach (var r in rates) rateMap.TryAdd((r.CurrencyTo, r.Date.Date), r);

        // 3. Get Accounts (to know transaction currency)
        var accounts = _accountService.Get(userId, ActivityMode.ALL).Data;

        // 4. Get Categories (to exclude system transfers)
        var categories = _categoryService.Get(userId, ActivityMode.ALL).Data;
        var systemCategoryIds = categories.Where(c => c.IsSystem).Select(c => c.Id).ToList();

        var result = new List<MonthlyHistoryDTO>();

        for (int month = 1; month <= 12; month++)
        {
            var monthTransactions = transactions
                .Where(t => t.Created.Month == month && !systemCategoryIds.Contains(t.CategoryId));

            decimal income = 0;
            decimal expense = 0;

            foreach (var t in monthTransactions)
            {
                // Determine transaction currency
                var account = accounts.FirstOrDefault(a => a.Id == t.AccountId);
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

            result.Add(new MonthlyHistoryDTO
            {
                Month = month,
                MonthName = new DateTime(year, month, 1).ToString("MMM"),
                Income = income,
                Expense = expense
            });
        }

        return new ListResponse<MonthlyHistoryDTO> { Data = result };
    }

    public async Task<PagedResponse<CategorySummary, ReportMetadata>> GetCategoriesReportData(int userId, string currency, IDictionary<string, string> filters, CancellationToken ct = default)
    {
        DateTime start = FilterHelper.GetDateTimeFromFilter(filters, nameof(ReportMetadata.Start), new DateTime(2014, 01, 01));
        DateTime end = FilterHelper.GetDateTimeFromFilter(filters, nameof(ReportMetadata.End), new DateTime(2014, 01, 01));

        IEnumerable<ExchangeRateDTO> rates = (await _exchangeRateService.Get(userId, start, end, currency, ct)).Data;
        var rateMap = new Dictionary<(string, DateTime), ExchangeRateDTO>();
        foreach (var r in rates) rateMap.TryAdd((r.CurrencyTo, r.Date.Date), r);
        IEnumerable<AccountResponse> accounts = _accountService.Get(userId, ActivityMode.ALL).Data;
        IEnumerable<CategoryResponse> categories = _categoryService.Get(userId, ActivityMode.ACTIVE).Data.Where(i => !i.IsSystem);
        IEnumerable<TransactionResponse> transactions = _transactionService.Get(userId, ActivityMode.ALL, filters).Data;

        PagedResponse<CategorySummary, ReportMetadata> resultDTO = BuildReportDataResponse<CategoryResponse, CategorySummary>(categories, "Расходы по категориям", currency, start, end);

        var categoryValues = new Dictionary<int, decimal>();
        foreach (TransactionResponse transaction in transactions)
        {
            var account = accounts.FirstOrDefault(i => i.Id == transaction.AccountId);
            if (account == null) continue;
            rateMap.TryGetValue((account.Currency, transaction.Created.Date), out ExchangeRateDTO? rate);
            if (categories.Any(i => i.Id == transaction.CategoryId))
            {
                decimal amount = rate != null ? transaction.Amount / rate.Rate : transaction.Amount;
                categoryValues[transaction.CategoryId] = categoryValues.GetValueOrDefault(transaction.CategoryId) + amount;
            }
        }

        return resultDTO with
        {
            Data = resultDTO.Data
                .Select(i => i with { Value = categoryValues.GetValueOrDefault(i.Id) })
                .Where(i => i.Value != 0)
        };
    }

    #endregion Public Interface

    #region Private Fields

    private IAccountService _accountService;
    private ICategoryService _categoryService;
    private ITransactionService _transactionService;
    private IExchangeRateService _exchangeRateService;

    #endregion Private Fields
}