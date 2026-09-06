# Investigation: Historical net-worth values exceed current account total

## Hand-off Brief

1. **What happened.** The user reports that the production historical net-worth chart preserves the expected trend but displays amounts materially above the sum of their accounts (about USD 55k shown versus about USD 35k expected); this is unverified against production data.
2. **Where the case stands.** Active. The confirmed entry point is `GET /api/reports/net-worth`, which delegates the entire calculation to `ReportService.GetNetWorthHistory`; the calculation and the production response have not yet been inspected.
3. **What's needed next.** Map the backend calculation, exchange-rate lookup, and dashboard rendering, then compare the endpoint's latest point with user-scoped account balances and rate records.

## Case Info

| Field            | Value |
| ---------------- | ----- |
| Ticket           | N/A |
| Date opened      | 2026-08-30 |
| Status           | Active |
| System           | InEx production report path; local source checkout on Windows |
| Evidence sources | User report, source-code index, implementation story, tests |

## Problem Statement

User report (Russian, verbatim): “historical net worth инсайт некорректно отображает значения. тенденция верна, но значения на графике сильно выше. к примеру на проде сумма моих счетов около 35 тыс usd, а график показывает около 55 тыс. исследуй проблему”.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| User report | Available | States a production discrepancy of roughly USD 20k, while trend direction is correct. |
| API entry point | Available | `inex/Controllers/ReportsController.cs:90`–`:94` registers the net-worth endpoint and delegates to the report service using `CurrentUserId`. |
| Calculation source | Available | `inex.Services/Services/ReportService.cs:298` is the identified implementation entry point; detailed code trace is pending. |
| Historical-net-worth story | Available | `docs/implementation/6-4-backend-frontend-historical-net-worth-chart.md:15` specifies period-accurate conversion. |
| Production API response and account/rate data | Missing | Needed to confirm the reported magnitude and identify the contributing account or currency. |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Trace `ReportService.GetNetWorthHistory` balances, transaction signs, and rate conversion | High | Open | Primary producing path. |
| 2 | Trace dashboard request and Recharts data transformation | High | Open | Determines whether values are altered after the API response. |
| 3 | Inspect tests and recent history for covered and uncovered aggregation behavior | Medium | Open | Identifies likely regression gaps. |
| 4 | Obtain a sanitized production endpoint response plus user-scoped account totals and rates | High | Blocked | Required to attribute the USD 20k discrepancy to real data. |

## Timeline of Events

| Time | Event | Source | Confidence |
| ---- | ----- | ------ | ---------- |
| 2026-08-30 | User reports inflated production chart amounts while trend remains correct. | User report | Confirmed |
| 2026-08-30 | Located the production endpoint and backend calculation entry point. | `inex/Controllers/ReportsController.cs:90`, `inex.Services/Services/ReportService.cs:298` | Confirmed |

## Confirmed Findings

### Finding 1: The chart is sourced from a user-scoped net-worth endpoint

**Evidence:** `inex/Controllers/ReportsController.cs:90`–`:94`

**Detail:** `GET /api/reports/net-worth` calls `GetNetWorthHistory(CurrentUserId, months, currency, ct)`. The controller itself does not calculate or transform monetary values.

## Deduced Conclusions

No conclusions yet.

## Hypothesized Paths

### Hypothesis 1: Backend aggregation or conversion inflates one or more balances

**Status:** Open

**Theory:** Because the displayed trend remains plausible while values are materially high, a stable additive error in transaction aggregation, account inclusion, or exchange-rate conversion may affect each point.

**Supporting indicators:** The endpoint delegates calculation to one service method; the frontend is expected to render its returned `netWorth` values.

**Would confirm:** A code trace or production data comparison showing that the service response is inflated before rendering.

**Would refute:** A production response near USD 35k combined with a frontend-only transformation that raises the plotted value.

**Resolution:** Pending.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ------ | ------------- |
| Sanitized latest production `GET /api/reports/net-worth?months=1` response | Separates backend result from chart display. | Capture the authenticated response for the affected user. |
| User-scoped current account balances and currencies | Identifies which accounts explain the delta. | Read-only database inspection or account endpoint response, scoped to the current user. |
| Historical rates used for the latest point | Tests exchange-rate magnitude/direction. | Read-only rate-record inspection linked to the report date. |

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| Error origin | Not yet established; reported visual output is the dashboard chart. |
| Trigger | Dashboard requests `/reports/net-worth?months=12`. |
| Condition | Pending source and production-data trace. |
| Related files | `inex/Controllers/ReportsController.cs`, `inex.Services/Services/ReportService.cs`, `inex/ClientApp/src/pages/Dashboard.tsx` |

