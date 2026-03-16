using System;
using System.Collections.Generic;
using System.Linq;
using inex.Services.Models.Exceptions.Base;

namespace inex.Services.Models.Exceptions;

public class InExException : Exception
{
    public InExException(string message) : base(message)
    {
        Errors = new List<IMessage>();
    }

    public InExException(IList<IMessage> errors) : base(string.Join("\r\n", errors.Select(i => i.Message)))
    {
        Errors = errors;
    }

    public IList<IMessage> Errors { get; }
}