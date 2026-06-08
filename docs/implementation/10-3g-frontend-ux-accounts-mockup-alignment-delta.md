# Story 10.3g: Frontend UX - Accounts Mockup Alignment Delta

Status: review

## Story

As an invited account holder,
I want the Accounts workspace to resolve the remaining Accounts mockup audit mismatches,
so that the page reads like the approved dense management mockup while preserving the completed 10.3a and 10.3d production fixes.

## Scope

This story covers the unresolved Accounts page-local deltas from the external Accounts audit and roadmap section 3.2. It must not reopen completed 10.3a/10.3d work unless the current source still conflicts with the audit.

In scope:

- Accounts copy, toolbar labels, search placeholder, list headers, inventory count semantics, hero delta copy, duplicate-description suppression, group density/punctuation, mobile density verification, and controlled visual checks.
- Accounts source and locale updates needed to support those changes.
- Local documentation inside this story's Dev Agent Record after implementation.

Out of scope:

- Shared authenticated shell decisions for Dashboard navigation, sign-out placement, route model, and global locale/fixture policy unless the orchestrator explicitly expands this story.
- Backend/API contract changes, new account balance fields, new fixtures, or new routes.
- Edits to `docs/planning/epics.md`, `docs/implementation/sprint-status.yaml`, 10.5a, 10.5b, or 10.6. Recommended shared-doc edits are listed at the end of this story for the orchestrator.

## Acceptance Criteria

1. Given `/accounts` renders in the English visual baseline, when the page header and inventory panel are inspected, then the page title remains `Accounts`, the inventory/list panel title is aligned to the mockup decision (`Accounts` if the mockup is authoritative), and the search placeholder is `Search accounts...` in EN with matching RU localization.
2. Given the Accounts toolbar renders, when status and view segmented controls appear, then each control has a visible compact label (`STATUS` and `VIEW` in the English baseline) without breaking keyboard access, mobile wrapping, or existing segmented-control behavior.
3. Given Accounts rows render on desktop in grouped and flat modes, when the inventory list is visible, then a desktop-only header row labels `ACCOUNT`, `CURRENCY`, `SHARE`, and `BALANCE`; mobile keeps the compact stacked row layout without horizontal overflow.
4. Given active-only scope is selected, when inventory count text renders, then the denominator is scoped to the selected status set, not the all-account total. Search may reduce the visible numerator, but the active-only summary must not display an all-account denominator such as `17 / 37` unless the product explicitly accepts that deviation.
5. Given net-worth hero data is complete enough to calculate a trustworthy comparison, when the hero delta renders, then it includes signed absolute base-currency movement, percent movement, and localized comparison-period helper text. If the current API data cannot support that claim, the hero must render a localized unavailable state instead of a partial percent-only MoM string.
6. Given an account row has `description` equal to `name` after trimming/case normalization, when the row renders and search runs, then the duplicate description is suppressed visually without removing the account from search results.
7. Given grouped mode renders currency sections, when group headers are visible, then punctuation, padding, and density are tightened toward the audit mockup while preserving the current collapse/expand accessibility affordance from Story 10.3d unless the product explicitly removes that interaction.
8. Given 390px and 360px mobile viewports, when populated grouped/flat Accounts rows, filter-empty, first-use empty, drawer-open, and expanded-row states are inspected, then no page-level horizontal overflow, clipped text, excessive row-card height, or bottom-nav occlusion appears.
9. Given loading, load-error, partial-error, first-use empty, filter-empty, drawer-open, and expanded-row states are not all visible in normal live data, when QA is run, then controlled fixtures or network interception are used to verify each state before the story is marked review-ready.
10. Given the story is complete, when frontend verification runs from `inex/ClientApp`, then `npm run build`, `npm run lint`, and existing Accounts-focused tests pass with no new `any` usage in touched TypeScript files.

## Tasks / Subtasks

- [x] Confirm starting state and protect completed story history. (AC: 1-10)
  - [x] Read this story, `10-3a-frontend-ux-accounts-management-redesign.md`, and `10-3d-frontend-ux-accounts-design-gap-remediation.md` before editing.
  - [x] Do not edit old Dev Agent Records in completed/review stories.
  - [x] Check `git status --short` before editing and preserve unrelated agent/user changes.
