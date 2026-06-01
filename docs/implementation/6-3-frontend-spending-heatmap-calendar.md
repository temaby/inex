# Story 6.3: Frontend - Spending Heatmap Calendar

Status: ready-for-dev

<!-- Note: Validation is optional. Run bmad-create-story validate before dev-story. -->

## Story

As a user wanting to understand my spending patterns,
I want a GitHub-style daily spend heatmap on the Reports page,
So that I can see at a glance which days I spend the most.

## Acceptance Criteria

1. Given the Reports section, When a user navigates to the heatmap view, Then a calendar grid is displayed showing the last 12 months, with each day cell colored by spend intensity (darker = higher spend).

2. Given a day with no transactions, When it renders in the grid, Then the cell shows the lowest intensity color - not blank or broken.

3. Given a day with transactions, When the user hovers over or taps the cell, Then a tooltip shows the date and total spend amount in the user's base currency.

4. Given the heatmap is built using the `recharts` library (already in the project), When `npm run build` completes, Then no new charting dependencies are added.

5. Given all labels and tooltip text, When reviewed, Then all strings are in `en/translation.json` and `ru/translation.json`.

## Tasks / Subtasks

- [ ] Add the heatmap view to the existing Reports route surface. (AC: 1, 5)
  - [ ] Add a protected nested Reports route for the heatmap, likely `/reports/heatmap`.
  - [ ] Add a heatmap row to `ReportList` using the current table/list launch pattern.
  - [ ] Add the heatmap route title to `Reports.tsx` without changing existing category, budget, or history report routes.
  - [ ] Keep the Reports top-level navigation separation established by Story 6.1.

- [ ] Build a functional last-12-month daily spend grid. (AC: 1, 2, 4)
  - [ ] Create a new Reports page component, likely `inex/ClientApp/src/pages/Reports/ReportSpendingHeatmap.tsx`.
  - [ ] Render one cell per day for the last 12 months, including zero-spend days.
  - [ ] Use deterministic date boundaries from Day.js: include today and the prior 12-month window, normalized to local display dates.
  - [ ] Use existing Ant Design layout/tooltip patterns and the existing `recharts` library where the heatmap visualization is rendered; do not add a new charting or calendar dependency.
  - [ ] Use a small fixed intensity scale so zero-spend days always render with the lowest visible intensity.

- [ ] Source and aggregate spending data without backend scope. (AC: 1, 3)
  - [ ] Reuse existing authenticated API access through `apiClient`; do not create a raw Axios client or `fetch` call.
  - [ ] Prefer the existing typed transaction list API, `GET /api/transactions`, with `mode=all`, `startDate`, `endDate`, `pageSize`, and `page`.
  - [ ] Page through results using response pagination metadata until all transactions in the 12-month range are loaded; do not rely on a single arbitrary page size if total items exceed the first page.
  - [ ] Aggregate only expense transactions into daily totals. Treat negative amounts as spend using `Math.abs(amount)`; exclude income and neutral transfer rows from spend totals.
  - [ ] Preserve user ownership by relying on the backend-authenticated transactions endpoint. Do not add client-supplied user IDs.

- [ ] Display tooltip values in the user's base currency. (AC: 3, 5)
  - [ ] Derive the user's base currency through existing frontend state/API patterns; do not hardcode `USD`.
  - [ ] Use each transaction's `accountCurrency` and available exchange-rate data to convert totals when the account currency differs from the base currency.
  - [ ] If exact historical per-day base-currency conversion cannot be satisfied through existing APIs without a backend change or excessive per-day calls, stop and report the gap instead of adding a backend endpoint in this frontend story.
  - [ ] Format tooltip amounts with localized labels and stable two-decimal display, matching current report conventions where possible.

