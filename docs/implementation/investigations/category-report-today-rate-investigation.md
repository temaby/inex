# Investigation: Category report today-rate selection

## Hand-off Brief

1. **What happened.** The category-spending report on 2026-08-16 created a temporary USD/BYN row from an arbitrary older actual rate rather than the immediately preceding one.
2. **Where the case stands.** Concluded; the same-day temporary query repeated the provider-side grouping defect and the fix is implemented with regression coverage.
3. **What's needed next.** Review and merge the implementation; repair of the already-persisted 2026-08-16 row remains separately user-gated.

## Case Info

| Field | Value |
| --- | --- |
| Ticket | N/A |
| Date opened | 2026-08-16 |
| Status | Concluded |
| System | InEx production report and exchange-rate cache |
| Evidence sources | Supplied screenshot, service source, read-only MySQL inspection, Git history |

## Problem Statement

The user reports that running the category-spending report on 2026-08-16 caused a missing same-day rate to be synchronized using the oldest available historical value rather than the prior day's actual rate. The screenshot shows USD/BYN rows for 2022-03-07, 2026-08-15, and a temporary 2026-08-16 row.

## Evidence Inventory

| Source | Status | Notes |
| --- | --- | --- |
| Supplied database screenshot | Available | Shows the reported USD/BYN sequence and temporary flag. |
| `inex.Services/Services/ExchangeRateService.cs` | Available | Documents a distinct same-day temporary-rate flow. |
| MySQL MCP exchange-rate history | Partial | The connected database has no USD/BYN rows in the August window shown in the screenshot; it cannot independently validate those exact rows. |
| Category-report caller chain | Partial | The legacy exchange-rate endpoint is identified; the report/frontend trigger remains to trace. |
| PR #311 / merge commit `1c24b87` | Available | Fixed only historical carry-forward selection. |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | Query USD/BYN history surrounding 2026-08-16 | High | Partial | Connected MySQL lacks the displayed August rows; screenshot remains the only evidence for that window. |
| 2 | Trace category report to exchange-rate API call | High | Done | Not required after the same-day helper's source-level defect was confirmed. |
| 3 | Trace `CreateTemporaryRatesForTodayIfNeeded` selection | High | Done | The source contains the same database-side ordering/grouping anti-pattern. |
| 4 | Compare behavior against PR #311 scope | Medium | Open | Test whether the prior fix was expected to cover this path. |

## Timeline of Events

| Time | Event | Source | Confidence |
| --- | --- | --- | --- |
| 2026-08-15 | Latest displayed actual USD/BYN row created with rate 3.040005992. | Supplied screenshot | Confirmed |
| 2026-08-16 | Report execution resulted in a temporary USD/BYN row with rate 3.09221. | Supplied screenshot | Confirmed |
| 2026-08-15 | PR #311 fixed historical missing-date carry-forward. | Git history / spec | Confirmed |

## Confirmed Findings

### Finding 1: The observed row is in the same-day temporary-rate category

**Evidence:** Supplied screenshot marks the 2026-08-16 USD/BYN row as `is_temporary = 1`; `inex.Services/Services/ExchangeRateService.cs:76-83` routes dates before today to historical synchronization and dates including today to temporary-rate creation.

**Detail:** The row is not evidence of the historical carry-forward routine changed by PR #311. It is direct evidence that a separate same-day selection path must be inspected.

### Finding 2: Same-day temporary selection repeats the ordering defect fixed for historical dates

**Evidence:** `inex.Services/Services/ExchangeRateService.cs:478-486` orders eligible rates descending by date, then applies `GroupBy(i => i.ToCode).Select(g => g.First())` before materializing the query. The historical routine changed by PR #311 instead materializes at `inex.Services/Services/ExchangeRateService.cs:536-545` before grouping.

**Detail:** On EF/MySQL, SQL `GROUP BY` does not preserve the preceding `ORDER BY` as a deterministic way to choose one row per currency. The same-day query can therefore choose an arbitrary prior row — including the 3.09221 value shown in the screenshot — instead of the newest actual rate.

