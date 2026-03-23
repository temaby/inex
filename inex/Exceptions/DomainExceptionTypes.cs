namespace inex.Exceptions;

/// <summary>
/// Generic mapping abstraction: Any exception can define how it maps to HTTP.
/// This decouples the handler from knowing specific exception types.
/// 
/// LEARNING: Strategy pattern allows exceptions to be responsible for their own mapping.
/// </summary>
public record HttpErrorMapping
{
    public int StatusCode { get; init; }
    public string Title { get; init; } = string.Empty;
    public string TypeUri { get; init; } = string.Empty;
    public string? Detail { get; init; }
    public Dictionary<string, object>? Extensions { get; init; }
}

/// <summary>
/// Contract: Any exception can implement this to define its HTTP error mapping.
/// The handler calls this without needing to know the specific exception type.
/// </summary>
public interface IHttpMappable
{
    /// <summary>
    /// Convert this exception into its HTTP Problem Details representation.
    /// </summary>
    HttpErrorMapping ToHttpErrorMapping(bool isDevelopment);
}

/// <summary>
/// Base class for domain exceptions that can be mapped to HTTP responses.
/// Simpler than InExException if you want a fresh start with fewer dependencies.
/// </summary>
public abstract class DomainException : Exception, IHttpMappable
{
    protected DomainException(string message) : base(message) { }
    protected DomainException(string message, Exception? inner) : base(message, inner) { }

    public abstract HttpErrorMapping ToHttpErrorMapping(bool isDevelopment);
}

/// <summary>
/// Example: Concrete domain exceptions that don't need MessageCode enum.
/// Each exception type knows its own HTTP semantics.
/// </summary>
/// 
public class ResourceNotFoundException : DomainException
{
    public string? ResourceType { get; }
    public object? ResourceId { get; }

    public ResourceNotFoundException(string message, string? resourceType = null, object? resourceId = null)
        : base(message)
    {
        ResourceType = resourceType;
        ResourceId = resourceId;
    }

    public override HttpErrorMapping ToHttpErrorMapping(bool isDevelopment) => new()
    {
        StatusCode = StatusCodes.Status404NotFound,
        Title = "Resource Not Found",
        TypeUri = "/errors/not-found",
        Detail = Message,
        Extensions = new()
        {
            { "resourceType", ResourceType ?? "Unknown" },
            { "resourceId", ResourceId ?? string.Empty }
        }
    };
}

public class ValidationFailedException : DomainException
{
    public IList<string> Errors { get; }

    public ValidationFailedException(string message, IList<string> errors)
        : base(message)
    {
        Errors = errors;
    }

    public override HttpErrorMapping ToHttpErrorMapping(bool isDevelopment) => new()
    {
        StatusCode = StatusCodes.Status422UnprocessableEntity,
        Title = "Validation Failed",
        TypeUri = "/errors/validation-failed",
        Detail = Message,
        Extensions = new()
        {
            { "errors", Errors }
        }
    };
}

public class AccessDeniedException : DomainException
{
    public string? Reason { get; }

    public AccessDeniedException(string message, string? reason = null)
        : base(message)
    {
        Reason = reason;
    }

    public override HttpErrorMapping ToHttpErrorMapping(bool isDevelopment) => new()
    {
        StatusCode = StatusCodes.Status403Forbidden,
        Title = "Access Denied",
        TypeUri = "/errors/access-denied",
        Detail = Message,
        Extensions = Reason != null ? new() { { "reason", Reason } } : null
    };
}

public class OperationNotSupportedException : DomainException
{
    public OperationNotSupportedException(string message)
        : base(message) { }

    public override HttpErrorMapping ToHttpErrorMapping(bool isDevelopment) => new()
    {
        StatusCode = StatusCodes.Status400BadRequest,
        Title = "Operation Not Supported",
        TypeUri = "/errors/not-supported",
        Detail = Message
    };
}

public class InternalServerErrorException : DomainException
{
    public InternalServerErrorException(string message, Exception? innerException = null)
        : base(message, innerException) { }

    public override HttpErrorMapping ToHttpErrorMapping(bool isDevelopment) => new()
    {
        StatusCode = StatusCodes.Status500InternalServerError,
        Title = "Internal Server Error",
        TypeUri = "/errors/internal-error",
        Detail = isDevelopment ? Message : "An error occurred processing your request."
    };
}
