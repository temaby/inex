---
title: 'Remove unused desktop space from management list grids'
type: 'bugfix'
created: '2026-07-29'
status: 'done'
baseline_commit: '5253e3e9be9e68573caf8c14a17088abbec915f5'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/design/docs/design-implementation-guide.md'
  - '{project-root}/docs/planning/ux-design-specification.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The desktop Accounts, Transactions, Categories, and Budgets lists leave a large empty region inside their full-width panels beneath the right-aligned search control. This weakens the table-like scan path and makes the page look broken.

**Approach:** Restore fluid desktop track sizing for meaningful data columns while preserving each page’s current column order, compact fixed-width fields, row interactions, and mobile reflow.

## Boundaries & Constraints

**Always:** Keep list headers and data rows on the same template; retain numeric alignment, the management-page frame, all controls, and the existing 768px/1048px mobile transitions. Preserve i18n and data behavior.

**Ask First:** Do not change the management frame width, column labels/order, or the current breakpoint thresholds without approval.

**Never:** Do not add placeholder columns, alter the search placement, constrain the entire list panel to a smaller width, or change API/state behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Desktop populated list | 1440px management route with fixture data | Meaningful data columns fill the available panel width; header and rows stay aligned. | N/A |
| Tablet/mobile list | 1024px and existing mobile fixtures | Existing compact/stacked layouts remain readable without horizontal overflow. | N/A |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Accounts/accounts.css` — grouped and flat account inventory desktop grid.
- `inex/ClientApp/src/pages/Transactions/transactions-ledger.css` — transaction header and ledger-row desktop grid.
- `inex/ClientApp/src/pages/Categories/categories.css` — category header and row desktop grid.
- `inex/ClientApp/src/pages/Budgets/budgets.css` — budget header and row desktop grid.
- `inex/ClientApp/visual-qa/{accounts,transactions,categories,budgets}.mjs` — fixture-based desktop, tablet, and mobile visual coverage.

## Tasks & Acceptance

**Execution:**
- [x] `inex/ClientApp/src/pages/Accounts/accounts.css` — make the identity and balance tracks consume available desktop space while keeping currency, share, and chevron compact.
- [x] `inex/ClientApp/src/pages/Transactions/transactions-ledger.css` — restore fluid desktop ledger tracks for description, amount, and account while retaining the bounded date column.
- [x] `inex/ClientApp/src/pages/Categories/categories.css` — restore the flexible category track so the header and rows reach the panel edge without changing the compact spend/activity/action tracks.
- [x] `inex/ClientApp/src/pages/Budgets/budgets.css` — restore flexible desktop budget tracks while leaving the 1048px single-column transition intact.
- [x] `inex/ClientApp` visual QA — capture fixture evidence for all four routes and verify generated summaries.

**Acceptance Criteria:**
- Given a populated desktop route at 1440px, when its list is rendered, then no large unused right-side region remains inside the table beneath the search control.
- Given a list header and its rows, when the viewport is desktop width, then their columns remain aligned and monetary values retain their current right-alignment.
- Given existing 1024px, 390px, and 360px fixture states, when visual QA runs, then no page-level horizontal overflow, clipped controls, or mobile reflow regression is reported.

## Spec Change Log

## Design Notes

The page frame remains bounded at 1360px. This change distributes space only within a list’s meaningful desktop columns, instead of leaving a visually separate empty track inside a full-width list panel.

## Verification

**Commands:**
- `npm run build` — expected: TypeScript and Vite build succeed.
- `npm run lint` — expected: no lint errors.
- `npm run visual-qa:accounts`, `npm run visual-qa:transactions`, `npm run visual-qa:categories`, `npm run visual-qa:budgets` — expected: fixture screenshots and passing summaries at their declared viewports.
- `npm run visual-qa:verify` — expected: all visual-QA summaries pass.

## Suggested Review Order

**Desktop scan-path layout**

- Makes account identity and balance consume the full desktop row width.
  [accounts.css:203](../../inex/ClientApp/src/pages/Accounts/accounts.css#L203)

- Restores the transaction ledger’s fluid primary data columns.
  [transactions-ledger.css:240](../../inex/ClientApp/src/pages/Transactions/transactions-ledger.css#L240)

- Keeps category spend and activity aligned while the hierarchy column fills space.
  [categories.css:265](../../inex/ClientApp/src/pages/Categories/categories.css#L265)

- Applies the same fluid template to budget headers and rows.
  [budgets.css:347](../../inex/ClientApp/src/pages/Budgets/budgets.css#L347)

**Visual evidence**

- Records the refreshed Accounts fixture geometry and screenshot evidence.
  [qa-summary.json:1](visual-qa/accounts/qa-summary.json#L1)

- Records the refreshed Transactions fixture geometry and screenshot evidence.
  [qa-summary.json:1](visual-qa/transactions/qa-summary.json#L1)

- Records the refreshed Categories fixture geometry and screenshot evidence.
  [qa-summary.json:1](visual-qa/categories/qa-summary.json#L1)

- Records the refreshed Budgets fixture geometry and screenshot evidence.
  [qa-summary.json:1](visual-qa/budgets/qa-summary.json#L1)
