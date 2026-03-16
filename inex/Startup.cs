using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.SpaServices.ReactDevelopmentServer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using System;
using System.IO;
using System.Reflection;
using inex.Models.App;
using inex.Data;
using inex.Extensions;
using inex.Services.Extensions;
using inex.Services.Models.App;
using inex.Services.Services;
using inex.Services.Services.Base;

namespace inex;

public class Startup
{
    public Startup(IConfiguration configuration)
    {
        Configuration = configuration;
    }

    public IConfiguration Configuration { get; }

    // This method gets called by the runtime. Use this method to add services to the container.
    public void ConfigureServices(IServiceCollection services)
    {
        string inexConnection = Configuration.GetConnectionString("InExConnection")
            ?? throw new InvalidOperationException("InExConnection connection string is not configured.");

        services.AddInExServices(inexConnection);

        services.AddTransient<IAccountService, AccountService>();
        services.AddTransient<IBudgetService, BudgetService>();
        services.AddTransient<ICategoryService, CategoryService>();
        services.AddTransient<ICSVService, CSVService>();
        services.AddTransient<ICurrencyService, CurrencyService>();
        services.AddTransient<ITransactionService, TransactionService>();
        services.AddTransient<IExchangeRateService, ExchangeRateService>();
        services.AddTransient<IReportService, ReportService>();
        services.AddTransient<IBudgetReportService, BudgetReportService>();

        services.AddControllersWithViews().AddJsonOptions(x => x.JsonSerializerOptions.IgnoreNullValues = true);

        // configure strongly typed settings objects
        var appSettingsSection = Configuration.GetSection("AppSettings");
        services.Configure<AppSettings>(appSettingsSection);
        services.Configure<ExchangeApiSettings>(Configuration.GetSection("ExchangeApiSettings"));

        // Register the Swagger generator, defining 1 or more Swagger documents
        services.AddSwaggerGen(swaggerOptions =>
        {
            swaggerOptions.SwaggerDoc("v1", new OpenApiInfo
            {
                Version = "v1",
                Title = "InEx API",
                Description = "API for managing InEx operations"
            });

            // Set the comments path for the Swagger JSON and UI.
            var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            swaggerOptions.IncludeXmlComments(xmlPath);
        });

        // In production, the React files will be served from this directory
        services.AddSpaStaticFiles(configuration =>
        {
            configuration.RootPath = "ClientApp/build";
        });

        services.AddHealthChecks()
            .AddDbContextCheck<InExDbContext>();
    }

    // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        // Enable middleware to serve generated Swagger as a JSON endpoint.
        app.UseSwagger();

        // Enable middleware to serve swagger-ui (HTML, JS, CSS, etc.),
        // specifying the Swagger JSON endpoint.
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "InEx API V1");
            c.RoutePrefix = "help";
        });

        if (env.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }
        else
        {
            app.UseExceptionHandler("/Error");
            // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
            app.UseHsts();
            app.UseHttpsRedirection();
        }

        app.EnsureDatabaseInitialized();

        app.UseStaticFiles();
        app.UseSpaStaticFiles();

        app.UseRouting();

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapHealthChecks("/health");
            endpoints.MapControllerRoute(
                name: "default",
                pattern: "{controller}/{action=Index}/{id?}");
        });

        app.UseSpa(spa =>
        {
            spa.Options.SourcePath = "ClientApp";

            if (env.IsDevelopment())
            {
                spa.UseReactDevelopmentServer(npmScript: "start");
            }
        });
    }
}
