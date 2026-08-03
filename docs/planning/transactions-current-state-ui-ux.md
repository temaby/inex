# Transactions: Current-State UI/UX Baseline

Status: baseline for review; it describes the implemented interface, not a future design proposal.

Last verified: 2026-08-03

## Evidence

The visual baseline is fixture-driven, captured on 2026-07-29. It exercises populated ledger, empty, filtered-empty, loading error, add drawer, filter drawer, and row-edit states without a live backend.

| Viewport/state | Confirmed result |
| --- | --- |
| 1440px populated | Desktop ledger; no page-level horizontal overflow. |
| 1024px populated | Desktop/tablet ledger; no page-level horizontal overflow. |
| 390px and 360px populated | Stacked mobile ledger, visible bottom navigation, no horizontal overflow or bottom-nav occlusion. |
| 390px and 360px drawers | Add and advanced-filter drawers fit the viewport. |
| Empty/filter-empty/load-error | Dedicated states are captured in the visual-QA record. |

Primary evidence is `docs/implementation/visual-qa/transactions/qa-summary.json` and its sibling PNGs. Implementation details are in `inex/ClientApp/src/pages/Transactions.tsx`, `inex/ClientApp/src/pages/Transactions/*`, and `transactions-ledger.css`.

## Experience intent as currently implemented

The page behaves as a dense, operational finance ledger. Its hierarchy is:

1. Establish the selected period and its financial summary.
2. Offer one prominent action: Add transaction.
3. Let the user find and narrow records without leaving the ledger.
4. Make amounts, financial direction, category context, account, and date scannable.
5. Let a row open directly into edit/delete work.

The page follows the shared InEx management shell: desktop top navigation, mobile top bar and bottom navigation, localised copy, shared buttons/drawers/inputs, and semantic monetary presentation.

## Desktop composition

### Page header

- Eyebrow: Overview.
- Title: Transactions.
- Right-aligned green primary button: Add transaction, with a plus icon.

### KPI strip

The white, three-column strip is immediately below the page header. The columns are Income, Expenses, and Net flow.

- Each card shows an uppercase label, a large tabular monetary value, and concise supporting text.
- Income uses green; expenses use red; net flow uses the appropriate semantic direction and an explicit sign.
- Currency is visually smaller than the numeric amount.
- A vertical divider separates cards. The strip remains a single surface rather than three unrelated cards.

### Ledger panel

The ledger is one bordered white panel with continuous rows.

- Toolbar: Ledger title, month controls, period/count text, and a Filters button.
- Controls: visible View label, compact segmented All/Income/Expense/Transfer control, and right-aligned search field.
- Table header: Description, Amount, Account, Date.
- Day groups: a light separator row with Today/Yesterday or a formatted date and item count.
- Ledger rows: description and contextual metadata on the left; monetary amount right-aligned; account and date in their own columns.
- Footer: selected-period count summary, pagination, and page-size selector.

Amount direction uses text/signage and colour. Transfers use neutral styling. Converted amounts are shown as a smaller approximate base-currency subline when a rate is available. Category paths, tags, and references appear as dense supporting metadata rather than separate cards.

## Mobile composition

At the mobile breakpoint, the primary action becomes full width under the title. KPI cards stack vertically in one shared bordered surface. The ledger panel keeps its heading, month controls, count, Filters button, segmented type control, and search, but allows these controls to wrap vertically.

The desktop table header is hidden. Each ledger row becomes a single stacked, pressable block:

- Amount appears first, followed by title and metadata.
- Account and date remain visible beneath the transaction context.
- Day-group separators remain visible.
- The final pagination content sits above the fixed bottom navigation.

The current mobile row deliberately has no visible chevron; click, Enter, and Space still open the edit drawer.

## Interaction model

| Element | User action | Current UI response |
| --- | --- | --- |
| Month previous/next and month picker | Choose a past/current month | Updates selected period and ledger/KPIs; future navigation is disabled. |
| Filters | Open advanced-filter drawer | Right-side drawer on desktop; full-width overlay on mobile. |
| View segments | Choose All, Income, Expense, or Transfer | Narrows the loaded ledger rows; counts continue to show server-summary scope. |
| Search | Type a phrase | Narrows the loaded ledger immediately. |
| Active-filter chip | Select a chip | Clears that one criterion. |
| Clear all | Select control in toolbar/chips/drawer | Restores current month and clears local controls. |
| Tag or reference token | Select token | Navigates to the Transactions route with that filter applied. |
| Ledger row | Click, Enter, or Space | Opens the edit drawer. |
| Add transaction | Select primary action | Opens the New transaction drawer, initially in Expense mode. |
| Cancel in add drawer | Select Cancel | Closes drawer and resets its local state without creating a record. |

