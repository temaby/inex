using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public interface IInExService : IDisposable
{
    Task DeleteAsync(int id, int userId, CancellationToken ct = default);
    Task DeleteAsync(IEnumerable<int> ids, int userId, CancellationToken ct = default);
}