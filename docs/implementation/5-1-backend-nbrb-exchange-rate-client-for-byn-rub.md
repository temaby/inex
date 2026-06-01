# Story 5.1: Backend - NBRB Exchange Rate Client for BYN/RUB

## Status

review

## Story

As a user with BYN or RUB accounts,
I want my BYN/RUB exchange rates sourced from the National Bank of the Republic of Belarus (NBRB),
so that account and report calculations use the authoritative Belarusian central-bank rate instead of excluding or mispricing these currencies.

## Acceptance Criteria

1. Given `ExchangeRateService` needs rates for an inclusive date range containing BYN/RUB conversion, when the cache is cold, then it fetches NBRB data through a new `NbrbApiClient` using a range request for the whole missing range, not one HTTP call per date.
2. Given NBRB is used for RUB, when the client calls the API, then it uses the official NBRB exchange-rate API documented at `https://www.nb-rb.by/apihelp/exrates.htm`, specifically `GET https://api.nbrb.by/exrates/rates/dynamics/{cur_id}?startdate={yyyy-MM-dd}&enddate={yyyy-MM-dd}` for range data and respects the documented 365-day maximum range.
3. Given NBRB returns `RateShort` rows with `Cur_ID`, `Date`, and `Cur_OfficialRate`, when the app converts them to the existing exchange-rate model, then RUB rates account for NBRB scale: RUB is published as BYN per 100 RUB, so `RUB -> BYN = Cur_OfficialRate / 100` and `BYN -> RUB = 100 / Cur_OfficialRate`.
4. Given BYN is the Belarusian base currency and is not a foreign-currency item in the NBRB API, when BYN is requested as either the base or target currency, then the implementation treats BYN identity rates as `1` and derives direct BYN/RUB conversion from the RUB NBRB series rather than trying to fetch a BYN currency code from NBRB.
5. Given NBRB omits dates where no official rate is set or returns an empty array for missing data, when `ExchangeRateService` fills the requested range, then it carries forward the nearest prior non-temporary rate for missing dates using the existing carry-forward behavior; if no prior rate exists, it leaves the date unfetched and logs the gap without fabricating a rate.
6. Given currencies other than the BYN/RUB path are requested, when `ExchangeRateService` processes them, then the existing Frankfurter range call plus CurrencyAPI supplement chain continues unchanged; NBRB is additive and must not replace or regress non-BYN/RUB rates.
7. Given NBRB returns HTTP 404 for an invalid currency id and may return transient 5xx/408/429 failures, when the client is registered, then it uses the existing timeout pattern, handles transient failures, and honors `Retry-After` for 429 responses before retrying; failures are logged without exposing API keys, connection strings, JWTs, or sensitive values.
8. Given a new external response type is needed, when it is named, then it is `NbrbRateResponse` or `NbrbRateShortResponse`, not `ExchangeRateResponse`, to avoid the existing `ExchangeRateResponse` naming collision in `inex.Services`.
9. Given the story is complete, when unit tests run, then `inex.Services.Tests` covers NBRB URL formatting, response conversion, scale-aware RUB/BYN math, missing-date carry-forward, BYN/RUB routing through NBRB, non-BYN/RUB routing through the existing chain, cancellation-token propagation, and NBRB failure fallback behavior.
10. Given the story is complete, when backend verification runs, then `dotnet build inex.sln` and the relevant `dotnet test` scope pass with no application-code changes outside this story's implementation scope.

## Tasks / Subtasks

- [x] Add an NBRB external client without changing public API contracts. (AC: 1, 2, 7, 8)
  - [x] Add `NbrbApiClient` under `inex.Services/Infrastructure/ExternalClients/ExchangeRate/`.
  - [x] Add a typed response named `NbrbRateResponse` or `NbrbRateShortResponse`; do not add another `ExchangeRateResponse` type.
  - [x] Use `GetFromJsonAsync` or equivalent typed JSON deserialization with `CancellationToken`.
  - [x] Format dates as `yyyy-MM-dd` in query strings.
  - [x] Enforce/split NBRB requests so no single `dynamics` request exceeds 365 days.
