---
title: 'Show linked-account reports in read-only mode'
type: 'feature'
created: '2026-09-20'
status: 'done'
baseline_commit: '22d02028b6df3f93883d8e902577a4e1346f2ce4'
context:
  - '{project-root}/docs/implementation/spec-linked-account-monthly-pdf-export.md'
  - '{project-root}/docs/implementation/spec-gh-400-linked-account-budgets-view.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Selecting an active linked account changes the Accounts, Categories, Transactions, and Budgets workspaces, but report reads and exports still use the authenticated master's context. That can display the wrong financial data and makes the Reports workspace inconsistent with the global selection.

**Approach:** Apply the existing directed linked-account read-scope resolver at every report boundary, pass the global linked context and linked user's base currency through report queries, and make monthly PDF view-as mode mutually exclusive with the existing multi-user aggregation mode.

## Boundaries & Constraints

**Always:** Re-resolve the active master-to-linked relationship for every delegated request; scope accounts, categories, transactions, rates, filters, active states, and base currency to exactly one readable owner; preserve report formulas, periods, rounding, transfer handling, routes, response shapes, and self-view behavior; use shared authenticated clients, existing linked-context recovery, and EN/RU localization; keep linked report surfaces visibly read-only.

**Ask First:** Any change to report formulas or serialized response contracts; any new persistence/schema; any requirement to traverse relationships owned by the selected linked user; any broad redesign beyond the existing report layout.

**Never:** Combine singular `linkedUserId` view-as with plural `linkedUserIds` aggregation; trust a client ownership field; cache authorization decisions; expose foreign data for pending, rejected, revoked, unrelated, reverse, or sibling links; call external exchange-rate providers in tests; persist the selected linked user.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Active linked view | Active directed link and selected `linkedUserId` | Category, history, net-worth, budget comparison, filters, and PDF use only the linked user's data and base currency | N/A |
| Self view | `linkedUserId` omitted | Existing report and PDF aggregation behavior is unchanged | N/A |
| Invalid or revoked link | Delegated report request without an active directed link | No foreign data is returned and the UI clears linked context | Generic 404; localized recovery notice |
| PDF view-as | Singular `linkedUserId`, optional linked-owned `accountIds` | Export is the selected user's own report; no nested links are traversed | Unavailable account IDs use existing validation path |
| Conflicting PDF modes | Singular `linkedUserId` plus non-empty plural `linkedUserIds` | Request is rejected before report generation | 422 Problem Details |

</frozen-after-approval>

## Code Map

- `inex/Controllers/ReportsController.cs` -- category, monthly history, net-worth, and monthly PDF request boundaries.
- `inex.Services/Services/Authorization/LinkedAccountReadScopeResolver.cs` -- established active directed-link authorization; reuse unchanged.
- `inex.Services/Services/ReportService.cs` -- already owner-scoped report calculations and base-currency resolution; preserve unchanged unless tests expose a gap.
- `inex/ClientApp/src/pages/Reports.tsx` -- shared report chrome, linked indicator, account filters, and PDF configuration/export.
- `inex/ClientApp/src/pages/Reports/ReportCategory.tsx` -- category/reference-data report queries.
- `inex/ClientApp/src/pages/Reports/ReportMonthlyHistory.tsx` -- history query and display currency.
- `inex/ClientApp/src/pages/Reports/ReportBudgetSpending.tsx` -- consumes the #400 linked budget-comparison contract.
- `inex/ClientApp/src/pages/Dashboard.tsx` -- sole net-worth consumer and linked report summary entry point.
- `inex/ClientApp/src/store/report/report-api.ts` -- category/history query arguments and cache identity.
- `inex/ClientApp/src/layouts/AppShell.tsx` -- linked-account selector availability for reports/dashboard.
- `inex/ClientApp/visual-qa/reports.mjs` -- responsive fixture evidence and delegated-request assertions.

## Tasks & Acceptance

**Execution:**
- [x] `inex/Controllers/ReportsController.cs` -- resolve optional `linkedUserId` for all report reads and reject mixed PDF modes at the trust boundary.
- [x] `inex.Tests/Reports/ReportsControllerTests.cs` -- cover active linked scoping, generic rejection/revocation, owner-relative PDF accounts, mode separation, and self-view regression.
- [x] `inex/ClientApp/src/store/report/report-api.ts` and focused API tests -- serialize linked scope, isolate caches, and preserve 404 recovery.
- [x] Report pages, Dashboard, and `AppShell.tsx` -- consume one global scope, linked base currency/reference data, explicit read-only indicator, #400 budget query, and safe PDF controls.
- [x] Focused component tests and EN/RU resources -- verify query args, indicator, PDF separation, self behavior, and revocation recovery.
- [x] `inex/ClientApp/visual-qa/reports.mjs` -- add linked fixtures and 1440/390 evidence for the hub and each affected report route.

