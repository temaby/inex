---
title: 'Use CurrencyAPI exclusively for manual exchange-rate synchronization'
type: 'bugfix'
created: '2026-08-15'
status: 'done'
baseline_commit: '4c9fea615beabce1198bb6d8ea9929d2678451b9'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/operations/exchange-rate-cache-repair.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The new authenticated manual exchange-rate synchronization endpoint obtains historical quotes through a mixed provider chain: Frankfurter first, CurrencyAPI for missing standard quotes, and NBRB for the BYN/RUB special path. Manual synchronization must use CurrencyAPI as its sole external quote source so the user has one predictable provider and its data semantics apply uniformly.

**Approach:** Change only the synchronization provider adapter used by `POST /api/exchange/rates/synchronize` so it queries CurrencyAPI for every requested missing date/currency pair. Retain the existing handler behaviour for cache reuse, prior-rate carry-forward, validation, ownership scoping, and stable endpoint errors.

## Boundaries & Constraints

**Always:** Keep the endpoint authenticated and current-user scoped; preserve its route, JSON contracts, error codes, cache semantics, cancellation propagation, and test-only mocked provider access. Call CurrencyAPI only for requested standard and BYN/RUB pairs, grouping neither Frankfurter nor NBRB into the manual-sync path. Continue logging CurrencyAPI failures and allow the application handler to carry forward an available earlier actual rate.

**Ask First:** Introducing a separate provider strategy for other exchange-rate consumers, changing CurrencyAPI quota settings, changing the endpoint contract, or broadening this change to automatic/retrieval rate fetching.

**Never:** Invoke live providers in tests or exploratory work; alter the existing GET exchange-rate provider behaviour; remove the prior actual-rate fallback; expose provider credentials; modify database schema.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Requested historical standard pair | Missing EUR/USD rate for a selected date | One CurrencyAPI request is made for EUR/USD and its valid quote is persisted | Existing response validation applies |
| Requested BYN/RUB pair | Missing BYN/RUB rate for a selected date | CurrencyAPI, rather than NBRB, supplies the requested pair | Existing response validation applies |
| CurrencyAPI outage with prior actual cache | Provider throws and an earlier actual quote exists | No provider-specific fallback is invoked; handler carries the prior actual quote forward | Warning is logged; sync succeeds with carry-forward |
| CurrencyAPI outage without prior actual cache | Provider throws and no earlier actual quote exists | Sync cannot complete the requested date | Existing stable provider-response error is returned |

</frozen-after-approval>

## Code Map

- `inex/Infrastructure/ExchangeRates/Synchronization/HistoricalRateProvider.cs` — synchronization-only provider adapter; remove Frankfurter/NBRB calls from this path and source requested pairs from CurrencyAPI.
- `inex.Application/ExchangeRates/Synchronization/SynchronizeExchangeRates.cs` — consumes adapter output; must remain unchanged except if tests demonstrate a narrowly necessary interface adjustment.
- `inex.Application.Tests/ExchangeRates/Synchronization/SynchronizeExchangeRatesCommandHandlerTests.cs` — regression coverage for handler carry-forward/error behaviour through mocked adapter output.
- `inex.Tests/ExchangeRates/HistoricalRateProviderTests.cs` — adapter-level tests asserting CurrencyAPI-only behaviour through stubbed HTTP clients.
- `inex/Infrastructure/ExchangeRates/Synchronization/ExchangeRateSynchronizationServiceCollectionExtensions.cs` — registrations to inspect; preserve DI validity after removing unused dependencies.

## Tasks & Acceptance

**Execution:**

- [x] `inex/Infrastructure/ExchangeRates/Synchronization/HistoricalRateProvider.cs` — replace the mixed Frankfurter/CurrencyAPI/NBRB selection logic with CurrencyAPI iteration over all requested date/target pairs; keep deduplication, valid-positive quote filtering, cancellation tokens, and failure logging.
- [x] `inex/Infrastructure/ExchangeRates/Synchronization/HistoricalRateProvider.cs` — remove dependencies and helper methods used only by Frankfurter/NBRB, without changing the independent legacy retrieval service chain.
- [x] `inex.Tests/ExchangeRates/HistoricalRateProviderTests.cs` — cover standard and BYN/RUB requests through CurrencyAPI and a provider exception yielding no quote.
- [x] `inex.Application.Tests/ExchangeRates/Synchronization/SynchronizeExchangeRatesCommandHandlerTests.cs` — retain the existing regression coverage for carry-forward from a prior actual rate.
- [x] `inex.sln` and project files — confirmed the existing test project already covers the adapter; no project or dependency change was required.

**Acceptance Criteria:**

- Given an authenticated manual synchronization request for normal currency pairs, when rates are absent from cache, then only CurrencyAPI is used to obtain those pairs.
- Given an authenticated manual synchronization request for BYN/RUB, when that pair is absent from cache, then CurrencyAPI is used and NBRB is not called.
- Given CurrencyAPI supplies no quote but a preceding actual cached rate exists, when the date is synchronized, then the existing carry-forward result is persisted.
- Given CurrencyAPI fails and no prior actual rate is available, when synchronization cannot complete, then the endpoint retains its documented stable error contract rather than returning an unhandled provider failure.
- Given existing non-manual exchange-rate retrieval behaviour, when this change is applied, then its provider chain is not modified.

## Spec Change Log

## Design Notes

The change is deliberately constrained to `HistoricalRateProvider`, the adapter registered for the manual synchronization command. The legacy `ExchangeRateService` keeps its own provider sequence and should not be refactored as part of this request. A mockable adapter test is essential because the repository forbids live exchange-rate-provider traffic from tests.

## Verification

**Commands:**

- `dotnet test inex.sln --no-restore` — expected: all tests pass without live provider traffic.
- `dotnet build inex.sln --no-restore` — expected: no warnings or errors.
- `git diff --check` — expected: no whitespace errors.

## Suggested Review Order

**Manual synchronization provider boundary**

- CurrencyAPI is the sole adapter dependency and source for every requested pair.
  [`HistoricalRateProvider.cs:23`](../../inex/Infrastructure/ExchangeRates/Synchronization/HistoricalRateProvider.cs#L23)

- Request cancellation stays cancellation rather than becoming a partial provider response.
  [`HistoricalRateProvider.cs:52`](../../inex/Infrastructure/ExchangeRates/Synchronization/HistoricalRateProvider.cs#L52)

**Regression coverage**

- Covers standard and BYN/RUB CurrencyAPI requests, outages, and cancellation.
  [`HistoricalRateProviderTests.cs:13`](../../inex.Tests/ExchangeRates/HistoricalRateProviderTests.cs#L13)

- Verifies an unavailable provider carries forward a prior cached actual rate.
  [`SynchronizeExchangeRatesCommandHandlerTests.cs:346`](../../inex.Application.Tests/ExchangeRates/Synchronization/SynchronizeExchangeRatesCommandHandlerTests.cs#L346)
