# Story 10.3f: Frontend UX - Budgets Burn-Rate And Planning Detail Completion

Status: review

## Story

As an invited account holder,
I want Budgets to finish the burn-rate, row planning, and edit-flow details found in the design gap review,
so that monthly budget health is accurate, actionable, and not shaped by backend-only form fields.

## Acceptance Criteria

1. Given `/budgets` loads budget and comparison report data, when the hero and rows render, then they use one explicit report/display currency source, do not derive currency from `accounts[0]`, and render all budget/report amounts consistently from that source.
2. Given report data is loading, unavailable, or failed while budgets are editable, when `/budgets` renders, then report-derived hero values and row scan targets show localized loading, unavailable, or retry/error treatment while budget-derived values remain visible and editable.
3. Given the selected month has budget and spending data, when the hero renders, then it includes spent-vs-budget rollup, remaining amount, current-day marker, pace verdict, burn-rate legend, and highest-burn budget list.
4. Given populated budget rows render, when a user scans desktop or mobile rows, then each row shows parent category context, category tags, spent, remaining, budgeted, percent used, daily pace, and pace delta without relying on color alone; exact-limit budgets are not classified as over budget unless spent is greater than budget.
5. Given the user creates or edits a budget, when the form renders, then separate year/month technical inputs are replaced by one localized period control while preserving the existing API payload, visible `key` handling is either justified or removed through a real contract, and the expanded edit panel shows a localized budget/spent/remaining/daily-average snapshot where report data exists.
6. Given the user opens the add drawer or inline edit on mobile, when keyboard, Escape, close, scroll, and focus-return behavior is tested, then the shared drawer contract still passes at 390px and 360px.
7. Given the story is complete, when `npm run build`, `npm run lint`, and visual QA run from `inex/ClientApp`, then all pass and screenshots cover burn-rate hero, highest-burn list, exact-limit and over-budget rows, report-error state, period control, drawer-open, expanded edit snapshot, empty, filter-empty, 1440px, 1024px, 390px, and 360px states.

## Tasks / Subtasks

- [x] Fix report semantics and failure treatment. (AC: 1, 2)
  - [x] Replace first-account currency derivation with one explicit source of truth.
  - [x] Use report metadata or the accepted base-currency source consistently across hero and rows.
  - [x] Gate report-derived hero and row values on loading/error/unavailable state.
  - [x] Keep budget-derived fields visible and editable when report data fails.
- [x] Rebuild the burn-rate hero to match the planning contract. (AC: 3)
  - [x] Add spent-vs-budget rollup, remaining, current-day marker, pace verdict, and burn-rate legend.
  - [x] Add highest-burn list sorted by percent used or accepted burn priority.
  - [x] Localize pace and legend copy in EN/RU.
- [x] Finish row planning details. (AC: 4)
  - [x] Add parent category context and daily pace metrics.
  - [x] Add or clarify budgeted column/header treatment.
  - [x] Treat exact-limit as at-limit or neutral, not over-budget.
  - [x] Preserve mobile scan labels and no-overflow behavior.
- [x] Clean up add/edit form UX. (AC: 5, 6)
  - [x] Replace separate year/month inputs with one localized period control while submitting existing `year` and `month` payload fields.
  - [x] Decide and document whether visible `key` remains required because of backend contract constraints.
  - [x] Add inline edit snapshot metrics where report data exists.
  - [x] Re-test drawer and focus behavior on mobile.
- [x] Validate build, lint, i18n, and visual QA. (AC: 7)
  - [x] Add EN/RU keys for new hero, row, period, snapshot, error, and at-limit copy.
  - [x] Run `npm run build`.
  - [x] Run `npm run lint`.
  - [x] Capture required visual QA screenshots.

### Review Findings

