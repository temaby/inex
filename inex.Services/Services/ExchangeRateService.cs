using AutoMapper;
using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Infrastructure.ExternalClients.ExchangeRate;
using inex.Services.Models.Exceptions;
using inex.Services.Models.Exceptions.Base;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.ExchangeRate;
using inex.Services.Services.Base;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace inex.Services.Services;

public class ExchangeRateService : Service, IExchangeRateService
{
    #region Constructors

    public ExchangeRateService(IInExUnitOfWork uowInEx, IMapper mapper, IOptions<ExchangeApiSettings> settings) : base(uowInEx, mapper)
    {
        _apiKey = settings.Value.ApiKey;
    }

    #endregion Constructors

    #region Public Interface

    public async Task<ResponseDataDTO<ExchangeRateDTO>> Get(int userId, DateTime start, DateTime end, string baseCurrency = "")
    {
        if (end < start)
        {
            throw new InExException(new List<IMessage>() { new InExMessage(MessageCode.DataInvalid, MessageSeverity.Error) });
        }
        /*else if (end == start)
        {
            return await Get(userId, start, baseCurrency);
        }*/
        else
        {
            // get current base currenc yfor the user
            baseCurrency = string.IsNullOrEmpty(baseCurrency) ? DbInEx.UserRepository.Get(true, null, i => i.Currency).First(i => i.Id == userId).Currency.Key : baseCurrency;
            // get an actual list of currencies for the user
            IEnumerable<string> currencyCodes = DbInEx.CurrencyRepository.Get(true).Where(i => i.Key != baseCurrency).Select(i => i.Key);

            // get a list of existing non-temporary rates from database
            // rate is marked as temporary in case API does not have information for the date and the rate is based on another day rate
            IQueryable<ExchangeRate> rates = DbInEx.ExchangeRateRepository.Get(true).Where(i => i.Created >= start && i.Created <= end && !i.IsTemporary);

            // get a list of dates that have actual rate information
            IEnumerable<DateTime> datesExisting = rates.Select(i => i.Created.Date).Distinct().ToList();

            for (DateTime date = start; date <= end; date = date.AddDays(1))
            {
                // exit in case date is from future
                if (date.Date > DateTime.UtcNow.Date)
                {
                    break;
                }
                // current free version of API provider does not support rates for today
                // logic below creates a temporary rate based on yesterday info
                else if (date.Date == DateTime.UtcNow.Date)
                {
                    // check if rates for today already exist
                    bool ratesExist = DbInEx.ExchangeRateRepository.Get(true).Any(i => i.Created == date.Date);

                    if (!ratesExist)
                    {
                        // get most recent date with rate details
                        DateTime? latestDate = DbInEx.ExchangeRateRepository.Get(true)
                            .Where(i => i.Created < date.Date && i.FromCode == baseCurrency)
                            .OrderByDescending(i => i.Created)
                            .Select(i => (DateTime?)i.Created)
                            .FirstOrDefault();

                        if (latestDate.HasValue)
                        {
                            // get rate details from the most recent date
                            IEnumerable<ExchangeRate> ratesExisting = DbInEx.ExchangeRateRepository.Get(true).Where(i => i.Created == latestDate.Value && i.FromCode == baseCurrency);
                            // create temporary rates based on latest info
                            IEnumerable<ExchangeRate> ratesNew = ratesExisting.Select(i => new ExchangeRate() { FromCode = i.FromCode, ToCode = i.ToCode, Rate = i.Rate, IsTemporary = true, CreatedBy = userId, Created = date.Date });
                            // add temporary rates to the database
                            foreach (ExchangeRate rate in ratesNew)
                            {
                                await DbInEx.ExchangeRateRepository.CreateAsync(rate);
                            }
                            // apply database changes
                            await DbInEx.SaveAsync();
                        }
                    }
                }
                // rates are not populated automatically ATM, so sometimes some dates may be skipped
                // logic below receives a list of rates from the API for a skipped date
                // actual rates should be either added to the database or replace existing temporary rates
                else if (!datesExisting.Any(i => i == date.Date))
                {
                    // build a list of user currencies for API request
                    string currencies = string.Join(",", currencyCodes);

                    // build API request url
                    string responseStr = string.Empty;
                    string url = $"https://api.currencyapi.com/v3/historical?date={date.Date.ToString("yyyy-MM-dd")}&apikey={_apiKey}&base_currency={baseCurrency}&currencies={currencies}";

                    // get API response string
                    using (HttpClient client = new HttpClient())
                    {
                        responseStr = await client.GetStringAsync(url);
                    }

                    if (responseStr.Length > 0)
                    {
                        // get exchanges rates information from response
                        ExchangeResponseDTO response = JsonConvert.DeserializeObject<ExchangeResponseDTO>(responseStr)!;
                        // check if there are temporary rates info for the date
                        IEnumerable<ExchangeRate> ratesExisting = DbInEx.ExchangeRateRepository.Get(false).Where(i => i.Created == date.Date && i.IsTemporary);

                        // in case temporary rates exist just update the records with actual information and remove temporary marker
                        if (ratesExisting.Any())
                        {
                            foreach (ExchangeRate rate in ratesExisting)
                            {
                                rate.Rate = response.Data.First(i => i.Value.Code == rate.ToCode).Value.Value;
                                rate.IsTemporary = false;
                                DbInEx.ExchangeRateRepository.Update(rate);
                            }

                            await DbInEx.SaveAsync();
                        }
                        // in case no temporary rates exist add rates information to the database
                        else
                        {
                            IEnumerable<ExchangeRate> ratesNew = response.Data.Select(i => new ExchangeRate() { FromCode = baseCurrency, ToCode = i.Value.Code, Rate = i.Value.Value, CreatedBy = userId, Created = response.Meta.last_updated_at.Date });
                            foreach (ExchangeRate rate in ratesNew)
                            {
                                await DbInEx.ExchangeRateRepository.CreateAsync(rate);
                            }

                            await DbInEx.SaveAsync();
                        }
                    }
                }
            }

            // get actual exchange rates information
            rates = DbInEx.ExchangeRateRepository.Get(true).Where(i => i.Created >= start && i.Created <= end);
            return BuildDataResponse<ExchangeRate, ExchangeRateDTO>(rates);
        }
    }