## Conclusion

**Confidence:** Low

The investigation has a confirmed backend entry point but no causal finding. The next evidence pass will determine whether the discrepancy originates in the service response or dashboard rendering.

## Recommended Next Steps

### Fix direction

Do not change code until the calculation and a production data comparison identify the source of inflation.

### Diagnostic

Trace the calculation and request/render chain; compare the latest returned point with current user-scoped account balances and rates.

## Reproduction Plan

1. Capture the affected user's latest net-worth API point and current account summary.
2. Recompute the account total in the selected base currency using the report-date rates.
3. Compare the recomputed total, API point, and chart tooltip value.

## Side Findings

- The implementation story requires period-accurate exchange rates: `docs/implementation/6-4-backend-frontend-historical-net-worth-chart.md:15`.

## Follow-up: 2026-08-30

### New Evidence

#### Evidence perimeter

| Source | Status | Notes |
| ------ | ------ | ----- |
| API and frontend rendering | Available | The dashboard requests the endpoint, stores `data.data`, adds only a display month label, and binds `netWorth` directly to the Recharts line: `inex/ClientApp/src/pages/Dashboard.tsx:217`–`:228`, `:264`–`:268`, `:443`–`:475`. |
| Backend calculation | Available | `GetNetWorthHistory` reconstructs every account balance from all earlier transactions, converts it at each month end, and returns the sum: `inex.Services/Services/ReportService.cs:300`–`:372`. |
| Exchange-rate convention | Available | Stored `Rate` is target-currency units per one unit of report base currency; dividing a target-currency balance by it is correct: `inex.Services/Services/ReportService.cs:601`–`:623`, `inex.Services/Infrastructure/ExternalClients/FrankfurterApiClient.cs:14`–`:32`. |
| Unit and integration coverage | Partial | Tests cover month windows, basic conversion, inactive accounts, and endpoint auth/validation, but no endpoint-to-current-total reconciliation or real-rate persistence path: `inex.Services.Tests/Services/ReportServiceTests.cs:606`–`:812`, `inex.Tests/Reports/ReportsControllerTests.cs:101`–`:117`. |
| Version control | Available | Historical net worth was introduced in `736ef97` (2026-06-02); the latest reports commit `ed9e071` changes category/PDF internal-transfer summaries, not this calculation path. |
| Production API, accounts, and rate rows | Missing | No production-connected source is available in the session. These are required to attribute the reported USD 20k excess. |

### Additional Findings

### Finding 2: The frontend does not change returned amounts

**Evidence:** `inex/ClientApp/src/pages/Dashboard.tsx:225`–`:228`, `:264`–`:268`, `:443`–`:475`

**Detail:** The dashboard stores the API `data.data`, adds a localized `monthLabel`, and renders `dataKey="netWorth"`. Axis and tooltip formatting use `Number(value)` only for display. No addition, conversion, scaling, or cumulative calculation occurs in the frontend.

### Finding 3: The report deliberately includes all accounts, including inactive ones

**Evidence:** `inex.Services/Services/ReportService.cs:323`–`:365`

**Detail:** The calculation asks `AccountService` and `TransactionService` for `ActivityMode.ALL`, rebuilds each account's cumulative balance from zero, and includes every non-zero balance in the total. An inactive account can therefore contribute to the latest point even if the user's comparison uses only visible/active accounts.

### Finding 4: The report's exchange-rate division matches the stored rate contract

**Evidence:** `inex.Services/Services/ReportService.cs:316`–`:321`, `:601`–`:623`; `inex.Services/Services/ExchangeRateService.cs:410`–`:432`; `inex.Services/Infrastructure/ExternalClients/NbrbApiClient.cs:97`–`:106`

**Detail:** A rate is stored as target-currency units per one report-base unit. For a target-currency account balance, `balance / rate` yields the report-base amount. No source-level rate-direction inversion was found for CurrencyAPI, Frankfurter, or NBRB paths.

### Finding 5: Current automated coverage cannot detect this class of production discrepancy

**Evidence:** `inex.Services.Tests/Services/ReportServiceTests.cs:640`–`:723`; `inex.Tests/Reports/ReportsControllerTests.cs:101`–`:117`