## Drawers and form experience

Both drawers have a title, subtitle, close affordance, contained scrolling, Escape close, focus trapping, and focus return to the trigger. They use 460px (add/edit) or 480px (filter) desktop widths and full-width mobile behavior.

### New transaction

- Title/subtitle change with Expense, Income, or Transfer mode.
- A compact segmented selector sits above the fields.
- Expense and Income use account, amount with selected currency suffix, category, date, and comment fields.
- Transfer uses source account/amount, destination account/amount, date, and comment.
- In-place validation errors appear on the affected fields.
- Footer actions are Cancel and a mode-specific Save action. Save changes to Saving while a create request is pending.

The comment placeholder teaches optional `#tag` and `@reference` conventions. There is no separate Tags field in the implemented form.

### Advanced filters

- Separate From and To native date inputs.
- Multi-select Account and Category controls; category options retain visual hierarchy through indentation.
- Keyword input with `#tag` / `@reference` parsing guidance.
- Minimum and maximum amount-equivalent inputs presented together. Their currency suffix is shown only when the selected accounts share a currency; otherwise those inputs are disabled.
- Clear all and Apply filters actions are available in the footer.

## States and feedback

| State | UI treatment |
| --- | --- |
| Initial load | Skeleton KPI values and skeleton ledger rows. |
| Refresh with existing results | Small refreshing status without clearing the ledger. |
| Initial load failure | Error alert with Retry and an error detail area. |
| Refresh failure | Inline alert with Retry above preserved rows. |
| No records in selected period | Rich empty state with icon, explanation, and Add transaction. |
| No records after a server filter | Compact filter-empty panel with Clear action. |
| Local search/type/amount returns no loaded rows | Column header stays visible; one centered no-match row replaces the body. |
| Active criteria | Clearable chips appear. The toolbar's Filters active label is hidden when the page is in the local no-match state. |

## Accessibility and content standards already present

- Visible strings use the translation system; English and Russian are supported.
- Icon-only month controls have accessible labels.
- Ledger rows expose button semantics, keyboard focus, and Enter/Space activation.
- Filter chips are buttons rather than decorative labels.
- Drawers implement keyboard Escape/focus-containment behavior through the shared primitive.
- Monetary presentation uses tabular numerics, semantic kind, and explicit direction where needed; colour is not the only direction signal.

## Design constraints to preserve in future work

- The design system's quiet, table-first financial character: dense but not cramped, restrained panels, strong numerical alignment, and minimal decoration.
- Continuous ledger rows and day grouping rather than a collection of individual transaction cards on desktop.
- Mobile must remain free of horizontal overflow, clipped controls, and bottom-navigation occlusion at 390px and 360px.
- Drawers must stay keyboard-accessible and fit mobile screens.
- English remains the visual baseline; Russian remains the responsive long-label check.
- Do not rely on a raw Ant Design default appearance where a shared InEx primitive establishes a visual or accessibility contract.

## Decisions to resolve during requirements review

These are not defects asserted by this baseline; they are places where the current implementation leaves a product or UX decision open.

1. Should local type/search/amount controls become server-wide so counts, results, and empty states describe one consistent scope?
2. When conversion data is missing, should KPI cards show a warning, a partial-total label, native subtotals, or another transparent treatment?
3. Should a transfer have an explicit paired-record drill-in/edit affordance so users understand its two-sided effect?
4. Should filters be retained after closing/reopening the drawer and shared through a human-readable URL beyond the current serialized filter parameter?
5. Should the first-use empty state help users create accounts/categories when those prerequisites are missing, rather than only offering Add transaction?
6. Is the mobile ledger's amount-first row order the preferred scan path for all locales and accessibility modes?

## Review checklist for this baseline

- Confirm the described flows match a representative user's day-to-day transaction work.
- Mark each decision above as retain current behavior, change, or defer.
- Identify missing actors, entry points, exception states, and compliance rules.
- Decide which statements become stable requirements and which are merely implementation details.
- Convert accepted decisions into testable functional and UX acceptance criteria in the next PRD/design phase.
