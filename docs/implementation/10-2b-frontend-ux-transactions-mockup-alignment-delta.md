# Story 10.2b: Frontend UX - Transactions Mockup Alignment Delta

Status: review

## Story

As an invited account holder,
I want the remaining Transactions mockup mismatches resolved after the ledger redesign and 10.2a remediation,
so that the Transactions workspace matches the audited design contract before the Epic 10 visual QA gate.

## Acceptance Criteria

1. Given the Transactions page header renders on desktop and mobile, when `/transactions` opens, then the primary CTA label is `Add transaction` in the English baseline, uses localized EN/RU text, and spans the content width on mobile without clipping or horizontal overflow.
2. Given the KPI strip renders money values, when income, expenses, and net flow are shown, then currency suffixes use smaller adjacent typography while preserving `Num` tabular numerics, explicit signage, accessible labels, and existing call-site compatibility.
3. Given the ledger toolbar renders, when the user scans controls, then a visible `View` label precedes the segmented control, the search field is right-aligned on desktop, and the layout wraps cleanly at 390px and 360px.
4. Given grouped transaction day headers render, when any day group is visible, then no leading calendar icon is shown and the label remains compact and localized using the existing 10.2a friendly-day helper.
5. Given mobile transaction rows render, when the ledger is viewed at 390px, then rows do not show a trailing chevron while preserving the existing click and keyboard edit affordance.
6. Given the filter drawer is opened, when controls render, then they match the audited mockup structure: separate `From` and `To` date inputs, native-looking account/category selects, keyword placeholder `BIEDRONKA, ALINA_SHAPOVA`, one `Amount equivalent` row with `Min` and `Max` boxes plus base-currency suffix blocks, and content-width right-aligned `Clear all` / `Apply filters` actions.
7. Given the filter drawer has no active values, when the user sees drawer actions, then actions remain visually enabled like the mockup; `Clear all` is a safe no-op and `Apply filters` applies the unchanged form without creating stale URL/filter state.
8. Given the add transaction drawer opens, when the default Expense mode renders, then the drawer title is `New transaction`, subtitle is `Record a new expense`, type selection uses the shared segmented control/pill style, fields are ordered Amount, Account, Category, Date, Comment, Tags, and footer actions are `Save expense` plus `Cancel`.
9. Given income or transfer mode is selected in the add drawer, when the user changes mode, then save copy and required fields update consistently without losing existing create income/expense/transfer API behavior.
10. Given tags are entered in the add drawer, when the user saves, then no backend contract change is introduced; tag tokens are appended to or merged with the submitted comment using the existing `#tag` parsing contract, unless a supported API field exists at implementation time.
11. Given search or filters produce no visible transactions on a populated result set, when the no-match state renders, then column headers remain visible and the list body shows one centered message `No transactions match these filters`; the rich dashed `FilterEmpty` panel and redundant toolbar `Filters active` badge do not appear in this no-match state while clearable chips remain available.
12. Given the story is complete, when `npm run build`, `npm run lint`, targeted frontend tests, and visual QA run from `inex/ClientApp`, then all pass and screenshots cover desktop populated, desktop filter drawer, desktop add drawer, filter-empty/no-match, mobile populated 390px, and mobile populated 360px with no page-level horizontal overflow or bottom-nav occlusion.

## Tasks / Subtasks

- [x] Align page header, KPI typography, and ledger toolbar fidelity. (AC: 1, 2, 3)
  - [x] Change the Transactions header CTA copy from generic `Add` to localized `Add transaction`; update EN/RU locale keys without breaking existing drawer labels.
  - [x] Add a mobile-specific full-width CTA rule through the existing AppShell/page-head contract or Transactions page CSS.
  - [x] Extend `Num` with an optional currency suffix typography variant, or add a narrow wrapper that does not break existing `Num` call sites.
  - [x] Add the visible `View` label before the segmented control and right-align desktop search while keeping mobile wrapping stable.
