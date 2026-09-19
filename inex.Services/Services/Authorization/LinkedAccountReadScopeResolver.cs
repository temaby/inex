using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Exceptions;

namespace inex.Services.Services.Authorization;

public sealed class LinkedAccountReadScopeResolver : ILinkedAccountReadScopeResolver
{
    private readonly IInExUnitOfWork _unitOfWork;

    public LinkedAccountReadScopeResolver(IInExUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public int Resolve(int authenticatedUserId, int? linkedUserId)
    {
        if (!linkedUserId.HasValue)
        {
            return authenticatedUserId;
        }

        bool canRead = _unitOfWork.UserAccountLinkRepository
            .Get(true, link => link.MasterUserId == authenticatedUserId
                && link.LinkedUserId == linkedUserId.Value
                && link.Status == UserAccountLinkStatus.Active)
            .Any();

        if (!canRead)
        {
            throw new ResourceNotFoundException("Requested linked user is unavailable.");
        }

        return linkedUserId.Value;
    }
}
