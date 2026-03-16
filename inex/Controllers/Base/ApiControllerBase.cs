using Microsoft.AspNetCore.Mvc;
using System;
using inex.Services.Models.Exceptions;
using inex.Services.Models.Exceptions.Base;
using inex.Services.Models.Records.Base;
using inex.Models;
using inex.Services.Models.Enums;

namespace inex.Controllers.Base;

public class ApiControllerBase : ControllerBase
{
    protected DateTime CheckDate(DateTime? date, DateType dateType, DateTime? defaultValue = null)
    {
        DateTime now = DateTime.UtcNow;

        date = date.HasValue ? new DateTime(date.Value.Year, date.Value.Month, dateType == DateType.START ? 0 : date.Value.Day, 0, 0, 0) :
            (defaultValue.HasValue ?
                new DateTime(defaultValue.Value.Year, defaultValue.Value.Month, dateType == DateType.START ? 0 : defaultValue.Value.Day, 0, 0, 0) :
                new DateTime(now.Year, now.Month, dateType == DateType.START ? 0 : now.Day, 0, 0, 0));

        return date.Value;
    }

    protected ResponseDTO BuildErrorMessage(MessageCode code, bool showInUI = true, Exception? e = null)
    {
        ResponseDTO response = new ResponseDTO();
        response.Messages.Add(new InExMessage(code, MessageSeverity.Error, showInUI));
        if (e != null)
        {
            if (e is InExException inexEx)
            {
                foreach (IMessage item in inexEx.Errors)
                {
                    response.Messages.Add(item);
                }
            }
            else
            {
                response.Messages.Add(new InExMessage(MessageCode.InternalError, MessageSeverity.Error, e.Message, showInUI));
            }
        }

        return response;
    }

    protected virtual int CurrentUserId => 1;
}
