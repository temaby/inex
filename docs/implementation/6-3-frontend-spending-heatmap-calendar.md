# Story 6.3: Backend + Frontend - Spending Heatmap Calendar

Status: done

<!-- Note: Validation is optional. Run bmad-create-story validate before dev-story. -->

## Story

As a user wanting to understand my spending patterns,
I want a GitHub-style daily spend heatmap on the Reports page,
So that I can see at a glance which days I spend the most.

## Acceptance Criteria

1. Given an authenticated user requests the spending heatmap report for the last 12 months, When the backend report API runs, Then it returns one daily spend total per date in the user's base currency, including zero-spend dates.

2. Given transactions exist across accounts with different currencies, When the backend calculates daily totals, Then it uses stored historical exchange rates and range-capable backend rate logic for each transaction date, and does not rely on the frontend single-date exchange-rate API.

3. Given the Reports section, When a user navigates to the heatmap view, Then a calendar grid is displayed showing the last 12 months, with each day cell colored by spend intensity (darker = higher spend).

4. Given a day with no transactions, When it renders in the grid, Then the cell shows the lowest intensity color - not blank or broken.

5. Given a day with transactions, When the user hovers over or taps the cell, Then a tooltip shows the date and backend-returned total spend amount in the user's base currency.

6. Given the heatmap is built using the `recharts` library already in the project, When `npm run build` completes, Then no new charting dependencies are added.

7. Given all labels and tooltip text, When reviewed, Then all strings are in `en/translation.json` and `ru/translation.json`.

## Tasks / Subtasks

- [x] Add backend heatmap response models and service contract. (AC: 1, 2)
  - [x] Add report response records under `inex.Services/Models/Records/Report/`, likely `SpendingHeatmapDayResponse` and metadata if needed.
  - [x] Add `GetSpendingHeatmap(...)` to `inex.Services/Services/Base/IReportService.cs`.
  - [x] Keep the response focused on date, total spend in base currency, base currency code, and range metadata needed by the frontend.

- [x] Implement backend daily spend aggregation in the report service. (AC: 1, 2, 4, 5)
  - [x] Update `inex.Services/Services/ReportService.cs` to fetch the requested date range, authenticated user's base currency, accounts, categories, transactions, and stored historical rates.
  - [x] Aggregate only expense transactions into daily totals; treat negative amounts as spend with `Math.Abs(amount)` and exclude income and system transfer rows.
  - [x] Convert non-base account currencies using stored historical rates for each transaction date through existing range-capable backend exchange-rate logic.
  - [x] Return explicit zero-total rows for every date in the range so the frontend does not infer missing days.
  - [x] Do not modify Story 6.5 category report behavior while adding heatmap logic.

- [x] Add the authenticated backend API endpoint and API tests. (AC: 1, 2)
  - [x] Update `inex/Controllers/ReportsController.cs` with a likely route such as `GET /api/reports/spending-heatmap?start=YYYY-MM-DD&end=YYYY-MM-DD`.
  - [x] Scope data by `CurrentUserId`; do not accept client-supplied user IDs.
  - [x] Add service tests in `inex.Services.Tests/Services/ReportServiceTests.cs` or a focused report test file for zero-fill days, expense-only aggregation, transfer exclusion, and historical conversion.
  - [x] Add controller/API coverage if an existing controller test pattern exists; otherwise document the gap in the Dev Agent Record during implementation.

- [x] Add the heatmap view to the existing Reports route surface. (AC: 3, 7)
  - [x] Add a protected nested Reports route for the heatmap, likely `/reports/heatmap`.
  - [x] Add a heatmap row to `ReportList` using the current table/list launch pattern.
  - [x] Add the heatmap route title to `Reports.tsx` without changing existing category, budget, or history report routes.
  - [x] Keep the Reports top-level navigation separation established by Story 6.1.

- [x] Render the backend-returned daily values as a functional Recharts heatmap. (AC: 3, 4, 5, 6)
  - [x] Create a new Reports page component, likely `inex/ClientApp/src/pages/Reports/ReportSpendingHeatmap.tsx`.
  - [x] Fetch the backend heatmap report through existing authenticated `apiClient`; do not create a raw Axios client or `fetch` call.
  - [x] Render one cell per backend-returned date for the last 12 months, including zero-spend days.
  - [x] Use existing Ant Design layout/tooltip patterns and the existing `recharts` library; do not add a new charting or calendar dependency.
  - [x] Use a small fixed intensity scale so zero-spend days always render with the lowest visible intensity.
  - [x] Format tooltip amounts using the backend-returned base currency and current report formatting conventions where possible.