- [x] Register NBRB configuration and resilience consistently with existing clients. (AC: 2, 7)
  - [x] Add `NbrbApiSettings` with `BaseUrl`, defaulting in tracked config to `https://api.nbrb.by/`; no API key is required.
  - [x] Register `NbrbApiSettings` in `InExServicesExtensions`.
  - [x] Register `HttpClient<NbrbApiClient>` with `Accept: application/json`, `Timeout.InfiniteTimeSpan`, the existing timeout policy, and an NBRB retry policy that preserves the existing transient failure coverage while honoring `Retry-After` for HTTP 429.
  - [x] Add a keyed retry policy name such as `NbrbApiRetry` rather than reusing another client's label.
- [x] Integrate NBRB into `ExchangeRateService` as an additive BYN/RUB path. (AC: 1, 3, 4, 5, 6)
  - [x] Inject the NBRB client or a dedicated NBRB abstraction into `ExchangeRateService` without removing Frankfurter or CurrencyAPI.
  - [x] Detect the direct BYN/RUB path case-insensitively and route it through NBRB range data.
  - [x] Resolve RUB metadata before the dynamics call: use a documented constant only if the source and scale are proven, otherwise query `/exrates/currencies` and select the active currency where `Cur_Abbreviation == "RUB"`.
  - [x] Convert NBRB RUB values with `Cur_OfficialRate / Cur_Scale` for `RUB -> BYN` and `Cur_Scale / Cur_OfficialRate` for `BYN -> RUB`; tests may use scale `100`.
  - [x] Treat `BYN -> BYN` and `RUB -> RUB` as identity if such a path is encountered; do not persist redundant same-currency exchange-rate rows unless existing service behavior requires it.
  - [x] Preserve existing Frankfurter-first range behavior for all non-BYN/RUB target currencies.
  - [x] Preserve existing `CreateTemporaryRatesForTodayIfNeeded`, `UpsertRatesForDate`, and `CarryForwardRatesFromPriorDay` semantics unless a small signature change is required to merge NBRB responses.
- [x] Add focused test coverage. (AC: 3, 5, 6, 7, 9)
  - [x] Add external-client tests parallel to `FrankfurterApiClientTests` for URL path/query, date formatting, JSON mapping, 404/empty-array behavior, and cancellation token propagation.
  - [x] Extend `ExchangeRateServiceTests` for BYN/RUB routing through NBRB and for non-BYN/RUB keeping the existing Frankfurter/CurrencyAPI chain.
  - [x] Add tests proving RUB scale math and missing-date carry-forward.
  - [x] Add failure tests showing NBRB exceptions leave BYN/RUB dates unfetched or carried forward from prior cached NBRB rates, and do not prevent non-BYN/RUB rates from being fetched through existing providers.
- [x] Verify backend scope. (AC: 10)
  - [x] Run focused service tests while iterating.
  - [x] Run `dotnet build inex.sln`.
  - [x] Run relevant `dotnet test` scope; full `dotnet test inex.sln` is preferred if time permits.

## Dev Notes

### Source Requirements

- Epic 5 covers FR-RATE-4: "NBRB exchange rate client: BYN + RUB via single range call." [Source: `docs/planning/epics.md#Epic 5: Exchange Rate Expansion`]
- Story 5.1 requires `ExchangeRateService` to call `NbrbApiClient` using a single range call, carry missing dates forward to the nearest prior rate, keep non-BYN/RUB currencies on the existing Frankfurter/CurrencyAPI chain, avoid a new `ExchangeRateResponse` naming collision, and cover BYN/RUB routing plus missing-date fallback in tests. [Source: `docs/planning/epics.md#Story 5.1: Backend - NBRB Exchange Rate Client for BYN/RUB`]
- Epic 5 depends on Epic 2 because date-based rate logic must use injectable `IClock` for deterministic tests. Epic 2 is done and `ExchangeRateService` already receives `IClock`. [Source: `docs/planning/epics.md#Epic 5: Exchange Rate Expansion`; `docs/implementation/2-2-backend-injectable-clock-abstraction-and-utc-consistency.md`]
- Epic 6 historical net worth depends on Epic 5 so BYN/RUB accounts are not excluded or treated as unsupported in multi-currency reporting. [Source: `docs/planning/epics.md#Epic 6: Dashboard & Spending Insights`]

