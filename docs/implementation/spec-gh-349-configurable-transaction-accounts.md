---
title: 'Configure transaction-page account balances and drawer filters'
type: 'feature'
created: '2026-09-06'
status: 'in-progress'
baseline_commit: '076b346d6d159037302c46927ef61540487034d0'
context:
  - 'AGENTS.md'
  - 'inex/ClientApp/AGENTS.md'
  - 'docs/planning/transactions-ux-design-specification.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Transactions route currently separates its active-account balances from its filters and gives users no control over which balances form its overview. It uses scarce ledger space and cannot provide an accurate base-currency total for the chosen accounts.

**Approach:** Let users persist a selection of active accounts for the balances overview, calculate a trustworthy base-currency total for that selection, and make the filter drawer the sole place to select one or more accounts for transaction filtering.

## Boundaries & Constraints

**Always:** Preserve the existing authenticated API client, URL-restorable `accountIds` server filter, loading/error/empty states, i18n, native account balances, and safe missing-rate behavior. Use the current local preference convention for display selection; default safely when the preference is unavailable or stale. Include only accounts that can be converted correctly in the total and present the existing unavailable-conversion treatment rather than a misleading complete total. New strings require English and Russian resources.

**Ask First:** Changing backend contracts, rate-provider behavior, persisted server-side preferences, transaction-filter URL semantics, or the selected-period calculation requires user direction.

**Never:** Do not call external rate providers, silently use a partial value as a complete total, duplicate the account list outside the filter drawer, change ownership/authentication behavior, or alter account balances themselves.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Configured overview | User selects a subset of active accounts for display | Balance block renders only that subset and `Total` in the preferred base currency | Persist the valid selection locally |
| Multi-account filter | User selects several accounts in Filters and applies | URL/server filter receives every selected ID; ledger and summary use that scope | Clear restores no account restriction |
| Missing conversion | A displayed non-base account has no usable cached conversion | Total follows existing unavailable-conversion UI and never represents a partial sum as complete | Keep native account information usable |
| Stale preference | Stored IDs include inactive/deleted accounts or storage fails | Ignore invalid IDs and retain a safe usable default | Do not break rendering or filtering |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Transactions.tsx` -- owns active-account data, cached rates, drawer state, URL filter application, and the balances composition.
- `inex/ClientApp/src/pages/Transactions/AccountBalancesCompanion.tsx` -- renders the selected balance overview, total state, and its display-selection controls.
- `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx` -- owns multi-account selection and clear/apply actions in the Filters drawer.
- `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts` -- existing rate-conversion semantics to reuse or extend through a pure helper.
- `inex/ClientApp/src/locales/en.json` and `inex/ClientApp/src/locales/ru.json` -- localized labels and conversion-state text.
- `inex/ClientApp/src/pages/Transactions/*.test.tsx` -- component and route coverage for selection, totals, filters, and states.

## Tasks & Acceptance

**Execution:**
- [ ] `Transactions.tsx` and balance companion -- make the displayed active-account set configurable, persist and sanitize it, and render its trusted base-currency total without retaining the old standalone account-list section.
- [ ] `transaction-ledger-utils.ts` with focused tests -- provide a deterministic account-balance conversion result consistent with cached-rate/missing-conversion handling.
- [ ] `TransactionFilterForm.tsx` with route/form tests -- make drawer account multi-select the exclusive account-list UI; preserve apply and clear behavior for `accountIds`.
- [ ] locale resources and component tests -- localize every new label/state and cover loading, error, empty, selected, cleared, stale-preference, and unavailable-conversion outcomes.
- [ ] visual QA evidence -- verify the route at desktop and mobile breakpoints with fixture data, including the Filters drawer and long Russian labels.

**Acceptance Criteria:**
- Given active accounts and a user-selected display subset, when the Transactions route is revisited, then the balances overview contains only the valid persisted subset and a base-currency total for it.
- Given one or more account IDs are chosen in the Filters drawer, when filters are applied or cleared, then the complete-period transaction results, summary, filter chips, and URL use exactly that selection or no account restriction.
- Given the drawer is closed, when viewing the ledger workspace, then no separate account-list row duplicates the drawer interface.
- Given loading, error, empty, or missing-rate data, when the overview or drawer renders, then existing state behavior remains actionable and no partial conversion is presented as complete.

## Design Notes

Issue #349 intentionally changes the prior Transactions UX rule that forbade converted cross-account totals and placed balances in a companion panel. The issue acceptance criteria are the controlling product decision for this PR; rate availability remains transparent rather than speculative.

## Verification

**Commands:**
- `npm test -- --run src/pages/Transactions` (from `inex/ClientApp`) -- expected: affected transaction component/page tests pass.
- `npm run lint` (from `inex/ClientApp`) -- expected: no lint errors.
- `npm run build` (from `inex/ClientApp`) -- expected: TypeScript and production build succeed.
- `npm run visual-qa:all` followed by `npm run visual-qa:verify` (from `inex/ClientApp`) -- expected: captured fixture visual evidence and PASS verification.