- [x] Add localized heatmap copy. (AC: 7)
  - [x] Add keys under `reports.heatmap*` or another stable Reports namespace in both EN and RU locale files.
  - [x] Include labels for the Reports list row, route title, legend, zero-spend state, loading/error state, and tooltip date/spend text.
  - [x] Preserve existing `reports.categoryReport`, `reports.budgetReport`, `reports.historyReport`, `nav.*`, and dashboard keys from Stories 6.1 and 6.2.

- [x] Verify backend and frontend quality gates. (AC: 1-7)
  - [x] From the repository root, run `dotnet build`.
  - [x] From the repository root, run `dotnet test`.
  - [x] From `inex/ClientApp`, run `npm run build`.
  - [x] From `inex/ClientApp`, run `npm run lint`.
  - [x] Manually smoke-check `/reports/heatmap` with spend data, no-spend days, and mixed account currencies where available.
  - [x] Confirm `/reports`, `/reports/category`, `/reports/budget`, `/reports/history`, and `/dashboard` still behave as before.

## Dev Notes

### Source Requirements

- Story 6.3 implements FR-FE-004: spending heatmap calendar, a GitHub-style daily spend grid on Reports. [Source: `docs/planning/epics.md`, Story 6.3]
- The source acceptance criteria require the last 12 months, spend-intensity cell coloring, a nonblank zero-spend state, hover/tap tooltip with date and base-currency spend, Recharts reuse with no new charting dependency, and EN/RU localization. [Source: `docs/planning/epics.md`, Story 6.3]
- The resolved implementation blocker changes Story 6.3 from frontend-only to backend + frontend: historical rates are stored in the database, so daily base-currency totals must be prepared by a backend report/service/API path using stored historical rates and range-capable backend logic.
- The sprint change proposal and readiness report allow Epic 6 dashboard/reporting work to proceed only when Story 6.5 remains separate and Epic 10 scope does not leak into functional stories. [Source: `docs/planning/sprint-change-proposal-2026-05-26.md`; `docs/planning/implementation-readiness-report-2026-05-26.md`]
- `ux-design.md` and `design-update-plan.md` reserve final Reports hub, dashboard visual design, shell/navigation behavior, shared primitives, responsive visual QA baseline, and chart accessibility polish for Epic 10. Use them only as boundary context for this story.

### Dependencies

- Depends on Story 6.1 for the functional dashboard route/navigation scaffold and clear separation between Dashboard and Reports.
- Does not depend on Story 6.2 month summary cards or Story 6.4 historical net worth chart.
- Does not depend on Story 6.5 implementation, and must not change category report backend behavior.
- Depends on existing authenticated report architecture, `ReportService`, `ReportsController`, stored exchange rates, range-capable `IExchangeRateService.Get(userId, start, end, baseCurrency, ct)`, React Router 6, Ant Design, shared `apiClient`, i18next, Day.js, and Recharts.

### Current State Analysis

`docs/planning/epics.md`

- Story 6.3 remains a Reports spending heatmap with the same user-facing goal.
- The epics source labels Story 6.3 as frontend, but the resolved blocker requires backend ownership of historical base-currency aggregation while preserving the source user outcome.
- Story 6.4 historical net worth and Story 6.5 category report fixes stay out of scope.

`inex.Services/Services/ReportService.cs`

- Existing report logic already uses `IExchangeRateService.Get(userId, start, end, currency, ct)` and stored rates for report conversion.
- Add heatmap aggregation here or in a narrow helper owned by report services; do not move category report behavior.

`inex/Controllers/ReportsController.cs`

- Existing authenticated report endpoints are under `api/reports`.
- Add a heatmap endpoint beside category and monthly history, scoped by `CurrentUserId`.

`inex/ClientApp/src/pages/Reports.tsx` and `ReportList.tsx`

- Reports already has nested route titles and a table/list launch pattern.
- Add the heatmap route and list row without redesigning the Reports hub or drill-down chrome.

### Implementation Guidance

- Backend returns authoritative daily totals in the user's base currency; frontend renders returned values and should not perform historical currency conversion.
- Prefer inclusive date ranges normalized to dates. The default frontend request should cover today and the prior 12-month window.
- The backend should return zero rows for missing dates so frontend rendering is deterministic.
- Loading and error states should be present and localized, but visually simple.
- Avoid shared Redux state changes if the heatmap data is not reused elsewhere.
- Do not add dependencies. Existing .NET services plus React, Ant Design, Recharts, Day.js, i18next, Redux Toolkit, and `apiClient` are enough.

### Epic 6 / Epic 10 Guardrails

