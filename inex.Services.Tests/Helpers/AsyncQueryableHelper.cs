using System.Collections;
using System.Linq.Expressions;

namespace inex.Services.Tests.Helpers;

/// <summary>
/// Wraps an in-memory sequence so it satisfies both IQueryable<T> (for sync LINQ)
/// and IAsyncEnumerable<T> (for async enumeration and APIs that consume IAsyncEnumerable<T> such as ToListAsync).
/// </summary>
internal static class AsyncQueryableExtensions
{
    public static IQueryable<T> AsAsyncQueryable<T>(this IEnumerable<T> source)
        => new TestAsyncEnumerable<T>(source);
}

internal sealed class TestAsyncEnumerable<T> : IQueryable<T>, IAsyncEnumerable<T>, IOrderedQueryable<T>
{
    private readonly IQueryable<T> _inner;

    public TestAsyncEnumerable(IEnumerable<T> source) =>
        _inner = source.AsQueryable();

    public Type ElementType => _inner.ElementType;
    public Expression Expression => _inner.Expression;
    public IQueryProvider Provider => new TestAsyncQueryProvider<T>(_inner.Provider);

    public IEnumerator<T> GetEnumerator() => _inner.GetEnumerator();
    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

    public IAsyncEnumerator<T> GetAsyncEnumerator(CancellationToken cancellationToken = default)
        => new TestAsyncEnumerator<T>(_inner.GetEnumerator());
}

internal sealed class TestAsyncEnumerator<T> : IAsyncEnumerator<T>
{
    private readonly IEnumerator<T> _inner;

    public TestAsyncEnumerator(IEnumerator<T> inner) => _inner = inner;

    public T Current => _inner.Current;

    public ValueTask<bool> MoveNextAsync() => ValueTask.FromResult(_inner.MoveNext());

    public ValueTask DisposeAsync()
    {
        _inner.Dispose();
        return ValueTask.CompletedTask;
    }
}

internal sealed class TestAsyncQueryProvider<TEntity> : IQueryProvider
{
    private readonly IQueryProvider _inner;

    public TestAsyncQueryProvider(IQueryProvider inner) => _inner = inner;

    public IQueryable CreateQuery(Expression expression) => _inner.CreateQuery(expression);

    public IQueryable<TElement> CreateQuery<TElement>(Expression expression)
        => new TestAsyncEnumerable<TElement>(_inner.CreateQuery<TElement>(expression));

    public object? Execute(Expression expression) => _inner.Execute(expression);

    public TResult Execute<TResult>(Expression expression) => _inner.Execute<TResult>(expression);
}
