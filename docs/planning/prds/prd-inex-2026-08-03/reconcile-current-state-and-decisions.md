# Input Reconciliation: Current State and Confirmed Decisions

Reviewed inputs:

- `docs/planning/transactions-current-state-functionality.md`
- `docs/planning/transactions-current-state-ui-ux.md`
- `.decision-log.md`

## Reconciliation outcome

| Finding | Resolution in `prd.md` |
| --- | --- |
| Custom date ranges needed an equal-length prior-period comparison, not a previous-month-only rule. | FR-4 defines a preceding whole-month comparison for a whole month and equal-length preceding range for a custom range. |
| Rate failure treatment needed a specific, testable display state. | FR-5 requires `N/A` and a warning that identifies affected currencies and Selected Period. |
| Mobile Amount-first order was confirmed but required explicit acceptance conditions. | FR-6 now requires Amount-first mobile Ledger Rows at 390px and 360px. |
| Every Active Account, including zero-balance accounts, was confirmed for the companion panel. | FR-8 makes it a requirement; it is no longer an assumption. |
| Type, Search, and Amount became Server Filters but the current URL persists only older filters. | FR-3 requires a stable URL-safe representation, complete restoration, and safe invalid-value fallback for every Server Filter. |

No unresolved conflict remains between the confirmed decisions and the current-state baselines. The only open product detail is whether a non-zero previous net flow should display both absolute and percentage change or one representation.