- [x] Align Accounts copy and toolbar controls to the audit baseline. (AC: 1, 2)
  - [x] Change `accounts.workspaceTitle` and related list title rendering to match the accepted mockup wording.
  - [x] Change `accounts.searchPlaceholder` to `Search accounts...` in EN and add matching RU copy.
  - [x] Add visible toolbar labels for the scope and view segmented controls.
  - [x] Prefer a local compact label wrapper unless extending `SegmentedControl` is clearly reusable and does not disrupt Categories/Budgets.
- [x] Add desktop inventory headers without damaging mobile rows. (AC: 3)
  - [x] Add a desktop-only header row above grouped and flat rows: `ACCOUNT`, `CURRENCY`, `SHARE`, `BALANCE`.
  - [x] Keep the header hidden or visually replaced by stacked labels on mobile.
  - [x] Ensure the header grid aligns with `.accounts-row` desktop columns.
- [x] Fix inventory denominator semantics. (AC: 4)
  - [x] Derive `visible` from searched accounts and `total` from the selected scope, not from all accounts.
  - [x] Keep the all-account count available only in all-scope copy or explicit secondary context.
  - [x] Add/update EN/RU keys so the count reads naturally in active and all scopes.
- [x] Resolve hero delta truthfulness and copy. (AC: 5)
  - [x] Audit whether `AccountSummary.thisMonthNet` plus current total can support the mockup's previous-month comparison claim.
  - [x] If trustworthy, render signed base-currency delta, percent, and comparison helper text using existing `Num` and localized copy.
  - [x] If not trustworthy, show `MoM delta unavailable` or equivalent localized copy; do not show percent-only copy that implies unavailable data is complete.
- [x] Suppress duplicate descriptions while preserving search. (AC: 6)
  - [x] Add a small helper that treats blank descriptions and descriptions equal to account name as absent for display.
  - [x] Keep search matching both `name` and raw `description`, including duplicate descriptions, so filtering behavior does not unexpectedly narrow.
- [x] Tighten group and mobile density against the audit target. (AC: 7, 8)
  - [x] Adjust group header punctuation toward compact `CURRENCY - n accounts` style while keeping current base equivalent/share values from Story 10.3d.
  - [x] Reduce padding only where screenshots show excess height; do not remove readable tap targets or focus outlines.
  - [x] Verify mobile row heights with populated long-name/long-amount examples at 390px and 360px.
- [x] Refresh controlled Accounts visual QA. (AC: 8, 9)
  - [x] Capture or update QA evidence for grouped 1440, flat 1024, populated 390/360, filter-empty 390, first-use empty 390, drawer-open 390/360, and expanded-row 1440/390.
  - [x] Verify loading, load-error, partial-error, and filter-empty through fixtures/network interception if live data cannot trigger them.
  - [x] Record screenshot paths and state notes in this story's Dev Agent Record.
- [x] Run verification. (AC: 10)
  - [x] Run `npm run build` from `inex/ClientApp`.
  - [x] Run `npm run lint` from `inex/ClientApp`.
  - [x] Run existing Accounts-focused tests, including `accounts-utils.test.ts` and `Accounts.empty-focus.test.tsx` if present.
  - [x] Search touched TypeScript files for added `any`.

## Dev Notes

### Source Audit And Roadmap Context

- Roadmap section 3.2 identifies Accounts page-local work: page title, search placeholder, toolbar labels, desktop headers, selected-scope denominator, net-worth delta, fixture/live-data policy, compact balances, duplicate descriptions, group density, mobile row density, row expansion decision, and controlled state checks. Source: `docs/ui-audit/implementation-roadmap.md`.
- The Accounts audit confirms the mockup target is a dense English screen with `MANAGE`, `Accounts`, toolbar labels (`STATUS`, `VIEW`), headers (`ACCOUNT`, `CURRENCY`, `SHARE`, `BALANCE`), scoped count text, compact currency groups, and five-item bottom nav. Source: `docs/ui-audit/accounts.md`.
- The same audit also records shared decisions that are not page-local: Dashboard nav, `/dashboard` default route, sign-out visibility, route model, locale baseline, fixture/live-data policy, and mobile bottom-nav item count. Treat those as dependencies or accepted deviations unless the orchestrator reassigns shared shell scope.

