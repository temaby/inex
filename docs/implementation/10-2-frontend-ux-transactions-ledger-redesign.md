# Story 10.2: Frontend UX - Transactions Ledger Redesign

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an invited account holder,
I want the Transactions page to behave like a dense financial ledger,
so that I can scan recent movement, filter quickly, and understand cash flow without leaving the page.

## Acceptance Criteria

1. Given the Transactions design in `docs/design/Transactions.jsx`, when the production Transactions route is rebuilt, then it includes the KPI strip, ledger toolbar, type segmented control, search input, active filter chips, grouped day headers, right-aligned amounts, and pagination controls.
2. Given transaction filtering is available, when any filter, search, date range, account, category, tag, reference, or amount condition is active, then the page shows a visible active-filter indicator and clearable chips without relying only on URL query text.
3. Given the add/edit transaction flows, when the user opens create, edit, or advanced filter UI, then the UI uses the shared drawer contract with Escape close, focus return, mobile full-width or bottom-sheet behavior, and accessible labels.
4. Given income, expense, and transfer rows, when transactions render, then amounts use tabular numerics, semantic colors, explicit signs or an accessible signage preference, and neutral transfer treatment.
5. Given a 390px mobile viewport, when the Transactions route is opened with populated and empty data, then ledger rows stack without horizontal overflow and the bottom navigation does not cover the final row, drawer action, or empty-state action.
6. Given the story is complete, when visual QA is run, then screenshots are captured for desktop populated, mobile populated, filter-active, filter-empty, and drawer-open states.

## Tasks / Subtasks

- [ ] Confirm prerequisite story outputs are available before implementation starts. (AC: 1-6)
  - [ ] Story 10.1a token/theme bridge is complete and page styles consume those tokens instead of hardcoded palette constants.
  - [ ] Story 10.1b shared primitives are complete for drawer, segmented controls, empty/filter-empty states, money/signage rendering, and form fields.
  - [ ] Story 10.1c app shell/bottom navigation is complete so ledger spacing and mobile safe-area behavior are implemented against the final shell.
- [ ] Rebuild the Transactions route as a ledger workspace while preserving existing data flow contracts. (AC: 1, 2, 4)
  - [ ] Replace legacy sidebar + table composition in `inex/ClientApp/src/pages/Transactions.tsx` with a ledger-first layout (KPI strip, toolbar, grouped list/table body, pagination).
  - [ ] Keep route path, page ownership, and `AppShell` integration unchanged.
  - [ ] Keep transaction data sourced from existing Redux state and actions (no backend contract changes in this story).
- [ ] Implement explicit loading and error UX for ledger data and form submissions. (AC: 1, 3, 5)
  - [ ] Initial load: while `transactions.isLoading` is true and no rows are loaded, show localized ledger skeleton rows plus a KPI skeleton, not a blank page.
  - [ ] Refresh load: when a filter/page/date change triggers loading while existing rows remain, keep the current ledger visible, show a compact localized refreshing indicator in the toolbar, and disable only controls that would submit conflicting requests.
  - [ ] Failed load: when `transactions.error` is set and no rows are available, show a localized error state with retry action that re-dispatches the current `fetchTransactions` request using the active filter/page parameters.
  - [ ] Partial refresh failure: when `transactions.error` is set while stale rows remain, show a localized inline alert/banner with Retry and keep the stale ledger visible.
  - [ ] Drawer/form errors: create, transfer, edit, and advanced filter drawers must surface thunk/API errors inside the drawer near the submit area, preserve entered values, restore submit button state, and keep Escape/focus-return behavior intact.
  - [ ] Localization keys: add EN/RU keys under a `transactions.loading`, `transactions.error`, and `transactions.formErrors` structure (or equivalent existing namespace) for initial loading, refreshing, load failure, retry, save failure, create failure, transfer failure, update failure, and filter apply failure.
- [ ] Implement active filter UX that is independent from raw URL string visibility. (AC: 2)
  - [ ] Render explicit active-filter chips and clear actions for type, search, account, category, tag/ref, amount, and date range filters.
  - [ ] Keep compatibility with current filter transport (`transactions.filter` state and URL `filter=` integration) while exposing user-friendly chips.
  - [ ] Preserve the existing active-filter indicator behavior from Epic 4 (`FR-FE-001`) and do not regress typed-filter migration compatibility.
- [ ] Align create/edit/filter interactions with shared primitive and drawer contracts. (AC: 3)
  - [ ] Use shared drawer primitives/contracts introduced by Stories 10.1b and 10.1c, including Escape close and focus return.
  - [ ] Ensure mobile create/filter/edit flows use bottom-sheet/full-width behavior consistent with design guide.
  - [ ] Keep existing create/edit business logic wiring (`createTransaction`, `createTransfer`, `updateTransaction`, `removeTransaction`) intact.
