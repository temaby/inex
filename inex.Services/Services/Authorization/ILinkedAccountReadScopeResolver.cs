namespace inex.Services.Services.Authorization;

public interface ILinkedAccountReadScopeResolver
{
    int Resolve(int authenticatedUserId, int? linkedUserId);
}