- This story is Epic 6 functional reporting work only.
- Keep scope to the functional spending heatmap calendar required by the source acceptance criteria.
- Do not redesign the Reports hub, report drill-down chrome, app shell, desktop navigation, or mobile navigation.
- Do not introduce final dashboard/report visual design, design tokens, theme bridge, shared primitives, money primitives, or an accessibility summary system.
- Do not own the responsive visual QA baseline. Basic smoke checks for the heatmap route and existing Reports routes are enough.
- Do not add chart accessibility polish beyond functional labels and tooltip text required by the source acceptance criteria.
- Do not implement Story 6.2 month cards, Story 6.4 historical net worth chart, or Story 6.5 category report fixes.
- Do not create Epic 10 stories or modify existing Epic 10 story files.

### Files Likely to Change

Backend:

- `inex.Services/Models/Records/Report/SpendingHeatmapDayResponse.cs` - new daily heatmap response model.
- `inex.Services/Services/Base/IReportService.cs` - add heatmap service contract.
- `inex.Services/Services/ReportService.cs` - add daily aggregation and historical conversion.
- `inex/Controllers/ReportsController.cs` - add authenticated heatmap report endpoint.
- `inex.Services.Tests/Services/ReportServiceTests.cs` or a focused report test file - backend service tests for aggregation and conversion.

Frontend:

- `inex/ClientApp/src/App.tsx` - register the nested `/reports/heatmap` route.
- `inex/ClientApp/src/pages/Reports.tsx` - add heatmap route title mapping.
- `inex/ClientApp/src/pages/Reports/ReportList.tsx` - add heatmap launch row.
- `inex/ClientApp/src/pages/Reports/ReportSpendingHeatmap.tsx` - new heatmap page component.
- `inex/ClientApp/public/locales/en/translation.json` - add heatmap labels, legend, tooltip, loading/error text.
- `inex/ClientApp/public/locales/ru/translation.json` - add matching Russian heatmap labels.

Files to avoid unless an implementation blocker requires them:

- `inex/ClientApp/src/pages/Reports/ReportCategory.tsx`, `ReportBudgetSpending.tsx`, and `ReportMonthlyHistory.tsx` - preserve existing reports.
- `inex/ClientApp/src/layouts/BasicPage.tsx` - Story 6.1 owns minimal navigation scaffold; Epic 10 owns shell/navigation redesign.
- `inex/ClientApp/package.json` and `package-lock.json` - no dependency changes.
- `docs/implementation/6-4-backend-frontend-historical-net-worth-chart.md` and `docs/implementation/6-5-backend-fix-category-report-data-gaps-and-localization.md` - adjacent story scopes stay separate.
- `docs/implementation/10-*.md` - Epic 10 story files are out of scope.

### Testing Requirements

- Backend tests:
  - Service tests cover daily zero-fill rows, expense-only aggregation, system transfer exclusion, same-currency totals, and mixed-currency historical conversion.
  - API/controller coverage should verify the heatmap endpoint is authenticated, scoped to `CurrentUserId`, and returns the expected response shape if an existing controller test pattern is available.
- Required commands:
  - From the repository root: `dotnet build`
  - From the repository root: `dotnet test`
  - From `inex/ClientApp`: `npm run build`
  - From `inex/ClientApp`: `npm run lint`
- Manual smoke checks:
  - `/reports` lists the heatmap view alongside category, budget, and history reports.
  - `/reports/heatmap` renders a last-12-month grid with one visible cell per day.
  - Zero-spend days render with the lowest intensity state, not blank cells.
  - Hover and tap interaction shows localized date and spend amount in the user's base currency.
  - Existing routes still render: `/reports`, `/reports/category`, `/reports/budget`, `/reports/history`, and `/dashboard`.

### References

- `docs/planning/epics.md` - Epic 6 Story 6.3 source of record.
- `docs/planning/prds/prd-inex-2026-05-20/prd.md` - FR-FE-004 and frontend core UX roadmap context.
- `docs/planning/sprint-change-proposal-2026-05-26.md` - Epic 6 report-integrity and scope-boundary guardrails.
- `docs/planning/implementation-readiness-report-2026-05-26.md` - Epic 6 ready with story-boundary caution.
- `docs/planning/design-update-plan.md` - Epic 10 design sequencing and scope boundaries.
- `docs/planning/ux-design.md` - UX source index; final design-system details are not Story 6.3 implementation scope.
- `docs/planning/architecture.md` - frontend stack, route, i18n, and Epic 10 boundary guidance.
- `docs/project-context.md` - frontend `apiClient`, Redux, i18n, build/lint, no-new-dependency, and ownership rules.
- `docs/implementation/6-1-frontend-dashboard-home-page-and-navigation-restructure.md` - required dashboard/report navigation scaffold dependency.
- `docs/implementation/6-2-frontend-month-summary-cards.md` - adjacent dashboard widget scope to avoid.
- `docs/implementation/6-4-backend-frontend-historical-net-worth-chart.md` - adjacent net worth scope to avoid.
- `docs/implementation/6-5-backend-fix-category-report-data-gaps-and-localization.md` - separate report-correctness scope to avoid.