### NBRB API Contract

- Official documentation: `https://www.nb-rb.by/apihelp/exrates.htm`.
- Daily rates endpoint: `GET https://api.nbrb.by/exrates/rates[/{cur_id}]?ondate={date}&periodicity=0&parammode={mode}` returns full daily `Rate` rows. Do not use this endpoint in a per-date loop for this story's range fetch.
- Range endpoint: `GET https://api.nbrb.by/exrates/rates/dynamics/{cur_id}?startdate={date}&enddate={date}` returns an array of `RateShort` objects and is limited to periods of no more than 365 days. `RateShort` contains `Cur_ID`, `Date`, and `Cur_OfficialRate`.
- Invalid currency ids return 404. If no rate is established for a requested date, NBRB returns an empty array or omits that date from dynamics results. [Source: official NBRB API help, `https://www.nb-rb.by/apihelp/exrates.htm`]
- RUB NBRB internal currency id must be determined from the official currency list endpoint or documented as a constant with a source comment. Prefer `GET /exrates/currencies` discovery in implementation if the current id cannot be proven stable for historical ranges.
- NBRB publishes rates as BYN per `Cur_Scale` units of foreign currency. RUB commonly uses scale `100`; the implementation must not treat `Cur_OfficialRate` as BYN per 1 RUB unless `Cur_Scale` is 1.

### Existing Exchange-Rate Architecture

- Current `ExchangeRateService` constructor takes `IInExUnitOfWork`, primary `IExchangeRateClient` (`CurrencyApiClient`), fallback `IExchangeRateClient` (`FrankfurterApiClient`), `ILogger<ExchangeRateService>`, and `IClock`. `InExServicesExtensions` manually resolves both clients for `IExchangeRateService`. [Source: `inex.Services/Services/ExchangeRateService.cs`; `inex.Services/Extensions/InExServicesExtensions.cs`]
- `ExchangeRateService.Get` resolves the user's base currency, loads all target currency codes except the base, checks cached non-temporary rates, fetches the min/max missing range, upserts actual rates, carries forward missing dates, and creates temporary rates for today from the most recent prior rates. Preserve that flow. [Source: `inex.Services/Services/ExchangeRateService.cs`]
- Frankfurter already implements `GetRatesForRangeAsync` as one range HTTP call and maps external rates into the shared external model. CurrencyAPI intentionally returns an empty range dictionary and only supplements uncovered currencies per date. NBRB must not make the range path worse for RUB/BYN by falling back to the `IExchangeRateClient` default day loop. [Source: `inex.Services/Infrastructure/ExternalClients/ExchangeRate/IExchangeRateClient.cs`; `FrankfurterApiClient.cs`; `CurrencyApiClient.cs`]
- Existing external-client resilience is in `HttpResiliencePolicyFactory`: 3 retries, exponential delay, transient HTTP errors, HTTP 429, and Polly timeout; timeout per attempt defaults to 10 seconds. NBRB needs the same timeout/transient coverage plus `Retry-After` handling for 429 responses because the Epic 5 acceptance criteria require it and the current shared factory does not read `Retry-After`. [Source: `docs/planning/epics.md#Story 5.1: Backend - NBRB Exchange Rate Client for BYN/RUB`; `inex.Services/Infrastructure/Resilience/HttpResiliencePolicyFactory.cs`]
- Existing cache persistence stores rows in `exchange_rate` with `FromCode`, `ToCode`, `Rate`, `IsTemporary`, and `Created`. A unique constraint exists for date/from/to combinations; use upsert behavior rather than creating duplicate rows. [Source: `inex.Data/Models/ExchangeRate.cs`; `inex.Data/Migrations/20260424070214_AddExchangeRateUniqueConstraint.cs`]

### BYN/RUB Conversion Rules