    public async Task<ResponseDataDTO<ExchangeRateDTO>> Get(int userId, DateTime date, string baseCurrency = "")
    {
        baseCurrency = string.IsNullOrEmpty(baseCurrency) ? DbInEx.UserRepository.Get(true, null, i => i.Currency).First(i => i.Id == userId).Currency.Key : baseCurrency;
        IEnumerable<string> currencyCodes = DbInEx.CurrencyRepository.Get(true).Where(i => i.Key != baseCurrency).Select(i => i.Key);

        // fix for rates API as rates are not available for today
        date = date.Date == DateTime.UtcNow.Date ? date.Date.AddDays(-1) : date;

        IQueryable<ExchangeRate> rates = DbInEx.ExchangeRateRepository.Get(true).Where(i => i.Created == date.Date);

        if (!rates.Any() || rates.Count() < currencyCodes.Count())
        {
            string currencies = string.Join(",", currencyCodes);

            string responseStr = string.Empty;
            string url = $"https://api.currencyapi.com/v3/historical?date={date.ToString("yyyy-MM-dd")}&apikey={_apiKey}&base_currency={baseCurrency}&currencies={currencies}";

            using (HttpClient client = new HttpClient())
            {
                responseStr = await client.GetStringAsync(url);
            }

            if (responseStr.Length > 0)
            {
                ExchangeResponseDTO response = JsonConvert.DeserializeObject<ExchangeResponseDTO>(responseStr)!;

                IEnumerable<ExchangeRate> ratesNew = response.Data.Select(i => new ExchangeRate() { FromCode = baseCurrency, ToCode = i.Value.Code, Rate = i.Value.Value, CreatedBy = userId, Created = response.Meta.last_updated_at.Date });
                foreach (ExchangeRate rate in ratesNew)
                {
                    await DbInEx.ExchangeRateRepository.CreateAsync(rate);
                }

                await DbInEx.SaveAsync();
            }

            rates = DbInEx.ExchangeRateRepository.Get(true).Where(i => i.Created == date);
        }

        return BuildDataResponse<ExchangeRate, ExchangeRateDTO>(rates);
    }

    #endregion Public Interface

    #region Private Methods

    private class ExchangeData
    {
        public string Code { get; set; } = null!;
        public decimal Value { get; set; }
    }

    private class ExchangeMeta
    {
        public DateTime last_updated_at { get; set; }
    }

    private class ExchangeResponseDTO
    {
        public ExchangeMeta Meta { get; set; } = null!;
        public Dictionary<string, ExchangeData> Data { get; set; } = null!;
    }

    #endregion Private Methods

    #region Private Fields

    private readonly string _apiKey;

    #endregion Private Fields

    /*
     {
"success":true,
"timestamp":1363478399,
"historical":true,
"base":"EUR",
"date":"2013-03-16",
"rates":{
"USD":1.307716,
"AUD":1.256333,
"CAD":1.333812,
"PLN":4.150819,
"MXN":16.259128
}
}
     */
}