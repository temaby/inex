---
title: 'Restrict transaction editor categories to active options'
type: 'bugfix'
created: '2026-08-29'
baseline_commit: '3c3d1fa75f2354abda455a4abaaa0c548c663841'
status: 'in-review'
context:
  - 'docs/project-context.md'
  - 'inex/ClientApp/AGENTS.md'
  - 'docs/planning/transactions-ux-design-specification.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The transaction editor currently receives the complete category collection, so its Category picker presents disabled categories. Its Account and Category picker configuration also drifts from the add-transaction form, creating an inconsistent editing experience.

**Approach:** Make the edit form expose the same active-category choice set and Account/Category picker treatment as the add form, while preserving the currently stored account/category values and the existing update contract.

## Boundaries & Constraints

**Always:** Keep the change frontend-only; use the existing `Dropdown`, translations, drawer accessibility, RTK Query mutation, and current transaction route. Treat `isEnabled` as the active-category criterion. Preserve an existing inactive selection long enough to open and save an old transaction without silently changing its category.

**Ask First:** Stop if matching the add form requires a shared primitive redesign, a backend/API change, category data migration, or a decision to forbid editing historical inactive-category transactions.

**Never:** Do not alter transaction API routes, request shape, server validation, account/category lifecycle rules, user ownership behavior, drawer focus behavior, or unrelated Transactions layout and visual-QA baselines.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Active category selection | Edit drawer opens with enabled and disabled categories loaded | The category menu offers enabled categories only and uses the add-form's picker treatment. | N/A |
| Existing inactive category | The edited transaction references a disabled category | The current value remains represented on open; a save that changes another field does not substitute a category. | Keep the update drawer and existing API error flow if saving fails. |
| Active account selection | Edit drawer opens | The Account control matches the add form's label, placeholder, single-select behavior, and selected-value handling. | N/A |
| Category change | User selects an enabled leaf or system category | The selected category ID is sent through the existing update mutation. | Existing mutation error feedback remains intact. |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Transactions/TransactionEditForm.tsx` -- edit-form initialization, category tree, dropdown props, and update mutation.
- `inex/ClientApp/src/pages/Transactions/TransactionCreateExpenseForm.tsx` -- add-form reference for Account/Category picker configuration.
- `inex/ClientApp/src/pages/Transactions/TransactionCreateIncomeForm.tsx` -- same reference for the income mode.
- `inex/ClientApp/src/pages/Transactions.tsx` -- establishes active accounts/categories for add and passes the full category collection to the ledger/edit path.
- `inex/ClientApp/src/pages/Transactions/TransactionEditForm.test.tsx` -- focused regression coverage for editor state and update payload.
- `inex/ClientApp/src/pages/Transactions/transactions-ledger.css` -- inspect only if a narrow edit-control styling adjustment is needed.

## Tasks & Acceptance

**Execution:**
- [x] `inex/ClientApp/src/pages/Transactions/TransactionEditForm.tsx` -- derive the selectable category tree from enabled categories, retain a historical selected category independently, and align Account/Category `Dropdown` configuration with the add-form reference -- prevents disabled options and visual drift without changing the update contract.
- [x] `inex/ClientApp/src/pages/Transactions/TransactionEditForm.test.tsx` -- cover active-only menu input plus the retained historical-selection/update path -- prevents regression of old transaction edits.
- [x] `inex/ClientApp/src/pages/Transactions.tsx` -- no change required: the editor keeps complete category data for historical-value rendering and derives its own active choice tree.
- [ ] `docs/implementation/visual-qa/transactions/` -- capture the edit drawer state through the existing fixture harness after runtime readiness is restored -- demonstrates desktop/mobile presentation parity.

**Acceptance Criteria:**
- Given enabled and disabled categories are loaded, when a transaction is edited, then only enabled categories are offered for selection.
- Given edit Account and Category controls are compared to add Expense/Income controls, when each renders, then they share the same component, single-select behavior, placeholders, selected-value treatment, and visual configuration.
- Given a transaction references a disabled historical category, when a user changes only its comment or amount and saves, then its original category ID is retained in the existing update request.
- Given the user selects an enabled category and saves, when the update mutation is invoked, then its request contains the newly selected category ID and otherwise retains its existing contract.
- Given the edit drawer is displayed at 1440px, 390px, and 360px, when Account and Category controls render, then no clipping, page overflow, or drawer keyboard/focus regression occurs.

## Design Notes

The add form is the golden reference. Reuse its `Dropdown` usage rather than adding a second edit-only picker style. The editor may render an already selected inactive category as a historical value, but that value must not become a selectable menu option.

## Verification

**Commands:**
- `npm test -- src/pages/Transactions/TransactionEditForm.test.tsx` -- expected: focused regression suite passes.
- `npm run build` -- expected: TypeScript and Vite build pass.
- `npm run lint` -- expected: frontend lint passes.
- `npm run visual-qa:transactions` followed by `npm run visual-qa:verify` -- expected: fixture QA passes and includes edit-drawer evidence.

**Manual checks:**
- Open an edit drawer with enabled and disabled categories at desktop and mobile widths; inspect the category menu, retained historical selection, Account/Category visual parity, Escape close, and focus return.

**Blocker:** The local visual-QA harness cannot bind its loopback server port (`EACCES`). Its generated baseline directory was restored unchanged after the failed attempt; fresh edit-drawer evidence must be captured by a runtime environment where the harness can start.