- Direct `BYN -> RUB`: store `Rate = Cur_Scale / Cur_OfficialRate`.
- Direct `RUB -> BYN`: store `Rate = Cur_OfficialRate / Cur_Scale`.
- Do not request BYN from NBRB as a foreign currency; BYN is the domestic currency in NBRB rate publications.
- Match currency codes case-insensitively for routing, but persist the existing uppercase currency keys (`BYN`, `RUB`) already seeded in `CurrencyConfiguration`.
- RUB metadata must be resolved before rate conversion. Preferred implementation: query `GET https://api.nbrb.by/exrates/currencies`, deserialize at least `Cur_ID`, `Cur_Abbreviation`, `Cur_Scale`, `Cur_DateStart`, and `Cur_DateEnd`, then choose the row where `Cur_Abbreviation == "RUB"` and the requested range overlaps the row's effective dates. If more than one row overlaps because NBRB changed metadata over time, split the dynamics requests by metadata effective range. If no RUB row overlaps, log the failure and treat the affected BYN/RUB dates as unavailable.
- A hardcoded RUB `Cur_ID` is acceptable only if the code comment cites the official NBRB currency-list source and tests still cover scale-aware conversion. Do not hardcode `Cur_Scale = 100` in conversion code if the metadata response includes scale.

### NBRB Failure and Partial-Data Rules

- NBRB is authoritative for the BYN/RUB path in this story. Do not silently supplement failed or missing BYN/RUB NBRB rates from CurrencyAPI or Frankfurter unless a later story explicitly changes the source-of-truth rule.
- If NBRB fails for the requested range and a prior non-temporary BYN/RUB rate is already cached before a missing date, carry forward that prior cached rate using the existing carry-forward behavior.
- If NBRB fails and no prior non-temporary BYN/RUB rate exists, leave the affected BYN/RUB dates absent from the cache and log a structured warning/error. Do not create temporary or fabricated actual rates for historical dates.
- If Frankfurter returns non-BYN/RUB rates for a date but NBRB omits RUB for that same date, persist the non-BYN/RUB rates normally and handle the BYN/RUB gap independently through prior-rate carry-forward or absence. Cache completeness checks must not treat the entire date as fully cached until required target currencies for that base are present.
- If NBRB returns some dates in a range and omits weekends/holidays, insert actual NBRB rates for returned dates first, then carry forward from the nearest prior non-temporary BYN/RUB rate for omitted dates.

### Files Likely to Change

- `inex.Services/Infrastructure/ExternalClients/ExchangeRate/NbrbApiClient.cs` - new client.
- `inex.Services/Infrastructure/ExternalClients/ExchangeRate/NbrbRateResponse.cs` or `NbrbRateShortResponse.cs` - new response model.
- `inex.Services/Infrastructure/ExternalClients/ExchangeRate/NbrbApiSettings.cs` - new settings class.
- `inex.Services/Extensions/InExServicesExtensions.cs` - options, retry policy, HTTP client registration, and `ExchangeRateService` factory update.
- `inex.Services/Services/ExchangeRateService.cs` - BYN/RUB routing and NBRB merge logic.
- `inex/appsettings.json` - non-secret `NbrbApiSettings:BaseUrl` only.
- `inex.Tests/Infrastructure/InExWebApplicationFactory.cs` - test configuration for `NbrbApiSettings:BaseUrl`.
- `inex.Services.Tests/Infrastructure/ExternalClients/NbrbApiClientTests.cs` - new client tests.
- `inex.Services.Tests/Services/ExchangeRateServiceTests.cs` - service routing, conversion, and fallback tests.

### Project Structure Notes

- Keep service business logic in `inex.Services`; do not move exchange-rate orchestration into controllers or `inex.Data`.
- Keep persistence behind existing repositories/unit of work. No schema change is expected for this story unless implementation discovers the existing unique constraint cannot support required upserts.
- Do not add frontend work, report UI work, or Epic 6 historical net-worth implementation in this story.
- Do not introduce new dependencies; current `HttpClient`, `System.Net.Http.Json`, Polly, xUnit, and Moq are sufficient.

### Security, Configuration, and Environment

- NBRB does not require an API key. Do not add secrets for it.
- Tracked config may include only the public base URL. Keep real `CurrencyApiSettings:ApiKey`, connection strings, JWT secrets, and invite tokens out of docs/logs/tests.
- Do not log full request URLs if future query strings could include secrets. NBRB URLs are currently non-secret, but follow the existing structured logging style.
- Preserve cancellation token propagation through service and client calls.

### Testing Requirements

