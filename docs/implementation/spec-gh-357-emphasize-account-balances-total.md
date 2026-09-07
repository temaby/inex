---
title: 'Emphasize the Transactions account-balances total'
type: 'bugfix'
created: '2026-09-07'
status: 'done'
route: 'one-shot'
context:
  - 'AGENTS.md'
  - 'inex/ClientApp/AGENTS.md'
  - 'docs/project-context.md'
  - 'docs/planning/transactions-ux-design-specification.md'
---

# Emphasize the Transactions account-balances total

## Intent

**Problem:** The account-balances companion showed `TOTAL` before account rows in a smaller type size, weakening the summary's scan order.

**Approach:** Render the account list before the total and style the summary as an emphasized, same-or-larger final row without changing balance data, conversion, localization, or companion presentation.

## Suggested Review Order

**Summary hierarchy**

- Render the account rows before the final converted summary.
  [`AccountBalancesCompanion.tsx:91`](../../inex/ClientApp/src/pages/Transactions/AccountBalancesCompanion.tsx#L91)

- Use semantic surface contrast and readable summary typography.
  [`transactions-ledger.css:147`](../../inex/ClientApp/src/pages/Transactions/transactions-ledger.css#L147)

**Regression evidence**

- Lock the rendered DOM order for the final summary row.
  [`AccountBalancesCompanion.test.tsx:74`](../../inex/ClientApp/src/pages/Transactions/AccountBalancesCompanion.test.tsx#L74)

- Verify the fixture view has final order and visual emphasis across companion variants.
  [`transactions.mjs:733`](../../inex/ClientApp/visual-qa/transactions.mjs#L733)