**Acceptance Criteria:**
- Given an active selected linked user, when any report view or export loads, then every financial read belongs to that user and the page identifies the named read-only context.
- Given a scope switch or revoked link, when requests rerun, then stale owner data is not rendered and the application recovers to self view.
- Given linked PDF mode, when Configure or quick export runs, then only singular view-as scope and linked-owned account selections are sent; self mode retains plural aggregation.
- Given no linked selection, when existing report routes and exports run, then their contracts and behavior remain unchanged.

## Spec Change Log

## Design Notes

Keep authorization in controllers because report services already accept an owner ID and consistently scope downstream dependencies. Use the linked account's advertised base currency for category/history/budget/net-worth requests, while preserving current self-view defaults. Direct Axios requests must carry `linkedUserId` in `params` so the shared 404 interceptor can clear revoked context.

## Verification

**Commands:**
- `dotnet test inex.Services.Tests/ --filter "FullyQualifiedName~ReportServiceTests|FullyQualifiedName~BudgetReportServiceTests|FullyQualifiedName~LinkedAccountReadScopeResolverTests"` -- expected: focused service and authorization coverage passes.
- `dotnet test inex.Tests/ --filter "FullyQualifiedName~ReportsControllerTests|FullyQualifiedName~BudgetsControllerTests"` -- expected: focused API integration coverage passes.
- `npm test -- --run src/store/report/__tests__/report-api.test.ts src/store/budgetReport/__tests__/budgetReport-api.test.ts src/pages/Reports/Reports.linked-account.test.tsx` -- expected: focused linked-report tests pass.
- `npm run lint` and `npm run build` -- expected: frontend lint, type-check, and production build pass.
- `powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1 -Ui` then `npm run visual-qa:reports` -- expected: linked hub/category/budget/history captures pass at 1440px and 390px with no overflow, unhandled calls, or mixed PDF modes.

## Suggested Review Order

**Authorization and export boundary**

- Resolve every delegated report read at the authenticated controller boundary.
  [`ReportsController.cs:56`](../../inex/Controllers/ReportsController.cs#L56)

- Reject mixed PDF modes before any linked relationship can be traversed.
  [`ReportsController.cs:117`](../../inex/Controllers/ReportsController.cs#L117)

**Frontend scope and stale-data safety**

- Bind report chrome, accounts, PDF requests, and async completion to one owner scope.
  [`Reports.tsx:44`](../../inex/ClientApp/src/pages/Reports.tsx#L44)

- Clear category results during owner changes and avoid leaking linked currency globally.
  [`ReportCategory.tsx:45`](../../inex/ClientApp/src/pages/Reports/ReportCategory.tsx#L45)

- Keep history and budget results keyed to the currently requested owner.
  [`ReportMonthlyHistory.tsx:45`](../../inex/ClientApp/src/pages/Reports/ReportMonthlyHistory.tsx#L45)

- Consume #400 with linked scope while preserving self-view currency behavior.
  [`ReportBudgetSpending.tsx:23`](../../inex/ClientApp/src/pages/Reports/ReportBudgetSpending.tsx#L23)

- Scope Dashboard budget and net-worth reads to the selected linked owner.
  [`Dashboard.tsx:127`](../../inex/ClientApp/src/pages/Dashboard.tsx#L127)

**Query contracts and navigation**

- Include owner and currency in report query arguments and cache identity.
  [`report-api.ts:52`](../../inex/ClientApp/src/store/report/report-api.ts#L52)

- Expose the existing workspace selector on Reports and Dashboard routes.
  [`AppShell.tsx:79`](../../inex/ClientApp/src/layouts/AppShell.tsx#L79)

**Regression and visual evidence**

- Exercise active, invalid, revoked, owner-relative PDF, and self-view API paths.
  [`ReportsControllerTests.cs:93`](../../inex.Tests/Reports/ReportsControllerTests.cs#L93)

- Verify singular linked PDF scope remains separate from self aggregation.
  [`Reports.linked-account.test.tsx:73`](../../inex/ClientApp/src/pages/Reports/Reports.linked-account.test.tsx#L73)

- Enforce route-specific linked requests across the responsive visual matrix.
  [`reports.mjs:380`](../../inex/ClientApp/visual-qa/reports.mjs#L380)
