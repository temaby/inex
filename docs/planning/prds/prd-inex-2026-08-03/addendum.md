# Transactions Page Enhancements: Addendum

This addendum keeps supporting rationale and implementation-sensitive context out of the PRD's feature requirements.

## Date validation and time-zone rationale

The user considers transaction dates to be manually entered financial dates in the user's own locale. There are no automated transaction feeds in scope. A broad time-zone model is therefore deferred: it adds data migration, storage, filtering, grouping, and exchange-rate-mapping complexity without a confirmed user benefit.

Any future exchange-rate work should revisit the question using a concrete failure case, such as an exchange rate missing for a manually entered local date.

## Approved KPI conversion policy

KPI base currency is the authenticated user's preferred currency. Each non-zero income or expense transaction is converted using its local transaction date, not a period-wide per-currency aggregate. The Transactions summary contract therefore returns date-and-currency cash-flow buckets for the current and immediately preceding comparable scopes.

The frontend may use only an already-cached rate for that date, or an explicitly recorded effective prior-business-date rate supplied by the existing weekend/holiday cache policy. A missing bucket remains unavailable: the affected KPI is `N/A` with currency, local date, and period evidence. Rendering, tests, and exploratory work must not fetch, repair, or otherwise call a rate provider.

Transfer-only filtering keeps Income, Expenses, and Net flow cards visible at zero and retains the Transfer count. It must not trigger a rate lookup or Rate Warning solely because the selected scope contains transfers.

## Deferred transfer relationship experience

A transfer currently creates two records. The user accepts managing each record separately after creation and defers a visual relationship, paired drill-in, or synchronized edit experience.

## Empty-state rationale

The Transactions page remains focused on transaction management. Account and category choices are expected to be available from seed data, so first-use guidance need not redirect the user to prerequisite setup.

## Account-balance companion: options considered

The intended job is checking an active account's usable balance while reviewing or entering a transaction, without leaving Transactions.

Recommended progressive-disclosure pattern:

- Desktop: an explicit `Account balances` control opens a named companion panel beside the ledger. It contains active accounts with name and native-currency balance. It is optional and can stay open through create/edit work; it must not permanently reduce ledger width.
- New/edit drawer: after an account is selected, show that account's native balance directly below the Account field.
- Mobile: the same explicit control opens the application's accessible full-width drawer. It must not open automatically when an account field receives focus.
- Do not add a converted cross-account total in this scope. The primary job is checking a particular account's balance; missing exchange rates make a converted aggregate less reliable.

Supporting patterns: [Actual Budget accounts](https://actualbudget.org/docs/accounts/), [Actual Budget account register](https://actualbudget.org/docs/tour/accounts/), [GnuCash transaction register](https://wiki.gnucash.org/docs/C/gnucash-guide/chapter_txns.html), and [W3C modal dialog guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

The summary shows every active account. Zero-balance active accounts remain visible so the panel is an inventory, not a filtered spending report.
