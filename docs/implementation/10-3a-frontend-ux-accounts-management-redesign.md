# Story 10.3a: Frontend UX - Accounts Management Redesign

Status: review

## Story

As an invited account holder,
I want the Accounts page rebuilt around balance scanning and currency groups,
so that account balances are easy to compare on desktop and mobile.

## Acceptance Criteria

1. Given the Accounts design reference, when `/accounts` is rebuilt, then it includes a net-worth hero, currency distribution, active/all scope control, currency-grouped and flat views, searchable rows, compact balance cells, and create/edit drawer or inline edit behavior.
2. Given empty or filter-empty states on Accounts, when no data or no matching results are shown, then the page uses the shared InEx empty-state pattern with product-specific EN/RU copy and useful primary actions.
3. Given 390px and 360px mobile viewports, when Accounts is opened with populated data, then toolbars wrap, wide controls scroll internally, rows stack cleanly, and no page-level horizontal overflow appears.
4. Given the story is complete, when `npm run build`, `npm run lint`, and visual QA run, then all pass and screenshots cover populated, empty, and drawer-open states.

## Tasks / Subtasks

- [x] Confirm prerequisite story outputs are available before implementation starts. (AC: 1-4)
  - [x] Story 10.1a token/theme bridge is complete and page styles consume those tokens instead of hardcoded palette constants.
  - [x] Story 10.1b shared primitives are complete for drawer, segmented controls, empty/filter-empty states, money/signage rendering, and form fields.
  - [x] Story 10.1c app shell/bottom navigation is complete so Accounts spacing and mobile safe-area behavior are implemented against the final shell.
  - [x] Story 10.2 Transactions redesign is complete or explicitly waived for this management-page wave, preserving the fixed Epic 10 order.
  - [x] If 10.3a, 10.3b, and 10.3c run in parallel, coordinate shared EN/RU locale files and shared primitive assumptions before editing.
- [x] Rebuild `/accounts` as a management workspace while preserving existing data contracts and route ownership. (AC: 1)
  - [x] Replace the current table-first composition in `inex/ClientApp/src/pages/Accounts.tsx` with the design-system workspace flow: hero, toolbar/filter bar, grouped/flat list, and inline-edit or drawer interactions.
  - [x] Keep route path, auth guarding (`ProtectedRoute`), and shell integration from Story 10.1c unchanged.
  - [x] Keep account data sourced from existing Redux state/actions (`accounts-slice` + `accounts-actions`) with no backend/API contract changes in this story.
- [x] Implement explicit loading and error UX for account data and form submissions. (AC: 1, 2, 4)
  - [x] Initial load: while `accounts.isLoading` is true and `accounts.items` is empty, show localized account hero/list skeletons rather than empty-state copy.
  - [x] Refresh load: when `accounts.isLoading` is true and existing accounts remain, keep stale rows visible, show a compact localized refreshing indicator in the toolbar/hero, and avoid layout shift.
  - [x] Failed load: when `accounts.error` is set and no accounts are available, show a localized page error state with Retry that re-dispatches `fetchAccounts("ALL")`.
  - [x] Partial refresh failure: when `accounts.error` is set while stale accounts remain, show a localized inline alert/banner with Retry and keep the stale account list visible.
  - [x] Drawer/form errors: create/edit/delete failures must appear in the drawer or expanded edit panel near the submit actions, preserve entered values, and reset disabled/loading button states after failure.
  - [x] Localization keys: add EN/RU keys under an `accounts.loading`, `accounts.error`, and `accounts.formErrors` structure (or equivalent existing namespace) for initial loading, refreshing, load failure, retry, create failure, update failure, and delete failure.
- [x] Implement scanning-centric account presentation contracts from design references. (AC: 1)
  - [x] Add net-worth hero with total USD value, MoM delta, and by-currency distribution treatment.
  - [x] Add active/all scope control, grouping mode (`by currency` / `flat list`), and search across account name/currency.
  - [x] Implement compact account rows with deterministic currency badge, share-of-net-worth signal, and right-aligned/tabular balance cells.
  - [x] Preserve existing create/edit workflows (`AccountCreateForm`, `AccountEditForm`) and keep one expanded row at a time.
