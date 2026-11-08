---
title: 'Show family statistics in the dashboard'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_commit: 'dc1988a'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/design/docs/design-implementation-guide.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Masters can view linked users individually but cannot see combined family statistics in the dashboard.

**Approach:** Add Family to the existing dashboard workspace selector. Show master plus all active directly linked users in one read-only dashboard, using the master's base currency. Reuse the dashboard's familiar balance, cash-flow and category presentation, with a participant breakdown; keep personal and individual views intact.

## Boundaries & Constraints

**Always:** Reauthorize membership on every request. Include all active financial accounts regardless of overview visibility; label this scope. Selected month controls flows/categories; balances stay current. Preserve owner-aware categories, complete-or-unavailable aggregates, decimal arithmetic, cached-only FX, EN/RU, apiClient, accessibility and responsiveness. Family selection is transient; leaving dashboard resets to self. Support either dashboard preference without changing it.

**Ask First:** Schema changes, dependencies, category merging, persisted preferences or expansion to other family workspaces.

**Never:** Accept client ownership IDs; traverse nested links; expose pending/revoked/reverse/sibling/unrelated users; contact rate providers; fabricate transfer counterparts; add family mutations, budgets or mixed-owner ledger navigation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Family | Master with active outgoing links | Combined current balance; selected-month income, expenses, surplus and owner-separated categories; participant totals and currency | Read-only |
| Account scope | Active non-favorite and inactive accounts | Include every active account; exclude inactive accounts | Explicit scope copy |
| Conversion gap | Missing/nonpositive dated cached FX | Affected cash-flow or balance aggregate unavailable independently; never partial family sums | Localized missing-rate evidence |
| Transfers | Accepted or one-sided pending/rejected/cancelled posting | Exclude system transactions from income/expenses; balances reflect actual postings | Explain one-sided transfers |
| Lost access | Link revoked before next request | Removed participant excluded; no active outgoing links returns generic 404 and exits family | Refresh relationship context |
| Context change | Family to self/individual, month change, navigation/logout | No old values under new labels; leaving dashboard resets family and selects self | Discard obsolete results |
| Empty / period | No activity/accounts or earlier month | Valid zero/empty states; earlier month changes flows, current balance stays current | Reject invalid/future month |

</frozen-after-approval>

## Code Map

- `inex.Services/Services/ReportService.cs` — monthly aggregation foundation; PDF uses provider-capable FX and retains existing behavior.
- `inex.Services/Services/ExchangeRateService.cs` — cached-only FX source.
- `inex/ClientApp/src/pages/Dashboard/useDashboardMonth.ts` — transient month selection.

## Tasks & Acceptance

**Execution:**
- [x] `inex.Services/Models/Records/Report/FamilyStatisticsResponse.cs`, `inex.Services/Services/Base/IReportService.cs` — define totals, participants, owner-aware categories, balance date and FX completeness.
- [x] `inex.Services/Services/ReportService.cs` — add authorized, owner-scoped cached-only aggregation with cancellation; separate monthly flows from current balances; preserve PDF behavior.
- [x] `inex/Controllers/ReportsController.cs` — authenticated `GET /api/reports/family`, validated year/month only; generic 404 without active outgoing links.
- [x] `inex/ClientApp/src/store/report/report-api.ts`, `inex/ClientApp/src/model/Report/FamilyStatistics.ts` — typed query and isolated scope/month/session cache.
- [x] `inex/ClientApp/src/store/linkedAccount/linked-account-slice.ts`, `inex/ClientApp/src/layouts/AppShell.tsx`, `inex/ClientApp/src/App.tsx` — guarded Family selector; reset individual scope on entry and family on route exit/session loss/access failure.
- [x] `inex/ClientApp/src/pages/Dashboard.tsx`, `inex/ClientApp/src/pages/Dashboard/FamilyDashboard.tsx`, `inex/ClientApp/src/pages/Dashboard/family-dashboard.css` — family body using shared primitives/styles: month, balance, cash-flow, categories and participant breakdown. Mount personal queries only in personal mode; hide mutations and mixed-owner links.
- [x] `inex/ClientApp/public/locales/{en,ru}/translation.json`, `inex/ClientApp/src/i18n.ts` — localize scope, transfers and states; bump resource version.
- [x] `inex.Services.Tests/Services/FamilyStatisticsTests.cs`, `inex.Tests/Reports/ReportsControllerTests.cs` — test matrix, currencies, ownership, rounding and cached-only reads.
- [x] `inex/ClientApp/src/pages/Dashboard/FamilyDashboard.test.tsx`, `inex/ClientApp/src/layouts/AppShell.test.tsx`, `inex/ClientApp/src/store/report/__tests__/report-api.test.ts` — test scope/month switching, obsolete responses, access loss and regressions.
- [x] `inex/ClientApp/visual-qa/family-dashboard.mjs`, `inex/ClientApp/package.json` — fixture-only evidence in `docs/implementation/visual-qa/family-dashboard/` at 1440/1024/390/360px, including Russian and error states.

