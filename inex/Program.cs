using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using inex.Data;
using inex.Extensions;
using inex.Services.Extensions;
using Serilog;
using Serilog.Events;
using Serilog.Formatting.Compact;

// ── 1. BUILDER PHASE ──

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
    .MinimumLevel.Override("System", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithProcessId()
    .Enrich.WithThreadId()
    .Enrich.WithMachineName()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .WriteTo.File(
        new CompactJsonFormatter(),
        "logs/inex-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30)
    .CreateLogger();

try
{
    Log.Information("Starting InEx application");

    var builder = WebApplication.CreateBuilder(args);

    // Configure Serilog to use the logger we created
    builder.Host.UseSerilog();

    builder.Services.AddInExServices(builder.Configuration);

    var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>();
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowLocalhost", policy =>
        {
            policy.WithOrigins(allowedOrigins ?? Array.Empty<string>())
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
    });

    builder.Services.AddControllers()
        .AddJsonOptions(x => x.JsonSerializerOptions.DefaultIgnoreCondition
            = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull);

    builder.Services.AddInExSwagger();
    builder.Services.AddSpaStaticFiles(config => config.RootPath = "ClientApp/build");
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<InExDbContext>();

    // ── 2. BUILD ──
    var app = builder.Build();

    // ── 3. PIPELINE PHASE ──

    // Add Serilog request logging middleware
    app.UseSerilogRequestLogging(options =>
    {
        options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
        {
            diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
            diagnosticContext.Set("RequestScheme", httpContext.Request.Scheme);
            diagnosticContext.Set("RemoteIP", httpContext.Connection.RemoteIpAddress);
            diagnosticContext.Set("UserAgent", httpContext.Request.Headers["User-Agent"].ToString());
        };
    });

    if (app.Environment.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
        app.UseInExSwagger();
    }
    else
    {
        app.UseHsts();
        app.UseHttpsRedirection();
        app.EnsureDatabaseInitialized();
    }
    app.UseStaticFiles();
    app.UseSpaStaticFiles();

    app.UseRouting();

    app.UseCors("AllowLocalhost");

    app.MapHealthChecks("/health");
    app.MapControllers();

    app.MapFallbackToFile("index.html");

    // ── 4. RUN ──
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.Information("Shutting down InEx application");
    Log.CloseAndFlush();
}