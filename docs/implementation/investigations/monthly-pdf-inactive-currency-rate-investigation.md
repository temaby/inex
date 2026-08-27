# Investigation: Monthly PDF Inactive Currency Rate Failure

## Hand-off Brief

1. **What happened.** A monthly PDF can return a validation failure for an inactive account's legacy currency because report balances include inactive accounts but rate synchronization excludes their currencies.
2. **Where the case stands.** Concluded with high confidence from the report, account, and rate-service paths; an existing unit test explicitly exercises the faulty inactive-account behavior.
3. **What's needed next.** Restrict monthly-report accounts to enabled accounts and add a regression test with a non-zero inactive foreign-currency balance.

## Case Info

| Field | Value |
| --- | --- |
| Ticket | GitHub #330 |
| Date opened | 2026-08-27 |
| Status | Concluded |
| System | InEx ASP.NET Core reporting service |
| Evidence sources | User error response, source code, unit tests, Git history |

## Problem Statement

The monthly PDF endpoint returned a validation failure stating that a BYR rate was unavailable although the currency was associated only with an inactive user account.

## Evidence Inventory

| Source | Status | Notes |
| --- | --- | --- |
| User error | Available | Exact unavailable-rate validation message and monthly PDF route supplied. |
| Source code | Available | Controller, monthly-report, account, and exchange-rate scopes traced. |
| Unit tests | Available | Existing test encodes unavailable rate behavior on a disabled foreign account. |
| Runtime database state | Missing | Not required: the source/test path deterministically explains the failure. |

## Timeline of Events

| Time | Event | Source | Confidence |
| --- | --- | --- | --- |
| 2026-08-27 | Monthly PDF export reports unavailable BYR rate. | User error response | Confirmed |
| 2026-08-27 | Report path and rate-target policy traced. | Source code | Confirmed |
| 2026-08-27 | Root cause assigned GitHub issue #330. | GitHub | Confirmed |

## Confirmed Findings

### Finding 1: The PDF endpoint delegates to the monthly-report conversion path

**Evidence:** `inex/Controllers/ReportsController.cs:104`, `inex.Services/Services/ReportService.cs:473`

**Detail:** PDF rendering begins only after `GetMonthlyFinancialReport` completes, so the renderer does not select or convert BYR.

### Finding 2: Account and rate scopes conflict

**Evidence:** `inex.Services/Services/ReportService.cs:366`, `inex.Services/Services/ReportService.cs:427`, `inex.Services/Services/ExchangeRateService.cs:150`

**Detail:** The report loads all user accounts and converts all of their opening/closing balances. Exchange-rate synchronization selects only enabled current-user account currencies.

### Finding 3: A disabled foreign balance reaches the unavailable-rate validation

**Evidence:** `inex.Services/Services/ReportService.cs:397`, `inex.Services.Tests/Services/ReportServiceTests.cs:216`

**Detail:** Conversion throws when its account currency has no non-zero rate. The test constructs a disabled EUR account and currently expects this exception.

## Deduced Conclusions

### Deduction 1: BYR is not requested because it is active

**Based on:** Findings 1–3

**Reasoning:** A disabled BYR account can contribute a non-zero opening or closing balance. It is included by the report but omitted from rate synchronization, so conversion cannot find a BYR rate.

**Conclusion:** The defect is an inconsistent account-scope policy, not a PDF, controller, or globally seeded-currency defect.

## Hypothesized Paths

### Hypothesis 1: Global inactive currencies are fetched by the rate service

**Status:** Refuted

**Theory:** A globally seeded legacy currency may be requested regardless of user account state.

**Supporting indicators:** Legacy BYR appears in the validation message.

**Would confirm:** A target-currency query without user/enabled predicates.

**Would refute:** A query restricted to current-user enabled accounts.

**Resolution:** `ExchangeRateService` requires matching `UserId`, `IsEnabled`, and non-base currency at `inex.Services/Services/ExchangeRateService.cs:150-154`.

## Source Code Trace

| Element | Detail |
| --- | --- |
| Error origin | `inex.Services/Services/ReportService.cs:397`, `ConvertAmount` |
| Trigger | `GET /api/reports/monthly-pdf` delegates to PDF/report creation. |
| Condition | An inactive non-base account has a non-zero balance and no mapped rate. |
| Related files | `ReportsController.cs`, `AccountService.cs`, `ExchangeRateService.cs`, `ReportServiceTests.cs` |

## Conclusion

**Confidence:** High

The report's `ActivityMode.ALL` account load conflicts with the deliberate enabled-account rate policy. Limit reportable accounts to enabled ones; do not widen provider/rate targets to inactive currencies.

## Recommended Next Steps

### Fix direction

Use `ActivityMode.ACTIVE` for the monthly report's account set and replace the regression test with a successful disabled foreign-balance case.

### Diagnostic

The focused report service tests fully cover the deterministic source path; no provider or database calls are needed.

## Reproduction Plan

1. Configure a user with USD base currency, an active USD account, and an inactive BYR account.
2. Give the BYR account a non-zero transaction before the selected month.
3. Leave BYR absent from returned rates.
4. Generate the monthly report/PDF. Before the fix it throws; after the fix it succeeds and excludes BYR.

## Side Findings

- Inactive categories remain intentionally represented in other reports and are not needed to explain this defect.
