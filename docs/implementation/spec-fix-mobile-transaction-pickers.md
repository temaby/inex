---
title: 'Keep transaction account and category pickers usable on mobile'
type: 'bugfix'
created: '2026-11-06'
status: 'done'
baseline_commit: 'f6a9b58af94ecf315125352441c5cc9da19f993d'
context:
  - 'docs/project-context.md'
  - 'inex/ClientApp/AGENTS.md'
  - 'docs/planning/transactions-ux-design-specification.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Mobile transaction account/category lists shift to the upper-left corner. Their shared vertical Menu opens sideways; a full-width drawer leaves no horizontal room. Screenshots demonstrate the failure; exact browser bounds require reproduction.

**Approach:** Anchor the popup below/above its field and expand nested categories within its width. Preserve selections and callbacks; verify scrolling and keyboard access.

## Boundaries & Constraints

**Always:** Preserve picker callbacks, selected IDs, single/multiple selection, category eligibility, historical selections, translations, API requests, and drawer accessibility. Use installed Ant Design and design tokens. Bound popup width and scrolling. Create `fix/mobile-transaction-pickers` after approval; current checkout is clean on `fix/dashboard-overview-account-scope`.

**Ask First:** Changes to selection semantics, category eligibility, backend contracts, dependencies, or transaction persistence.

**Never:** Call real APIs from QA; alter calculations; hardcode visible text; rewrite completed stories; push without authorization.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Account selection | Mobile Expense/Income drawer, populated accounts | Popup follows its field, options remain reachable, selecting updates the account and currency | Preserve existing validation |
| Nested category | Parent category with children | Children expand within the popup; a selectable child retains its original ID | Preserve existing validation |
| Long lists and names | 360px viewport, Russian labels, more rows than available height | Popup scrolls internally and stays within viewport bounds | No page-level overflow |
| Scrolled drawer | Field is opened after scrolling | Popup remains attached to its field and usable near viewport edges | Dismiss safely when appropriate |
| Existing consumers | Edit, transfer, internal transfer, correction, and budget forms | Values and callback contracts remain compatible; multi-selection still works where used | Preserve current API error feedback |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/components/Dropdown.tsx` -- shared account/category picker; currently a vertical Ant Design Menu with a synthetic root submenu.
- `inex/ClientApp/src/components/Dropdown.module.css` -- legacy picker stylesheet; its current import is unused and has an incorrect relative path.
- `inex/ClientApp/src/pages/Transactions/` -- creation/edit consumers and existing form tests.
- `inex/ClientApp/src/pages/Budgets.tsx` and `inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx` -- shared consumers.
- `inex/ClientApp/visual-qa/transactions.mjs` -- isolated fixture runner.

## Tasks & Acceptance

**Execution:**
- [x] `inex/ClientApp/src/components/Dropdown.tsx` -- replace side flyouts with an anchored popup and inline category expansion; retain callbacks and dismissal.
- [x] `inex/ClientApp/src/components/Dropdown.module.css` -- add scoped width, scrolling, and wrapping rules; correct the import.
- [x] `inex/ClientApp/src/components/Dropdown.test.tsx` -- test selection, nested categories, reopening, and multiple selection.
- [x] `inex/ClientApp/visual-qa/mobile-transaction-pickers.mjs` -- add isolated open-picker bounds and interaction checks at 1440/1024/390/360px, including Russian and scrolled states.
- [x] `docs/implementation/visual-qa/mobile-transaction-pickers/` and `docs/design/docs/visual-qa-checklist.md` -- save and inspect fixture evidence and record results.

**Acceptance Criteria:**
- Given mobile creation, when a picker opens, then options fit the viewport and selection updates the expected ID.
- Given nested categories, when a parent is activated, then children remain touch/keyboard reachable.
- Given long translated lists and drawer scrolling, when options open/scroll, then controls remain attached and unclipped.
- Given desktop/edit/budget consumers, when selections change or persist, then request contracts remain unchanged.
- Given an open picker, when dismissed, then focus and drawer closing remain predictable.

## Design Notes

Installed rc-menu uses `rightTop` placement with X/Y overflow adjustment. Fixing only the root placement leaves child flyouts broken. Use one bounded overlay; verify portal containment against drawer focus trapping.

The installed Ant Design Dropdown forces Menu content into vertical mode. The implementation uses Popover with an inline Menu to keep category children within one overlay. Existing page QA selectors now target the picker buttons. Dedicated picker QA reuses the Transactions/Budgets API fixtures without replacing their page baselines.

## Verification

- Project doctor `-Ui`: already PASS, 0 failures and 0 warnings.
- Run focused picker and transaction form tests, then `npm run build` and `npm run lint`.
- Run targeted fixture browser QA, inspect generated screenshots, and verify popup bounds, scrollability, selection outcomes, Escape, and focus return.
- Run relevant budget fixture states if shared-picker rendering changes there.

**Results:** Build and lint PASS. 35 distinct component/form/budget tests PASS across focused runs. Dedicated browser QA: 17/17 PASS, including real mouse/touch scrolling, bottom-of-list selections, nested child selection, scrolling the drawer while open, Tab dismissal, Escape, focus return, and viewport bounds. Screenshots inspected; no real API calls or unhandled requests. Three independent reviews completed; the Tab dismissal finding and QA coverage gaps were patched and verified.

## Suggested Review Order

- Anchor the shared picker and keep categories within its popup.
  [Dropdown.tsx:29](../../inex/ClientApp/src/components/Dropdown.tsx#L29)
- Wrap labels and bound scrolling without lateral flyouts.
  [Dropdown.module.css:6](../../inex/ClientApp/src/components/Dropdown.module.css#L6)
- Verify callbacks and keyboard dismissal with real components.
  [Dropdown.test.tsx:22](../../inex/ClientApp/src/components/Dropdown.test.tsx#L22)
- Inspect isolated browser interactions and measured bounds.
  [mobile-transaction-pickers.mjs:1](../../inex/ClientApp/visual-qa/mobile-transaction-pickers.mjs#L1)


