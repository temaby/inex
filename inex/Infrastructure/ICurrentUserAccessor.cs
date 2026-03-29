namespace inex.Infrastructure;

/// <summary>
/// Abstracts the current user identity so controllers and services
/// don't depend directly on HttpContext or Claims — easier to test.
/// </summary>
public interface ICurrentUserAccessor
{
    int UserId { get; }
}