- [x] Implement empty and filter-empty experiences via shared primitives with localized copy. (AC: 2)
  - [x] Use shared `EmptyState` / `FilterEmpty` pattern from the design system (Story 10.1b) rather than page-local ad hoc empty panels.
  - [x] Add/adjust EN and RU translation keys for accounts empty/filter-empty labels and CTA text.
  - [x] Ensure empty-state primary actions map to real workflows (`Add account`, optional secondary CTA) and do not expose dead links.
- [x] Enforce responsive behavior and overflow resilience at mobile breakpoints. (AC: 3)
  - [x] Verify toolbar/filter controls wrap or scroll internally without creating page-level overflow.
  - [x] Ensure row layout stacks cleanly on 390px and 360px widths, with bottom navigation safe area preserved.
  - [x] Ensure drawer behavior remains usable on mobile (`bottom` placement/full width) with accessible close behavior and non-occluded actions.
- [x] Deliver verification artifacts and quality gates. (AC: 4)
  - [x] Run `npm run build` from `inex/ClientApp`.
  - [x] Run `npm run lint` from `inex/ClientApp`.
  - [x] Capture screenshot set: desktop populated, mobile populated, empty/zero-data, filter-empty, drawer-open.
  - [x] Confirm no new `any` usage in touched TypeScript files.

## Dev Notes

### Story Intelligence From Planning Artifacts

- Epic 10 Story 10.3a implements `FR-UX-004` for the Accounts management surface and contributes to `FR-UX-007` visual QA obligations. [Source: `docs/planning/epics.md`, Epic 10 / Story 10.3a]
- Design update sequencing expects shell + primitives first, then management-surface wave (Accounts/Categories/Budgets), so this story must reuse foundations from 10.1a/10.1b/10.1c instead of introducing one-off patterns. [Source: `docs/planning/design-update-plan.md`]
- UX source index for frontend redesign stories is the design implementation guide + design update plan + Epic 10 definitions. [Source: `docs/planning/ux-design.md`]

### Current State Analysis (Files Being Updated)

- `inex/ClientApp/src/pages/Accounts.tsx`
  - Current page is Ant Design table centric, with `Checkbox` active-only filter, `Drawer`-hosted create form, and expandable row edit form.
  - Uses `useBreakpoint()` and inline styles; includes `any` usage in filter and row render paths.
  - Must preserve: `fetchAccounts("ALL")` refresh loop on `accountsLastUpdate`, one-row expansion behavior, and existing create/edit form wiring.
- `inex/ClientApp/src/pages/Accounts/AccountCreateForm.tsx`
  - Current form fetches currencies from `/currencies` and dispatches `createAccount` with derived key.
  - Must preserve: create flow dispatch + reset/close behavior; avoid backend contract changes.
- `inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx`
  - Current inline edit handles update/delete with local reducer state and mobile-aware action layout.
  - Must preserve: `updateAccount(id, key, ...)` payload shape and delete confirmation path.
- `inex/ClientApp/src/store/accounts/accounts-actions.ts`
  - Thunk ownership remains Redux + `apiClient`; contains recent key-field update in `updateAccount` payload.
  - Must preserve: API routes (`/accounts`) and optimistic refresh via `setLastUpdate`.
- `inex/ClientApp/src/store/accounts/accounts-slice.ts`
  - State contract: `items`, `isLoading`, `isCreating`, `isUpdating`, `lastUpdate`, `error`.
  - Must preserve: slice state shape to avoid downstream regressions in pages/forms.

### Accounts Design Contract (From Mockup)

- Target reference is `docs/design/Accounts.jsx`.
- Hero contract:
  - Two-column desktop hero (`320px 1fr`) with Net Worth left and By Currency distribution right.
  - Net Worth uses tabular numerics and includes MoM delta signaling.
  - Currency mix uses deterministic per-currency colors with legend and USD-equivalent percentages.
- Toolbar/filter contract:
  - Active/all scope toggle.
  - Group mode control (`currency` and `flat`).
  - Search over account name/currency.
  - Add account action launches create flow.
