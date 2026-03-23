namespace inex.Services.Models.Common;

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