- [ ] Add localized heatmap copy. (AC: 5)
  - [ ] Add keys under `reports.heatmap*` or another stable Reports namespace in both EN and RU locale files.
  - [ ] Include labels for the Reports list row, route title, legend, zero-spend state, loading/error state, and tooltip date/spend text.
  - [ ] Preserve existing `reports.categoryReport`, `reports.budgetReport`, `reports.historyReport`, `nav.*`, and dashboard keys from Stories 6.1 and 6.2.

- [ ] Verify frontend quality gates. (AC: 1-5)
  - [ ] From `inex/ClientApp`, run `npm run build`.
  - [ ] From `inex/ClientApp`, run `npm run lint`.
  - [ ] Manually smoke-check `/reports/heatmap` with spend data, no-spend days, and mixed account currencies where available.
  - [ ] Confirm `/reports`, `/reports/category`, `/reports/budget`, `/reports/history`, and `/dashboard` still behave as before.

## Dev Notes

### Source Requirements

- Story 6.3 implements FR-FE-004: spending heatmap calendar, a GitHub-style daily spend grid on Reports. [Source: `docs/planning/epics.md`, Story 6.3]
- The source acceptance criteria require the last 12 months, spend-intensity cell coloring, a nonblank zero-spend state, hover/tap tooltip with date and base-currency spend, Recharts reuse with no new charting dependency, and EN/RU localization. [Source: `docs/planning/epics.md`, Story 6.3]
- The PRD tracks FR-FE-004 under frontend core UX, not under the final design-system rebuild. [Source: `docs/planning/prds/prd-inex-2026-05-20/prd.md`]
- The sprint change proposal and readiness report allow Epic 6 dashboard/reporting work to proceed only when Story 6.5 remains separate and Epic 10 scope does not leak into functional stories. [Source: `docs/planning/sprint-change-proposal-2026-05-26.md`; `docs/planning/implementation-readiness-report-2026-05-26.md`]
- `ux-design.md` and `design-update-plan.md` reserve final Reports hub, dashboard visual design, shell/navigation behavior, shared primitives, responsive visual QA baseline, and chart accessibility polish for Epic 10. Use them only as boundary context for this story. [Source: `docs/planning/ux-design.md`; `docs/planning/design-update-plan.md`]

### Dependencies

- Depends on Story 6.1 for the functional dashboard route/navigation scaffold and clear separation between Dashboard and Reports.
- Does not depend on Story 6.2 month summary cards or Story 6.4 historical net worth chart.
- Does not depend on Story 6.5 implementation, and must not change category report backend behavior.
- Depends on existing authenticated transaction/report frontend architecture: React Router 6, Ant Design, Redux Toolkit, shared `apiClient`, i18next, Day.js, and Recharts.
- Depends on existing data being sufficient to compute daily spend totals in the user's base currency. If existing APIs cannot supply accurate base-currency conversion for historical daily spend, this story must surface that as a planning/API gap rather than adding backend work.

### Current State Analysis

`docs/implementation/6-1-frontend-dashboard-home-page-and-navigation-restructure.md`

- Story 6.1 creates the `/dashboard` route and separates Dashboard from Reports.
- Story 6.3 should preserve that route/navigation scaffold and add only the heatmap report view.
- If Story 6.1 implementation is not present when this story starts, implement after rebasing onto 6.1 or stop and report the missing scaffold.

`inex/ClientApp/src/App.tsx`

- Current protected routes include `/transactions`, `/accounts`, `/categories`, `/budgets`, `/profile`, and nested `/reports` routes.
- Current Reports nested routes are `category`, `budget`, and `history`; no heatmap route exists yet.
- Add the heatmap as a nested Reports route. Do not alter public `/login` and `/register`, `ProtectedRoute`, or existing report route paths.

`inex/ClientApp/src/pages/Reports.tsx`

- Reports wraps nested report pages in `BasicPage`, derives a title from `location.pathname`, and shows a Back button on drill-down routes.
- Add a heatmap title mapping and preserve the current Back button behavior.
- Do not rebuild Reports hub chrome, report cards, Share/Export/Print placement, or drill-down layout.