- [x] Clean up ledger row and day-header visual deltas. (AC: 4, 5)
  - [x] Remove the visible `CalendarDays` icon from day headers.
  - [x] Keep `getFriendlyTransactionDayLabel` behavior from Story 10.2a; do not regress Today/Yesterday/localized older labels.
  - [x] Hide/remove the mobile chevron while preserving row `role="button"`, `tabIndex`, Enter/Space handling, and click-to-edit behavior.
- [x] Rework the filter drawer to the audited mockup contract. (AC: 6, 7)
  - [x] Replace the AntD `RangePicker` surface with separate From/To date inputs or a visually equivalent shared primitive/native-input treatment.
  - [x] Replace menu-style account/category dropdown rows with native-looking select controls where practical; preserve multi-select semantics if production filtering requires multiple account/category values.
  - [x] Update keyword placeholder from `#tag @ref` to localized mockup-style example copy while continuing to parse tags and refs.
  - [x] Recompose min/max amount-equivalent inputs into one labeled row with base-currency suffix blocks.
  - [x] Make drawer footer buttons content-width and right-aligned; actions must be safe when no filters are active.
  - [x] Preserve URL query compatibility and Redux `transactions.filter` behavior from 10.2/10.2a.
- [x] Rework add drawer copy, selector, fields, and actions. (AC: 8, 9, 10)
  - [x] Replace AntD card tabs with the shared segmented/pill control for Expense, Income, and Transfer.
  - [x] Type `TransactionCreate` and the three create form components; remove existing `any` in touched create-flow files.
  - [x] Reorder Expense and Income fields to Amount, Account, Category, Date, Comment, Tags.
  - [x] Add Tags input support without changing backend DTOs; merge tags into the submitted comment as `#tag` tokens unless an existing supported API field is discovered.
  - [x] Add a Cancel footer action that closes the drawer without submitting and resets only local create-form state.
  - [x] Localize mode-specific save labels such as `Save expense`, `Save income`, and `Save transfer`.
- [x] Replace no-match rendering with the simple mockup state. (AC: 11)
  - [x] Keep desktop column headers visible when local search/type/amount filters eliminate all rows from a populated server result.
  - [x] Render one centered no-match message in the table/list body.
  - [x] Preserve active chips and clear-all behavior, but remove the redundant toolbar `Filters active` badge in this state.
  - [x] Keep initial empty, loading, full API error, and partial refresh states intact unless the no-match change requires a small compatibility adjustment.
- [x] Add focused verification and visual QA. (AC: 12)
  - [x] Add or update focused Vitest coverage for any extracted helpers, especially tag-to-comment merging and no-match classification if extracted.
  - [x] Run `npm test` or the narrowest relevant Vitest command, then `npm run build` and `npm run lint` from `inex/ClientApp`.
  - [x] Capture screenshots for desktop populated, filter drawer, add drawer, no-match/filter-empty, mobile 390px, and mobile 360px.
  - [x] Confirm no new `any` in touched TypeScript files with a targeted `rg "\bany\b"` search.

## Dev Notes

### Scope Source

- This story is derived from `docs/ui-audit/transactions.md` and roadmap section 3.1 in `docs/ui-audit/implementation-roadmap.md`.
- `transaction.ms` / `transactions.ms` was searched for and not found; treat references to `transaction.ms` as a typo for `transactions.md`.
- Story 10.2a is complete and already closed these older Transactions gaps: explicit scope contract, period badge/counts, type counts, friendly day labels, category paths, base-currency sublines, signed ledger amounts, amount-equivalent filtering fidelity, 20/50/100 pagination, and filter form typing in the advanced filter area. Do not reimplement those as new work. [Source: `docs/implementation/10-2a-frontend-ux-transactions-design-gap-remediation.md`]

### Current State Analysis

