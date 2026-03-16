using AutoMapper;
using Microsoft.Extensions.DependencyInjection;
using inex.Data.Extensions;
using inex.Data.Repositories;
using inex.Data.Repositories.Base;
using inex.Services.Models.ConfigProfiles;

namespace inex.Services.Extensions;

public static class InExServicesExtensions
{
    public static IServiceCollection AddInExServices(this IServiceCollection services, string inexConnectionString)
    {
        services.AddInExData(inexConnectionString);

        var mapperConfig = new MapperConfiguration(mc =>
        {
            mc.AddProfile(new AccountProfile());
            mc.AddProfile(new BudgetProfile());
            mc.AddProfile(new CategoryProfile());
            mc.AddProfile(new CurrencyProfile());
            mc.AddProfile(new TransactionProfile());
            mc.AddProfile(new ExchangeProfile());
        });

        IMapper mapper = mapperConfig.CreateMapper();
        services.AddSingleton(mapper);

        services.AddTransient<IInExUnitOfWork, InExUnitOfWork>();
        return services;
    }
}