`inex/ClientApp/src/pages/Reports/ReportList.tsx`

- The Reports index is currently an Ant Design `Table` with rows for category, budget, and history reports.
- Add a heatmap row using the same launch pattern. Do not replace the table with Epic 10 report cards.

`inex/ClientApp/src/pages/Reports/ReportMonthlyHistory.tsx`

- Existing chart usage already imports Recharts components and renders inside `ResponsiveContainer`.
- The heatmap visualization must use the existing `recharts` library to satisfy source AC 4, while still avoiding any new charting or calendar dependency.
- This file hardcodes some currency formatting assumptions today; do not copy hardcoded currency behavior into the heatmap.

`inex/ClientApp/src/store/transactions/transactions-actions.ts`

- `fetchTransactions` calls `GET /api/transactions` with typed query params: `mode`, `pageSize`, `page`, `accountId`, `categoryId`, `tag`, `ref`, `startDate`, and `endDate`.
- The shared transactions slice is used by the Transactions page. Avoid dispatching `fetchTransactions` from the heatmap if it would overwrite the user's transaction-list state, pagination, or filters.
- Prefer a heatmap-local API helper or page-local loader through `apiClient` if reusing the shared slice would cause cross-page state side effects.

`inex/Controllers/TransactionsController.cs`

- `GET /api/transactions` is authenticated and scoped by `CurrentUserId`.
- The endpoint returns paginated data with metadata, so the heatmap must page through the range if it needs all 12-month transactions.
- The typed date filters are `startDate` and `endDate`. Do not use the legacy report filter DSL for this story unless an existing report endpoint is intentionally reused for a narrow reason.

`inex.Services/Models/Records/Transaction/TransactionResponse.cs`

- Transaction responses include `AccountCurrency`.
- Tags and refs are derived from comments on read and are irrelevant for the heatmap.
- The story needs only date, amount, account currency, and enough transaction/category information to identify expenses and exclude transfers. If the response shape is insufficient, report the gap instead of changing backend contracts in this frontend story.

`inex/ClientApp/public/locales/en/translation.json` and `ru/translation.json`

- `reports` already contains category, budget, history, amount, income, expense, savings, and related report labels.
- Add heatmap-specific keys in both files and preserve existing keys.

### Implementation Guidance

- Keep the implementation small and additive:
  - add a Reports heatmap route,
  - add a Reports list entry,
  - fetch existing transaction data for the last 12 months,
  - aggregate expense totals per day,
  - render the heatmap and localized tooltips.
- Use existing Day.js and report date conventions. Avoid adding date/calendar libraries.
- Use a fixed-size intensity scale based on the maximum daily spend in the loaded period. Handle all-zero data with a stable neutral scale.
- Tooltip content should include a localized date and total spend amount in the user's base currency.
- Loading and error states should be present and localized, but visually simple.
- Avoid shared Redux state changes if the heatmap data is not reused elsewhere.
- Do not add frontend test infrastructure in this story. The current frontend gate is build plus lint.
- Do not add dependencies. Existing React, Ant Design, Recharts, Day.js, i18next, Redux Toolkit, and `apiClient` are enough for the functional scaffold.

### Epic 6 / Epic 10 Guardrails

- This story is Epic 6 functional reporting scaffold work only.
- Keep scope to the functional spending heatmap calendar required by the source acceptance criteria.
- Do not redesign the Reports hub, report drill-down chrome, app shell, desktop navigation, or mobile navigation.
- Do not introduce final dashboard/report visual design, design tokens, theme bridge, shared primitives, money primitives, or an accessibility summary system.
- Do not own the responsive visual QA baseline. Basic smoke checks for the heatmap route and existing Reports routes are enough.
- Do not add chart accessibility polish beyond functional labels and tooltip text required by the source acceptance criteria.
- Do not implement Story 6.2 month cards, Story 6.4 historical net worth chart, or Story 6.5 category report fixes.
- Do not create Epic 10 stories or modify existing Epic 10 story files.

