---
title: 'Load missing exchange rates from Dashboard and Transactions'
type: 'bugfix'
created: '2026-10-16'
status: 'done'
baseline_commit: '0542bd4019d7f1097cef1b70e691bb1344c022df'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/operations/exchange-rate-cache-repair.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dashboard and Transactions read only cached exchange rates. When required rates are absent, the user must open a report to populate the cache before these pages can display converted totals.

**Approach:** Let these two pages request rates through the same on-demand service used by reports. Reuse its existing cache checks, provider fallbacks, synchronization lock, historical carry-forward, and temporary rates for today. Retain existing unavailable states when a required rate still cannot be obtained.

## Boundaries & Constraints

**Always:** Derive the synchronizing user from the authenticated principal. Preserve linked-account read-only behavior and existing linked-scope authorization. Keep money conversion, rounding, filters, and valuation dates unchanged. Preserve existing response shapes and shared authenticated `apiClient`. Keep cached data usable when synchronization fails, with incomplete aggregates unavailable. Mock external providers in all verification.

**Ask First:** Changes to supported currencies, archived-account synchronization policy, linked-account synchronization permissions, financial conversion rules, schema, or dependencies.

**Never:** Call live exchange-rate providers during tests or exploration; silently substitute partial totals; replace the manual synchronization command; change unrelated pages' cache-only requests; rewrite completed story history.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Missing rates | Own foreign-currency accounts and incomplete date coverage | Opening either page loads missing rates for its existing requested period and updates conversions | Retain unavailable state for unresolved currencies/dates |
| Complete cache | Own requested period already covered | Existing service returns cached rates without unnecessary provider calls | Existing error handling |
| Today and future month end | Current period extends past today | Existing service skips future dates and creates today's temporary rates from prior actual rates | Never request live same-day provider rates |
| Long period | Transactions includes current and previous periods over 31 days | Range retrieval uses report service behavior, without the manual command's 31-day limit | Normal request failure path |
| Provider failure | Synchronization fails with some useful cache present | Attempt a cache-only read and retain valid conversions; unresolved conversions remain unavailable | Complete loading state without automatic retry loops |
| Linked view | Authorized linked user selected | Continue existing scoped cache-only retrieval | Never synchronize the signed-in user's currencies for a linked view |
| Scope changes | Switch period or linked user while a request is pending | Ignore results for an obsolete request key | Preserve existing Redux stale-response protections |
| Unsupported historical currency | Transactions reference a currency only used by archived accounts | Preserve existing enabled-account synchronization policy and show unavailable evidence if cache lacks coverage | No misleading complete aggregate |

</frozen-after-approval>

## Code Map

- `inex/Controllers/ExchangeRateController.cs` — existing date, cached-range, and manual synchronization endpoints; add authenticated range retrieval.
- `inex.Services/Services/ExchangeRateService.cs` — existing report-compatible `Get(userId, start, end, ..., ct)` implementation; reuse without altering its algorithm.
- `inex/ClientApp/src/store/rates/rates-action.ts` — shared cache-only thunk; add a separate on-demand range thunk so Categories remains unchanged.
- `inex/ClientApp/src/store/rates/rates-slice.ts` — request/completion keys, loading/error state, stale-result protection.
- `inex/ClientApp/src/pages/Dashboard.tsx` — cache-only initial load and retry currently share a completion key.
- `inex/ClientApp/src/pages/Transactions.tsx` — rate request follows summary current/previous period and optional account overview.
- `inex.Tests/ExchangeRates/ExchangeRateControllerTests.cs` — endpoint regression coverage.

## Tasks & Acceptance

