---
title: 'Allow masters to include linked-user data in monthly PDF reports'
type: 'feature'
created: '2026-09-11'
status: 'draft'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/implementation/spec-configurable-monthly-pdf-export.md'
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** An active master-to-linked user relationship is present in the database, but a monthly PDF report can only use the master's own accounts. A master needs to choose whether to include financial information from one or more linked users in that export.

**Approach:** Keep the existing own-account PDF as the default. In the Configure dialog, let a master explicitly select active linked users; the PDF aggregates the selected linked users' active accounts together with the selected master accounts, in the master's reporting currency.

## Boundaries & Constraints

**Always:** Authorize reporting scope server-side as the requesting master plus only its active linked users; re-resolve link status at export time. Keep `accountIds` restricted to the master's active accounts and use a separate linked-user selection parameter. Load every linked user's accounts, transactions, categories, and exchange-rate coverage through that user's scope, but convert the aggregate to the master's base currency. Preserve existing period handling, selected master-account behavior, inactive-account exclusion, transfer exclusion, summary/category logic, and PDF route/download behavior.

**Ask First:** Changing the default to include linked data, persisting selection, exposing linked users' account details outside the PDF configuration, expanding this authorization to other report types, or changing the master-currency aggregation rule.

**Never:** Trust client-provided ownership or link status, let a linked user include its master, include pending/rejected/revoked/unrelated users, permit inactive accounts, add a schema change, or call external exchange-rate providers in tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default PDF | Master exports without linked-user selection | Only selected/all active master accounts contribute | Existing validation applies |
| Opt-in inclusion | Master selects an active linked user in Configure | That user's active-account transactions, balances, categories, and eligible transfers are included in the master's currency | Missing required rate returns the existing report validation failure |
| Invalid/tampered link | Supplied user is pending, revoked, unrelated, or the requester is itself linked | No foreign data is read or reported | Generic validation failure / existing ProblemDetails path |
| Account boundaries | Linked user has inactive accounts or categories with IDs/names overlapping the master | Inactive accounts stay excluded; category aggregation preserves each owner's category path | N/A |

</frozen-after-approval>

## Code Map

- `inex/Controllers/ReportsController.cs` -- monthly-PDF query binding and authenticated request handoff.
- `inex.Services/Services/Base/IReportService.cs` -- monthly report contract.
- `inex.Services/Services/ReportService.cs` -- authorization-aware multi-user data assembly, conversion, and PDF generation.
- `inex.Services/Services/Auth/AuthService.cs` and `inex/Controllers/AuthController.cs` -- existing active-link state API consumed by the report configuration.
- `inex/ClientApp/src/pages/Reports.tsx` -- Configure dialog state, export request, and linked-user opt-in controls.
- `inex/ClientApp/src/locales/en/translation.json` and `inex/ClientApp/src/locales/ru/translation.json` -- localized report and revised link-access wording.
- `inex.Services.Tests/Services/ReportServiceTests.cs` and `inex.Tests/Reports/ReportsControllerTests.cs` -- service and authenticated endpoint coverage.

## Tasks & Acceptance

**Execution:**
- [ ] `inex/Controllers/ReportsController.cs` and `inex.Services/Services/Base/IReportService.cs` -- add an optional linked-user selection to the monthly-PDF contract without changing the existing `accountIds` semantics.
- [ ] `inex.Services/Services/ReportService.cs` -- derive the permitted linked-user set from active `UserAccountLink` records, then aggregate only explicitly selected participants' active financial data in the master currency. Keep category identity owner-aware and obtain rate coverage for every included user's currencies.
- [ ] `inex/ClientApp/src/pages/Reports.tsx` -- fetch active link state for the configuration dialog, show unchecked selections only to masters with linked users, and send selected linked-user IDs only on configured export.
- [ ] `inex/ClientApp/src/locales/en/translation.json`, `inex/ClientApp/src/locales/ru/translation.json`, and affected profile copy -- add all UI text and remove any statement that incorrectly says a link grants no financial-data access.
- [ ] `inex.Services.Tests/Services/ReportServiceTests.cs` -- cover opt-in aggregation, default exclusion, authorization rejection, inactive-account exclusion, owner-distinct categories, transfer treatment, and linked-only-currency conversion without provider calls.
- [ ] `inex.Tests/Reports/ReportsControllerTests.cs` -- seed active and inactive links and prove the PDF endpoint accepts only a master's active linked-user selection.
- [ ] `inex/ClientApp` report tests or the existing visual-QA request fixture -- cover master-only rendering and the configured request shape; retain build/lint verification.

**Acceptance Criteria:**
- Given a master with an active linked user, when the master explicitly includes that user, then the monthly PDF combines eligible data in the master's base currency.
- Given the same master exports normally, when no linked user is selected, then the PDF remains limited to the master's selected/all active accounts.
- Given a tampered, inactive, or non-master request, when it names a linked user, then no foreign data appears and the request follows the existing validation-error contract.
- Given selected participants whose category IDs or names overlap, when their PDF is generated, then the totals and category paths do not collide or lose either participant's data.

## Design Notes

`accountIds` remains the master-account filter. `linkedUserIds` expresses a separate, opt-in participant scope, which avoids turning an existing own-account identifier parameter into a cross-user authorization channel. The server makes the final membership decision from active relationships, so a UI state that became stale after revocation cannot grant report access.

## Verification

**Commands:**
- `dotnet test inex.Services.Tests/ --filter FullyQualifiedName~ReportServiceTests` -- expected: report aggregation and authorization cases pass with mocked rates.
- `dotnet test inex.Tests/ --filter FullyQualifiedName~ReportsControllerTests` -- expected: authenticated PDF route enforces active master-link scope.
- `dotnet test inex.sln --no-restore` -- expected: full solution tests pass.
- `dotnet build inex.sln --no-restore` -- expected: solution builds without errors.
- `npm run build` and `npm run lint` from `inex/ClientApp` -- expected: strict frontend build and lint pass.