### Completed Story Intelligence

- Story 10.3a rebuilt `/accounts` and then fixed two review findings: filter-empty hero distribution and account-count plural copy. It also records prior visual QA under `docs/implementation/visual-qa/10-3a/`. Source: `docs/implementation/10-3a-frontend-ux-accounts-management-redesign.md`.
- Story 10.3d is `done` and already completed balance scan fidelity, base equivalents, deterministic sorting, first-use empty short-circuiting, filter-empty context preservation, edit snapshot metrics, create-drawer Cancel, drawer viewport clamping, zero-share handling, missing base-currency unavailable states, and empty-state focus fallback. Do not duplicate these fixes unless the current source regressed. Source: `docs/implementation/10-3d-frontend-ux-accounts-design-gap-remediation.md`.
- Story 10.1b owns the base shared primitives. Story 10.1e owns the mockup-alignment extensions for labeled compact segmented controls, 220px search, list panels, compact currency suffixes, drawer footers, and no-match rows. Source: `docs/implementation/10-1b-frontend-ux-shared-primitives.md`; `docs/implementation/10-1e-shared-mockup-alignment-primitives-contract.md`.
- Story 10.1c originally targeted a five-item nav, but current source now includes Dashboard as a sixth item after Story 10.4 work. Do not remove Dashboard inside this page story without a shared IA decision. Sources: `docs/implementation/10-1c-frontend-ux-app-shell-and-navigation.md`, `inex/ClientApp/src/layouts/AppShell.tsx`.
- Story 10.6 is blocked until Epic 10 prerequisite stories are done. If 10.3g is added to the sprint, 10.6 should remain blocked until 10.3g reaches `done`. Source: `docs/implementation/10-6-frontend-ux-visual-qa-baseline-and-responsive-regression-checklist.md`.

### Current Source State

- `inex/ClientApp/src/pages/Accounts.tsx` already uses RTK Query (`useGetAccountsQuery`, `useGetAccountsSummaryQuery`), `BasicPage`/`AppShell`, `Num`, `SegmentedControl`, `InExDrawer`, `EmptyState`, `FilterEmpty`, and local account display helpers.
- Current toolbar controls render two unlabeled `SegmentedControl` instances. This matches audit finding 7 as still unresolved in page source.
- Current inventory title uses `accounts.workspaceTitle`, and EN copy is `Account inventory`; the audit mockup expects `Accounts` if English mockup copy is authoritative.
- Current EN search placeholder is `Search name or currency`; the audit mockup expects `Search accounts...`.
- Current row rendering has no desktop header row above rows. This matches audit finding 8 as unresolved.
- Current count copy uses `displayAccounts.length` as the denominator, which can expose all-account total in active-only scope. The audit expects selected-scope denominator.
- Current hero delta renders percent-only `accounts.hero.momDelta` or unavailable text. The audit expects signed absolute movement, percent, and comparison-month helper text if supported.
- Current row metadata displays `account.description || accounts.noDescription`; it does not suppress descriptions that duplicate account names.
- Current group and row code already includes collapse, base equivalent, shares, compact five-column desktop row grid, no repeated active badge, and mobile stacked rows from 10.3d. Treat those as preservation constraints while tuning density.

### Architecture And Project Guardrails

- Keep the frontend stack unchanged: React 18, TypeScript strict, Vite, Ant Design 5, Redux Toolkit/RTK Query, Axios, React Router 6, i18next, and existing primitives. Source: `docs/project-context.md`; `docs/planning/architecture.md`.
- All authenticated API calls must continue through the existing API client/RTK Query base query. Do not introduce raw `fetch` or raw authenticated Axios clients. Source: `docs/project-context.md`.
- All changed user-visible strings must be added to both `inex/ClientApp/public/locales/en/translation.json` and `inex/ClientApp/public/locales/ru/translation.json`. Source: `docs/project-context.md`.
- Do not add backend endpoints or account DTO fields in this story. Fixture parity and data-policy decisions are orchestrator/product decisions, not local UI inventions. Sources: roadmap section 1.3 and 3.2; `docs/planning/architecture.md`.
- Preserve existing route protection, `/accounts` route, `ProtectedRoute`, logout behavior, and app shell behavior. Source: `docs/project-context.md`; `docs/planning/architecture.md`.

