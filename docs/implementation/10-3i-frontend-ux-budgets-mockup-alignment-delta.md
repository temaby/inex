# Story 10.3i: Frontend UX - Budgets Mockup Alignment Delta

Status: review

## Story

As an invited account holder,
I want the Budgets workspace to close the remaining mockup-alignment gaps after the burn-rate/detail work,
so that month planning is compact, scannable, and ready for the Epic 10 visual QA gate.

## Acceptance Criteria

1. Given `/budgets` renders inside the authenticated shell, when the page header is visible, then `Copy from March`/`Copy from {previous month}` and `Add budget` appear in the `AppShell` page-header action area with Copy secondary and Add primary; on mobile the same actions occupy full-width header action rows and are not duplicated in the list toolbar.
2. Given the Budgets hero renders with budget and report data, when the default populated state is shown, then the hero uses the mockup hierarchy only: month budget title, spent/budget rollup, progress bar with day marker, remaining/pace sentence, compact burn-rate legend, and highest-burn list; secondary metric cards are removed from the default hero or moved behind an accepted secondary detail pattern.
3. Given the list card renders, when budgets are present, then the card starts with a title/count/scope header such as `Budgets` and `{visible} of {total} budgets for {Month YYYY}`, and the month controls, search, and view/sort controls live inside that list header/toolbar.
4. Given the list controls render, when the user changes period, search, or sort, then period navigation includes previous/next icon buttons, month chips, and a jump-to-month affordance; search is a compact right-aligned control with English baseline placeholder `Search budgets...`; view/sort segmented controls support `Burn rate`, `Remaining`, `Amount`, and `Name`.
5. Given desktop budget rows render, when a user scans the list, then the desktop schema matches the mockup columns `Budget`, `Categories`, `Progress`, `Daily pace`, and `Remaining`; spent/budgeted values are folded into the Progress cell, remaining shows a signed amount plus `left/over · {currency}` sublabel, and separate `Spent`/`Budgeted` desktop columns are removed unless explicitly documented as an accepted deviation.
6. Given collapsed budget rows render, when a row has descriptions or multiple categories, then the collapsed row remains compact: the first cell shows name plus parent context only, category display uses one small tag plus `+N` or an equivalent compact treatment, and verbose description text is only shown in expanded/edit detail.
7. Given over-budget and at-limit rows render, when status is visible, then over-budget rows use the mockup-style narrow left rail and progress coloring while retaining non-color text; exact-limit rows retain the current `At limit` treatment only if the taxonomy is documented, otherwise the design taxonomy is aligned to `Severely over` before implementation.
8. Given a row is expandable, when the user scans desktop rows, then a clear right-side caret/affordance is visible and keyboard/screen-reader state remains correct through `aria-expanded`.
9. Given mobile viewports at 390px and 360px, when populated, empty, filter-empty, drawer-open, and expanded-row states are inspected, then no page-level horizontal overflow, clipped button text, overlapping hero/list controls, or bottom-nav occlusion appears.
10. Given this story is complete, when verification runs from `inex/ClientApp`, then `npm run build`, `npm run lint`, and the Budgets-focused tests/visual QA pass with no new `any` usage and all new visible copy localized in EN/RU.

## Tasks / Subtasks

- [x] Move page-level actions into the `AppShell` header contract. (AC: 1)
  - [x] Pass `extra` to `BasicPage`/`AppShell` from `Budgets.tsx` for Copy and Add.
  - [x] Remove Copy/Add from the current external `.budgets-toolbar`.
  - [x] Keep Copy disabled/loading/error behavior and Add drawer focus-return behavior intact.
  - [x] Verify mobile header actions stack full-width under the Budgets title without overlap.
- [x] Compress the hero to the mockup default hierarchy. (AC: 2, 9)
  - [x] Remove the default metric-card grid from `.budgets-hero__metrics`, or move it to a deliberate secondary detail location.
  - [x] Keep the spent/budget rollup, progress marker, remaining/pace sentence, status legend, and five-row burn list.
  - [x] Tighten hero spacing so mobile exposes the list toolbar much earlier than the current tall hero.
- [x] Recompose the Budgets list card and toolbar. (AC: 3, 4)
  - [x] Add a list title/count/scope header with localized singular/plural copy.
  - [x] Move month controls, jump picker, search, and view/sort controls into the list header/toolbar.
  - [x] Add previous/next icon buttons while preserving URL `year`/`month` synchronization and period validation.
  - [x] Add `Burn rate`, `Remaining`, `Amount`, and `Name` sort modes without changing API contracts.
