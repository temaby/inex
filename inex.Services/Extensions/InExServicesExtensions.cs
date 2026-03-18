using Microsoft.Extensions.DependencyInjection;
using inex.Data.Extensions;
using inex.Services.Services.Base;
using inex.Services.Services;
using Microsoft.Extensions.Configuration;
using inex.Services.Models.App;

namespace inex.Services.Extensions;

public static class InExServicesExtensions
{
    public static IServiceCollection AddInExServices(this IServiceCollection services, IConfiguration config)
    {
        string inexConnectionString = config.GetConnectionString("InExConnection")
        ?? throw new InvalidOperationException("InExConnection connection string is not configured.");

        services.AddOptions<ExchangeApiSettings>().BindConfiguration("ExchangeApiSettings").ValidateDataAnnotations().ValidateOnStart();

        services.AddAutoMapper(typeof(InExServicesExtensions).Assembly);

        services.AddInExData(inexConnectionString);

        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<IBudgetService, BudgetService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ICSVService, CSVService>();
        services.AddScoped<ICurrencyService, CurrencyService>();
        services.AddScoped<ITransactionService, TransactionService>();
        services.AddScoped<IExchangeRateService, ExchangeRateService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IBudgetReportService, BudgetReportService>();

        return services;
    }
}