- [x] [Review][Patch] Keep cached report metrics visible through failed refetches while surfacing retry/error treatment separately. [`inex/ClientApp/src/pages/Budgets/budget-planning-utils.ts`]
- [x] [Review][Patch] Keep categoryless budgets scannable with safe zero-spend report metrics instead of unavailable rows. [`inex/ClientApp/src/pages/Budgets/budget-planning-utils.ts`]
- [x] [Review][Patch] Delete budgets against the original record period and invalidate the original list when edits move a budget to another period. [`inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx`]
- [x] [Review][Patch] Bump the locale resource version so newly added budget locale keys are not hidden by cached translation JSON. [`inex/ClientApp/src/i18n.ts`]
- [x] [Post-Merge Review][Patch] Derive report/display currency from the authenticated user's profile currency through the existing currencies contract instead of a hardcoded USD request. [`inex/ClientApp/src/pages/Budgets.tsx`, `inex/ClientApp/src/pages/Budgets/budget-planning-utils.ts`]
- [x] [Post-Merge Review][Patch] Use `currentData` for selected-month budget and report rendering so prior-month query data cannot appear under a newly selected month. [`inex/ClientApp/src/pages/Budgets.tsx`]
- [x] [Post-Merge Review][Patch] Clamp the shared drawer to the viewport and refresh Budgets drawer-open 390px/360px visual QA evidence. [`inex/ClientApp/src/components/primitives/InExDrawer.tsx`, `docs/implementation/visual-qa/10-3f/`]
- [x] [Post-Merge Review][Patch] Skip the budget report query until profile currency resolution completes so the page never sends an initial hardcoded USD report request for non-USD users. [`inex/ClientApp/src/pages/Budgets.tsx`]
- [x] [Post-Merge Review][Patch] Treat future budget months as zero elapsed days, completed months as zero remaining days, and disable unsupported period years in create/edit pickers. [`inex/ClientApp/src/pages/Budgets.tsx`, `inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx`, `inex/ClientApp/src/pages/Budgets/budget-planning-utils.ts`]
- [x] [Post-Merge Review][Patch] Hide edit snapshot metrics after the edited period no longer matches the selected report month. [`inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx`]
- [x] [Post-Merge Review][Patch] Return focus to the Add budget trigger after Escape and Cancel drawer close paths and document interaction QA evidence. [`inex/ClientApp/src/pages/Budgets.tsx`, `docs/implementation/visual-qa/10-3f/qa-summary.json`]
- [x] [Post-Merge Review][Patch] Keep budget report queries skipped when profile currency lookup fails or does not contain the user's currency instead of falling back to USD. [`inex/ClientApp/src/pages/Budgets.tsx`, `inex/ClientApp/src/pages/Budgets/budget-planning-utils.ts`]
- [x] [Post-Merge Review][Patch] Display the resolved profile/request currency rather than report metadata when rendering budget amounts. [`inex/ClientApp/src/pages/Budgets.tsx`]
- [x] [Post-Merge Review][Patch] Keep categorized budgets scannable with zero-spend metrics when the report has no matching category item. [`inex/ClientApp/src/pages/Budgets/budget-planning-utils.ts`]
- [x] [Post-Merge Review][Patch] Collapse budget rows before tablet widths can clip the seven-column grid. [`inex/ClientApp/src/pages/Budgets/budgets.css`]

## Dev Notes

### Source Gap Review

- Primary source: `docs/implementation/10-3c-budgets-design-implementation-gap-review.md`.
- Story 10.3c remains the base redesign story; this follow-up remediates accepted residuals from that review.
- First-use empty and filter-empty source-of-truth decisions should be resolved inside this story only where they affect implemented UI; otherwise record owner-visible rationale.

### Expected Files