- [x] Align desktop row schema and collapsed-row content. (AC: 5, 6, 8)
  - [x] Change desktop grid from seven columns to the five mockup columns.
  - [x] Fold spent/budgeted into Progress as `spent / budgeted` plus percent above the progress bar.
  - [x] Render Remaining as signed value plus `left/over · currency` sublabel.
  - [x] Hide description from collapsed rows and keep it in expanded/edit detail.
  - [x] Render category chips compactly, with one tag plus overflow count where needed.
  - [x] Add a visible expand/collapse caret button or affordance.
- [x] Align status styling, density, and card chrome. (AC: 6, 7, 9)
  - [x] Replace full-row over-budget gradient with a narrow left rail plus progress/status color.
  - [x] Keep non-color text labels for over-budget and at-limit states.
  - [x] Tighten Budgets card radius/shadow and row height toward the mockup compact card language.
  - [x] Verify row and toolbar text can wrap/shrink without layout shift.
- [x] Update localization for changed Budgets copy. (AC: 1, 3, 4, 5, 10)
  - [x] Add EN/RU keys for list count/scope, sort options, jump-to-month, previous/next month labels, compact remaining sublabels, and category overflow labels.
  - [x] Change the English search placeholder to `Search budgets...` unless the orchestrator explicitly accepts current product copy.
  - [x] Preserve existing keys used by 10.3f and avoid overwriting sibling story locale edits.
- [x] Verify and capture evidence. (AC: 9, 10)
  - [x] Run `npm run build` from `inex/ClientApp`.
  - [x] Run `npm run lint` from `inex/ClientApp`.
  - [x] Run Budgets-focused frontend tests if present, especially `budget-planning-utils` coverage after sort/status changes.
  - [x] Capture or update Budgets visual QA evidence for 1440px, 1024px, 390px, and 360px populated states.
  - [x] Capture Budgets empty, filter-empty, drawer-open, expanded-row, over-budget, exact-limit, long amount, and RU-label states.

## Dev Notes

### Scope Source

- This story is a delta after Story 10.3c and Story 10.3f, both marked `done` in `docs/implementation/sprint-status.yaml`.
- The source mismatch list is `docs/ui-audit/budgets.md`.
- The synthesized implementation flow is roadmap section `3.4 Budgets` in `docs/ui-audit/implementation-roadmap.md`.
- Do not reopen completed 10.3f work for report currency resolution, report-error handling, period control, snapshot panel, exact-limit classification, drawer focus, invalid URL normalization, or parent-category descendant spend unless this story's row/header alignment exposes a regression.

### Current State Analysis

- `inex/ClientApp/src/pages/Budgets.tsx` currently renders `<BasicPage title subtitle>` with no `extra`; Copy/Add actions are in `.budgets-toolbar` after hero content. This matches the audit's remaining header-action mismatch.
- `Budgets.tsx` already includes burn-rate hero, rollup, status legend, highest-burn list, daily pace, period picker, report loading/error treatment, and edit snapshots from 10.3f. Preserve those behaviors while reducing visual hierarchy and row schema.
- `Budgets.tsx` currently keeps secondary hero metric cards for Budgeted, Spent, Remaining, Used, and Over budget. The audit identifies these cards as a contributor to oversized hero height.
- `Budgets.tsx` currently renders a separate toolbar before the list, not a list-card title/count toolbar.
- `Budgets.tsx` currently has no `Burn rate`/`Remaining`/`Amount`/`Name` view or sort state; sorting is highest-burn only in the hero and filtered rows preserve API order.
- `Budgets.tsx` currently renders desktop list headers for Name, Categories, Progress, Daily pace, Spent, Remaining, and Budgeted. The audit target is Budget, Categories, Progress, Daily pace, Remaining.
- `Budgets.tsx` currently includes row description in collapsed rows and renders all category names as chips; the audit target is a lighter collapsed row with compact tag density.
- `inex/ClientApp/src/pages/Budgets/budgets.css` currently uses `var(--radius-3)` on hero/list cards and full-row gradients for over/at-limit status. The audit asks for tighter card chrome and narrow over-budget rail treatment.
- `inex/ClientApp/src/layouts/AppShell.tsx` and `App.tsx` now include Dashboard and `/` -> `/dashboard`; that is a cross-page shell/IA decision, not a Budgets-only implementation change.

### Likely Impacted Source Files

Primary:

- `inex/ClientApp/src/pages/Budgets.tsx`
- `inex/ClientApp/src/pages/Budgets/budgets.css`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`

Likely supporting:

- `inex/ClientApp/src/pages/Budgets/budget-planning-utils.ts`
- `inex/ClientApp/src/pages/Budgets/budget-planning-utils.test.ts`
- `inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx` only if collapsed/expanded detail ownership changes
- `inex/ClientApp/src/components/primitives/SegmentedControl.tsx` only if current primitive cannot support compact list-toolbar sort controls

Do not change unless orchestrator explicitly broadens scope:

- `inex/ClientApp/src/layouts/AppShell.tsx`
- `inex/ClientApp/src/layouts/AppShell.css`
- `inex/ClientApp/src/App.tsx`
- backend controllers/services/models
- RTK Query API endpoint contracts in `store/budgets` and `store/budgetReport`

### Dependencies

- 10.1a design tokens and Ant Design theme bridge must remain in place.
- 10.1b primitives must remain the source for `InExButton`, `SegmentedControl`, `InExDrawer`, `Num`, and empty/filter-empty patterns.
- 10.1e shared mockup-alignment contracts must remain available for labeled compact controls, 220px search, list panels, compact currency suffixes, drawer footers, desktop headers, and simple no-match rows.
- 10.1c/10.4 shell and dashboard route decisions are already present in the current source. This story should not remove Dashboard or change root routing.
- 10.3c and 10.3f implementation history must be preserved; do not edit their Dev Agent Records.
- 10.6 final visual QA is blocked until this Budgets delta and 10.5a/10.5b are complete.

### Guardrails

- Keep the story frontend-only unless a blocking regression is proven. No backend endpoint, model, migration, or report contract changes are in scope.
- Preserve authenticated API calls through existing `apiClient`/RTK Query infrastructure.
- Preserve URL query behavior for `year` and `month`, including invalid-param normalization and supported-year boundaries.
- Preserve profile/request currency behavior from 10.3f; do not force PLN in production unless the orchestrator explicitly chooses static mockup fixtures for visual parity.
- Preserve budget create/update/delete/copy payload contracts, including required `key`.
- Preserve report-error/currency-error handling that keeps budget editing usable.
- Do not add dependencies.
- Do not introduce `any` in touched TypeScript files.
- Localize all new visible text in both EN and RU.
- Coordinate locale edits with 10.5a and 10.5b agents; rebase before editing shared translation files if implementation runs in parallel.

### Verification Checklist

- [ ] `npm run build` passes from `inex/ClientApp`.
- [ ] `npm run lint` passes from `inex/ClientApp`.
- [ ] Budgets-focused tests pass, including sorting/status utility tests if added.
- [ ] Search for added `any` in touched `.ts`/`.tsx` files returns no matches.
- [ ] `/budgets?year=2026&month=4` populated desktop at 1440px shows header actions, compact hero, list title/count, list toolbar, five-column schema, and no extra Spent/Budgeted desktop columns.
- [ ] 1024px Budgets does not clip the list header, controls, rows, or long amounts.
- [ ] 390px and 360px Budgets populated states have no page-level horizontal overflow and bottom nav does not cover final content.
- [ ] Empty, filter-empty, drawer-open, expanded-row, over-budget, and exact-limit states remain usable and localized.
- [ ] RU labels and long amount values do not overflow or clip.
- [ ] Copy/Add actions remain reachable by keyboard and retain focus recovery after drawer close.

### Open Decisions

- Default implementation assumes the mockup is authoritative for Budgets page layout. If product accepts the current metric-card hero, extra columns, or external toolbar, the orchestrator should update design/planning docs before dev starts.
- The current product behavior uses the authenticated user's/profile currency for budget reports. If visual QA must instead use April 2026 PLN fixtures, that fixture policy must be made explicit in 10.6/design docs before implementation.
- Dashboard in nav and `/` -> `/dashboard` are current production behavior. This story should document them as accepted deviations, not remove them.
- The status taxonomy currently includes `At limit`; the audit/mockup references `Severely over`. Default path keeps `At limit` only with documented rationale, otherwise align taxonomy before touching row styling.
- Search placeholder default path is `Search budgets...`; keeping `Search budget or category` requires accepted-copy documentation.

### References

- `docs/ui-audit/implementation-roadmap.md` section 3.4 Budgets
- `docs/ui-audit/budgets.md`
- `docs/implementation/10-3c-frontend-ux-budgets-management-redesign.md`
- `docs/implementation/10-3c-budgets-design-implementation-gap-review.md`
- `docs/implementation/10-3f-frontend-ux-budgets-burn-rate-and-planning-detail.md`
- `docs/implementation/10-1a-frontend-ux-design-tokens-and-theme-bridge.md`
- `docs/implementation/10-1b-frontend-ux-shared-primitives.md`
- `docs/implementation/10-1e-shared-mockup-alignment-primitives-contract.md`
- `docs/implementation/10-1c-frontend-ux-app-shell-and-navigation.md`
- `docs/implementation/10-5a-frontend-ux-profile-and-settings-redesign.md`
- `docs/implementation/10-5b-frontend-ux-login-and-registration-redesign.md`
- `docs/implementation/10-6-frontend-ux-visual-qa-baseline-and-responsive-regression-checklist.md`
- `docs/implementation/sprint-status.yaml`
- `docs/planning/epics.md` Epic 10
- `docs/planning/architecture.md` Epic 10 frontend architecture addendum
- `docs/planning/ux-design.md`
- `docs/project-context.md`
- `inex/ClientApp/src/pages/Budgets.tsx`
- `inex/ClientApp/src/pages/Budgets/budgets.css`
- `inex/ClientApp/src/pages/Budgets/budget-planning-utils.ts`
- `inex/ClientApp/src/store/budgets/budgets-api.ts`
- `inex/ClientApp/src/store/budgetReport/budgetReport-api.ts`
- `inex/ClientApp/src/layouts/AppShell.tsx`
- `inex/ClientApp/src/App.tsx`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`