## Deduced Conclusions

### Deduction 1: PR #311 did not cover this observed path

**Based on:** Findings 1–2 and `docs/implementation/spec-gh-310-fix-legacy-weekend-rate-carry-forward.md`.

**Reasoning:** PR #311 deliberately scoped its change to prior-date historical carry-forward and retained the existing temporary-rate behavior. The service dispatches same-day requests to a different method.

**Conclusion:** The user's observed value can coexist with PR #311 being correctly delivered; it exposes the same defect in an unmodified same-day temporary-rate selection path.

## Hypothesized Paths

### Hypothesis 1: Same-day temporary-rate source selection groups before preserving newest ordering

**Status:** Confirmed

**Theory:** `CreateTemporaryRatesForTodayIfNeeded` or its helper selects one prior row per target currency through database grouping that discards date ordering.

**Supporting indicators:** The observed temporary value matches an older displayed USD/BYN row, and the source code contains the equivalent ordering/grouping sequence that PR #311 removed from the historical method.

**Would confirm:** Source trace shows a database-side `GroupBy`/`First` or unordered selection before materialization.

**Would refute:** The method materializes the ordered candidate set before grouping, or another writer replaces the row after this method completes.

**Resolution:** Confirmed by `inex.Services/Services/ExchangeRateService.cs:478-486`. The MySQL MCP data source is partial for the screenshot's August window, but it is not required to establish the nondeterministic selection mechanism.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | --- | --- |
| Screenshot environment's full USD/BYN history | Identifies the exact older source date selected. | Run the same read-only query against the database shown in the screenshot. |
| Report caller path | Identifies the exact trigger and endpoint. | Source trace. |

## Source Code Trace

| Element | Detail |
| --- | --- |
| Error origin | `inex.Services/Services/ExchangeRateService.cs:83` dispatches today to temporary-rate creation. |
| Trigger | User ran the category-spending report. |
| Condition | Same-day cache row missing. |
| Related files | Category-report service/controller and temporary-rate helper. |

## Conclusion

**Confidence:** High

The regression is confirmed in the same-day temporary-rate query. It reproduced the SQL ordering/grouping anti-pattern that PR #311 corrected only for historical dates. The implementation now materializes the ordered candidates before grouping and has a public-service regression test for the EUR/BYN case. The connected MySQL database cannot corroborate the screenshot's August rows, but source code proves the former nondeterministic mechanism.

## Recommended Next Steps

### Fix direction

Completed in the associated same-day temporary-rate selection fix: materialize before grouping in `CreateTemporaryRatesForTodayIfNeeded`; test multiple preceding actual rates through the public service API. The separate manual synchronization endpoint and historical carry-forward method remain unchanged.

### Diagnostic

Trace the report/frontend caller only if proof of the UI trigger is required; it does not change the confirmed source-level defect.

## Reproduction Plan

With a missing same-day rate and multiple earlier actual rows for one currency pair, run the category report and inspect the temporary row's value and source-selection path.

## Follow-up: 2026-08-16

### New Evidence

- A read-only MySQL query for the screenshot's August 2026 USD/BYN window returned no rows from the connected MCP database; that evidence source is partial for the incident.
- A value-match query shows 3.09221 occurs in earlier non-temporary USD/BYN rows, consistent with the screenshot's reported old-value selection.
- `inex.Services/Services/ExchangeRateService.cs:478-486` repeats `OrderByDescending` followed by provider-side grouping and `First()` before materialization.

### Additional Findings

- The same-day temporary path, not the historical weekend carry-forward path, is the confirmed defect location.

### Updated Hypotheses

- Hypothesis 1 is confirmed.

### Backlog Changes

- Same-day helper trace is complete. Report-trigger tracing remains open only as supplementary evidence.

### Updated Conclusion

- The same-day temporary-rate query now uses the same materialize-before-group invariant as PR #311, without coupling the two paths.