### Likely Impacted Source Files

Primary in-scope files:

- `inex/ClientApp/src/pages/Accounts.tsx`
- `inex/ClientApp/src/pages/Accounts/accounts.css`
- `inex/ClientApp/src/pages/Accounts/accounts-utils.ts`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`

Possible in-scope test/QA files:

- `inex/ClientApp/src/pages/Accounts/accounts-utils.test.ts`
- `inex/ClientApp/src/pages/Accounts.empty-focus.test.tsx`
- `docs/implementation/visual-qa/10-3g/` for new evidence, if the implementation agent commits story-level screenshots or QA summaries.

Conditional/shared files only if the orchestrator expands scope:

- `inex/ClientApp/src/components/primitives/SegmentedControl.tsx` if adding a reusable visible-label API is preferable to local wrappers.
- `inex/ClientApp/src/layouts/AppShell.tsx` and `inex/ClientApp/src/layouts/AppShell.css` only if the shared Dashboard/sign-out/nav decision is assigned to this story.
- `inex/ClientApp/src/App.tsx` only if the shared route/default-landing decision is assigned to this story.

### Dependencies

- Story 10.1a done: tokens and Ant Design theme bridge exist.
- Story 10.1b done: shared primitives exist.
- Story 10.1e review/done: shared mockup-alignment primitive contracts exist and should be consumed instead of page-local wrappers for toolbar labels, search, list-panel composition, compact balances, drawer actions, and filter-empty separation.
- Story 10.1c implemented shell and bottom-nav contracts; current source includes later Dashboard route changes.
- Story 10.3a done: base Accounts redesign exists.
- Story 10.3d done: earlier Accounts gap remediation exists and must be preserved.
- Coordinate locale-file edits with 10.5a and 10.5b if those agents are active in parallel.
- Story 10.6 must wait for this story if the orchestrator adds 10.3g to Epic 10 prerequisites.

### Guardrails For The Dev Agent

- Do not revert or rewrite the 10.3d fixes for base equivalents, group sorting, first-use empty, filter-empty context, drawer focus, or zero-share handling.
- Do not remove Dashboard, sign-out, or `/dashboard` redirect as a page-local "fix"; record those as shared decisions unless reassigned.
- Do not fabricate March 2026 or April 2026 fixture values in live UI.
- Do not show dead controls for unsupported starting balance, update balance, bank connect, or view-transactions actions.
- Do not weaken account API payloads or mutate backend contracts.
- Do not add new dependencies.
- Do not introduce `any`, `@ts-ignore`, hardcoded visible English strings, or page-level horizontal overflow.

### Open Decisions

- Is the English mockup the acceptance baseline for this story, or should user-selected locale remain accepted while EN is used only for comparison screenshots?
- Should the shared shell keep the six-item production nav with Dashboard, or should audited management pages match the five-item mockup nav?
- Should the visible sign-out icon remain an accepted production deviation from the mockup's single profile pill?
- Should Accounts visual parity use seeded April 2026 mockup fixtures, or should live data be allowed to differ while layout/copy aligns?
- Is `thisMonthNet` a reliable enough source for a previous-period hero delta, or should the hero explicitly show delta unavailable until a historical net-worth API is available?
- Should row expansion remain the accepted production edit pattern? Story 10.3d implemented it with an accessible snapshot panel; removing it would be a product decision.

## Verification Checklist

- [ ] `git status --short` checked before edits and before completion.
- [ ] `npm run build` passes from `inex/ClientApp`.
- [ ] `npm run lint` passes from `inex/ClientApp`.
- [ ] Accounts-focused tests pass where present.
- [ ] No new `any` usage in touched TypeScript files.
- [ ] EN/RU locale files contain all new keys and no missing-key fallback appears in screenshots.
- [ ] Desktop 1440 grouped Accounts screenshot reviewed.
- [ ] Desktop 1024 flat Accounts screenshot reviewed.
- [ ] Mobile 390 populated Accounts screenshot reviewed.
- [ ] Mobile 360 populated Accounts screenshot reviewed.
- [ ] Filter-empty state reviewed with hero context preserved.
- [ ] First-use empty state reviewed without unavailable hero chrome.
- [ ] Drawer-open state reviewed at 390px and 360px with footer actions visible.
- [ ] Expanded-row state reviewed on desktop and mobile.
- [ ] Loading, error, and partial-error states reviewed through controlled fixtures/interception.

## References

- `docs/ui-audit/implementation-roadmap.md` (especially section 3.2 Accounts)
- `docs/ui-audit/accounts.md`
- `docs/planning/epics.md` (Epic 10 sequence and Story 10.3d/10.6 dependencies)
- `docs/planning/architecture.md` (Epic 10 frontend architecture addendum)
- `docs/planning/ux-design.md` (UX source index)
- `docs/project-context.md` (frontend stack, i18n, API, verification, no-overflow guardrails)
- `docs/implementation/sprint-status.yaml` (current Epic 10 statuses)
- `docs/implementation/10-1a-frontend-ux-design-tokens-and-theme-bridge.md`
- `docs/implementation/10-1b-frontend-ux-shared-primitives.md`
- `docs/implementation/10-1e-shared-mockup-alignment-primitives-contract.md`
- `docs/implementation/10-1c-frontend-ux-app-shell-and-navigation.md`
- `docs/implementation/10-3a-frontend-ux-accounts-management-redesign.md`
- `docs/implementation/10-3a-accounts-design-implementation-gap-review.md`
- `docs/implementation/10-3d-frontend-ux-accounts-design-gap-remediation.md`
- `docs/implementation/10-5a-frontend-ux-profile-and-settings-redesign.md`
- `docs/implementation/10-5b-frontend-ux-login-and-registration-redesign.md`
- `docs/implementation/10-6-frontend-ux-visual-qa-baseline-and-responsive-regression-checklist.md`
- `inex/ClientApp/src/pages/Accounts.tsx`
- `inex/ClientApp/src/pages/Accounts/accounts.css`
- `inex/ClientApp/src/pages/Accounts/accounts-utils.ts`
- `inex/ClientApp/src/store/accounts/accounts-api.ts`
- `inex/ClientApp/src/components/primitives/SegmentedControl.tsx`
- `inex/ClientApp/src/layouts/AppShell.tsx`
- `inex/ClientApp/src/App.tsx`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`