## Checklist Validation

- [x] Story status is `ready-for-dev`.
- [x] Story, Acceptance Criteria, Tasks/Subtasks, Dev Notes, impacted files, dependencies, guardrails, verification checklist, open decisions, and references are present.
- [x] Scope is constrained to the requested story document; shared docs and implementation files are not edited.
- [x] Completed 10.3c/10.3f Dev Agent Records are preserved by reference only.
- [x] Current source was inspected so the story distinguishes already-completed 10.3f work from unresolved audit gaps.
- [x] Acceptance criteria are testable and map to specific page behaviors.
- [x] Cross-story ownership risks are called out for shell, locale files, 10.5a, 10.5b, and 10.6.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-07: Created story from BMad create-story workflow using the Budgets audit, roadmap section 3.4, existing Epic 10 stories, sprint status, epics, architecture, UX planning, project context, and current Budgets source.
- 2026-06-07: Branch requirement satisfied on `docs/10-3i-budgets-alignment`.
- 2026-06-08: Implemented on `feature/10-3i-budgets-alignment`; preserved unrelated in-progress worktree edits from other workers and limited source edits to Budgets-owned files plus `budgets.*` locale keys.
- 2026-06-08: Added failing then passing `getSortedBudgets` coverage for `Burn rate`, `Remaining`, `Amount`, and `Name` sort modes.
- 2026-06-08: Verification passed from `inex/ClientApp`: `npm run build`, `npm run lint`, focused `npm run test -- src/pages/Budgets/budget-planning-utils.test.ts`, and full `npm run test` (18 files, 83 tests).
- 2026-06-08: Added-`any` scan over touched Budgets TypeScript diffs returned no matches.
- 2026-06-08: Browser visual QA evidence captured with `dataMode: fixture` via isolated local fixture proxy: populated 1440/1024/390/360 had no horizontal overflow; 1440 showed header Copy/Add, compact hero, list title/count, toolbar, five desktop columns, no Spent/Budgeted headers, no hero metric cards, over-budget rail, exact-limit rows, long amount row, and caret affordance.
- 2026-06-08: Browser visual QA evidence captured with `dataMode: fixture`: filter-empty 390 retained list header and no overflow; expanded-row 1440 had `aria-expanded=true`, caret state, edit detail, and no collapsed description; drawer-open 390 had no overflow; empty 390 kept full-width header actions; bottom-nav 360 left final row above fixed nav; RU-label 360 had localized labels and no overflow.

### Completion Notes List

- Story context created for unresolved Budgets mockup-alignment delta after completed 10.3c and 10.3f work.
- Shared docs were not modified by the story worker; recommended shared-doc updates were integrated by the orchestrator after story creation.
- Moved Copy/Add into `BasicPage.extra`, removed the external Budgets toolbar actions, and kept copy loading/error plus drawer focus behavior intact.
- Compressed the hero to the mockup hierarchy by removing default metric cards while retaining rollup, progress marker, remaining/pace sentence, legend, and five-row burn list.
- Rebuilt the list card header with localized count/scope copy, previous/next period buttons, month chips, jump-to-month picker, compact search, and compact sort segmented control.
- Added immutable Budgets sort modes for burn rate, remaining, amount, and name without changing API contracts.
- Aligned rows to Budget/Categories/Progress/Daily pace/Remaining, folded spent/budgeted into Progress, rendered compact category overflow, hid collapsed descriptions, added caret affordance, and changed over/at-limit styling to narrow rails with non-color text.
- Kept `At limit` taxonomy because 10.3f already established exact-limit classification and this story explicitly allowed retaining it when documented.
- Localized new Budgets copy in EN/RU only under `budgets.*`; no shared primitive changes were needed.

### File List

- `docs/implementation/10-3i-frontend-ux-budgets-mockup-alignment-delta.md`
- `docs/implementation/sprint-status.yaml`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`
- `inex/ClientApp/src/pages/Budgets.tsx`
- `inex/ClientApp/src/pages/Budgets/budget-planning-utils.test.ts`
- `inex/ClientApp/src/pages/Budgets/budget-planning-utils.ts`
- `inex/ClientApp/src/pages/Budgets/budgets.css`

### Change Log

- 2026-06-08: Completed Story 10.3i Budgets mockup-alignment delta and moved story to review.
