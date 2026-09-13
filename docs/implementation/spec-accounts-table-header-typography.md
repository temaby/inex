---
title: 'Align Accounts table header typography'
type: 'bugfix'
created: '2026-09-13'
status: 'done'
route: 'one-shot'
baseline_commit: '74e1e7481ab46baf5db3003b830864f159bc35de'
---

# Align Accounts table header typography

## Intent

**Problem:** The Accounts inventory table headers rendered at 10px/800 while the adjacent compact "View" label rendered at 11px/700, creating a visible typographic mismatch.

**Approach:** Raise the Accounts table headers to 11px with a 700 weight. Keep the shared segmented control and mobile behavior unchanged.

## Suggested Review Order

- Align the desktop table labels with the compact control without changing the grid layout.
  [accounts.css:440](../../inex/ClientApp/src/pages/Accounts/accounts.css#L440)
