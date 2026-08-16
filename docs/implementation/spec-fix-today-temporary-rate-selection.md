---
title: 'Fix same-day temporary exchange-rate selection'
type: 'bugfix'
created: '2026-08-16'
status: 'done'
baseline_commit: 'f40d50fa6392633471437759fe29545440699984'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/implementation/spec-gh-310-fix-legacy-weekend-rate-carry-forward.md'
---

<frozen-after-approval reason="human-owned intent – do not modify unless human renegotiates">

## Intent

**Problem:** When a report requests rates for today and the same-day slot is absent, the legacy service creates a temporary placeholder from an arbitrary earlier actual rate. The failure is caused by database-side grouping after descending sorting, so it can select an old rate instead of the nearest preceding actual rate and makes same-day financial calculations incorrect.

**Approach:** Make the same-day temporary-rate path select its source deterministically: materialize eligible prior actual rates in descending date order, then choose the first rate for each target currency in memory. Add regression coverage that proves the latest rate is used for each currency, while preserving the existing temporary flag and all separate synchronization boundaries.

## Boundaries & Constraints

**Always:** Modify only the legacy `ExchangeRateService` same-day temporary placeholder path; select rates strictly before today, with matching base/target currency and `IsTemporary == false`; preserve the temporary row's creation semantics, existing-rate behavior, user account currency scope, lock, cancellation flow, and service API contracts; use mocks only for provider interactions.

**Ask First:** Repairing the already-persisted incorrect 2026-08-16 row; changing provider calls or rate dates; changing database schema, indexes, report calculations, or the cached-rate API contract.

**Never:** Merge, reroute, or alter the manual `POST /api/exchange/rates/synchronize` handler/repository; alter the historical carry-forward implementation delivered by PR #311; fetch live rates for today; change the persisted row from temporary to actual; commit generated files or unrelated report/UI changes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Missing today slot | EUR has two earlier actual USD/EUR rates; no same-day EUR row | Create a temporary EUR row with the later rate | Existing no-provider behavior applies |
| Per-currency sources | EUR and BYN have different latest actual dates | Each same-day temporary row uses its own latest preceding rate | A target with no prior actual row stays absent |
| Partial today cache | Today has a EUR temporary row but BYN is absent | Do not replace EUR; create only BYN from its latest actual source | Existing cache semantics apply |
| All today targets present | Today already has every requested target | Create no rows and save nothing | Return normally |

</frozen-after-approval>

## Code Map

- `inex.Services/Services/ExchangeRateService.cs` -- `CreateTemporaryRatesForTodayIfNeeded` selects and persists same-day temporary rates; contains the erroneous provider-side grouping.
- `inex.Services.Tests/Services/ExchangeRateServiceTests.cs` -- service-level mocked regression coverage for cache synchronization.
- `docs/implementation/spec-gh-310-fix-legacy-weekend-rate-carry-forward.md` -- prior historical-only fix whose materialize-before-group invariant is reused without coupling paths.

## Tasks & Acceptance

**Execution:**

- [x] `inex.Services/Services/ExchangeRateService.cs` -- materialized the descending candidate set before grouping within `CreateTemporaryRatesForTodayIfNeeded` -- guarantees newest-prior selection per target currency on EF/MySQL.
- [x] `inex.Services.Tests/Services/ExchangeRateServiceTests.cs` -- added a same-day regression with multiple prior actual rates and target-specific source dates -- proves temporary rows use the correct rates and remain temporary.

**Acceptance Criteria:**

- Given several older actual USD/EUR rates and no USD/EUR row today, when legacy rate retrieval creates today's placeholder, then the saved temporary EUR rate equals the latest earlier actual EUR rate.
- Given EUR and BYN have different latest actual source dates, when today's temporary rows are created, then each row uses its own latest earlier rate and has `IsTemporary == true`.
- Given a same-day rate already exists for one target, when other requested targets are missing, then the existing target is unchanged and only missing targets are created.
- Given manual synchronization or a historical missing date, when the relevant endpoint runs, then this change does not change its handler/repository or historical carry-forward path.

## Design Notes

`OrderByDescending(...).GroupBy(...).First()` is only deterministic after materialization. Keeping the two paths separate means this method adopts the invariant already verified in the historical service method without sharing control flow or persistence ownership. The test should exercise the public `Get` method with the clock fixed to the requested date and empty providers, avoiding external calls.

## Verification

**Commands:**

- `dotnet test inex.Services.Tests/ --no-restore` -- expected: all service tests pass without provider network calls.
- `dotnet test inex.sln --no-restore` -- expected: the full solution passes.
- `dotnet build inex.sln --no-restore` -- expected: successful build with no new warnings/errors.
- `git diff --check` -- expected: no whitespace errors.

**Results:**

- `dotnet test inex.Services.Tests/ --no-restore` passed: 92 tests.
- `dotnet test inex.sln --no-restore` passed: 233 tests (12 application, 92 services, 129 integration).
- `dotnet build inex.sln --no-restore` succeeded with 0 warnings and 0 errors.
- Read-only MySQL `EXPLAIN` confirmed the changed database query shape contains filtering and descending ordering only; grouping is now in memory.
- `git diff --check` passed.

## Suggested Review Order

**Same-day source selection**

- Materialize ordered prior rates before reducing them per target currency.
  [`ExchangeRateService.cs:478`](../../inex.Services/Services/ExchangeRateService.cs#L478)

**Regression guard**

- Reject provider-side grouping so the test fails on the former query shape.
  [`ExchangeRateServiceTests.cs:81`](../../inex.Services.Tests/Services/ExchangeRateServiceTests.cs#L81)

- Prove target-specific latest values create temporary same-day rows without provider calls.
  [`ExchangeRateServiceTests.cs:340`](../../inex.Services.Tests/Services/ExchangeRateServiceTests.cs#L340)