**Execution:**
- [x] `inex/Controllers/ExchangeRateController.cs` — add `GET api/exchange/rates/range` with required start/end query parameters, cancellation propagation, and `CurrentUserId`; delegate to existing service range retrieval.
- [x] `inex/ClientApp/src/store/rates/rates-action.ts` — add scoped on-demand range loading: own view calls new range endpoint, linked view retains cached endpoint; on sync failure attempt cache fallback; preserve existing cache-only thunk semantics.
- [x] `inex/ClientApp/src/pages/Dashboard.tsx` and `inex/ClientApp/src/pages/Transactions.tsx` — use on-demand loading on initial demand and existing retries; ensure a prior cache-only completion cannot suppress the first on-demand request and prevent duplicate in-flight loads.
- [x] `inex.Tests/ExchangeRates/ExchangeRateControllerTests.cs` — cover authenticated range dispatch, anonymous rejection, reversed-range validation, and required query arguments without external network requests.
- [x] `inex/ClientApp/src/store/rates/` and affected page tests — cover own/linked routes, pending/stale requests, cache fallback and terminal failure, automatic loading, and retry behavior using mocked APIs.

**Acceptance Criteria:**
- Given missing obtainable rates, when the user opens Dashboard or Transactions in their own view, then converted values become available without visiting Reports.
- Given a completed cache-only request from another screen, when either page opens, then its on-demand request is not incorrectly skipped.
- Given unrelated cache-only consumers, when this fix is applied, then their requests remain cache-only.

## Spec Change Log

## Design Notes

The manual POST synchronization command rejects intervals over 31 days and future end dates. Reusing the existing report service through a thin range endpoint avoids a second synchronization algorithm or frontend chunking. Linked mode remains read-only. Historical account-overview valuation and archived-currency policy remain as currently implemented.

## Verification

**Commands:**
- `dotnet test inex.Services.Tests/` — focused backend baseline.
- `dotnet test inex.sln` — full backend regression coverage with providers mocked.
- `npm test -- <affected test files>` from `inex/ClientApp` — focused request and page regressions.
- `npm run build` and `npm run lint` from `inex/ClientApp` — type/build/lint success.

Project doctor UI readiness passed: 20 checks, zero failures or warnings. This is a loading-behavior change with no layout or visual-parity claim. No database schema or provider-specific query changes are planned.

### Implementation verification (2026-10-16)

- Added authenticated `GET api/exchange/rates/range` with binding-required dates, current-principal ownership, cancellation propagation, and existing report range service behavior.
- Dashboard and Transactions use a distinct on-demand thunk and `rates.range` state. Cache-only consumers retain their existing state and requests. Own failures attempt cache fallback; linked views remain cache-only.
- Dashboard requests once per mounted scope/demand, so prior completed requests do not prevent loading on reopening; pending thunks deduplicate StrictMode effects. Existing retry requests remain available. Obsolete request keys cannot overwrite the active scope.
- `dotnet test inex.Services.Tests/ --no-restore -m:1`: PASS, 121 tests.
- `dotnet test inex.sln --no-restore -m:1 /nodeReuse:false`: PASS, 303 tests (121 service, 170 API/integration, 12 application). All verification uses mocked providers or factory test hosts; no live provider requests.
- Focused frontend regression tests: PASS, covering on-demand/cache-only isolation, own and linked routes, fallback, terminal failure and retry, pending deduplication, obsolete requests, Dashboard StrictMode/remount/retry, and Transactions current/previous range loading.
- `npm run build`: PASS. Existing Vite CJS API and large vendor chunk warnings remain.
- `npm run lint`: PASS.
- Initial sandbox prevented esbuild process startup and stalled unrestricted MSBuild workers; rerunning local checks with approved process escalation and single-node MSBuild succeeded. Required-date errors correctly follow the existing standardized HTTP 422 validation contract.
- No schema, service query algorithm, conversion, layout, provider policy, or dependency changes. Browser visual parity was not claimed; behavior is verified through mocked page/API regressions.

### Implementation and review verification (2026-10-16)

