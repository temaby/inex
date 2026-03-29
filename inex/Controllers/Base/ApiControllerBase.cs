using inex.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using System;
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

    protected int CurrentUserId =>
        HttpContext.RequestServices.GetRequiredService<ICurrentUserAccessor>().UserId;
}
