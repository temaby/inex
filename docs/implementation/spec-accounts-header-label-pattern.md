---
title: 'Align Accounts headers with Categories'
type: 'bugfix'
created: '2026-09-14'
status: 'done'
route: 'one-shot'
baseline_commit: '3b6997ed8a2a7d7a03118f3321573a78d036b2f2'
---

# Align Accounts headers with Categories

## Intent

**Problem:** Accounts table headers used a lighter color and lacked the per-cell no-wrap and truncation behavior used by Categories headers.

**Approach:** Apply the Categories list-header typography and cell-overflow pattern to Accounts while preserving the existing grid and mobile header hiding rule.

## Suggested Review Order

- Keep Accounts labels visually consistent with Categories without changing the inventory grid.
  [accounts.css:440](../../inex/ClientApp/src/pages/Accounts/accounts.css#L440)
