using inex.Services.Models.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace inex.Exceptions;

/// <summary>
/// Generic global exception handler that converts all unhandled exceptions to RFC 7807 Problem Details.
/// </summary>
public class GlobalExceptionsHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionsHandler> _logger;
    private readonly IHostEnvironment _env;

    public GlobalExceptionsHandler(ILogger<GlobalExceptionsHandler> logger, IHostEnvironment env)
    {
        _logger = logger;
        _env = env;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        // Check if response has already started (cannot modify headers after body begins)
        if (httpContext.Response.HasStarted)
        {
            _logger.LogWarning("Response has already started; cannot handle exception: {Message}", exception.Message);
            return false;
        }

        // Get HTTP mapping: either from IHttpMappable or default
        var errorMapping = GetErrorMapping(exception);

        // 4xx = client error (expected) → Warning; 5xx = server fault → Error
        if (errorMapping.StatusCode >= 500)
            _logger.LogError(exception, "Unhandled exception occurred");
        else
            _logger.LogWarning("Client error {StatusCode} {Path}: {Message}",
                errorMapping.StatusCode, httpContext.Request.Path, exception.Message);

        var problemDetails = new ProblemDetails
        {
            Status = errorMapping.StatusCode,
            Title = errorMapping.Title,
            Type = errorMapping.TypeUri,
            Detail = errorMapping.Detail,
            Instance = httpContext.Request.Path
        };

        // Add standard correlation extension
        problemDetails.Extensions["traceId"] = Activity.Current?.Id ?? httpContext.TraceIdentifier;

        // Add any domain-specific extensions
        if (errorMapping.Extensions != null)
        {
            foreach (var ext in errorMapping.Extensions)
            {
                problemDetails.Extensions[ext.Key] = ext.Value;
            }
        }

        // Include stack trace only in development
        if (_env.IsDevelopment())
        {
            problemDetails.Extensions["stackTrace"] = exception.StackTrace;
        }

        // Set response headers
        httpContext.Response.StatusCode = errorMapping.StatusCode;
        httpContext.Response.ContentType = "application/problem+json";

        // Write Problem Details as JSON with correct RFC 7807 content type
        await httpContext.Response.WriteAsJsonAsync(
            problemDetails,
            options: null,
            contentType: "application/problem+json",
            cancellationToken: cancellationToken);

        return true;
    }

    /// <summary>
    /// Get HTTP error mapping from exception.
    /// Priority:
    /// 1. If exception is IHttpMappable, use its mapping
    /// 2. Otherwise, use default mapping for unknown exception
    /// </summary>
    private HttpErrorMapping GetErrorMapping(Exception exception)
    {
        // If exception knows how to map itself, use that
        if (exception is IHttpMappable mappable)
        {
            return mappable.ToHttpErrorMapping(_env.IsDevelopment());
        }

        // Default fallback for unknown exceptions
        return new HttpErrorMapping
        {
            StatusCode = StatusCodes.Status500InternalServerError,
            Title = "Internal Server Error",
            TypeUri = "/errors/internal-error",
            Detail = _env.IsDevelopment()
                ? exception.Message
                : "An unexpected error occurred. Please try again later."
        };
    }
}