- Use `inex.Services.Tests` for `NbrbApiClient` and `ExchangeRateService` unit coverage.
- Mock HTTP with `HttpMessageHandler` as in `FrankfurterApiClientTests`.
- Mock repositories and clients as in `ExchangeRateServiceTests`; use `FakeClock` for date-sensitive tests.
- Verify call counts explicitly: BYN/RUB cold-cache range uses NBRB range fetch once per required range segment, not `GetRatesAsync` per date; non-BYN/RUB behavior still calls Frankfurter range first and CurrencyAPI only for uncovered currencies.
- Include edge cases: empty NBRB array, missing weekend/holiday date in returned series, invalid id/404, transient failure, `end < start` still throws existing validation exception, and future/today behavior remains unchanged.

### Internal Checklist Validation

- Acceptance criteria are concrete and testable.
- Backend behavior and external API behavior are specified with source URLs and expected data shape.
- BYN/RUB conversion math is explicit.
- Caching, retry, timeout, missing-date, and failure behavior are specified.
- Existing architecture, likely files, tests, security, configuration, and dependencies are referenced.
- Story sequencing is correct: Epic 2 prerequisite is complete; Epic 6 depends on this story.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-01: `dotnet build .\inex.sln` initially failed while selecting the generic Polly retry overload; fixed by explicitly calling `AsyncRetryTResultSyntax.WaitAndRetryAsync`.
- 2026-06-01: `dotnet test .\inex.Services.Tests\inex.Services.Tests.csproj` initially failed on an overly strict cancellation-token equality assertion because `HttpClient` wraps the token; adjusted to assert a cancellable token reaches the handler.

### Completion Notes List

- Added `NbrbApiClient` with `/exrates/currencies` RUB metadata discovery, `dynamics/{cur_id}` range calls, inclusive 365-day segmentation, typed JSON response models, and scale-aware BYN/RUB conversion.
- Registered `NbrbApiSettings`, `INbrbApiClient`, an `NbrbApiRetry` policy, timeout handling, and public tracked NBRB base URL configuration.
- Integrated NBRB as the authoritative direct BYN/RUB path in `ExchangeRateService` while preserving Frankfurter-first plus CurrencyAPI supplement behavior for all non-BYN/RUB paths.
- Extended carry-forward to fill missing target currencies independently, so NBRB gaps do not block non-BYN/RUB rates and prior non-temporary BYN/RUB rates can be carried forward.
- Added focused `NbrbApiClientTests` and `ExchangeRateServiceTests` coverage for URL formatting, date formatting, metadata and JSON mapping, scale math, 365-day splitting, empty/404 behavior, cancellation propagation, retry-after behavior, NBRB routing, missing-date carry-forward, failure behavior, and non-BYN/RUB regression behavior.
- Verification passed: `dotnet test .\inex.Services.Tests\inex.Services.Tests.csproj`, `dotnet build .\inex.sln`, and `dotnet test .\inex.sln`.

### File List

- `inex.Services/Infrastructure/ExternalClients/ExchangeRate/INbrbApiClient.cs`
- `inex.Services/Infrastructure/ExternalClients/ExchangeRate/NbrbApiClient.cs`
- `inex.Services/Infrastructure/ExternalClients/ExchangeRate/NbrbApiSettings.cs`
- `inex.Services/Infrastructure/ExternalClients/ExchangeRate/NbrbCurrencyResponse.cs`
- `inex.Services/Infrastructure/ExternalClients/ExchangeRate/NbrbRateResponse.cs`
- `inex.Services/Infrastructure/Resilience/HttpResiliencePolicyFactory.cs`
- `inex.Services/Extensions/InExServicesExtensions.cs`
- `inex.Services/Services/ExchangeRateService.cs`
- `inex/appsettings.json`
- `inex.Tests/Infrastructure/InExWebApplicationFactory.cs`
- `inex.Services.Tests/Infrastructure/ExternalClients/NbrbApiClientTests.cs`
- `inex.Services.Tests/Services/ExchangeRateServiceTests.cs`
- `docs/implementation/5-1-backend-nbrb-exchange-rate-client-for-byn-rub.md`
- `docs/implementation/sprint-status.yaml`

## Change Log

- 2026-06-01: Implemented Story 5.1 NBRB BYN/RUB exchange-rate client, service integration, configuration, resilience, and tests.
