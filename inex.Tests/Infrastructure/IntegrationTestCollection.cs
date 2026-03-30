namespace inex.Tests.Infrastructure;

/// <summary>
/// Marks all integration test classes that spin up a real ASP.NET Core test server
/// as belonging to the same xUnit collection. Tests within a collection run sequentially,
/// which prevents parallel host initialization from corrupting Serilog's static logger.
///
/// Each class still declares its own IClassFixture&lt;InExWebApplicationFactory&gt; to get
/// an isolated in-memory database — this collection only ensures sequential execution.
/// </summary>
[CollectionDefinition(Name)]
public class IntegrationTestCollection
{
    public const string Name = "Integration";
}