- `inex/ClientApp/src/pages/Transactions.tsx`
  - Uses `BasicPage`/`AppShell`, KPI strip, ledger toolbar, chips, `TransactionList`, and `InExDrawer` for add/filter drawers.
  - Header CTA still uses `t("transactions.add")`, currently English `Add`, while the mockup/audit expects `Add transaction`.
  - Ledger controls render the segmented control and search, but no visible `View` label.
  - The toolbar renders a `Filters active` badge whenever filters are active; the audit expects no redundant badge in no-match state.
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`
  - Defaults to 20/50/100 pagination and uses 10.2a helpers for category paths, friendly day labels, base equivalents, and signed amounts.
  - Day headers still render `CalendarDays`.
  - Mobile rows still render `ChevronRight`.
  - Filter-empty currently uses the rich shared `FilterEmpty` panel instead of a single centered no-match row.
- `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx`
  - Uses AntD `RangePicker`, custom `Dropdown`, `Input`, and AntD block buttons.
  - Amount equivalent is inside the form after 10.2a, but the labels remain split (`Minimum equivalent`, `Maximum equivalent`) and no base-currency suffix blocks are shown.
  - Actions are disabled when no filters are active; the mockup shows enabled content-width actions.
- `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx`
  - Still uses `props: any`, reducer `action: any`, AntD card `Tabs`, generic `Save`, and no Cancel action.
  - The create form components also use `props: any`.
- `TransactionCreateExpenseForm.tsx`, `TransactionCreateIncomeForm.tsx`, and `TransactionCreateTransferForm.tsx`
  - Expense/Income field order is Account, Category, Amount, Date, Comment.
  - No Tags input exists. Backend tag/ref behavior is comment parsing, not a separate tag persistence contract. [Source: `docs/planning/epics.md`, FR-TXN-3]
- `inex/ClientApp/src/components/primitives/Num.tsx`
  - Renders amount and currency as one same-size string.
  - Already supports explicit `signage` override and accessible `aria-label`; preserve this behavior.

### Likely Impacted Source Files

- `inex/ClientApp/src/pages/Transactions.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionCreateExpenseForm.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionCreateIncomeForm.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionCreateTransferForm.tsx`
- `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts` if helper extraction is needed
- `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.test.ts` if helper tests are added
- `inex/ClientApp/src/pages/Transactions/transactions-ledger.css`
- `inex/ClientApp/src/components/primitives/Num.tsx`
- `inex/ClientApp/src/components/primitives/SegmentedControl.tsx` only if a compact/labeled option is needed globally
- `inex/ClientApp/src/components/primitives/Input.tsx` / `Select.tsx` only if filter drawer styling should be solved through primitives
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`

### Dependencies

- Story 10.1a must remain done because this story consumes design tokens. [Source: `docs/implementation/10-1a-frontend-ux-design-tokens-and-theme-bridge.md`]
- Story 10.1b must remain done because this story consumes shared `Num`, buttons, drawer, segmented control, inputs/selects, and empty-state primitives. [Source: `docs/implementation/10-1b-frontend-ux-shared-primitives.md`]
- Story 10.1e must remain review/done because this story consumes shared mockup-alignment contracts for labeled compact segmented controls, 220px search, compact currency suffixes, drawer footers, continuous list panels, and simple no-match rows. [Source: `docs/implementation/10-1e-shared-mockup-alignment-primitives-contract.md`]
- Story 10.1c must remain done/reviewed because mobile CTA behavior and bottom-nav clearance depend on `AppShell`. [Source: `docs/implementation/10-1c-frontend-ux-app-shell-and-navigation.md`]
- Story 10.2 and Story 10.2a must remain done because this story is a delta on top of their Transactions implementation. [Source: `docs/implementation/10-2-frontend-ux-transactions-ledger-redesign.md`; `docs/implementation/10-2a-frontend-ux-transactions-design-gap-remediation.md`]
- Story 10.6 should remain blocked until this 10.2b delta is either completed or explicitly accepted as a deferred exception by the orchestrator. [Source: `docs/implementation/10-6-frontend-ux-visual-qa-baseline-and-responsive-regression-checklist.md`]
- Parallel story owners are likely editing EN/RU locale files for 10.5a and 10.5b; coordinate/rebase before editing locale files.

### Guardrails