### Files Likely to Change

- `inex/ClientApp/src/App.tsx` - register the nested `/reports/heatmap` route.
- `inex/ClientApp/src/pages/Reports.tsx` - add heatmap route title mapping.
- `inex/ClientApp/src/pages/Reports/ReportList.tsx` - add heatmap launch row.
- `inex/ClientApp/src/pages/Reports/ReportSpendingHeatmap.tsx` - new heatmap page component.
- `inex/ClientApp/public/locales/en/translation.json` - add heatmap labels, legend, tooltip, loading/error text.
- `inex/ClientApp/public/locales/ru/translation.json` - add matching Russian heatmap labels.

Files that may change only if needed:

- `inex/ClientApp/src/model/Transaction/*` - optional explicit transaction response type if current typed models are insufficient.
- `inex/ClientApp/src/store/dashboard/*` or `src/store/reports/*` - only if page-local state is insufficient; avoid shared primitive or broad report-state refactors.

Files to avoid unless an implementation blocker requires them:

- Backend projects (`inex`, `inex.Services`, `inex.Data`) - this is a frontend story and must not add a backend endpoint or change backend contracts.
- `inex/ClientApp/src/pages/Dashboard.tsx` - dashboard widgets are not owned by this Reports heatmap story unless Story 6.1 explicitly left a nonfunctional heatmap placeholder that needs a link-only update.
- `inex/ClientApp/src/pages/Reports/ReportCategory.tsx`, `ReportBudgetSpending.tsx`, and `ReportMonthlyHistory.tsx` - preserve existing reports.
- `inex/ClientApp/src/layouts/BasicPage.tsx` - Story 6.1 owns minimal navigation scaffold; Epic 10 owns shell/navigation redesign.
- `inex/ClientApp/package.json` and `package-lock.json` - no dependency changes.
- `docs/implementation/10-*.md` - Epic 10 story files are out of scope.

### Testing Requirements

- Required commands from `inex/ClientApp`:
  - `npm run build`
  - `npm run lint`
- Manual smoke checks:
  - `/reports` lists the heatmap view alongside category, budget, and history reports.
  - `/reports/heatmap` renders a last-12-month grid with one visible cell per day.
  - Zero-spend days render with the lowest intensity state, not blank cells.
  - Hover and tap interaction shows localized date and spend amount in the user's base currency.
  - Mixed spend amounts produce visible intensity differences without adding a new charting dependency.
  - Existing routes still render: `/reports`, `/reports/category`, `/reports/budget`, `/reports/history`, and `/dashboard`.
- No backend tests are required because this story must not change backend behavior.

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
- `docs/implementation/6-5-backend-fix-category-report-data-gaps-and-localization.md` - separate report-correctness scope to avoid.
- `inex/ClientApp/src/App.tsx` - current route tree and Reports nested routes.
- `inex/ClientApp/src/pages/Reports.tsx` - current Reports wrapper, title mapping, and Back button.
- `inex/ClientApp/src/pages/Reports/ReportList.tsx` - current Reports launch list.
- `inex/ClientApp/src/store/transactions/transactions-actions.ts` - existing transaction API query pattern.
- `inex/Controllers/TransactionsController.cs` - authenticated typed transaction list endpoint.
- `inex.Services/Models/Records/Transaction/TransactionResponse.cs` - transaction response fields relevant to aggregation.
- `inex/ClientApp/public/locales/en/translation.json` and `ru/translation.json` - locale baseline.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

- Story context created via bmad-create-story workflow for key `6-3-frontend-spending-heatmap-calendar`.
- Story status set to `ready-for-dev`.
- Story intentionally limits scope to a functional Reports heatmap before Epic 10.
- Sprint status was not updated because this orchestration run was constrained to create exactly one story file.

### File List

- docs/implementation/6-3-frontend-spending-heatmap-calendar.md
