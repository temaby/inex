---
title: 'Fix legacy weekend exchange-rate carry-forward selection'
type: 'bugfix'
created: '2026-08-15'
status: 'done'
baseline_commit: '2af5f99f113f8fb951de1ae9a76f3f6c418bc6ca'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/operations/exchange-rate-cache-repair.md'
---

<frozen-after-approval reason="human-owned intent вЂ” do not modify unless human renegotiates">

## Intent

**Problem:** The legacy exchange-rate retrieval endpoint can copy a non-latest historical value into weekend or holiday dates when a provider has no quote. The persisted value then makes converted financial calculations incorrect.

**Approach:** Make the legacy carry-forward selection deterministically choose the nearest earlier non-temporary rate for every base/target currency pair. Add a regression test with multiple historical rates; retain the endpoint's existing provider and cache behavior.

## Boundaries & Constraints

**Always:** Preserve the authenticated endpoint contract, enabled-account currency scope, cache writes, temporary-rate behavior, cancellation flow, and no-live-provider test rule. Select the source rate per target currency, strictly before the requested date, and only from non-temporary records.

**Ask First:** Repairing already-persisted incorrect historical rows, changing rate-provider behavior, changing the database schema or indexes, or altering calculations outside rate synchronization.

**Never:** Merge, remove, delegate between, or otherwise couple the legacy `GET /api/exchange/rates/{date}` flow and manual `POST /api/exchange/rates/synchronize` flow. Do not alter the manual synchronization handler, repository, adapter, route, or its tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Weekend carry-forward | A past date has no provider quote; EUR has several older actual USD/EUR rates | Persist the rate from the newest date before the missing date | Existing provider and cache behavior applies |
| Per-currency selection | Several target currencies have different latest actual dates | Each missing target receives its own newest preceding actual rate | A target without a prior actual rate remains unresolved under existing behavior |
| Existing temporary row | Missing past date contains a temporary EUR row | Update it to the newest preceding actual rate and mark it non-temporary | Existing update path applies |

</frozen-after-approval>

## Code Map

- `inex.Services/Services/ExchangeRateService.cs` -- legacy rate retrieval and historical carry-forward path; the only production implementation to change.
- `inex.Services.Tests/Services/ExchangeRateServiceTests.cs` -- mocked provider/cache service regression tests.
- `inex.Application/ExchangeRates/Synchronization/SynchronizeExchangeRates.cs` -- manual synchronization boundary; inspection-only, must not change.
- `inex.Infrastructure/ExchangeRates/Synchronization/ExchangeRateRepository.cs` -- manual synchronization persistence; inspection-only, already materializes the ordered set before grouping.

## Tasks & Acceptance

**Execution:**

- [x] `inex.Services/Services/ExchangeRateService.cs` -- materialize eligible legacy carry-forward candidates in descending date order before grouping by target currency, so the first candidate per group is deterministically the newest prior actual rate.
- [x] `inex.Services.Tests/Services/ExchangeRateServiceTests.cs` -- add a regression case containing multiple preceding actual rates and a missing weekend/holiday date; assert the newly persisted or promoted rate uses the latest value per target currency.
- [x] `inex.Services.Tests/Services/ExchangeRateServiceTests.cs` -- keep provider mocks empty for the missing date and verify no manual synchronization dependencies participate in the legacy behavior.

**Acceptance Criteria:**

- Given EUR has actual USD/EUR values on two dates before an unavailable weekend date, when legacy retrieval fills the unavailable date, then the persisted EUR value equals the later of the two source dates.
- Given several target currencies with different latest source dates, when legacy retrieval fills the unavailable date, then every target receives the rate from its own latest source date.
- Given a temporary row already exists for the unavailable historical date, when the legacy path carries a value forward, then it is updated in place, marked non-temporary, and uses the latest actual value.
- Given a manual synchronization request, when it runs, then no changed source file or test changes its behavior.

## Design Notes

The ordering needs to become an in-memory guarantee for the legacy path. Database `GROUP BY` does not preserve a prior LINQ ordering, so applying `First()` before materializing the ordered candidate set can select a non-latest row. This narrowly matches the existing manual-path repository pattern without sharing implementation or changing endpoint ownership.

## Verification

**Commands:**

- `dotnet test inex.Services.Tests/ --no-restore` -- expected: service tests pass without network provider calls.
- `dotnet test inex.sln --no-restore` -- expected: full solution test suite passes.
- `dotnet build inex.sln --no-restore` -- expected: no errors or warnings.
- `git diff --check` -- expected: no whitespace errors.

## Suggested Review Order

**Deterministic legacy carry-forward**

- Materialize the descending candidate set before reducing it to one rate per target.
  [`ExchangeRateService.cs:536`](../../inex.Services/Services/ExchangeRateService.cs#L536)

**Regression proof**

- Covers latest-per-currency selection and promotion of pre-existing temporary rows.
  [`ExchangeRateServiceTests.cs:668`](../../inex.Services.Tests/Services/ExchangeRateServiceTests.cs#L668)
