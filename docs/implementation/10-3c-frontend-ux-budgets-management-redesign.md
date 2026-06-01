# Story 10.3c: Frontend UX - Budgets Management Redesign

Status: ready-for-dev

## Story

As an invited account holder,
I want budget management to focus on month planning and burn rate,
so that monthly budget health is easy to compare.

## Acceptance Criteria

1. Given the Budgets design reference, when /budgets is rebuilt, then it includes a month switcher, burn-rate summary, copy-from-previous-month action, add budget action, budget rows, progress bars, over-budget state, and remaining/spent scan targets.
2. Given empty or filter-empty states on Budgets, when no data or no matching results are shown, then the page uses shared InEx empty-state patterns with product-specific EN/RU copy and useful primary actions.
3. Given 390px and 360px mobile viewports, when Budgets is opened with populated data, then toolbars wrap, wide controls scroll internally, rows stack cleanly, and no page-level horizontal overflow appears.
4. Given the story is complete, when npm run build, npm run lint, and visual QA run from inex/ClientApp, then all pass and screenshots cover populated, empty, and drawer-open states.

## Tasks / Subtasks

- [ ] Confirm prerequisite story outputs are available before implementation starts. (AC: 1-4)
  - [ ] Story 10.1a token/theme bridge is complete and page styles consume those tokens instead of hardcoded palette constants.
  - [ ] Story 10.1b shared primitives are complete for drawer, segmented controls, empty/filter-empty states, money/signage rendering, progress bars, and form fields.
  - [ ] Story 10.1c app shell/bottom navigation is complete so Budgets spacing and mobile safe-area behavior are implemented against the final shell.
- [ ] Rebuild /budgets as a month-planning workspace while preserving existing API and Redux contracts. (AC: 1)
- [ ] Replace table-first layout in inex/ClientApp/src/pages/Budgets.tsx with design-system composition: hero, toolbar, month switcher, list rows, inline edit, and add drawer flow. (AC: 1)
- [ ] Preserve route path, ProtectedRoute behavior, shared app shell behavior, and current data loading boundaries (budgets/categories/accounts slices). (AC: 1)
- [ ] Use existing budget report data for burn-rate/spent/remaining scan targets without changing API contracts. (AC: 1)
  - [ ] `GET /api/reports/budget/comparison?year={year}&month={month}&currency=USD` and the existing `budgetReport` Redux slice/action are in scope for this redesigned page.
  - [ ] Dispatch `fetchBudgetReport(selectedYear, selectedMonth, "USD")` alongside existing budget/category data loads and consume `state.budgetReport.items`, `metadata`, `isLoading`, and `error` for spent, remaining, percentage-used, and burn-rate summary values.
  - [ ] Do not add or alter report endpoints, DTOs, store registration, or backend behavior in this story; if the slice is not registered in the store at implementation time, block or add a separate prerequisite rather than silently duplicating report state locally.
  - [ ] If report data fails while budgets load successfully, keep the editable budget list visible and render localized unavailable/error treatment only for report-derived metrics.
- [ ] Implement burn-rate summary and budget-row scan targets (spent, remaining, percent-used, over-budget state) with tabular numerics and non-color-only cues. (AC: 1)
- [ ] Keep copy-from-previous-month action present and visually secondary to add-budget. (AC: 1)
- [ ] Implement first-use empty and filter-empty states using shared EmptyState and FilterEmpty primitives with localized copy and real actions. (AC: 2)
- [ ] Add or update translation keys in both locale files for all new user-visible Budgets copy. (AC: 2)
- [ ] Implement explicit loading and error UX for budget, report, and form submission flows. (AC: 1, 2, 4)
  - [ ] Initial load: while `budgets.isLoading` is true and no budget rows are loaded, show localized budget hero/list skeletons rather than empty-state copy.
  - [ ] Refresh load: when month changes or copy/create/update/delete triggers a refresh while existing rows remain, keep stale rows visible, show a compact localized refreshing indicator, and avoid changing the selected month unless the user explicitly selected it.
  - [ ] Failed budget load: when `budgets.error` is set and no rows are available, show a localized page error state with Retry that re-dispatches `fetchBudgets` for the active month/year.
  - [ ] Failed report load: when `budgetReport.error` is set, show a localized inline report-metrics error with Retry for `fetchBudgetReport` and keep budget editing flows usable.
  - [ ] Partial refresh failure: when stale rows remain after a budget/report refresh error, show localized inline alert/banner with Retry and keep stale data visible.
  - [ ] Drawer/form errors: add, edit, delete, and copy-from-previous-month failures must appear near the initiating controls or inside the drawer/inline edit panel, preserve entered values, and reset disabled/loading button states after failure.
  - [ ] Localization keys: add EN/RU keys under a `budgets.loading`, `budgets.error`, and `budgets.formErrors` structure (or equivalent existing namespace) for initial loading, refreshing, budget load failure, report load failure, retry, create failure, update failure, delete failure, and copy failure.