- [ ] Enforce finance-grade amount semantics and signage behavior. (AC: 4)
  - [ ] Ensure amount cells are right-aligned on desktop and use tabular numeric rendering.
  - [ ] Keep transfer rows visually neutral; do not treat transfer as income/expense.
  - [ ] Preserve explicit sign or signage mode behavior established by shared primitives.
- [ ] Deliver responsive and visual QA gate evidence. (AC: 5, 6)
  - [ ] Validate no page-level horizontal overflow at 390px and 360px.
  - [ ] Verify bottom-nav safe padding so last ledger row and drawer actions remain visible.
  - [ ] Capture screenshots for: desktop populated, mobile populated, filter-active, filter-empty, drawer-open.
- [ ] Validate engineering quality gates. (AC: 1-6)
  - [ ] Run `npm run build` from `inex/ClientApp`.
  - [ ] Run `npm run lint` from `inex/ClientApp`.
  - [ ] Confirm no new `any` usage in touched TypeScript files.

## Dev Notes

### Story Intelligence From Planning Artifacts

- Epic 10 Story 10.2 implements `FR-UX-003` (ledger-first Transactions workspace) and contributes to `FR-UX-007` visual QA requirements. [Source: `docs/planning/epics.md`, Epic 10 / Story 10.2]
- PRD requires Transactions to support grouped rows, scan-friendly amount semantics, and robust filtering while preserving EN/RU behavior. [Source: `docs/planning/prds/prd-inex-2026-05-20/prd.md`, sections 4.4, 5.11, 6.7]
- Design update sequencing requires this story after shell/tokens/primitives so page-level rebuild uses shared foundations rather than one-off CSS. [Source: `docs/planning/design-update-plan.md`, Proposed Implementation Sequence]
- UX source loading index for this story is: design implementation guide + design update plan + Epic 10 breakdown. [Source: `docs/planning/ux-design.md`]

### Current State Analysis (Files Being Updated)

- `inex/ClientApp/src/pages/Transactions.tsx`
  - Current implementation uses `BasicPage`, `Layout.Sider`, AntD `Tabs`, and a side-panel mode (`status` vs `filter`) controlled by `?filter=` query.
  - Mobile currently uses `Grid.useBreakpoint` and separate filter/add drawers.
  - Page-level composition is not ledger-first and does not provide the design-specified KPI strip + active chip bar contract.
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`
  - Uses AntD `Table` on desktop and card rows on mobile.
  - Supports grouped date headers and inline edit expansion already (valuable behavior to preserve).
  - Contains many `any`-typed records and hardcoded color values; redesign must avoid adding new `any` while not breaking current behavior.
- `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx`
  - Uses legacy filter DSL (`filter=accountIds:...;categoryIds:...;start:...;end:...;tags:...;refs:...;`).
  - Maintains canonical Redux filter state (`transactions.filter`) and URL sync.
  - Redesign should keep compatibility while adding explicit chips and indicator UX.
- `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx` and `TransactionEditForm.tsx`
  - Existing create/edit flows and action dispatch wiring are working and should be preserved.
  - These flows are candidates for visual wrapper updates, not business-logic rewrites.
- `inex/ClientApp/src/store/transactions/transactions-actions.ts` and `transactions-slice.ts`
  - Current async ownership is Redux thunk + `apiClient`.
  - Existing filter transport and pagination API call contract must remain intact unless explicitly changed by a backend/frontend API contract story.

### Design And UX Guardrails

- Use `docs/design/Transactions.jsx` as the visual/interaction target for:
  - KPI strip with Income/Expenses/Net Flow summary,
  - ledger toolbar with segmented type control and search,
  - advanced filter drawer and visible active filter chips,
  - grouped day headers with per-day totals,
  - right-aligned amount column and pagination controls,
  - mobile stacked rows and no horizontal overflow.
- Keep shell behavior from Story 10.1c: bottom nav visible on mobile, content padded to prevent occlusion.
- Keep money rendering semantics from Story 10.1b primitives:
  - tabular numerics,
  - explicit signage mode support,
  - transfer-neutral treatment,
  - no color-only dependency.

### Architecture Compliance Requirements

- Keep frontend architecture unchanged for this story:
  - React 18 + TypeScript strict + Ant Design 5 + Redux Toolkit + Axios + i18next.
  - Authenticated calls stay on shared `apiClient`.
  - No RTK Query migration in this story (that belongs to Epic 7 / 7.4 track).
- Keep route and auth boundaries unchanged:
  - `/transactions` remains under `ProtectedRoute`.
  - No auth/session flow changes.
- Keep backend contracts unchanged:
  - Do not modify Transactions API route shapes, status codes, or DTO semantics in this UI story.

### File Structure Requirements

Primary files expected to be touched:

- `inex/ClientApp/src/pages/Transactions.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionEditForm.tsx`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`