- Do not edit backend controllers, services, repositories, EF models, migrations, or DTO contracts for this story.
- Do not add a separate tags API field unless a supported backend contract already exists. Use the existing comment parsing model for `#tag` tokens.
- Do not migrate Transactions data loading or filters to another state architecture; preserve RTK Query usage and current URL/filter compatibility.
- Do not remove active filter chips. Epic 4 and Story 10.2 require visible active-filter affordances; this story only removes the redundant badge in the no-match state.
- Do not regress 10.2a base-currency safety: equivalent totals and amount filters must not silently mix currencies when a conversion rate is unavailable.
- Do not introduce new `any` in touched TypeScript files; replace existing `any` in touched create-flow files where practical.
- Keep all new visible text in both EN and RU locale files.
- Preserve `InExDrawer` focus/Escape behavior and focus return.
- Do not modify old Dev Agent Records in completed stories.

## Verification Checklist

- [ ] `npm test` or targeted Vitest command passes from `inex/ClientApp` for any new/changed helpers.
- [ ] `npm run build` passes from `inex/ClientApp`.
- [ ] `npm run lint` passes from `inex/ClientApp`.
- [ ] Targeted no-new-`any` search passes for touched `.ts` / `.tsx` files.
- [ ] Desktop visual QA: populated Transactions page at 1440px.
- [ ] Desktop visual QA: filter drawer open at 1440px and 1024px.
- [ ] Desktop visual QA: add drawer open at 1440px and 1024px.
- [ ] Desktop visual QA: no-match state with headers plus centered message.
- [ ] Mobile visual QA: populated Transactions at 390px and 360px.
- [ ] Mobile visual QA: no horizontal overflow, no clipped CTA text, and no bottom-nav occlusion.
- [ ] Keyboard smoke: row edit remains reachable with Enter/Space after mobile chevron removal.
- [ ] i18n smoke: EN and RU render new CTA, drawer, filter, and no-match copy without missing-key fallback.

## Open Decisions

- If product chooses to keep the mobile row chevron as a visible edit/drill-in affordance, document it as an accepted mockup deviation and revise AC 5 before development starts.
- If product chooses to keep Ant Design `RangePicker` and custom menu-style dropdowns in the filter drawer, document that AntD form controls are an accepted production deviation and revise AC 6 before development starts.
- If product chooses disabled no-filter drawer actions as a guardrail, document that deviation and revise AC 7 before development starts.
- If product chooses not to expose a Tags field in create flows, document the backend/comment-parsing rationale and revise AC 8/10 before development starts.
- If product chooses to keep the redundant `Filters active` badge in no-match state for Epic 4 consistency, document the conflict with the mockup and revise AC 11 before development starts.

## References

- `docs/ui-audit/transactions.md` - Transactions audit source, confirmed mismatches 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, and 16.
- `docs/ui-audit/implementation-roadmap.md` - section 3.1 Transactions implementation items and open page decisions.
- `docs/planning/epics.md` - Epic 10 sequence, Story 10.2/10.2a/10.6 definitions, FR-TXN-3 comment-parsed tags contract, and FR-UX requirements.
- `docs/planning/architecture.md` - Epic 10 frontend architecture addendum, dependency policy, i18n/accessibility/error-handling guardrails.
- `docs/planning/ux-design.md` - UX source index for design-system stories.
- `docs/project-context.md` - React/TypeScript/Vite/AntD stack, no new `any`, i18n, mobile overflow, and API-client guardrails.
- `docs/implementation/sprint-status.yaml` - current Epic 10 statuses; 10.2 and 10.2a done, 10.6 blocked, 10.5a/10.5b ready-for-dev.
- `docs/implementation/10-2-frontend-ux-transactions-ledger-redesign.md` - base Transactions implementation history and Dev Agent Record.
- `docs/implementation/10-2a-frontend-ux-transactions-design-gap-remediation.md` - completed Transactions remediation history and Dev Agent Record.
- `docs/implementation/10-2-transactions-design-implementation-gap-review.md` - historical gap review; most P1 items closed by 10.2a, useful for regression context.
- `docs/implementation/10-6-frontend-ux-visual-qa-baseline-and-responsive-regression-checklist.md` - final visual QA gate and failure criteria.
- `docs/implementation/10-1e-shared-mockup-alignment-primitives-contract.md` - shared mockup-alignment primitive contracts consumed by this page-local delta.

