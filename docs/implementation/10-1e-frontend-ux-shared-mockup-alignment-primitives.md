# Story 10.1e: Frontend UX - Shared Mockup Alignment Primitives

Status: ready-for-dev

## Story

As an invited account holder,
I want the shared controls and list primitives to support the audited mockup patterns,
so that Transactions, Accounts, Categories, and Budgets can align without four separate one-off implementations.

## Acceptance Criteria

1. Given page toolbars use segmented controls, when shared primitive support is updated, then labeled compact controls can render visible labels such as `View`, `VIEW`, `Status`, and `STATUS` without each page inventing a wrapper.
2. Given the mockups use compact search fields, when shared input/search support is updated, then pages can render 220px-class search fields with consistent icon treatment, placeholder copy, shrink behavior, and mobile wrapping.
3. Given management pages use continuous list panels, when shared composition guidance is complete, then pages can render title/count rows, filter rows, desktop column headers, rows, and simple no-match rows inside one panel where the mockup requires it.
4. Given money values need compact visual treatments, when `Num` or money display helpers are updated, then currency suffix sizing and compact notation can be used without breaking existing call sites that expect a same-size string.
5. Given drawers/forms differ across pages, when shared drawer/form conventions are finalized, then right drawer width, header/close placement, body padding, footer action alignment, field density, and Cancel/Create or Cancel/Save button patterns have one contract.
6. Given filter-empty and true empty/error states are different, when empty-state conventions are updated, then populated-list no-match states can render a simple row/message while initial empty/loading/error states can remain richer where accepted.
7. Given this story is complete, when page-local stories 10.2b, 10.3g, 10.3h, and 10.3i begin, then each can cite the shared primitive contracts instead of duplicating control, drawer, number, and empty-state decisions.

## Tasks / Subtasks

- [ ] Extend or specify compact labeled segmented-control behavior. (AC: 1)
  - [ ] Decide whether `SegmentedControl` accepts label/size props or whether a small shared toolbar field wrapper is introduced.
  - [ ] Preserve keyboard accessibility, labels, and active state semantics.
  - [ ] Cover Transactions, Accounts, Categories, and Budgets label variants.
- [ ] Extend or specify compact search field behavior. (AC: 2)
  - [ ] Standardize search width, icon placement, field height, placeholder ownership, and mobile shrink/wrap behavior.
  - [ ] Preserve `min-width: 0` and avoid page-level horizontal overflow.
- [ ] Define list/table panel composition. (AC: 3)
  - [ ] Provide a shared pattern for continuous list cards with header, count, filters, column headers, rows, and filter-empty row.
  - [ ] Document desktop-only headers and mobile stacked row exceptions.
- [ ] Extend money display options. (AC: 4)
  - [ ] Support smaller currency suffix typography where mockups show it.
  - [ ] Support compact large balances where row density requires it.
  - [ ] Preserve existing `Num` behavior by default.
- [ ] Finalize drawer/form conventions. (AC: 5)
  - [ ] Decide drawer width and header/close placement contract.
  - [ ] Decide whether Ant Design controls remain accepted deviations or need compact/native-looking wrappers.
  - [ ] Standardize footer actions and field order guidance.
- [ ] Split filter-empty from rich empty/error states. (AC: 6)
  - [ ] Define when simple table-area no-match rows are required.
  - [ ] Preserve initial empty, loading, partial-error, and full-error richness where product accepts it.
- [ ] Document dependencies for page-local stories. (AC: 7)
  - [ ] Add explicit references in page stories to these shared decisions.
  - [ ] Keep page-local CSS only for page-specific grids and row content.

## Dev Notes

### Audit Evidence

