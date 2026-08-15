using inex.Controllers.Base;
using inex.Application.ExchangeRates.Synchronization;
using inex.Application.ExchangeRates.Synchronization.Exceptions;
using Microsoft.AspNetCore.Authorization;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.ExchangeRate;
using inex.Services.Exceptions;
using inex.Services.Services.Base;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Controllers;

[Route(RoutePrefix)]
[Authorize]
[Produces("application/json")]
[ApiController]
public class ExchangeRateController : ApiControllerBase
{
    #region Routes

    public const string RoutePrefix = "api/exchange";

    public const string GetDateRatesRoute = "rates/{date}";
    public const string GetCachedRatesRoute = "rates/cached";
    public const string SynchronizeRatesRoute = "rates/synchronize";

    #endregion Routes

    #region Constructors

    public ExchangeRateController(
        IExchangeRateService exchangeService,
        SynchronizeExchangeRatesCommandHandler synchronizeExchangeRatesCommandHandler)
    {
        _exchangeService = exchangeService;
        _synchronizeExchangeRatesCommandHandler = synchronizeExchangeRatesCommandHandler;
    }

    #endregion Constructors

    #region Public Interface

    /// <summary>Get exchange rates for a date</summary>
    /// <param name="date">Date</param>
    /// <returns>List of supported exchange rates</returns>
    [HttpGet]
    [Route(GetDateRatesRoute)]
    [ProducesResponseType(typeof(IEnumerable<ExchangeRateResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult> Get(DateTime date, CancellationToken ct)
    {
        ListResponse<ExchangeRateResponse> resultsDTO = await _exchangeService.Get(CurrentUserId, date, ct: ct);
        return Ok(resultsDTO);
    }

    /// <summary>Get already-cached exchange rates without contacting an external provider.</summary>
    [HttpGet]
    [Route(GetCachedRatesRoute)]
    [ProducesResponseType(typeof(IEnumerable<ExchangeRateResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetCached([FromQuery] DateTime startDate, [FromQuery] DateTime endDate, CancellationToken ct)
    {
        ListResponse<ExchangeRateResponse> resultsDTO = await _exchangeService.GetCached(CurrentUserId, startDate, endDate, ct: ct);
        return Ok(resultsDTO);
    }

    /// <summary>Synchronizes missing exchange rates for the authenticated user's enabled account currencies.</summary>
    [HttpPost]
    [Route(SynchronizeRatesRoute)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult> Synchronize([FromBody] SynchronizeExchangeRatesRequest request, CancellationToken ct)
    {
        try
        {
            await _synchronizeExchangeRatesCommandHandler.HandleAsync(
                new SynchronizeExchangeRatesCommand(CurrentUserId, request.StartDate, request.EndDate),
                ct);

            return NoContent();
        }
        catch (SynchronizationValidationException exception)
        {
            throw new ValidationFailedException(
                "The exchange-rate synchronization request is invalid.",
                [exception.Code]);
        }
        catch (SynchronizationProviderResponseException exception)
        {
            throw new DomainRuleException(
                exception.Code,
                "The exchange-rate provider could not complete the synchronization request.");
        }
        catch (TemporaryRateSourceException exception)
        {
            throw new DomainRuleException(
                exception.Code,
                "No prior actual exchange rate is available for today's temporary rate.");
        }
    }

    #endregion Public Interface

    #region Private Fields

    private readonly IExchangeRateService _exchangeService;
    private readonly SynchronizeExchangeRatesCommandHandler _synchronizeExchangeRatesCommandHandler;

    #endregion Private Fields
}