- Added authenticated range retrieval with required dates, principal-derived ownership, and cancellation propagation. The endpoint awaits report-compatible synchronization and then reads `GetCached` to preserve exclusion of expired historical temporary rates, including archived-only currencies.
- Dashboard and Transactions use a distinct on-demand thunk and `rates.range` state. Categories retains cache-only requests. Own failures attempt cached fallback; linked requests stay cache-only.
- Dashboard loads once per mounted scope/demand and supports retries. Pending thunks deduplicate StrictMode effects. On-demand requests carry an RTK `nanoid`; reducers require both key and generation so an older A request cannot overwrite a newer A after switching A -> B -> A. Legacy cached state guards are unchanged.
- Endpoint regressions cover anonymous rejection, HTTP 422 required/reversed dates, current-principal ownership ignoring supplied IDs, long/future ranges, cancellation propagation, synchronization-before-cache order, and real expired-temporary-rate filtering with no enabled EUR account.
- `dotnet test inex.Services.Tests/ --no-restore -m:1`: PASS, 121 tests.
- `dotnet test inex.Tests/ --no-restore -m:1 /nodeReuse:false --filter FullyQualifiedName~ExchangeRateControllerTests`: PASS, 13 tests.
- `dotnet test inex.sln --no-restore -m:1 /nodeReuse:false`: PASS, 304 tests (121 service, 171 API/integration, 12 application).
- `npm test -- src/store/rates/__tests__/rates-action.test.ts src/pages/Dashboard.test.tsx src/pages/Transactions.month-controls.test.tsx`: PASS, 27 tests. Coverage includes own/linked routes, cache-only isolation, fallback, terminal failure/retry, pending deduplication, stale key/generation results, Dashboard StrictMode/remount/retry, and Transactions full current/previous periods.
- `npm run build`: PASS; existing Vite CJS API/vendor chunk warnings only. `npm run lint`: PASS.
- Tests use mocked providers or factory test hosts; no live providers were called. No schema, provider query algorithm, conversion, layout, or dependency changes. Browser visual parity was not claimed.
- Initial sandbox prevented esbuild startup and stalled MSBuild; process escalation and single-node MSBuild completed successfully. Initial stalled session had already exited when checked. Generated `inex.xml` was restored from HEAD after verification.

## Review disposition

- Patched obsolete response acceptance after A -> B -> A by checking a unique request generation.
- Patched historical temporary-rate eligibility by returning the existing cache-reader result after synchronization.
- Re-review confirmed both patches meet the approved constraints. Additional overlapping HTTP requests after scope changes remain safe: the server synchronization lock rechecks cached coverage before calling providers, and stale generations cannot publish results.
- Environment follow-up is proposed in [the session retrospective](session-retrospective-auto-load-rates-2026-10-16.md); no runtime or global agent policy changes were added.

## Suggested Review Order

**Authenticated rate retrieval**

- Synchronize through the report service, then return only eligible cached rates.
  [ExchangeRateController.cs:68](../../inex/Controllers/ExchangeRateController.cs#L68)

**Page loading and request isolation**

- Separate own on-demand requests from linked cache-only reads; retain cache fallback.
  [rates-action.ts:53](../../inex/ClientApp/src/store/rates/rates-action.ts#L53)
- Reject superseded request generations before publishing results.
  [rates-slice.ts:82](../../inex/ClientApp/src/store/rates/rates-slice.ts#L82)
- Request rates once per mounted Dashboard demand and support retries.
  [Dashboard.tsx:364](../../inex/ClientApp/src/pages/Dashboard.tsx#L364)
- Load the full current and previous Transactions periods automatically.
  [Transactions.tsx:292](../../inex/ClientApp/src/pages/Transactions.tsx#L292)

**Regression evidence**

- Cover authentication, required dates, scope, synchronization order, and obsolete placeholder exclusion.
  [ExchangeRateControllerTests.cs:134](../../inex.Tests/ExchangeRates/ExchangeRateControllerTests.cs#L134)
- Exercise fallback, retries, pending deduplication, and scope-generation races with mocked APIs.
  [rates-action.test.ts:16](../../inex/ClientApp/src/store/rates/__tests__/rates-action.test.ts#L16)