- `inex/ClientApp/src/pages/Budgets.tsx`
- `inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx`
- `inex/ClientApp/src/pages/Budgets/budgets.css`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`

### Guardrails

- Do not add or change budget/report backend endpoints in this story.
- Preserve existing budget create/update/delete/copy payload contracts.
- Preserve URL month/year query behavior.
- Do not replace shared drawer or progress primitives; verify them in the Budgets context.
- Coordinate locale-file edits with Stories 10.3d, 10.3e, 10.5a, and 10.5b.

## References

- `docs/planning/epics.md`
- `docs/implementation/10-3c-frontend-ux-budgets-management-redesign.md`
- `docs/implementation/10-3c-budgets-design-implementation-gap-review.md`
- `docs/design/Budgets.jsx`
- `docs/design/EmptyState.jsx`
- `docs/design/docs/design-implementation-guide.md`
- `docs/implementation/visual-qa/10-3c/`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex with BMad dev-story Worker C (Budgets) and integrated BMad code-review layers.

### Debug Log References

- 2026-06-05: Story created from BMad design-gap review and dedicated subagent synthesis.
- 2026-06-05: `npm run build` passed from `inex/ClientApp` after Windows sandbox `spawn EPERM` rerun with escalation.
- 2026-06-05: `npm run lint` passed from `inex/ClientApp`.
- 2026-06-05: `npm run test` passed from `inex/ClientApp` with 12 files and 50 tests.
- 2026-06-05: Targeted visual QA refreshed in `docs/implementation/visual-qa/10-3f/qa-summary.json`; no horizontal overflow in populated hero, highest-burn list, report-error, drawer-open, expanded edit, empty, filter-empty, 1440px, 1024px, 390px, and 360px states.
- 2026-06-05: BMad integrated code review completed; actionable Budgets findings fixed and mixed-currency contract gap deferred.
- 2026-06-05: Post-merge BMad review found hardcoded USD report currency, stale selected-month query data risk, and mobile drawer evidence issues; fixes were applied with focused Vitest and refreshed drawer QA.
- 2026-06-05: Second post-merge BMad review found the report query still sent an initial USD request before currencies loaded, future/past month pace boundaries were off by one, unsupported period years were selectable, edit snapshots could become stale after period edits, and Budgets drawer focus return lacked evidence; fixes were applied and verified with focused Vitest and route smoke.
- 2026-06-05: Browser route smoke with the existing API contracts confirmed `/budgets` requested `currency=PLN` with no USD report request, had no 390px/360px overflow, and returned focus to `Add budget` after Escape and Cancel; evidence recorded in `docs/implementation/visual-qa/10-3f/qa-summary.json`.
- 2026-06-05: Third post-merge BMad review found currency lookup failure could still trigger USD fallback, display currency could prefer mismatched metadata, categorized budgets with no report item showed unavailable metrics, and 769-969px budget rows could clip; fixes were applied with focused Vitest and CSS updates.
- 2026-06-05: Round-3 route smoke confirmed `/budgets` requests `currency=PLN`, ignores mismatched USD report metadata for display, skips report requests when `/currencies` fails, collapses rows at 969px/900px, and restores Add budget focus after Escape/Cancel; evidence recorded in `docs/implementation/visual-qa/10-3f/qa-summary.json`.

### Completion Notes List

- Replaced first-account currency derivation with explicit budget report currency handling and report metadata display.
- Added report loading/error/unavailable states while keeping editable budget values visible.
- Rebuilt burn-rate hero with spent-vs-budget rollup, remaining, current-day marker, pace verdict, legend, and highest-burn list.
- Added row parent context, category tags, spent/remaining/budgeted scan targets, percent used, daily pace, pace delta, and exact-limit status.
- Replaced separate year/month fields with a single period picker in create/edit flows while preserving API payloads; kept visible `key` because the backend create/update contract requires it.
- Added inline edit snapshot metrics, EN/RU locale copy, tests, and visual QA evidence for required states.
- Follow-up derives the report/display currency from the authenticated user's currency, uses month-scoped `currentData`, clamps the shared drawer, and refreshes Budgets drawer-open visual QA at 390px and 360px.
- Second follow-up skips report fetching until profile currency resolution, corrects planning-period pace math, guards unsupported period years, hides stale edit snapshots, and verifies drawer Escape/Cancel focus return.
- Browser screenshot refresh was attempted after the second follow-up, but the in-app browser process could not write PNG files to the workspace (`EPERM`); interaction evidence is recorded in the QA summary JSON.
- Third follow-up removes the final USD fallback path, aligns display currency to the profile/request currency, keeps categorized no-spend budgets scannable, and collapses rows at tablet widths.
- Budgets QA summary now includes round-3 PLN display, currency-failure, tablet-collapse, and drawer focus-return smoke evidence.

### File List

- `inex/ClientApp/src/pages/Budgets.tsx`
- `inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx`
- `inex/ClientApp/src/pages/Budgets/budgets.css`
- `inex/ClientApp/src/pages/Budgets/budget-planning-utils.ts`
- `inex/ClientApp/src/pages/Budgets/budget-planning-utils.test.ts`
- `inex/ClientApp/src/components/primitives/InExDrawer.tsx`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`
- `inex/ClientApp/src/i18n.ts`
- `docs/implementation/visual-qa/10-3f/`

### Change Log

- 2026-06-05: Created ready-for-dev follow-up story.
- 2026-06-05: Implemented Budgets burn-rate and planning detail completion, review fixes, tests, locale updates, and refreshed visual QA evidence.
- 2026-06-05: Applied post-merge report currency, selected-month current-data, shared drawer viewport, and Budgets drawer visual QA fixes.
- 2026-06-05: Applied second post-merge report query gating, pace boundary, period picker, edit snapshot, and drawer focus-return fixes with focused utility tests and route smoke.
- 2026-06-05: Applied third post-merge currency fallback, display currency, zero-spend categorized budget, and tablet row layout fixes with focused utility tests.
- 2026-06-05: Added round-3 Budgets route-smoke evidence for PLN display, currency failure, tablet row collapse, and drawer focus return.