## BMad Checklist Validation

- [x] Status is `ready-for-dev`.
- [x] Story, acceptance criteria, tasks/subtasks, Dev Notes, likely impacted files, dependencies, guardrails, verification checklist, open decisions, and references are present.
- [x] Scope is limited to unresolved Transactions mismatches from `transactions.md` and roadmap section 3.1 after accounting for completed Story 10.2a work.
- [x] Source implementation files were read for current-state accuracy, but no implementation source files were edited.
- [x] Shared docs were not modified by the story worker; required shared-doc changes were integrated later by the orchestrator in this branch.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-08: Created `feature/10-2b-transactions-alignment` from local `master`; initial `.git` write required escalation.
- 2026-06-08: In-app Browser could not open localhost/127.0.0.1 Vite URLs due `ERR_BLOCKED_BY_CLIENT`; visual QA was completed with installed Playwright in `dataMode: fixture`.
- 2026-06-08: Vite/Playwright commands required escalation for Windows process spawn; screenshots were saved under `%TEMP%\inex-10-2b-visual-qa` and not committed.
- 2026-06-08: Verification commands run from `inex/ClientApp`: `npm test -- src/pages/Transactions/transaction-ledger-utils.test.ts`, `npm run build`, `npm run lint`, `npm test`, targeted `rg "\bany\b"` search on touched Transactions TypeScript files, and Playwright fixture visual QA.

### Completion Notes List

- Story context created via bmad-create-story workflow for key `10-2b-frontend-ux-transactions-mockup-alignment-delta`.
- Story status set to `ready-for-dev` in this file only.
- Shared planning/status updates were integrated by the orchestrator after story creation.
- Transactions header now uses localized `Add transaction`, full-width mobile CTA styling, smaller KPI currency suffixes through existing `Num currencySize="sm"`, and a labeled compact `View` segmented control with right-aligned search.
- Ledger day headers no longer render a calendar icon, mobile rows no longer render a chevron, and row click/Enter edit behavior is preserved.
- Filter drawer now uses separate native From/To date inputs, native multi-select account/category controls, mockup keyword placeholder, one amount-equivalent Min/Max row with base-currency suffixes, and enabled safe Clear all / Apply filters actions.
- Add drawer now uses `New transaction` / `Record a new expense`, a shared segmented mode selector, typed create-flow props/reducer/actions, reordered expense/income fields, Tags input merging into submitted comments via the existing `#tag` parsing contract, and Cancel / mode-specific save actions.
- No-match state keeps column headers, renders `No transactions match these filters`, preserves chips/clear behavior, and suppresses the redundant `Filters active` badge.
- Visual QA fixture metrics: no horizontal overflow at 1440, 390, 360, or RU 390; mobile bottom nav visible; no day-header icons or mobile chevrons; Enter opens edit drawer on mobile.

### File List

- docs/implementation/10-2b-frontend-ux-transactions-mockup-alignment-delta.md
- docs/implementation/sprint-status.yaml
- inex/ClientApp/public/locales/en/translation.json
- inex/ClientApp/public/locales/ru/translation.json
- inex/ClientApp/src/pages/Transactions.tsx
- inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx
- inex/ClientApp/src/pages/Transactions/TransactionCreateExpenseForm.tsx
- inex/ClientApp/src/pages/Transactions/TransactionCreateIncomeForm.tsx
- inex/ClientApp/src/pages/Transactions/TransactionCreateTransferForm.tsx
- inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx
- inex/ClientApp/src/pages/Transactions/TransactionList.tsx
- inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.test.ts
- inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts
- inex/ClientApp/src/pages/Transactions/transactions-ledger.css

## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-06-08 | 1.0 | Implemented Transactions mockup-alignment delta, focused tests, visual QA, and story status update. | GPT-5 Codex |