**Acceptance Criteria:**
- Given an authorized master, when Family opens, then participants match server-derived scope and currency is visible.
- Given a context/month change, when results render, then labels and data match with no stale scope or mutation controls.
- Given self/linked views or PDF exports, when used after delivery, then existing behavior is preserved.
- Given EN/RU at required widths, when family states render, then summaries remain accessible without clipping, overflow or navigation occlusion.

## Spec Change Log

## Design Notes

Keep family rendering separate from single-owner DashboardData. Reuse presentation primitives. Category keys retain owner/category ID; labels show path and owner. Cash-flow and balance completeness are independent. Missing FX never initiates synchronization.

## Verification

- `dotnet test inex.Services.Tests/` — focused service and authorization coverage.
- `dotnet build inex.sln`; `dotnet test inex.sln` — backend contracts and regressions.
- MySQL MCP read-only verification — validate new provider-dependent membership/source queries; EF InMemory alone is insufficient.
- `npm test -- --run FamilyDashboard AppShell report-api Dashboard`; `npm run build`; `npm run lint` — frontend scope behavior and regressions.
- `npm run visual-qa:family-dashboard`; `npm run visual-qa:verify` — fixture evidence and summary validation; inspect screenshots before review.

Planning readiness: UI doctor passed 21 checks; MySQL MCP `SELECT 1` passed. The implementation is complete; verification and review results follow.

## Implementation Verification

- Backend build: zero warnings/errors; solution tests: 396 passed, one opt-in MySQL integration test skipped.
- Frontend: 55 files / 473 tests passed; build/typecheck and lint passed.
- Family browser QA: 19 fixture scenarios passed at 1440/1024/390/360px; EN/RU screenshots inspected.
- Canonical summary verification: Family Dashboard passed; ten other summaries fail only their existing 24-hour freshness limit.
- MySQL MCP: membership query/schema and index verified read-only; no migrations or real user-data reads.
- Family QA uses port 53147 to avoid Windows reserved-port EACCES; browser required sandbox escalation.

## Review Resolution (2026-11-08)

Three independent reviewers audited the scoped feature diff. Fixed the demonstrated trailing-slash route reset, UTC/local month disagreement, and UTC-midnight date-label drift. Family month selection now follows the server UTC calendar; personal calendar behavior is preserved. Browser regressions cover America/Los_Angeles dates, Europe/Warsaw month rollover and `/dashboard/`. Historical FX reads are limited to the selected month plus today rather than all intervening dates. KEEP: server-derived ownership, independent completeness, cached-only FX and personal/PDF behavior.

Final patch verification: 161 service tests and 25 report endpoint tests passed; 157 focused frontend tests passed, including two additional UTC regressions. Frontend production build/typecheck and lint passed again. All 19 family fixture scenarios passed; western-timezone and Russian/mobile screenshots were inspected. Full suites earlier passed 396 backend tests (one opt-in MySQL integration skipped) and 473 frontend tests.

No unresolved demonstrated review findings remain. The generic canonical verifier still fails only the freshness limit of ten unrelated pre-existing summaries; the family summary passes. No remote push or deployment was performed.

## Suggested Review Order

- Read server-derived participants and cached financial aggregation.
  [ReportService.Family.cs:14](../../inex.Services/Services/ReportService.Family.cs#L14)

- Enter the read-only family API using the authenticated master.
  [ReportsController.cs:51](../../inex/Controllers/ReportsController.cs#L51)

- Switch dashboard bodies without mounting personal reads in family mode.
  [Dashboard.tsx:18](../../inex/ClientApp/src/pages/Dashboard.tsx#L18)

- Inspect current balances, monthly flows and owner-aware category rendering.
  [FamilyDashboard.tsx:22](../../inex/ClientApp/src/pages/Dashboard/FamilyDashboard.tsx#L22)

- Keep family selection transient and recover when access disappears.
  [linked-account-slice.ts:84](../../inex/ClientApp/src/store/linkedAccount/linked-account-slice.ts#L84)

- Align only family month selection with the server calendar.
  [useDashboardMonth.ts:15](../../inex/ClientApp/src/pages/Dashboard/useDashboardMonth.ts#L15)

- Check financial and isolation regressions with mocked FX.
  [FamilyStatisticsTests.cs:18](../../inex.Services.Tests/Services/FamilyStatisticsTests.cs#L18)

- Check responsive, timezone and context-switch fixture evidence.
  [family-dashboard.mjs:10](../../inex/ClientApp/visual-qa/family-dashboard.mjs#L10)