**Detail:** Service tests inject hand-authored rates and mocked account/transaction results. The HTTP test has only one USD account. No test reconciles the newest chart point with an independently calculated account total, exercises transfers through the endpoint, or verifies persisted rate rows and duplicate/carry-forward selection.

### Updated Hypotheses

### Hypothesis 1: Backend aggregation or conversion inflates one or more balances

**Status:** Open

**Theory:** The discrepancy originates before rendering because the dashboard plots the API `netWorth` field directly.

**Supporting indicators:** Finding 2; the backend reconstructs balances and conversion (Finding 3 and Finding 4).

**Would confirm:** The latest production API point exceeds a user-scoped reconstruction from the same account and rate rows.

**Would refute:** The API returns roughly USD 35k while the dashboard tooltip shows roughly USD 55k.

**Resolution:** The frontend-only branch is substantially weakened; production API evidence remains required.

### Hypothesis 2: Inactive accounts are included by the chart but excluded from the user's current-total comparison

**Status:** Open

**Theory:** A positive historical balance on one or more inactive accounts adds to each point in the chart, while the Accounts view or the user's manual total omits those accounts.

**Supporting indicators:** Finding 3. This produces a stable additive offset and preserves the apparent trend.

**Would confirm:** A per-account production reconstruction finds about USD 20k of positive balance on inactive accounts absent from the compared current total.

**Would refute:** Every inactive account reconstructs to zero or the current total includes all inactive accounts.

**Resolution:** Pending production account-state data.

### Hypothesis 3: A blank account currency is treated as the base currency

**Status:** Open

**Theory:** The report uses `account.Currency ?? baseCurrency`; unlike other report methods, it does not fall back to `transaction.AccountCurrency`.

**Supporting indicators:** `inex.Services/Services/ReportService.cs:357`–`:359` versus `:134` and `:261`. A large balance recorded in a non-base currency could be added as USD/base currency without conversion.

**Would confirm:** A contributing account has a blank currency while its transactions identify a different currency, and its unconverted balance explains the excess.

**Would refute:** All contributing accounts have non-empty, correct currencies.

**Resolution:** Pending production account and transaction data.

### Hypothesis 4: A stale or duplicated exchange-rate row is selected for a contributing currency

**Status:** Open

**Theory:** Rate rows are inserted with `TryAdd` into a map without deterministic ordering or duplicate validation; carry-forward also has no maximum age.

**Supporting indicators:** `inex.Services/Services/ReportService.cs:316`–`:321`; `inex.Services/Services/ExchangeRateService.cs:524`–`:577`. A stale low target-per-base rate makes `balance / rate` too high, while retaining trend shape.

**Would confirm:** The latest point's rate rows contain a duplicate target/date, a long carry-forward gap, or an unexpected temporary row, and correcting it removes the excess.

**Would refute:** Each selected rate is unique, current for the report date, and financially plausible.

**Resolution:** Pending production rate rows.

### Backlog Changes

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Trace `ReportService.GetNetWorthHistory` balances, transaction signs, and rate conversion | High | Done | The source path is mapped; no frontend arithmetic or rate-direction inversion found. |
| 2 | Trace dashboard request and Recharts data transformation | High | Done | It binds API `netWorth` directly to the line. |
| 3 | Inspect tests and recent history for covered and uncovered aggregation behavior | Medium | Done | Coverage lacks a production-style reconciliation. |
| 4 | Obtain a sanitized production endpoint response plus user-scoped account totals and rates | High | Blocked | Required to distinguish the three remaining plausible mechanisms. |
| 5 | Compare per-account reconstructed balance to current account total, including status and currency | High | Open | This is the shortest route to confirm/refute Hypotheses 2 and 3. |
| 6 | Audit selected latest-point rate rows for duplicates, temporary rows, and carry-forward age | High | Open | This confirms/refutes Hypothesis 4. |

### Updated Conclusion

**Confidence:** Medium that the frontend is not the cause; low for any individual root-cause mechanism.

The source trace shows that the dashboard renders backend values without numerical modification, and that normal rate direction is correct. The remaining evidence points to a production-data or scope discrepancy: all/inactive account inclusion, a missing account currency, or stale/duplicate rate selection. Production endpoint, account, transaction, and rate evidence is required to identify which mechanism causes the roughly USD 20k difference.