- The roadmap section 2 identifies shared table/filter/form/component work before page-local work. [Source: `docs/ui-audit/implementation-roadmap.md`]
- Transactions findings 5, 6, 9, 10, 11, 12, 13, 14, and 16 show missing shared number, toolbar, drawer/form, and filter-empty capabilities. [Source: `docs/ui-audit/transactions.md`]
- Accounts findings 6, 7, 8, 12, 14, 15, and 18 show shared search, labels, headers, compact money, density, mobile rows, and state coverage needs. [Source: `docs/ui-audit/accounts.md`]
- Categories findings C07, C08, C09, C13, C15, C16, C17, C18, and C19 show list panel, compact controls/search, rows, filter-empty, drawer/form, and expanded-row conventions. [Source: `docs/ui-audit/categories.md`]
- Budgets findings 12, 13, 14, 15, 16, 17, 20, 21, 22, and 24 show list panel, controls, table schema, progress/money, row density, status rail, and card chrome needs. [Source: `docs/ui-audit/budgets.md`]

### Likely Impacted Source Files For Later Dev Story

- `inex/ClientApp/src/components/primitives/SegmentedControl.tsx`
- `inex/ClientApp/src/components/primitives/Input.tsx`
- `inex/ClientApp/src/components/primitives/Num.tsx`
- `inex/ClientApp/src/components/primitives/InExDrawer.tsx`
- `inex/ClientApp/src/components/primitives/Button.tsx`
- `inex/ClientApp/src/components/primitives/EmptyState.tsx`
- `inex/ClientApp/src/components/Dropdown.tsx`
- `inex/ClientApp/src/layouts/AppShell.css`
- Page CSS files for Transactions, Accounts, Categories, and Budgets
- EN/RU locale files for placeholder and label copy

### Dependencies And Sequencing

- Must start after 10.1d policy decisions are documented, because locale/fixture policy controls visual acceptance language and state expectations.
- Must complete before page-local delta stories 10.2b, 10.3g, 10.3h, and 10.3i.
- May be implemented in parallel with documentation-only planning updates, but not with page-local primitive rewrites unless ownership is explicitly split.

### Guardrails

- Do not solve shared control behavior separately in each page if a primitive extension is reasonable.
- Do not break existing call sites that consume default `Num`, `Input`, `SegmentedControl`, `InExDrawer`, or `EmptyState` behavior.
- Do not add dependencies unless a story explicitly approves them.
- Keep EN/RU copy in locale files and avoid hardcoded visible strings.
- Preserve keyboard and screen-reader behavior when compacting controls.

### Verification Checklist

- [ ] Shared control contract covers toolbar labels and compact sizing.
- [ ] Shared search contract covers width, icon, placeholder, shrink/wrap behavior.
- [ ] List-panel pattern covers title/count/filter/header/row/filter-empty composition.
- [ ] Money display defaults remain backward compatible.
- [ ] Drawer/form contract covers close placement, width, body padding, and footer actions.
- [ ] Filter-empty and initial empty/error states are explicitly separated.
- [ ] Page-local stories cite this story before implementing deltas.

## Open Decisions

- Should `SegmentedControl` own visible labels, or should a shared toolbar field wrapper own them?
- Should Ant Design controls remain an accepted production deviation inside drawers, or should compact field wrappers be introduced?
- Should compact money suffix styling live inside `Num` props or page-specific wrappers?
- Should a formal list-panel component be introduced, or should the shared contract stay as CSS/composition guidance?

## References

- `docs/ui-audit/implementation-roadmap.md`
- `docs/ui-audit/transactions.md`
- `docs/ui-audit/accounts.md`
- `docs/ui-audit/categories.md`
- `docs/ui-audit/budgets.md`
- `docs/implementation/10-1b-frontend-ux-shared-primitives.md`
- `docs/implementation/10-2a-frontend-ux-transactions-design-gap-remediation.md`
- `docs/implementation/10-3d-frontend-ux-accounts-design-gap-remediation.md`
- `docs/implementation/10-3e-frontend-ux-categories-spend-and-budget-signals.md`
- `docs/implementation/10-3f-frontend-ux-budgets-burn-rate-and-planning-detail.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

- Story created from mockup audit roadmap via BMad create-story workflow.
- Correct-course proposal source: `docs/planning/sprint-change-proposal-2026-06-07-epic-10-mockup-alignment.md`.

### File List

- `docs/implementation/10-1e-frontend-ux-shared-mockup-alignment-primitives.md`
