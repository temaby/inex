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
    [ProducesResponseType(typeof(IEnumerable<NamedDTO>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<NamedDTO>> Get()
    {
        return Ok(_currencyService.Get());
    }
}
