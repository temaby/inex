# Story 6.2: Frontend - Month Summary Cards

Status: ready-for-dev

<!-- Note: Validation is optional. Run bmad-create-story validate before dev-story. -->

## Story

As a user on the dashboard,
I want to see this month's income, expenses, and net savings at a glance,
So that I can quickly assess my financial health without running a report.

## Acceptance Criteria

1. Given the dashboard home page (from Story 4.1), When it loads, Then three summary cards are displayed: Total Income, Total Expenses, Net Savings - each showing the current month's figure in the user's base currency.

2. Given a previous month exists with transaction data, When the cards render, Then each card shows a MoM delta (e.g. +12% vs last month) with directional color coding (green for positive savings/income trend, red for negative).

3. Given no transactions exist for the current month, When the cards render, Then each card shows 0 with a neutral state - no errors or blank space.

4. Given the data is fetched from the existing reports API, When the API call is made, Then it reuses an existing endpoint - no new backend endpoint required for this story.

5. Given all card labels and delta text, When reviewed, Then all strings are in `en/translation.json` and `ru/translation.json`.

## Tasks / Subtasks

- [ ] Add month summary cards to the existing dashboard scaffold. (AC: 1, 3, 5)
  - [ ] Update the dashboard page created by Story 6.1, likely `inex/ClientApp/src/pages/Dashboard.tsx`.
  - [ ] Replace or fill the Story 6.1 month-summary placeholder with three functional cards only: Total Income, Total Expenses, and Net Savings.
  - [ ] Use existing Ant Design layout/card/statistic patterns; do not create shared card primitives or a final design-system component.
  - [ ] Keep the dashboard route and navigation behavior from Story 6.1 intact.

- [ ] Fetch the current and previous month totals through an existing reports API. (AC: 1, 2, 3, 4)
  - [ ] Reuse an existing report endpoint; do not add or modify backend endpoints.
  - [ ] Prefer `GET /api/reports/budget/comparison?year={year}&month={month}&currency={currency}` because its response metadata already exposes `totalIncome` and `totalOutcome`.
  - [ ] Fetch the current month and previous month for MoM comparison.
  - [ ] Use the shared authenticated `apiClient`; do not create a raw Axios client or `fetch` call.
  - [ ] Keep the fetch isolated to the dashboard widget so existing Reports pages and report Redux state are not reset or polluted by dashboard loading.

- [ ] Resolve and display the user's base currency. (AC: 1)
  - [ ] Derive the target currency from existing frontend/backend data, not a hardcoded `USD`.
  - [ ] `auth.user.currencyId` identifies the preferred currency but does not currently include the currency key; map it to a code through existing currency data or an existing `/api/currencies` call if needed.
  - [ ] If using already-loaded exchange-rate state as a fallback, ensure the displayed suffix and report `currency` query param match the actual base currency.
  - [ ] Document any temporary fallback in completion notes if the current frontend lacks a reliable currency-code source.

- [ ] Calculate and render MoM deltas. (AC: 2, 3, 5)
  - [ ] Total Income comes from `metadata.totalIncome`.
  - [ ] Total Expenses comes from `metadata.totalOutcome`.
  - [ ] Net Savings is `metadata.totalIncome - metadata.totalOutcome`.
  - [ ] For each card, compare current month value to the same metric from the previous month.
  - [ ] Show a localized neutral state when the previous month baseline is zero or absent, rather than rendering `Infinity`, `NaN`, blank text, or an error.
  - [ ] Apply directional color coding locally on the cards: positive income trend is positive, lower expenses are positive, and higher net savings is positive.

- [ ] Add localized dashboard summary strings. (AC: 5)
  - [ ] Add keys under a dashboard namespace such as `dashboard.summary.*` in both locale files.
  - [ ] Include labels for Total Income, Total Expenses, Net Savings, current month, previous month comparison, neutral/no-change state, loading, and error/empty states as needed.
  - [ ] Preserve existing `reports.*`, `transactions.*`, and `nav.*` keys.

- [ ] Verify frontend quality gates. (AC: 1-5)
  - [ ] From `inex/ClientApp`, run `npm run build`.
  - [ ] From `inex/ClientApp`, run `npm run lint`.
  - [ ] Manually smoke-check `/dashboard` with normal data, no current-month transactions, and a previous-month baseline where possible.
  - [ ] Confirm `/reports`, `/reports/category`, `/reports/budget`, and `/reports/history` still behave as before.

## Dev Notes

### Source Requirements

- Story 6.2 implements FR-FE-002: month summary cards on the dashboard. [Source: `docs/planning/epics.md`, Story 6.2]
- The source acceptance criteria require three current-month summary cards, MoM deltas, zero-data handling, existing reports API reuse, and EN/RU localization. [Source: `docs/planning/epics.md`, Story 6.2]
- The PRD tracks FR-FE-002 as covered by Epic 6, separate from the Epic 10 design-system rebuild. [Source: `docs/planning/prds/prd-inex-2026-05-20/prd.md`]
- The implementation readiness report marks Epic 6 ready only with story-boundary caution. Keep this story focused on functional dashboard reporting value. [Source: `docs/planning/implementation-readiness-report-2026-05-26.md`]
- The design update plan and UX index reserve final dashboard/report visual design, shell behavior, shared primitives, responsive visual QA, and chart accessibility polish for Epic 10. [Source: `docs/planning/design-update-plan.md`; `docs/planning/ux-design.md`]

