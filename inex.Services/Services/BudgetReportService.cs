using AutoMapper;
using inex.Data.Repositories.Base;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Report;
using inex.Services.Services.Base;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace inex.Services.Services;

public class BudgetReportService : Service, IBudgetReportService
{
    private readonly IBudgetService _budgetService;
    private readonly ITransactionService _transactionService;
    private readonly IExchangeRateService _exchangeRateService;
    private readonly IAccountService _accountService;
    private readonly ICategoryService _categoryService;

    public BudgetReportService(
        IInExUnitOfWork uowInEx,
        IMapper mapper,
        IBudgetService budgetService,
        ITransactionService transactionService,
        IExchangeRateService exchangeRateService,
        IAccountService accountService,
        ICategoryService categoryService) : base(uowInEx, mapper)
    {
        _budgetService = budgetService;
        _transactionService = transactionService;
        _exchangeRateService = exchangeRateService;
        _accountService = accountService;
        _categoryService = categoryService;
    }

    public async Task<PagedResponse<BudgetComparisonDTO, ReportMetadataDTO>> GetBudgetComparison(int userId, int year, int month, string currency)
    {
        // 1. Get Budgets for the month
        var budgetsResponse = _budgetService.Get(userId, year, month);
        var budgets = budgetsResponse.Data;

        // 2. Get Transactions for the month
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);
        var filters = new Dictionary<string, string>
            {
                { "start", startDate.ToString("yyyy-MM-dd") },
                { "end", endDate.ToString("yyyy-MM-dd") }
            };
        var transactionsResponse = _transactionService.Get(userId, ActivityMode.ACTIVE, filters);
        var transactions = transactionsResponse.Data;

        // 2.1 Get Accounts to resolve currency correctly
        var accountsResponse = _accountService.Get(userId, ActivityMode.ALL);
        var accounts = accountsResponse.Data;

        // 2.2 Get Categories to identify system categories
        var categoriesResponse = _categoryService.Get(userId, ActivityMode.ALL);
        var systemCategoryIds = categoriesResponse.Data
            .Where(c => c.IsSystem)
            .Select(c => c.Id)
            .ToHashSet();

        // 3. Get Exchange Rates
        var ratesResponse = await _exchangeRateService.Get(userId, startDate, endDate, currency);
        var rates = ratesResponse.Data;

        // 4. Calculate Spending per Category and Totals
        var categorySpending = new Dictionary<int, decimal>();
        decimal totalIncome = 0;
        decimal totalOutcome = 0;

        foreach (var transaction in transactions)
        {
            // Skip system transactions for totals
            bool isSystemTransaction = systemCategoryIds.Contains(transaction.CategoryId);

            if (!categorySpending.ContainsKey(transaction.CategoryId))
                categorySpending[transaction.CategoryId] = 0;

            decimal amountInTargetCurrency = 0;

            // Resolve account currency from the accounts list
            var account = accounts.FirstOrDefault(a => a.Id == transaction.AccountId);
            var transactionCurrency = account?.Currency ?? transaction.AccountCurrency; // Fallback to transaction.AccountCurrency if account not found (shouldn't happen)

            // If transaction currency matches report currency, use amount directly
            if (string.Equals(transactionCurrency, currency, StringComparison.InvariantCultureIgnoreCase))
            {
                amountInTargetCurrency = transaction.Amount;
            }
            else
            {
                // Find rate to convert FROM report currency TO transaction currency
                var rate = rates.FirstOrDefault(r => r.CurrencyTo == transactionCurrency && r.Date.Date == transaction.Created.Date);

                if (rate != null)
                {
                    amountInTargetCurrency = transaction.Amount / rate.Rate;
                }
                else
                {
                    // Fallback: try to find rate for the same currency pair on a different day
                    var fallbackRate = rates
                        .Where(r => r.CurrencyTo == transactionCurrency)
                        .OrderBy(r => Math.Abs((r.Date.Date - transaction.Created.Date).TotalDays))
                        .FirstOrDefault();

                    if (fallbackRate != null)
                    {
                        amountInTargetCurrency = transaction.Amount / fallbackRate.Rate;
                    }
                    else
                    {
                        // Last resort: if no rate found, assume 1:1
                        // Now that we have correct currency, this should only happen if rates are truly missing
                        amountInTargetCurrency = transaction.Amount;
                    }
                }
            }

            if (!isSystemTransaction)
            {
                if (amountInTargetCurrency > 0)
                {
                    totalIncome += amountInTargetCurrency;
                }
                else
                {
                    totalOutcome += Math.Abs(amountInTargetCurrency);
                }
            }

            // Always track category spending for budget comparison (in case someone budgeted a system category?)
            // Usually system categories are not budgeted, but if they are, we should probably track them.
            // However, for "Total Outcome" we definitely want to exclude them.
            // For "Category Spending" used in budget comparison:
            if (amountInTargetCurrency < 0)
            {
                categorySpending[transaction.CategoryId] += Math.Abs(amountInTargetCurrency);
            }
        }

        // 5. Build Comparison List
        var comparisonList = new List<BudgetComparisonDTO>();

        foreach (var budget in budgets)
        {
            // Skip budgets with 0 value
            if (budget.Value == 0)
                continue;

            decimal spentForBudget = 0;
            if (budget.CategoryIds != null)
            {
                foreach (var categoryId in budget.CategoryIds)
                {
                    if (categorySpending.ContainsKey(categoryId))
                    {
                        spentForBudget += categorySpending[categoryId];
                    }
                }
            }

            comparisonList.Add(new BudgetComparisonDTO
            {
                CategoryName = budget.Name,
                CategoryIds = budget.CategoryIds?.ToList() ?? new List<int>(),
                BudgetedAmount = budget.Value,
                SpentAmount = spentForBudget,
                RemainingAmount = budget.Value - spentForBudget,
                PercentageUsed = budget.Value > 0 ? (spentForBudget / budget.Value) * 100 : 0
            });
        }

        return new PagedResponse<BudgetComparisonDTO, ReportMetadataDTO>
        {
            Data = comparisonList,
            Metadata = new ReportMetadataDTO
            {
                Name = $"Budget Comparison {year}-{month}",
                Currency = currency,
                Start = startDate,
                End = endDate,
                TotalIncome = totalIncome,
                TotalOutcome = totalOutcome
            }
        };
    }
}