## Checklist Validation Notes

- Target story is explicitly identified as 10.3g and status is `ready-for-dev`.
- Story, Acceptance Criteria, Tasks/Subtasks, Dev Notes, likely impacted source files, dependencies, guardrails, verification checklist, open decisions, and references are present.
- Previous completed story history is preserved by reference only; no completed Dev Agent Records were edited.
- The story prevents likely LLM implementation mistakes: duplicating 10.3d fixes, changing shared shell IA locally, fabricating fixture data, adding backend contracts, or introducing dead controls.
- Shared docs were not modified; required sprint/epics/10.6 changes are left as orchestrator recommendations.

## Recommended Shared-Doc Edits For Orchestrator

- Integrated by orchestrator in this planning pass:
  - `docs/planning/epics.md`: added Story 10.3g and updated Epic 10 sequence so 10.6 waits for 10.3g.
  - `docs/implementation/sprint-status.yaml`: added `10-3g-frontend-ux-accounts-mockup-alignment-delta: ready-for-dev`.
  - `docs/implementation/10-6-frontend-ux-visual-qa-baseline-and-responsive-regression-checklist.md`: added 10.3g as a prerequisite.
  - `docs/implementation/10-5a-frontend-ux-profile-and-settings-redesign.md` and `docs/implementation/10-5b-frontend-ux-login-and-registration-redesign.md`: added locale-file coordination notes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-07: Created story from BMad create-story workflow using the Accounts audit, roadmap section 3.2, existing Epic 10 stories, sprint status, epics, architecture, UX planning, project context, and current Accounts source.
