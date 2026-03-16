using inex.Controllers.Base;
using inex.Services.Models.Exceptions;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.ExchangeRate;
using inex.Services.Services.Base;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Controllers;

[Route(RoutePrefix)]
[Produces("application/json")]
[ApiController]
public class ExchangeRateController : ApiControllerBase
{
    #region Routes

    public const string RoutePrefix = "api/exchange";

    public const string GetDateRatesRoute = "rates/{date}";

    #endregion Routes

    #region Constructors

    public ExchangeRateController(IExchangeRateService exchangeService)
    {
        _exchangeService = exchangeService;
    }

    #endregion Constructors

    #region Public Interface

    /// <summary>
    /// Get exchange rates for a date
    /// </summary>
    /// <param name="date">Date</param>
    /// <returns>
    /// List of supported exchange rates
    /// </returns>
    [HttpGet]
    [Route(GetDateRatesRoute)]
    [ProducesResponseType(typeof(IEnumerable<ExchangeRateDTO>), StatusCodes.Status200OK)]
    public async Task<ActionResult> Get(DateTime date)
    {
        try
        {
            ResponseDataDTO<ExchangeRateDTO> resultsDTO = await _exchangeService.Get(CurrentUserId, date);
            return Ok(resultsDTO);
        }
        catch (Exception e)
        {
            return BadRequest(BuildErrorMessage(MessageCode.InternalError, e: e));
        }
    }

    #endregion Public Interface

    #region Private Fields

    private readonly IExchangeRateService _exchangeService;

    #endregion Private Fields
}