### Dependencies

- Depends on Story 6.1 for the authenticated `/dashboard` route, dashboard page file, and navigation scaffold.
- Depends on the existing reports API and shared `apiClient` behavior.
- Depends on the current authenticated profile/currency data enough to render values in the user's base currency. If the frontend cannot map `auth.user.currencyId` to a currency key without an existing call, use the existing `/api/currencies` endpoint rather than adding a new backend endpoint.
- Does not depend on Story 6.3 heatmap, Story 6.4 historical net worth chart, or Story 6.5 category report fixes.
- Epic 5 exchange-rate work improves base-currency conversion reliability, but this story should not implement new exchange-rate providers or historical net-worth calculations.

### Current State Analysis

`docs/implementation/6-1-frontend-dashboard-home-page-and-navigation-restructure.md`

- Story 6.1 creates the dashboard route and placeholder regions for Epic 6 widgets.
- Story 6.2 should fill only the month-summary region and preserve route/navigation behavior from 6.1.
- If Story 6.1 implementation is not yet merged when this story starts, implement after rebasing onto 6.1 or stop and report the missing scaffold.

`inex/ClientApp/src/App.tsx`

- Before Story 6.1, protected `/` redirects to `/transactions` and no dashboard route exists.
- Story 6.2 should not change route protection, public auth routes, or Reports nested routes beyond what Story 6.1 already established.
- Existing app startup loads accounts, categories, budgets, and rates after auth session restore.

`inex/ClientApp/src/store/auth/auth-slice.ts`

- Auth state includes `user.currencyId`, but not the currency key string needed for report `currency` query parameters.
- The developer must resolve the currency code through existing currency data or an existing API call. Do not silently treat `currencyId` as a currency code.

`inex/ClientApp/src/store/report/report-actions.ts` and `report-slice.ts`

- `fetchReport(type, filter)` calls `/reports/{type}` and stores shared report-page state.
- Dashboard summary cards should avoid reusing this shared slice if doing so would overwrite Report Category state, title, currency, loading, or filters.
- Any new dashboard-specific state should be scoped to the dashboard page or dashboard-specific store module, not a shared primitive layer.

`inex/ClientApp/src/store/budgetReport/budgetReport-actions.ts` and `budgetReport-slice.ts`

- `fetchBudgetReport(year, month, currency)` calls `/reports/budget/comparison?year={year}&month={month}&currency={currency}`.
- The response metadata includes `totalIncome` and `totalOutcome`, which can satisfy the current-month income/expense inputs without backend changes.
- Existing `budgetReport` Redux state is used by `ReportBudgetSpending`. Avoid dispatching its actions from Dashboard if that causes report-page state changes or stale selected-period behavior.

`inex/Controllers/ReportBudgetController.cs`

- Existing endpoint: `GET /api/reports/budget/comparison`.
- Parameters: `year`, `month`, and optional `currency`, currently defaulting to `USD`.
- Story 6.2 must pass the user's base currency explicitly once resolved.

`inex/ClientApp/src/pages/Reports/ReportBudgetSpending.tsx`

- Already demonstrates current report metadata usage for income, expenses, savings, loading, and Ant Design `Card`/`Statistic` layout.
- Reuse its calculation semantics where appropriate, but do not move its UI into a shared card primitive.

`inex/ClientApp/src/pages/Transactions/TransactionSummary.tsx`

- Existing account-summary logic derives a base currency from loaded exchange rates and computes a month-to-date net change.
- This is useful context only; Story 6.2 must show income, expenses, and net savings from the reports API per the source AC, not from account balance summary data.

`inex/ClientApp/public/locales/en/translation.json` and `ru/translation.json`

- `reports.totalIncome`, `reports.totalExpense`, and `reports.savings` already exist.
- Add dashboard-specific labels/delta text under a dashboard namespace instead of overloading report-specific wording if the dashboard copy differs.

### Implementation Guidance

- Keep the implementation small and functional:
  - render three dashboard cards,
  - fetch current and previous month totals from an existing report endpoint,
  - compute net savings and MoM deltas in frontend code,
  - localize all visible strings.
- Use Day.js for month calculations because the app already uses it.
- Use decimal-safe display formatting at two fractional digits, matching existing frontend report display.
- Treat missing API data as zero only after the request succeeds. Loading and error states should be visible and localized, but not visually elaborate.
- Preserve current report pages. Dashboard fetches should not change `/reports/budget` selected month, `report.items`, category report filters, or history report state.
- Do not add frontend test infrastructure in this story. The current project quality gate is build plus lint.
- Do not add dependencies. Ant Design, Redux Toolkit, Axios via `apiClient`, i18next, and Day.js are already available.

