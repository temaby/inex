using inex.Services.Models.Records.Base;
using inex.Services.Services.Base;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace inex.Controllers;

[Route("api/currencies")]
[Produces("application/json")]
[ApiController]
public class CurrenciesController : ControllerBase
{
    private readonly ICurrencyService _currencyService;

    public CurrenciesController(ICurrencyService currencyService)
    {
        _currencyService = currencyService;
    }

    /// <summary>Return all available currencies. Public — needed during registration.</summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IEnumerable<NamedResponse>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<NamedResponse>> Get()
    {
        return Ok(_currencyService.Get());
    }
}