- 2026-06-08: Followed bmad-dev-story workflow on branch `feature/10-3g-accounts-alignment`; `AGENTS.md` was not present on disk, so the prompt-provided repository instructions were used.
- 2026-06-08: Read this story plus completed Stories 10.3a and 10.3d before editing; did not edit old Dev Agent Records.
- 2026-06-08: Confirmed red phase with failing Accounts-focused tests for duplicate description suppression and missing audit toolbar/header/count behavior.
- 2026-06-08: `npm run test -- Accounts.empty-focus.test.tsx accounts-utils.test.ts` passed after implementation.
- 2026-06-08: Controlled fixture visual QA captured 13 Accounts states under `docs/implementation/visual-qa/10-3g/`; summary reports zero overflow, drawer, denominator, duplicate-description, or controlled-state failures.
- 2026-06-08: `npm run build` passed from `inex/ClientApp`; Vite reported the existing large vendor chunk warning.
- 2026-06-08: `npm run lint` passed from `inex/ClientApp`.
- 2026-06-08: `npm run test` passed from `inex/ClientApp` with 18 files and 83 tests.
- 2026-06-08: `git diff -U0 -- ... | Select-String -Pattern '^\\+.*\\bany\\b'` found no added `any` in touched TypeScript files.

### Completion Notes List

- Story context created for unresolved Accounts mockup-alignment delta after completed 10.3a and 10.3d work.
- Shared planning/status updates were integrated by the orchestrator after story creation.
- Aligned Accounts inventory copy to the mockup baseline: list title now reads `Accounts`, EN placeholder is `Search accounts...`, RU placeholder was updated, and visible compact `STATUS`/`VIEW` segmented labels use the existing 10.1e primitive contract.
- Added desktop-only inventory headers aligned to the Accounts row grid and hidden on mobile to preserve stacked row layouts.
- Fixed active-scope inventory count semantics so the denominator comes from the selected scope rather than all accounts.
- Rendered hero delta as signed base-currency movement plus percent and comparison-period helper only when complete summary/base data supports it; otherwise the localized unavailable state remains.
- Added display-only duplicate description suppression while preserving raw name/description/currency search matching.
- Tightened Accounts group punctuation and row/group padding while preserving collapse affordances, base equivalents, share values, focus outlines, and tap targets.
- Added focused Accounts regression coverage for audit labels, headers, active-scope count semantics, and duplicate description suppression.
- Refreshed controlled fixture visual QA for populated grouped/flat, 390/360 mobile, filter-empty, first-use empty, drawer-open, expanded-row, loading, load-error, and partial-error states.

### File List

- `docs/implementation/10-3g-frontend-ux-accounts-mockup-alignment-delta.md`
- `docs/implementation/sprint-status.yaml`
- `docs/implementation/visual-qa/10-3g/drawer-open-360.png`
- `docs/implementation/visual-qa/10-3g/drawer-open-390.png`
- `docs/implementation/visual-qa/10-3g/empty-390.png`
- `docs/implementation/visual-qa/10-3g/expanded-row-1440.png`
- `docs/implementation/visual-qa/10-3g/expanded-row-390.png`
- `docs/implementation/visual-qa/10-3g/filter-empty-390.png`
- `docs/implementation/visual-qa/10-3g/flat-1024.png`
- `docs/implementation/visual-qa/10-3g/grouped-1440.png`
- `docs/implementation/visual-qa/10-3g/load-error-390.png`
- `docs/implementation/visual-qa/10-3g/loading-390.png`
- `docs/implementation/visual-qa/10-3g/mobile-360.png`
- `docs/implementation/visual-qa/10-3g/mobile-390.png`
- `docs/implementation/visual-qa/10-3g/partial-error-390.png`
- `docs/implementation/visual-qa/10-3g/qa-summary.json`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`
- `inex/ClientApp/src/pages/Accounts.empty-focus.test.tsx`
- `inex/ClientApp/src/pages/Accounts.tsx`
- `inex/ClientApp/src/pages/Accounts/accounts.css`
- `inex/ClientApp/src/pages/Accounts/accounts-utils.test.ts`
- `inex/ClientApp/src/pages/Accounts/accounts-utils.ts`

### Change Log

- 2026-06-08: Implemented Accounts mockup-alignment delta, added focused tests, refreshed controlled fixture visual QA evidence, passed build/lint/full frontend tests, and marked story ready for review.