### Epic 6 / Epic 10 Guardrails

- This story is Epic 6 functional dashboard/reporting scaffold work only.
- Keep scope to the month summary cards/widgets required by the source acceptance criteria.
- Do not introduce shared card primitives, money primitives, token files, theme bridge work, or final dashboard visual design.
- Do not redesign Reports hub, report drill-down chrome, shell/navigation behavior, or mobile navigation.
- Do not own responsive visual QA baseline. Basic smoke checks for the dashboard cards and route regressions are enough.
- Do not add chart accessibility polish; this story has no chart.
- Do not implement Story 6.3 heatmap, Story 6.4 historical net worth chart, or Story 6.5 category report fixes.
- Do not create Epic 10 stories or modify existing Epic 10 story files.

### Files Likely to Change

- `inex/ClientApp/src/pages/Dashboard.tsx` - add functional month summary cards to the 6.1 dashboard scaffold.
- `inex/ClientApp/public/locales/en/translation.json` - add dashboard summary labels and delta/empty/error text.
- `inex/ClientApp/public/locales/ru/translation.json` - add matching Russian dashboard summary labels and delta/empty/error text.

Files that may change only if needed:

- `inex/ClientApp/src/store/dashboard/*` - optional dashboard-specific Redux state if local component state is not enough.
- `inex/ClientApp/src/model/Report/*` - optional explicit TypeScript response type for budget comparison metadata if reusing an existing type is insufficient.

Files to avoid unless an implementation blocker requires them:

- `inex/ClientApp/src/App.tsx` and `inex/ClientApp/src/layouts/BasicPage.tsx` - Story 6.1 owns route/navigation scaffold.
- `inex/ClientApp/src/pages/Reports/**` - preserve existing Reports behavior; do not redesign report pages.
- `inex/ClientApp/src/store/report/*` and `inex/ClientApp/src/store/budgetReport/*` - avoid shared report-state side effects unless deliberately adding isolated support.
- Backend projects (`inex`, `inex.Services`, `inex.Data`) - no backend work belongs in this story.
- `inex/ClientApp/package.json` and `package-lock.json` - no dependency changes.
- `docs/implementation/10-*.md` - Epic 10 story files are out of scope.

### Testing Requirements

- Required commands from `inex/ClientApp`:
  - `npm run build`
  - `npm run lint`
- Manual smoke checks:
  - `/dashboard` renders three summary cards after auth.
  - Current-month income, expenses, and net savings display in the user's base currency.
  - Previous-month data produces finite localized MoM deltas.
  - No current-month transactions produces zero values with neutral state.
  - Existing Reports routes still render and keep their own state behavior: `/reports`, `/reports/category`, `/reports/budget`, `/reports/history`.
- No backend tests are required because this story must not change backend behavior.

### References

- `docs/planning/epics.md` - Epic 6 Story 6.2 source of record.
- `docs/planning/prds/prd-inex-2026-05-20/prd.md` - FR-FE-002 and frontend roadmap context.
- `docs/planning/sprint-change-proposal-2026-05-26.md` - Epic 6 report-integrity and scope-boundary guardrails.
- `docs/planning/implementation-readiness-report-2026-05-26.md` - Epic 6 ready with story-boundary caution.
- `docs/planning/design-update-plan.md` - Epic 10 design sequencing and scope boundaries.
- `docs/planning/ux-design.md` - UX source index; final design-system details are not Story 6.2 implementation scope.
- `docs/planning/architecture.md` - frontend stack, route, i18n, and Epic 10 boundary guidance.
- `docs/project-context.md` - frontend `apiClient`, Redux, i18n, build/lint, and no-new-dependency rules.
- `docs/implementation/6-1-frontend-dashboard-home-page-and-navigation-restructure.md` - required dashboard scaffold dependency.
- `inex/ClientApp/src/App.tsx` - current route tree and startup data loading.
- `inex/ClientApp/src/store/auth/auth-slice.ts` - current profile currency state.
- `inex/ClientApp/src/store/budgetReport/budgetReport-actions.ts` - existing budget comparison endpoint call pattern.
- `inex/Controllers/ReportBudgetController.cs` - existing reports API endpoint available for reuse.
- `inex/ClientApp/src/pages/Reports/ReportBudgetSpending.tsx` - existing report metadata and summary-card rendering pattern.
- `inex/ClientApp/public/locales/en/translation.json` and `ru/translation.json` - locale baseline.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

- Story context created via bmad-create-story workflow for key `6-2-frontend-month-summary-cards`.
- Story status set to `ready-for-dev`.
- Story intentionally limits scope to functional month summary cards on the dashboard scaffold before Epic 10.
- Sprint status was not updated because this orchestration run was constrained to create exactly one story file.

### File List

- docs/implementation/6-2-frontend-month-summary-cards.md
