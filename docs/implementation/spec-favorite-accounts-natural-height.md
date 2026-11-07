---
title: Favorite accounts list with natural height
type: bugfix
created: '2026-11-07'
status: done
route: one-shot
---

# Favorite accounts list with natural height

## Intent

**Problem:** The favorite accounts widget limits its list height and requires internal scrolling to reach all accounts.

**Approach:** Remove the list height and scrolling rules so the widget grows downward with every account. The total and All accounts link follow the complete list. This replaces the bounded-list behavior from the earlier favorite sidebar specification at the user's request; existing drawer and page scrolling remain available.

## Suggested Review Order

- Inspect the natural-height list styling.
  [transactions-ledger.css:197](../../inex/ClientApp/src/pages/Transactions/transactions-ledger.css#L197)
- Check that fixture QA rejects internal list scrolling and retains all 17 stress accounts.
  [transactions.mjs:1215](../../inex/ClientApp/visual-qa/transactions.mjs#L1215)
- Inspect desktop and narrow Russian stress captures and the 21-state fixture summary.
  [QA summary](visual-qa/favorite-accounts-sidebar/qa-summary.json)
  [Desktop](visual-qa/favorite-accounts-sidebar/account-overview-stress-1440.png)
  [Russian mobile](visual-qa/favorite-accounts-sidebar/account-overview-stress-ru-360.png)