- Row contract:
  - Compact grid layout, currency badge, share-of-net-worth signal, right-aligned balance cell.
  - Expand/collapse affordance reveals edit panel (inline-edit pattern allowed by AC).
  - Disabled status remains visible and scan-friendly.

### Balance, Net-Worth, And MoM Data Source

- Source of truth for account balances in this story is the existing `GET /accounts?mode=ALL` response consumed by `accounts-actions.ts` and stored in `state.accounts.items`.
- The current production frontend model `AccountDetails` exposes `id`, `key`, `name`, `description`, `isEnabled`, and `currency`; the backend `AccountResponse` extends `UpdateAccountRequest` and adds `Currency`. No historical balance series, USD-equivalent balance, or account-level MoM delta is exposed by the existing Accounts API contract.
- API changes are out of scope for Story 10.3a. Do not add backend endpoints, DTO fields, Redux slices, or exchange-rate/report joins to support the mockup-only MoM treatment.
- Net-worth hero implementation must use only data already available in `state.accounts.items`. If numeric balance/value fields are unavailable in the current model at implementation time, render a localized unavailable/empty metric state (`accounts.hero.balanceUnavailable`) rather than fabricated totals.
- By-currency distribution may count accounts per currency when true balances are unavailable. Label this as account distribution, not value distribution, unless real numeric balances are present in the existing model.
- MoM delta must be hidden or rendered as localized unavailable copy until a separate backend/reporting story provides a historical value source. Do not compute MoM from current account rows.

### Empty-State Contract

- Empty-state references are in `docs/design/EmptyState.jsx` (`EmptyAccounts`, `FilterEmpty`).
- Implementation requirements:
  - Use shared primitives introduced by Story 10.1b; do not create bespoke empty-state markup in page scope.
  - Provide localized EN/RU copy and useful CTAs (primary add-account action).
  - Support both first-use empty and filter-empty modes.

### Responsive And Accessibility Guardrails

- Mobile behavior and breakpoints are governed by `docs/design/responsive.css` and design guide sections.
- Required checks:
  - No page-level horizontal overflow at 390px and 360px.
  - Toolbar/filter controls wrap or scroll internally; rows stack without clipping.
  - Bottom-nav safe padding remains intact (from shell story).
- Accessibility:
  - Keep keyboard operability for toggles, row expansion, and drawer close behavior.
  - Do not rely only on color for financial meaning; keep signage/tabular numeric behavior from shared primitives.

### Architecture Compliance Requirements

- Keep frontend architecture unchanged in this story:
  - React 18 + TypeScript strict + Ant Design + Redux Toolkit + Axios + i18next.
  - Authenticated HTTP continues through shared `apiClient`.
  - No RTK Query migration and no backend endpoint changes.
- Preserve route/auth boundaries:
  - `/accounts` stays under `ProtectedRoute` and current shell flow.
  - No auth session or navigation IA changes in this story.

### File Structure Requirements

Primary files expected to be touched:

