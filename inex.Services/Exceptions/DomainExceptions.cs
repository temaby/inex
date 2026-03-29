using inex.Services.Models.Common;

namespace inex.Services.Exceptions;

/// <summary>
/// Base class for domain exceptions that self-describe their HTTP mapping via IHttpMappable.
/// </summary>
public abstract class DomainException : Exception, IHttpMappable
{
    protected DomainException(string message) : base(message) { }
    protected DomainException(string message, Exception? inner) : base(message, inner) { }

    public abstract HttpErrorMapping ToHttpErrorMapping(bool isDevelopment);
}

/// <summary>Resource was not found (404).</summary>
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
        StatusCode = 404,
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

/// <summary>Input failed validation (422).</summary>
public class ValidationFailedException : DomainException
{
    public IList<string> Errors { get; }

    public ValidationFailedException(string message, IList<string>? errors = null)
        : base(message)
    {
        Errors = errors ?? [];
    }

    public override HttpErrorMapping ToHttpErrorMapping(bool isDevelopment) => new()
    {
        StatusCode = 422,
        Title = "Validation Failed",
        TypeUri = "/errors/validation-failed",
        Detail = Message,
        Extensions = new() { { "errors", Errors } }
    };
}

/// <summary>A business rule was violated (422).</summary>
public class DomainRuleException : DomainException
{
    public string Rule { get; }

    public DomainRuleException(string rule, string detail)
        : base(detail)
    {
        Rule = rule;
    }

    public override HttpErrorMapping ToHttpErrorMapping(bool isDevelopment) => new()
    {
        StatusCode = 422,
        Title = "Business Rule Violation",
        TypeUri = "/errors/domain-rule",
        Detail = Message,
        Extensions = new() { { "rule", Rule } }
    };
}

/// <summary>Access is forbidden (403).</summary>
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
        StatusCode = 403,
        Title = "Access Denied",
        TypeUri = "/errors/access-denied",
        Detail = Message,
        Extensions = Reason != null ? new() { { "reason", Reason } } : null
    };
}

/// <summary>The requested operation is not supported (400).</summary>
public class OperationNotSupportedException : DomainException
{
    public OperationNotSupportedException(string message) : base(message) { }

    public override HttpErrorMapping ToHttpErrorMapping(bool isDevelopment) => new()
    {
        StatusCode = 400,
        Title = "Operation Not Supported",
        TypeUri = "/errors/not-supported",
        Detail = Message
    };
}

/// <summary>File upload failed validation (400).</summary>
public class UploadFailedException : DomainException
{
    public UploadFailedException(string reason) : base(reason) { }

    public override HttpErrorMapping ToHttpErrorMapping(bool isDevelopment) => new()
    {
        StatusCode = 400,
        Title = "Upload Failed",
        TypeUri = "/errors/upload-failed",
        Detail = Message
    };
}

/// <summary>A conflict with existing state was detected (409).</summary>
public class ConflictException : DomainException
{
    public object? ConflictingId { get; }

    public ConflictException(string message, object? conflictingId = null)
        : base(message)
    {
        ConflictingId = conflictingId;
    }

    public override HttpErrorMapping ToHttpErrorMapping(bool isDevelopment) => new()
    {
        StatusCode = 409,
        Title = "Conflict",
        TypeUri = "/errors/conflict",
        Detail = Message,
        Extensions = ConflictingId is null ? null : new() { { "conflictingId", ConflictingId } }
    };
}

/// <summary>Authentication failed — invalid credentials or token (401).</summary>
public class AuthenticationFailedException : DomainException
{
    public AuthenticationFailedException(string message) : base(message) { }

    public override HttpErrorMapping ToHttpErrorMapping(bool isDevelopment) => new()
    {
        StatusCode = 401,
        Title = "Authentication Failed",
        TypeUri = "/errors/authentication-failed",
        Detail = Message
    };
}

/// <summary>An unexpected internal error occurred (500).</summary>
public class InternalServerErrorException : DomainException
{
    public InternalServerErrorException(string message, Exception? innerException = null)
        : base(message, innerException) { }

    public override HttpErrorMapping ToHttpErrorMapping(bool isDevelopment) => new()
    {
        StatusCode = 500,
        Title = "Internal Server Error",
        TypeUri = "/errors/internal-error",
        Detail = isDevelopment ? Message : "An error occurred processing your request."
    };
}
