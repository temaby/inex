# Story 10.1e Shared Mockup Alignment Primitive Contracts

Status: active contract for page-local stories 10.2b, 10.3g, 10.3h, and 10.3i.

## Toolbar Controls

- Use `SegmentedControl` from `inex/ClientApp/src/components/primitives`.
- `label` renders the visible compact toolbar label inside the shared primitive. Callers own localized text and casing, so `View`, `VIEW`, `Status`, and `STATUS` are all valid.
- `size="compact"` is the default page-toolbar variant for audited management-page filters and view/status controls.
- The primitive keeps native `<button type="button">` controls with `aria-pressed` for active state. Do not add page-local non-semantic segmented wrappers.

## Compact Search

- Use `Input variant="search"` for 220px-class management-page searches.
- The search variant uses a leading search icon, `type="search"`, compact padding, default `width: 220px`, `flex: 1 1 220px`, `max-width: 100%`, and `min-width: 0`.
- Pages own translated placeholders and accessible labels. Search controls must live in flex-wrapping toolbar/filter rows so 390px and 360px viewports do not overflow.

## Continuous List Panels

- Use the list-panel composition exports when a mockup requires one continuous panel:
  - `ListPanel`
  - `ListPanelHeader`
  - `ListPanelFilterBar`
  - `ListPanelColumnHeader`
  - `ListPanelNoMatchRow`
- The standard composition order is title/count row, filter row, desktop column header, rows, and optional simple no-match row.
- `ListPanelColumnHeader` is desktop-only through the shared `AppShell.css` contract. Mobile rows remain page-local stacked content and must not add horizontal scroll.
- Row grids, row content, expand/collapse details, and domain-specific cells stay page-local.

## Money Values

- `Num` defaults remain backward compatible: amount and currency render as one same-size visible string.
- Use `currencySize="sm"` where mockups show a smaller adjacent currency suffix.
- Use existing `compact` for dense large balances. The compact option preserves tabular numerics, signage, kind color, and accessible labels.

## Drawers And Forms

- Use `InExDrawer` for page drawers so focus/Escape behavior remains delegated to Ant Design Drawer.
- Default width remains `440` for backward compatibility. Use `width={520}` for dense management forms that need the audited wider right drawer.
- Header title/subtitle and close placement are owned by `InExDrawer`.
- Body padding defaults to `24` and can be adjusted with `bodyPadding` only for documented density needs.
- Use the `footer` prop for drawer action rows. Use `footerAlign="end"` for standard `Cancel` plus `Create`/`Save` actions; `between` is reserved for destructive-secondary layouts.
- Ant Design form controls remain accepted inside drawer bodies when they preserve accessibility, validation, keyboard behavior, and existing API contracts. Page stories may introduce native-looking shared wrappers later only when a specific control cannot meet the mockup contract.

## Empty And No-Match States

- Use `ListPanelNoMatchRow` for populated-list filter/search no-match states inside a continuous list panel.
- Use richer `EmptyState` or existing accepted rich loading/error treatments for first-use empty, initial loading, partial-error, and full-error states.
- Page stories own localized no-match copy such as `No transactions match these filters`, `No categories match these filters`, and `No budgets match these filters`.

## Page-Local Story Dependency

- Story 10.2b should consume these contracts for Transactions toolbar labels, compact search, `Num currencySize="sm"`, drawer footer actions, and simple no-match rows.
- Story 10.3g should consume these contracts for Accounts `STATUS`/`VIEW` controls, search width, desktop headers, compact balances, drawer actions, and filter-empty separation.
- Story 10.3h should consume these contracts for Categories continuous list panel, `Status`/`View` controls, compact search, drawer actions, and simple no-match rows.
- Story 10.3i should consume these contracts for Budgets header/list controls, compact search, sort segmented controls, money suffixes, drawer actions, desktop headers, and simple no-match rows.