Optional additive files (recommended for maintainability):

- `inex/ClientApp/src/pages/Transactions/transactions-ledger.css`
- `inex/ClientApp/src/pages/Transactions/TransactionsKpiStrip.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionsToolbar.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionsFilterChips.tsx`

Files to avoid changing unless required:

- `inex/ClientApp/src/store/**` (except minimal typing additions required by touched UI)
- `inex/ClientApp/src/utils/apiClient.ts`
- backend projects (`inex`, `inex.Services`, `inex.Data`)

### Library And Framework Requirements

- Use existing stack and dependencies only.
- Use shared primitive components introduced in Story 10.1b where applicable (`Drawer`, segmented controls, icon buttons, money/signage rendering patterns).
- Keep all user-visible text localized in EN/RU locale files.

### Testing And Verification Requirements

- Required command checks from `inex/ClientApp`:
  - `npm run build`
  - `npm run lint`
- Manual responsive checks:
  - desktop ledger at 1440 and 1024,
  - mobile at 390 and 360,
  - empty state,
  - filter-active state,
  - drawer-open states (create, filter, edit).
- Screenshot gate (minimum set):
  - desktop populated,
  - mobile populated,
  - filter-active,
  - filter-empty,
  - drawer-open.

### Previous Story Intelligence

- Story 10.1a (tokens/theme bridge) established tokenized color/typography contracts that this story must consume, not override with ad hoc palette constants.
- Story 10.1b (shared primitives) established shared money and drawer contracts; this story should reuse those primitives and avoid duplicating control patterns.
- Story 10.1c (app shell/navigation) established top-nav/bottom-nav behavior and mobile safe-area rules; this story must preserve bottom-nav compatibility and content padding.

### Git Intelligence Summary (Recent Repository History)

Recent commits:

1. `117430a` - story 1.5: verify frontend build artifacts are not tracked (#129)
2. `dde85c8` - Story 1.4: externalize local secret config (#128)
3. `cfe865c` - fix(accounts): include key in account update payload (#127)
4. `2937892` - Story 1 1 owned delete not found cleanup (#126)
5. `cfbe606` - Normalize owned delete not-found handling (#125)

Implications:

- Recent codebase work is security/hygiene heavy and backend-centric; this story should keep frontend-only blast radius and preserve stable APIs.
- Regression risk is primarily UX/layout and mobile behavior; visual QA and responsive checks are mandatory acceptance gates.

### Latest Technical Context

- Current frontend still contains `any` in transactions flows. This story must not add new `any` in touched files and should opportunistically narrow types where low-risk.
- Current filters still use string DSL transport. Story should surface user-friendly chips/indicator while keeping compatibility with existing Redux + URL filter behavior.
- Existing grouped-day ledger behavior in `TransactionList` is a useful baseline and should be preserved during redesign.

### Project Context Reference

- Keep API calls on shared `apiClient`; do not create raw clients. [Source: `docs/project-context.md`]
- Keep strict TypeScript direction; no new `any` in touched code. [Source: `docs/project-context.md`]
- Keep all user-visible strings in i18n dictionaries (EN/RU). [Source: `docs/project-context.md`]
- Converted routes must pass mobile overflow checks at 390px and 360px. [Source: `docs/project-context.md`]

### References

- `docs/planning/epics.md` (Epic 10, Story 10.2 ACs and dependencies)
- `docs/planning/design-update-plan.md` (migration principles and sequence)
- `docs/planning/ux-design.md` (UX source index)
- `docs/planning/architecture.md` (frontend architecture guardrails, apiClient/Redux constraints)
- `docs/planning/prds/prd-inex-2026-05-20/prd.md` (FR-UX-003, FR-UX-007, NFR-UX)
- `docs/design/docs/design-implementation-guide.md` (sections 7, 8 Transactions, 10, 13, 14, 17)
- `docs/design/Transactions.jsx` (target ledger UX contract)
- `inex/ClientApp/src/pages/Transactions.tsx` (current route composition)
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx` (current grouped list + edit behavior)
- `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx` (current filter state/URL mapping)
- `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx` (current create flow)
- `inex/ClientApp/src/pages/Transactions/TransactionEditForm.tsx` (current edit flow)
- `inex/ClientApp/src/store/transactions/transactions-actions.ts` and `transactions-slice.ts` (state/action contracts)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

### Completion Notes List

- Story context created via bmad-create-story workflow for key `10-2-frontend-ux-transactions-ledger-redesign`.
- Story includes implementation guardrails for preserving Redux/apiClient contracts while rebuilding UI to ledger-first design.
- Story includes explicit responsive and screenshot QA gates per Epic 10 requirements.
- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- docs/implementation/10-2-frontend-ux-transactions-ledger-redesign.md
