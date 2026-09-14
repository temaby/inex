---
title: 'Align Accounts tree indentation with Categories'
type: 'bugfix'
created: '2026-09-14'
status: 'in-progress'
baseline_commit: 'd398238c2ebd31786a2f8ec774ae25606f81d7fe'
context:
  - 'docs/project-context.md'
  - 'inex/ClientApp/AGENTS.md'
  - 'docs/design/docs/design-implementation-guide.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Currency-tree leaf rows in Accounts lost their intended hierarchy indentation after a later inventory-header change changed their desktop padding from 42px to 14px. The Accounts column header `Account` also appears inset, and its relationship to the Categories list header must be understood before altering it.

**Approach:** Restore the Accounts leaf-row nesting increment used by Categories while preserving each page's established base gutter. Keep the Accounts column-header alignment behavior only if inspection confirms it aligns with the grouped list's content frame rather than representing a second hierarchy indent.

## Boundaries & Constraints

**Always:** Preserve Account data loading, interactions, accessibility, responsive layout, and localization; use the existing CSS-only page pattern; verify desktop and mobile fixture states; preserve unrelated working-tree changes.

**Ask First:** Change shared list-panel primitives, Accounts markup, grid columns, or the established base gutters for Accounts/Categories; these would expand the change beyond restoring the hierarchy relationship.

**Never:** Change API/state behavior, add dependencies, alter Categories behavior, or treat generated frontend build output as a deliverable.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Desktop tree leaf | Accounts currency group at a viewport wider than 768px | Leaf receives the same 28px nesting increment as a Categories child: Accounts base 14px + 28px = 42px. | N/A |
| Mobile tree leaf | Accounts currency group at 768px or narrower | Leaf preserves the equivalent Accounts mobile increment: base 12px + 28px = 40px. | N/A |
| Inventory header | Populated desktop Accounts list | `Account` stays aligned to the Accounts list content frame (card inset 20px + row gutter 14px = 34px), without inheriting tree-leaf indentation. | N/A |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Accounts/accounts.css` -- defines Accounts list/card gutters, desktop and mobile leaf indentation, and inventory-header padding.
- `inex/ClientApp/src/pages/Categories/categories.css` -- reference implementation for its 28px hierarchy increment and page base gutter.
- `inex/ClientApp/visual-qa/accounts.mjs` -- fixture-based responsive visual QA for grouped Accounts rows.
- `docs/design/docs/visual-qa-checklist.md` -- records the required visual QA evidence.

## Tasks & Acceptance

**Execution:**

- [ ] `inex/ClientApp/src/pages/Accounts/accounts.css` -- restore the 42px desktop tree-leaf padding; retain the existing 40px mobile override and the 34px inventory-header content-frame alignment; avoid changes to the grid, markup, and shared styles.
- [ ] `docs/design/docs/visual-qa-checklist.md` -- record fresh fixture evidence for the affected Accounts desktop and mobile grouped-list states.

**Acceptance Criteria:**

- Given a grouped Accounts list on desktop, when a currency-tree leaf is rendered, then its left gutter adds the same 28px hierarchy increment as a child Category row.
- Given a grouped Accounts list at 390px or 360px, when a currency-tree leaf is rendered, then it keeps its 40px mobile left padding with no horizontal overflow or clipped controls.
- Given a populated desktop Accounts list, when the inventory header is shown, then `Account` remains at the list content-frame offset and does not shift with tree-leaf indentation.
- Given the Accounts fixture suite, when the page is rendered at its covered breakpoints, then visual QA reports no regressions.

## Design Notes

Categories uses an additive hierarchy increment: its normal row starts at 16px and a depth-one child starts at 44px, a 28px increase. Accounts uses a 14px desktop row gutter and a 12px mobile gutter, so its equivalent leaf positions are 42px and 40px. The Accounts `Account` column header's 34px inset is a separate content-frame calculation (`20px` card inset + `14px` row gutter), introduced by `51b2c8ab`; it should not follow the leaf's 28px nesting increment.

## Verification

**Commands:**

- `npm run build` (from `inex/ClientApp`) -- expected: production build succeeds.
- `npm run lint` (from `inex/ClientApp`) -- expected: lint succeeds without new errors.
- `npm run visual-qa:accounts` (from `inex/ClientApp`) -- expected: fixture summary passes for grouped desktop and mobile Accounts states.
- `npm run visual-qa:verify` (from `inex/ClientApp`) -- expected: overall visual QA verification passes.

**Manual checks:**

- Compare populated Accounts screenshots at 1440px, 390px, and 360px to confirm leaf hierarchy is visible, the `Account` header remains aligned to the list frame, and no mobile overflow, clipping, or bottom-navigation occlusion appears.

## Spec Change Log
