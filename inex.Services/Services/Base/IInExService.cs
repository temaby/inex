using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public interface IInExService : IDisposable
{
    Task DeleteAsync(int id);
    Task DeleteAsync(IEnumerable<int> ids);
}