## Change Log

- 2026-06-01: Corrected Story 6.3 scope from frontend-only to backend + frontend after resolving the historical-rate blocker. Backend report/API now owns daily base-currency heatmap totals using stored historical rates; frontend renders the returned values.
- 2026-06-01: Implemented backend heatmap report/API, frontend Reports heatmap route, EN/RU localization, and backend service/API coverage.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `dotnet test inex.Services.Tests\inex.Services.Tests.csproj --no-restore` red phase: failed on missing `GetSpendingHeatmap` contract before implementation.
- `dotnet test inex.Services.Tests\inex.Services.Tests.csproj --no-restore` green phase: 61 passed.
- `dotnet test inex.Tests\inex.Tests.csproj --no-restore` API coverage: 92 passed.
- `dotnet build`: succeeded with 25 existing XML-doc warnings for older controller `ct` parameters and 0 errors; the new heatmap action has a `ct` param tag.
- `dotnet test`: succeeded with 61 service tests and 92 integration tests passed.
- `npm run build`: succeeded after sandbox escalation for Node parent-path access; existing Vite large chunk warning remains.
- `npm run lint`: succeeded after sandbox escalation for Node parent-path access.
- Headless Chrome authenticated smoke with mocked API responses rendered `/reports/heatmap` with a mocked authenticated session, EUR heatmap data including zero-spend and spend days, route title, date range, legend, and 733 SVG heatmap nodes.
- Vite route checks returned HTTP 200 for `/reports`, `/reports/category`, `/reports/budget`, `/reports/history`, `/reports/heatmap`, and `/dashboard`.
- Re-review fix: `dotnet test inex.Services.Tests\inex.Services.Tests.csproj --no-restore --filter FullyQualifiedName~ReportServiceTests` passed with 7 ReportService tests, including end-date non-midnight heatmap coverage.
- Re-review fix: `dotnet test inex.Tests\inex.Tests.csproj --no-restore --filter FullyQualifiedName~ReportsControllerTests` passed with 2 Reports API tests.
- Re-review fix: `dotnet test` passed with 62 service tests and 92 integration tests.

### Completion Notes List

- Story context originally created via bmad-create-story workflow for key `6-3-frontend-spending-heatmap-calendar`.
- Story status remains `ready-for-dev`.
- Scope corrected before implementation: backend report/service/API work is required for historical base-currency daily totals; frontend single-date exchange-rate API usage is explicitly out.
- Story remains limited to a functional Reports heatmap before Epic 10.
- Story 6.4 net worth and Story 6.5 category report fixes remain out of scope.
- Added `GET /api/reports/spending-heatmap` scoped to `CurrentUserId`; it resolves the user's base currency server-side and returns explicit daily rows for the inclusive range.
- Heatmap aggregation uses existing range-capable backend exchange-rate service logic and stored rates; the frontend does not call the single-date exchange-rate route.
- Added service tests for zero-fill days, expense-only aggregation, system transfer exclusion, and mixed-currency historical conversion.
- Added API tests for authentication and response shape.
- Added `/reports/heatmap` with a Recharts scatter-cell calendar grid, visible zero-spend cells, localized tooltip text, and EN/RU copy.
- Authenticated heatmap browser smoke was completed through headless Chrome with mocked authenticated API responses because no local app/database session was available; real backend data paths remain covered by service and integration API tests.
- Re-review fix completed: heatmap transaction fetch now passes an end-of-day filter value so transactions on the inclusive end date after midnight are included without changing global transaction filter semantics.
- Added regression coverage for an expense transaction on the heatmap end date at a non-midnight time.

### File List

- docs/implementation/6-3-frontend-spending-heatmap-calendar.md
- docs/implementation/sprint-status.yaml
- inex.Services/Models/Records/Report/SpendingHeatmapDayResponse.cs
- inex.Services/Services/Base/IReportService.cs
- inex.Services/Services/ReportService.cs
- inex.Services.Tests/Services/ReportServiceTests.cs
- inex/Controllers/ReportsController.cs
- inex.Tests/Reports/ReportsControllerTests.cs
- inex/inex.xml
- inex/ClientApp/src/App.tsx
- inex/ClientApp/src/pages/Reports.tsx
- inex/ClientApp/src/pages/Reports/ReportList.tsx
- inex/ClientApp/src/pages/Reports/ReportSpendingHeatmap.tsx
- inex/ClientApp/public/locales/en/translation.json
- inex/ClientApp/public/locales/ru/translation.json
