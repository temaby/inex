---
title: Include all active accounts in dashboard reports
type: bugfix
created: '2026-10-25'
status: done
---

## Problem and intended behavior

Dashboard used the same favorite-account IDs for wallet balances, transaction summaries, category reads and drill-down links. Transactions defaults to all active accounts, so non-favorite account activity appeared there but was absent from dashboard reports before category grouping. The user's current instruction supersedes the earlier dashboard rule that overview visibility determines reporting scope.

Use two scopes within the selected own/linked financial workspace:

- Reporting: all enabled accounts, regardless of the favorite flag. Apply those IDs to monthly income/expense summaries, category transactions, cash-flow links and category drill-down links.
- Wallet display: enabled favorite accounts only. Balance queries, native balance lists, totals and wallet share bars retain this scope.

Activity mode remains active, matching the Transactions default; disabled accounts remain excluded. Both classic and visual dashboards use the shared model. Changing favorite flags does not remove report activity. With no favorite wallets but active accounts, show the existing empty wallet state while reports and scoped transaction links remain usable. With no active accounts, skip report reads and prevent unrestricted drill-down. Unknown or failed account scope retains existing loading/error handling.

No backend, API contract, dependency, financial conversion, category ranking or localization changes are needed. Other continues to group categories after the first eight; grouping is independent of account selection.

## Verification

- Project doctor: PASS, 21 UI checks, no warnings.
- Full frontend regression suite: PASS, 40 files / 300 tests with two workers.
- Focused dashboard/aggregation/preferences: PASS, 56 tests. Added classic/visual, own/linked, no-favorite, disabled-account, navigation and foreign-rate regressions.
- Frontend production build/typecheck and lint: PASS.
- Visual dashboard browser fixtures: PASS, 36 states. Four additional captures verify report activity on a non-favorite foreign-currency account, favorite-only balances, desktop/mobile empty favorite lists and linked scope. Synthetic report totals are income 500, expenses 150 and result 350; a disabled account's expense is excluded.
- Classic dashboard browser fixtures: PASS, all 17 states.
- Inspected desktop mixed-favorite and no-favorite screenshots. Existing 1440x800/900 height checks and 1024/390/360 responsive checks pass.

Browser fixtures intercept every API request and use cached synthetic FX rates; no real backend or rate provider is called. Evidence is in `docs/implementation/visual-qa/visual-dashboard/`, including `report-all-active-1440.png`, `report-only-1440.png`, `report-only-390.png` and `report-linked-1440.png`.

Canonical visual-summary verification reports only seven unrelated summaries exceeding its 24-hour freshness limit; both affected dashboard summaries pass. Windows browser-profile cleanup emits a non-blocking temporary-directory warning after successful captures.
