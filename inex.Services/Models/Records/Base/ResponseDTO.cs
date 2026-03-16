using System.Collections.Generic;
using System.Linq;
using inex.Services.Models.Exceptions;
using inex.Services.Models.Exceptions.Base;

namespace inex.Services.Models.Records.Base;

public record ResponseDTO
{
    public bool IsValid => !Messages.Any(m => m.Severity >= MessageSeverity.Warning);
    public IList<IMessage> Messages { get; } = new List<IMessage>();
}