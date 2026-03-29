using System.Security.Cryptography;
using System.Text;
using inex.Data;
using inex.Data.Models;
using inex.Extensions;
using inex.Infrastructure;
using inex.Services.Extensions;
using inex.Services.Options;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using inex.Exceptions;
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

    // ── Identity (AddIdentityCore = UserManager + RoleManager only, no Cookie auth scheme) ──
    builder.Services
        .AddIdentityCore<AppUser>(options =>
        {
            options.Password.RequiredLength = 8;
            options.Password.RequireUppercase = false;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequireDigit = true;
        })
        .AddRoles<AppRole>()
        .AddEntityFrameworkStores<InExDbContext>();

    // ── JWT Authentication ──
    var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
    var jwtSecret = jwtSection["Secret"] ?? throw new InvalidOperationException("JwtOptions:Secret is not configured.");

    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSection["Issuer"],
                ValidAudience = jwtSection["Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ClockSkew = TimeSpan.Zero
            };
        });

    builder.Services.AddAuthorization();

    // ── ICurrentUserAccessor ──
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<ICurrentUserAccessor, HttpContextCurrentUserAccessor>();

    // Register the global exception handler
    builder.Services.AddExceptionHandler<GlobalExceptionsHandler>();
    builder.Services.AddProblemDetails();

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

    // Configure API behavior to return Problem Details for validation/model-binding errors.
    // Must be called AFTER AddControllers() so our factory overrides the default 400 factory
    // registered by ApiBehaviorOptionsSetup. This ensures 422 for invalid input, not 400.
    builder.Services.Configure<ApiBehaviorOptions>(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var problemDetails = new ValidationProblemDetails(context.ModelState)
            {
                Type = "/errors/validation-failed",
                Title = "One or more validation errors occurred.",
                Status = StatusCodes.Status422UnprocessableEntity,
                Detail = "See the errors field for details.",
                Instance = context.HttpContext.Request.Path,
            };

            // Add trace ID for correlation
            problemDetails.Extensions["traceId"] = System.Diagnostics.Activity.Current?.Id
                ?? context.HttpContext.TraceIdentifier;

            // Use ContentResult to bypass MVC formatter content-negotiation, which always
            // writes application/json regardless of ContentTypes hints on ObjectResult.
            var json = System.Text.Json.JsonSerializer.Serialize(problemDetails,
                new System.Text.Json.JsonSerializerOptions
                {
                    DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
                });

            return new ContentResult
            {
                StatusCode = StatusCodes.Status422UnprocessableEntity,
                ContentType = "application/problem+json; charset=utf-8",
                Content = json
            };
        };
    });

    builder.Services.AddInExSwagger();
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<InExDbContext>();

    var spaPath = Path.Combine(builder.Environment.ContentRootPath, "ClientApp/build");
    if (!Directory.Exists(spaPath))
    {
        Log.Warning("SPA build directory not found at {SpaPath}. Static files might not be served correctly.", spaPath);
    }

    // ── 2. BUILD ──
    var app = builder.Build();

    // ── 3. PIPELINE PHASE ──

    app.UseExceptionHandler();

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
        app.UseInExSwagger();
    }
    else
    {
        app.UseHsts();
        app.UseHttpsRedirection();
    }
    // Avoid noisy warning when wwwroot is not present in this SPA-hosted setup.
    if (Directory.Exists(app.Environment.WebRootPath))
    {
        app.UseStaticFiles();
    }

    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(spaPath),
        OnPrepareResponse = ctx =>
        {
            var headers = ctx.Context.Response.Headers;

            headers.Append("X-Frame-Options", "DENY");
            headers.Append("X-Content-Type-Options", "nosniff");

            // Cache static assets for 1 year, except HTML files which should not be cached to ensure users get the latest version.
            if (!ctx.File.Name.EndsWith(".html"))
            {
                ctx.Context.Response.Headers.CacheControl = "public,max-age=31536000,immutable";
            }
            else
            {
                headers.CacheControl = "no-cache, no-store, must-revalidate";
                headers.Pragma = "no-cache";
            }
        }
    });

    app.UseRouting();

    app.UseCors("AllowLocalhost");

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapHealthChecks("/health");
    app.MapControllers();

    app.MapFallbackToFile("index.html", new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(spaPath)
    });

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