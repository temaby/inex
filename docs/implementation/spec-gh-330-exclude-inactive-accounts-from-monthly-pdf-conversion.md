---
title: 'Exclude Inactive Accounts from Monthly PDF Conversion'
type: 'bugfix'
created: '2026-08-27'
status: 'done'
baseline_commit: '178421881d417301b85f405ba0a43ae09888aa8e'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/operations/exchange-rate-cache-repair.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The monthly PDF report can fail with HTTP 422 when an inactive foreign-currency account has a historical balance but no rate for its legacy currency. The report converts that account while exchange-rate synchronization intentionally ignores inactive account currencies.

**Approach:** Make the monthly report's account scope match the rate service's enabled-account scope. Generate the report only from the authenticated user's enabled accounts, while retaining historical inactive categories that occur on those reportable transactions.

## Boundaries & Constraints

**Always:** Keep every service call scoped to the authenticated user; preserve the report endpoint, PDF format, response status behavior for genuinely missing active-account rates, decimal conversion semantics, and the exchange-rate service's enabled-account target policy.

**Ask First:** Changing whether inactive-account history appears in monthly reports, changing category activity semantics, or synchronizing rates for legacy/inactive currencies.

**Never:** Fetch legacy rates simply to support inactive accounts, change the API contract or PDF layout, modify external provider behavior, add dependencies, or touch unrelated report types.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Inactive legacy balance | Inactive BYR account has a non-zero pre-period balance; BYR rate is unavailable | PDF generation succeeds; BYR balance and transactions are excluded | No BYR rate lookup or 422 |
| Active foreign account | Enabled EUR account has reportable balance/transactions and a valid EUR rate | PDF includes converted EUR values | Existing conversion remains unchanged |
| Missing active rate | Enabled foreign account requires a missing/zero rate | Existing validation failure remains | Return the established validation error |

</frozen-after-approval>

## Code Map

- `inex.Services/Services/ReportService.cs` -- assembles monthly report balances, transactions, and rate conversions.
- `inex.Services/Services/AccountService.cs` -- defines `ActivityMode.ACTIVE` versus `ActivityMode.ALL` account scope.
- `inex.Services/Services/ExchangeRateService.cs` -- synchronizes only current-user enabled account currencies.
- `inex.Services.Tests/Services/ReportServiceTests.cs` -- unit coverage for monthly report/PDF behavior and service invocation scope.

## Tasks & Acceptance

**Execution:**
- [x] `inex.Services/Services/ReportService.cs` -- load enabled accounts for the monthly report before filtering transactions and computing opening/closing balances -- aligns report inputs with available rate targets.
- [x] `inex.Services.Tests/Services/ReportServiceTests.cs` -- replace the test that codifies a disabled-account rate failure with a regression proving a historical inactive foreign balance does not block the report; update the user-ID/mode expectation -- prevents the BYR path returning.
- [x] `inex.Services.Tests/Services/ReportServiceTests.cs` -- extend PDF coverage or assert report generation succeeds for the same inactive-account fixture -- validates the user-facing export path.

**Acceptance Criteria:**
- Given an inactive BYR account has a non-zero historical balance and no BYR rate exists, when its user downloads the selected month's PDF, then the report succeeds without converting or requesting BYR.
- Given active base- and foreign-currency accounts have reportable data, when the PDF is generated, then their values remain included and use the existing conversion behavior.
- Given report data is loaded for a user, when account scope changes to active accounts, then category, transaction, and rate paths remain called with that same user ID.

## Spec Change Log

## Design Notes

The report must not widen the rate service to inactive currencies. Its account set is the source of both the balance aggregation and the eligible transaction set; selecting `ActivityMode.ACTIVE` once therefore prevents both direct inactive transactions and historical inactive-account balances from entering conversion.

## Verification

**Commands:**
- `dotnet test inex.Services.Tests/ --filter FullyQualifiedName~ReportServiceTests` -- expected: all report-service tests pass.
- `dotnet test inex.Services.Tests/` -- expected: service unit suite passes.
- `dotnet build inex.sln` -- expected: solution builds without errors.

## Suggested Review Order

**Report input scope**

- Restricts monthly transactions and balances to accounts whose currencies receive synchronized rates.
  [`ReportService.cs:366`](../../inex.Services/Services/ReportService.cs#L366)

**Behavioral regression coverage**

- Retains unavailable-rate validation for enabled foreign-currency accounts.
  [`ReportServiceTests.cs:216`](../../inex.Services.Tests/Services/ReportServiceTests.cs#L216)

- Proves inactive BYR history is excluded while inactive categories on active accounts remain included.
  [`ReportServiceTests.cs:281`](../../inex.Services.Tests/Services/ReportServiceTests.cs#L281)

- Makes the unit-test account fixture honor the production active-account query.
  [`ReportServiceTests.cs:600`](../../inex.Services.Tests/Services/ReportServiceTests.cs#L600)