- [ ] Verify responsive behavior at 390 and 360 widths: month switcher internal horizontal scroll, wrapping controls, row stacking, no page overflow, and no bottom-nav occlusion. (AC: 3)
- [ ] Preserve existing create/update/delete/copy workflows through existing thunk actions and parseAxiosError paths. (AC: 1, 4)
- [ ] Run npm run build and npm run lint in inex/ClientApp and capture visual QA screenshots for required states. (AC: 4)

## Dev Notes

### Story Intelligence From Planning Artifacts

- Story maps to Epic 10 FR-UX-004 and contributes to FR-UX-007 visual QA obligations.
- Story sequencing requires reuse of Story 10.1a tokens, Story 10.1b shared primitives, and Story 10.1c shell/navigation behavior; no one-off page-local design system should be introduced.
- Budgets page contract in design guide emphasizes month planning, burn-rate visibility, and compact scan-first rows.

### Prerequisite Story Dependencies

This story should be implemented after:

- Story 10.1a (design tokens and theme bridge)
- Story 10.1b (shared primitives)
- Story 10.1c (app shell and navigation)

### Current State Analysis (Files Being Updated)

- inex/ClientApp/src/pages/Budgets.tsx
- Current behavior: Ant Design BasicPage + Table + DatePicker month selector + drawer create flow + expandable inline edit.
- Must preserve: selected month URL sync (year/month query params), one expanded row at a time, create/copy success and error messaging, existing Redux refresh loop based on budgets.lastUpdate.
- Current constraints: file currently contains several any usages and BasicPage-specific layout assumptions.

- inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx
- Current behavior: inline edit with update and delete actions, category multi-select via Dropdown, value/year/month fields.
- Must preserve: updateBudget and deleteBudget payload contracts and state transitions, no API shape changes.

- inex/ClientApp/src/store/budgets/budgets-actions.ts
- Current behavior: API base /budgets, supports fetch, copy, create, update, delete with setLastUpdate triggers.
- Must preserve: endpoint paths, query param naming for copy, parseAxiosError usage, loading flags.

- inex/ClientApp/src/store/budgets/budgets-slice.ts
- Current behavior: items/isLoading/isCreating/isUpdating/lastUpdate/error state contract.
- Must preserve: slice shape and action naming to avoid regressions across pages and forms.

- inex/ClientApp/public/locales/en/translation.json and inex/ClientApp/public/locales/ru/translation.json
- Current behavior: baseline budgets keys exist but redesign-specific copy keys are not present.
- Must preserve: existing keys and add only story-needed localized keys.

### Required UX Contracts For 10.3c

- Month switcher is a primary planning control and remains highly visible in toolbar.
- Hero shows burn-rate summary and should keep remaining/spent as first-class scan targets.
- Budget rows should expose percent used, over-budget state, and remaining values without relying on color alone.
- Copy-from-previous-month action remains secondary to add budget.
- Empty and filter-empty states use shared primitives and include actionable CTAs.
- Mobile behavior must pass 390 and 360 widths with no page-level horizontal overflow.

### Budget Report Data Scope

- Story 10.3c is allowed to consume the existing budget comparison report API and Redux state:
  - Backend route: `ReportBudgetController` exposes `GET /api/reports/budget/comparison`.
  - Frontend action: `fetchBudgetReport(year, month, currency = "USD")` in `inex/ClientApp/src/store/budgetReport/budgetReport-actions.ts`.
  - Frontend state: `budgetReport.items`, `budgetReport.metadata`, `budgetReport.isLoading`, `budgetReport.error`, `budgetReport.selectedYear`, and `budgetReport.selectedMonth`.
- Report data is the source of truth for `spentAmount`, `remainingAmount`, `percentageUsed`, and aggregate burn-rate indicators. Budget rows remain sourced from the existing budgets slice for editable budget identity and payload fields.
- API changes are out of scope. Do not add a new budgets endpoint or modify `BudgetComparisonDTO`/`BudgetComparisonResponse` in this story.
- If report data is unavailable, stale, or failed, the page must keep budget planning/editing usable and mark report-derived scan targets as unavailable or errored with localized copy.

### Suggested File Plan

Primary files expected to change:

- inex/ClientApp/src/pages/Budgets.tsx
- inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx
- inex/ClientApp/public/locales/en/translation.json
- inex/ClientApp/public/locales/ru/translation.json

Optional additive files recommended for maintainability:

- inex/ClientApp/src/pages/Budgets/budgets.css
- inex/ClientApp/src/pages/Budgets/BudgetsHero.tsx
- inex/ClientApp/src/pages/Budgets/BudgetsToolbar.tsx
- inex/ClientApp/src/pages/Budgets/BudgetRow.tsx
- inex/ClientApp/src/pages/Budgets/budgets.utils.ts

Files to avoid changing unless strictly required:

- inex/ClientApp/src/store/index.ts
- inex/ClientApp/src/store/accounts/*
- inex/ClientApp/src/store/categories/*
- inex/ClientApp/src/store/transactions/*
- inex/ClientApp/src/utils/apiClient.ts
- Backend projects (inex, inex.Services, inex.Data)

### Project Structure Notes

- Keep page-specific UX composition in inex/ClientApp/src/pages/Budgets and avoid cross-domain refactors.
- Keep shared behavior in existing primitives/components from Story 10.1b rather than adding duplicate local primitives.
- Keep Redux and API wiring in existing store and apiClient modules; this story is presentation and interaction redesign, not data architecture migration.

### Architecture Compliance Guardrails

- Keep frontend architecture unchanged: React 18, TypeScript strict, Redux Toolkit thunks, Ant Design, Axios apiClient, i18next.
- No RTK Query migration in this story.
- No backend endpoint or payload contract changes in this story.
- Keep all user-visible copy in EN/RU locale files.
- Avoid introducing new any in touched TypeScript files.

### Regression Guardrails

- Preserve URL month/year query behavior currently in Budgets page.
- Preserve copy budgets workflow parameters: sourceYear/sourceMonth/targetYear/targetMonth.
- Preserve updateBudget payload fields: id, key, name, description, value, categoryIds, year, month.
- Preserve delete confirmation workflow and collapse behavior.
- Preserve current loading-state and message flows.

### Testing And QA Requirements

Required commands from inex/ClientApp:

- npm run build
- npm run lint

Required screenshot states:

- Desktop populated budgets
- Mobile populated budgets (390)
- Mobile populated budgets (360)
- Empty first-use state
- Filter-empty state
- Drawer-open state

Fail conditions:

- Page-level horizontal overflow at 390 or 360
- Bottom navigation occludes final actionable content
- Over-budget state only communicated by color
- New hardcoded user-facing strings outside i18n files

### Previous Story Intelligence

From Story 10.3b and 10.3a patterns:

- Keep data contracts stable while redesigning page UX.
- Prefer additive page modules over broad cross-route refactors.
- Include explicit responsive and screenshot QA gates in the story itself.
- Reuse shared primitives established in Story 10.1b; do not recreate local variants.

### Git Intelligence Summary

Recent commits:

- 117430a story 1.5: verify frontend build artifacts are not tracked
- dde85c8 story 1.4: externalize local secret config
- cfe865c fix(accounts): include key in account update payload
- 2937892 story 1.1 owned delete not found cleanup
- cfbe606 normalize owned delete not-found handling

Implications for this story:

- Keep payload-contract discipline strict in frontend forms and thunks.
- Keep scope focused and avoid incidental infrastructure/security changes.

### Latest Tech Information (Context7)

Ant Design v5.26.2 guidance relevant to this story:

- Drawer uses open and onClose; keyboard escape behavior is enabled by default and should remain enabled.
- For outermost wrapper styling in v5, prefer rootClassName/rootStyle over panel className/style usage.
- Prefer destroyOnHidden instead of deprecated destroyOnClose when teardown behavior is needed.
- Drawer supports placement bottom for mobile-first full-width patterns and supports autoFocus after open.
- Segmented control is an available core component for scope and view toggles.

Implementation recommendation:

- If story implementation keeps Ant Design Drawer in page-level flows, align with v5 props and preserve focus/escape behavior.
- If shared Drawer primitive wraps Ant Design Drawer, verify wrapper forwards required accessibility and lifecycle props.

### Project Context Reference

- Frontend API calls must use shared apiClient.
- No hardcoded visible text; localize EN/RU.
- Mobile checks at 390 and 360 are acceptance-critical.
- Preserve established shell and protected-route patterns.

### References

- docs/planning/epics.md (Epic 10, Story 10.3c)
- docs/planning/design-update-plan.md
- docs/planning/ux-design.md
- docs/project-context.md
- docs/design/docs/design-implementation-guide.md
- docs/design/Budgets.jsx
- docs/design/EmptyState.jsx
- docs/design/responsive.css
- inex/ClientApp/src/pages/Budgets.tsx
- inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx
- inex/ClientApp/src/store/budgets/budgets-actions.ts
- inex/ClientApp/src/store/budgets/budgets-slice.ts
- inex/ClientApp/public/locales/en/translation.json
- inex/ClientApp/public/locales/ru/translation.json

## Checklist Validation

- Story template sections included: Story, Acceptance Criteria, Tasks/Subtasks, Dev Notes, References, Dev Agent Record.
- Acceptance criteria from Epic 10.3c are preserved and mapped to executable tasks.
- Current-state analysis for update-target files is documented with preserve constraints.
- UX, responsive, i18n, architecture, and non-regression guardrails are explicit.
- Previous-story and git intelligence are included.
- Latest library guidance included for Ant Design v5 drawer/segmented behavior.
- Story status set to ready-for-dev.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

### Completion Notes List

- Story context created via bmad-create-story workflow for key 10-3c-frontend-ux-budgets-management-redesign.
- Story includes implementation guardrails for preserving budgets Redux/API contracts while redesigning UX.
- Story includes explicit responsive and screenshot QA gates per Epic 10 requirements.
- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- docs/implementation/10-3c-frontend-ux-budgets-management-redesign.md
