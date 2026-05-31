namespace inex.Services.Infrastructure.Time;

public interface IClock
{
    DateTime UtcNow { get; }
}
