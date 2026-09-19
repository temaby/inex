using System.Linq.Expressions;
using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Exceptions;
using inex.Services.Services.Authorization;
using Moq;

namespace inex.Services.Tests.Services.Authorization;

public class LinkedAccountReadScopeResolverTests
{
    [Fact]
    public void Resolve_WithoutLinkedUser_ReturnsAuthenticatedUserWithoutQueryingLinks()
    {
        var repository = new Mock<IRepository<UserAccountLink>>();
        var resolver = CreateResolver(repository, []);

        int result = resolver.Resolve(10, null);

        Assert.Equal(10, result);
        repository.VerifyNoOtherCalls();
    }

    [Fact]
    public void Resolve_WithActiveDirectedLink_ReturnsLinkedUser()
    {
        var repository = new Mock<IRepository<UserAccountLink>>();
        var resolver = CreateResolver(repository,
        [
            new UserAccountLink { MasterUserId = 10, LinkedUserId = 20, Status = UserAccountLinkStatus.Active },
        ]);

        int result = resolver.Resolve(10, 20);

        Assert.Equal(20, result);
    }

    [Theory]
    [InlineData(10, 20, 10, 20, UserAccountLinkStatus.Pending)]
    [InlineData(10, 20, 10, 20, UserAccountLinkStatus.Rejected)]
    [InlineData(10, 20, 10, 20, UserAccountLinkStatus.Revoked)]
    [InlineData(20, 10, 10, 20, UserAccountLinkStatus.Active)]
    [InlineData(30, 20, 10, 20, UserAccountLinkStatus.Active)]
    public void Resolve_WithoutActiveDirectedLink_ThrowsGenericNotFound(
        int authenticatedUserId,
        int requestedUserId,
        int masterUserId,
        int linkedUserId,
        UserAccountLinkStatus status)
    {
        var repository = new Mock<IRepository<UserAccountLink>>();
        var resolver = CreateResolver(repository,
        [
            new UserAccountLink { MasterUserId = masterUserId, LinkedUserId = linkedUserId, Status = status },
        ]);

        var exception = Assert.Throws<ResourceNotFoundException>(() =>
            resolver.Resolve(authenticatedUserId, requestedUserId));

        Assert.Equal("Requested linked user is unavailable.", exception.Message);
        Assert.Null(exception.ResourceId);
        Assert.Null(exception.ResourceType);
    }

    private static LinkedAccountReadScopeResolver CreateResolver(
        Mock<IRepository<UserAccountLink>> repository,
        IReadOnlyCollection<UserAccountLink> links)
    {
        repository
            .Setup(candidate => candidate.Get(
                true,
                It.IsAny<Expression<Func<UserAccountLink, bool>>?>(),
                It.IsAny<Expression<Func<UserAccountLink, object>>[]>()))
            .Returns((bool _, Expression<Func<UserAccountLink, bool>>? predicate, Expression<Func<UserAccountLink, object>>[] _) =>
                predicate is null ? links.AsQueryable() : links.AsQueryable().Where(predicate));

        var unitOfWork = new Mock<IInExUnitOfWork>();
        unitOfWork.SetupGet(candidate => candidate.UserAccountLinkRepository).Returns(repository.Object);
        return new LinkedAccountReadScopeResolver(unitOfWork.Object);
    }
}
