using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using inex.Data;
using inex.Extensions;
using inex.Services.Extensions;
using System.Security.Cryptography;
using System.Text;
using Serilog;

// ── 1. BUILDER PHASE ──

// Configure bootstrap logger to capture early startup failures before host is built.
Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting InEx application");

    var builder = WebApplication.CreateBuilder(args);

    // Upgrade from bootstrap logger to full logger from configuration/services.
    builder.Host.UseSerilog((context, services, loggerConfiguration) =>
        loggerConfiguration
            .ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext());

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
        var isProduction = app.Environment.IsProduction();
        options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
        {
            diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
            diagnosticContext.Set("RequestScheme", httpContext.Request.Scheme);
            var remoteIp = httpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = httpContext.Request.Headers["User-Agent"].ToString();

            diagnosticContext.Set("RemoteIP", isProduction ? HashForLog(remoteIp) : remoteIp ?? string.Empty);
            diagnosticContext.Set("UserAgent", isProduction ? HashForLog(userAgent) : userAgent);
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
    throw;
}
finally
{
    Log.Information("Shutting down InEx application");
    Log.CloseAndFlush();
}

static string HashForLog(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return string.Empty;
    }

    var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
    return Convert.ToHexString(bytes[..8]);
}