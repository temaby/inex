using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using inex.Data;
using inex.Extensions;
using inex.Services.Extensions;

// ── 1. BUILDER PHASE ──
var builder = WebApplication.CreateBuilder(args);
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