- `inex/ClientApp/src/pages/Accounts.tsx`
- `inex/ClientApp/src/pages/Accounts/AccountCreateForm.tsx` (only if visual wrapper or typing cleanup is required)
- `inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx` (only if layout contract requires update)
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`

Optional additive files (recommended for maintainability):

- `inex/ClientApp/src/pages/Accounts/accounts.css`
- `inex/ClientApp/src/pages/Accounts/AccountsHero.tsx`
- `inex/ClientApp/src/pages/Accounts/AccountsToolbar.tsx`
- `inex/ClientApp/src/pages/Accounts/AccountRow.tsx`

Files to avoid changing unless strictly required:

- `inex/ClientApp/src/store/**`
- `inex/ClientApp/src/utils/apiClient.ts`
- backend projects (`inex`, `inex.Services`, `inex.Data`)

### Library And Framework Requirements

- Use existing installed stack and primitives from Stories 10.1a and 10.1b.
- Keep money formatting/signage on shared primitives (`Num`/signage context where available), not page-local formatting forks.
- Keep all user-visible copy in i18n dictionaries.

### Testing And Verification Requirements

- Required command checks from `inex/ClientApp`:
  - `npm run build`
  - `npm run lint`
- Manual QA checks:
  - Desktop: populated accounts, grouped mode, flat mode.
  - Mobile: populated accounts at 390 and 360.
  - Empty first-use state.
  - Filter-empty state.
  - Drawer-open state (create or edit).
- Screenshot gate (minimum set):
  - Desktop populated.
  - Mobile populated (390 and 360).
  - Empty state.
  - Filter-empty state.
  - Drawer-open state.

### Previous Story Intelligence

- Story 10.2 set the pattern for comprehensive story context in Epic 10:
  - Keep Redux/API contracts stable while rebuilding page UX.
  - Capture explicit responsive and screenshot QA gates.
  - Favor additive page modules + CSS over broad cross-page refactors.
- Story 10.1c established shell/bottom-nav behavior that Accounts must preserve.
- Story 10.1b established shared primitives and signage/money semantics that Accounts should consume directly.

### Git Intelligence Summary (Recent Repository History)

Recent commits:

1. `117430a` - story 1.5: verify frontend build artifacts are not tracked (#129)
2. `dde85c8` - Story 1.4: externalize local secret config (#128)
3. `cfe865c` - fix(accounts): include key in account update payload (#127)
4. `2937892` - Story 1 1 owned delete not found cleanup (#126)
5. `cfbe606` - Normalize owned delete not-found handling (#125)

Implications:

- The latest frontend accounts bug fix corrected `updateAccount` payload contract (`key` is mandatory); story implementation must not regress this payload shape.
- Current repository momentum is safety/hygiene heavy; keep this story UI-focused with minimal blast radius.

### Project Context Reference

- Keep API calls on `apiClient`; do not create raw HTTP clients. [Source: `docs/project-context.md`]
- Keep strict TypeScript direction; do not add new `any` in touched files. [Source: `docs/project-context.md`]
- Keep all user-facing text localized EN/RU. [Source: `docs/project-context.md`]
- Converted routes must pass 390px/360px overflow checks. [Source: `docs/project-context.md`]

### References

- `docs/planning/epics.md` (Epic 10, Story 10.3a)
- `docs/planning/design-update-plan.md`
- `docs/planning/ux-design.md`
- `docs/planning/architecture.md`
- `docs/project-context.md`
- `docs/design/docs/design-implementation-guide.md` (Accounts + shell/responsive sections)
- `docs/design/Accounts.jsx`
- `docs/design/EmptyState.jsx`
- `docs/design/responsive.css`
- `inex/ClientApp/src/pages/Accounts.tsx`
- `inex/ClientApp/src/pages/Accounts/AccountCreateForm.tsx`
- `inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx`
- `inex/ClientApp/src/store/accounts/accounts-actions.ts`
- `inex/ClientApp/src/store/accounts/accounts-slice.ts`

## Checklist Validation

- Template sections present: Story, Acceptance Criteria, Tasks/Subtasks, Dev Notes, References, Dev Agent Record.
- Story-specific ACs from Epic 10.3a are preserved and mapped to implementation tasks.
- Current-state analysis and preservation constraints are explicitly documented for files expected to be updated.
- Architecture, UX, i18n, and responsive guardrails are included.
- Previous-story and git intelligence context included.
- Status confirmed as `ready-for-dev`.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- 2026-06-03: Confirmed Story 10.1a and Story 10.1b are `done` in `docs/implementation/sprint-status.yaml`.
- 2026-06-03: Story 10.1c and Story 10.2 are `review`, not `done`; user explicitly waived this gate by instructing to consider them done and proceed.
- 2026-06-03: `docs/project-context.md` was requested but is absent from this worktree; equivalent architecture/project guardrails were loaded from planning and story context.
- 2026-06-03: Current Accounts implementation uses RTK Query (`accounts-api.ts`), so the redesign preserved the live RTK Query contract rather than reverting to older Redux thunk notes.
- 2026-06-03: `npm run build` from `inex/ClientApp` passed.
- 2026-06-03: `npm run lint` from `inex/ClientApp` passed.
- 2026-06-03: `git diff -U0 -- ... | Select-String -Pattern "^\\+.*\\bany\\b"` found no added `any` usage in touched TypeScript files.
- 2026-06-03: Visual QA captured screenshots under `docs/implementation/visual-qa/10-3a/` with mocked authenticated API responses.
- 2026-06-03: Visual QA metrics reported no page-level horizontal overflow at 390px and 360px populated states, and covered empty, filter-empty, and drawer-open states.
- 2026-06-03: BMad code review found and fixed filter-empty hero distribution drift and account-count plural copy.
- 2026-06-03: `npm run build` and `npm run lint` from `inex/ClientApp` passed after review fixes.

### Completion Notes List

- Story context created via bmad-create-story workflow for key `10-3a-frontend-ux-accounts-management-redesign`.
- Story includes implementation guardrails for preserving Redux/apiClient contracts while rebuilding Accounts UX.
- Story includes explicit responsive and screenshot QA gates per Epic 10 requirements.
- Ultimate context engine analysis completed - comprehensive developer guide created.
- Rebuilt `/accounts` as a tokenized management workspace with net-worth hero, currency distribution, active/all scope, by-currency/flat view modes, search, compact account rows, share-of-net-worth indicators, and inline edit panels.
- Preserved route/auth shell ownership and existing RTK Query account API contracts; no backend endpoints or store contracts were changed.
- Kept create/edit/delete workflows in the existing form components while adding localized error display near submit actions and preserving entered values after failures.
- Added localized EN/RU accounts copy for loading, refresh, load failure, form failures, empty state, filter-empty state, hero metrics, scope/view controls, and search.
- Added page-scoped responsive CSS for Accounts; mobile visual QA passed at 390px and 360px with no horizontal overflow.
- Static verification passed with `npm run build`, `npm run lint`, and no added `any` usage in touched TypeScript files.
- Resolved review findings by keeping hero currency distribution sourced from scoped accounts instead of searched rows and by replacing unstable plural lookup with explicit singular/plural locale keys.

### File List

- docs/implementation/10-3a-frontend-ux-accounts-management-redesign.md
- docs/implementation/sprint-status.yaml
- docs/implementation/visual-qa/10-3a/desktop-populated.png
- docs/implementation/visual-qa/10-3a/mobile-390-populated.png
- docs/implementation/visual-qa/10-3a/mobile-360-populated.png
- docs/implementation/visual-qa/10-3a/empty.png
- docs/implementation/visual-qa/10-3a/filter-empty.png
- docs/implementation/visual-qa/10-3a/drawer-open.png
- docs/implementation/visual-qa/10-3a/qa-summary-mobile-states.json
- inex/ClientApp/public/locales/en/translation.json
- inex/ClientApp/public/locales/ru/translation.json
- inex/ClientApp/src/pages/Accounts.tsx
- inex/ClientApp/src/pages/Accounts/AccountCreateForm.tsx
- inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx
- inex/ClientApp/src/pages/Accounts/accounts.css

### Change Log

- 2026-06-03: Implemented Accounts management redesign, completed build/lint/no-any checks, captured visual QA screenshots, and marked story ready for review.
- 2026-06-03: Addressed BMad code review findings and reran build/lint.

## Senior Developer Review (AI)

### Review Outcome

Approve after fixes.

### Findings

- [x] Medium: Filter-empty search drove the hero currency distribution from the searched row set, so a no-match search made the hero report no currencies despite loaded account balances. Fixed by deriving hero distribution from the scoped account set and list groups from the searched set.
- [x] Low: Currency group count used a plural key form that rendered `2 account` with the installed i18next behavior. Fixed by using explicit singular/plural account-count keys.

### Verification

- `npm run build` from `inex/ClientApp` passed after review fixes.
- `npm run lint` from `inex/ClientApp` passed after review fixes.
- Pre-review visual QA screenshots cover desktop populated, mobile 390 populated, mobile 360 populated, empty, filter-empty, and drawer-open states; 390px/360px overflow metrics passed.
