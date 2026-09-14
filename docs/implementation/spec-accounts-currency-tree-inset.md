---
title: 'Align Accounts currency tree inset'
type: 'bugfix'
created: '2026-09-14'
status: 'done'
route: 'one-shot'
---

# Align Accounts currency tree inset

## Intent

**Problem:** Currency-group rows in Accounts had a wrapper inset that Categories tree rows do not use, leaving a visible empty rail.

**Approach:** Keep the group divider flush with the panel while placing Account markers, titles, connectors, and columns on the same interior rails as Categories.

## Suggested Review Order

- Make group boundaries span the panel without moving the hierarchy content.
  [`accounts.css:448`](../../inex/ClientApp/src/pages/Accounts/accounts.css#L448)

- Keep desktop leaf columns aligned after the wrapper inset is removed.
  [`accounts.css:499`](../../inex/ClientApp/src/pages/Accounts/accounts.css#L499)

- Preserve the shared mobile parent and child hierarchy rails.
  [`accounts.css:792`](../../inex/ClientApp/src/pages/Accounts/accounts.css#L792)
