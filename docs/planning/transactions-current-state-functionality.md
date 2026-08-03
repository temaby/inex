# Transactions: Current-State Functionality Baseline

Status: baseline for review; it describes implemented behavior, not approved future requirements.

Last verified: 2026-08-03

## Purpose and scope

The protected `/transactions` route is the operational ledger for an authenticated InEx user. It lets the user review a selected period, narrow the visible ledger, and create, edit, or delete income, expense, and transfer records.

This document records the behavior currently implemented in the React client and ASP.NET Core API. It intentionally distinguishes server-scoped data from client-only presentation filters so that later requirements do not accidentally change financial totals or pagination semantics.

## Evidence and source of truth

| Evidence | What it establishes |
| --- | --- |
| `inex/ClientApp/src/pages/Transactions.tsx` and `Transactions/*` | Page state, flows, local filtering, row interaction, drawers, and empty/error states. |
| `inex/ClientApp/src/store/transactions/transactions-api.ts` | Requests, mutations, and cache invalidation. |
| `inex/Controllers/TransactionsController.cs` and `inex.Services/Services/TransactionService.cs` | API surface, authenticated user scoping, filters, CRUD, summaries, and transfer behavior. |
| `docs/implementation/gh-264-transactions-month-summary-kpis.md` | Full-server-scope monthly KPI behavior. |
| `docs/implementation/visual-qa/transactions/qa-summary.json` | Fixture-based rendered states and intercepted API request evidence, generated 2026-07-29. |

The page does not use a live backend in the captured visual-QA evidence. The harness uses fixtures and intercepts every `/api` request.

## Terms

| Term | Current meaning |
| --- | --- |
| Server filter | Account, category, tag, reference, and date range sent to the API. It limits the API result and summary. |
| Ledger UI filter | Type, free-text search, and minimum/maximum amount controls applied only to rows already loaded for the current page. |
| Selected period | Usually a whole calendar month. The initial route state selects the current month; a user can choose a past month or a custom valid date range. |
| Active data | The API mode used by this page. A transaction is included only when both its account and category are enabled. |
| Base currency | The first loaded exchange-rate source currency, falling back to USD. KPI values convert supported currencies into it. |
| Transfer | A paired debit and credit created through the transfer endpoint. System-category transactions are displayed and counted as transfers. |

## Entry and retrieval flow

1. The route loads all accounts, all categories, and the current exchange-rate data.
2. If the route has no `filter` query value, the client writes a current-calendar-month filter into Redux and the URL.
3. The page requests two active-data resources with the same server filter:
   - `GET /api/transactions/summary` for the full filtered scope; it is not paginated.
   - `GET /api/transactions` for ledger rows with `pageSize`, `page`, and the same filters.
4. The ledger starts at page 1 with 20 rows. The user can choose 20, 50, or 100 rows per page.
5. Changes to a server filter reset the ledger to page 1. Changing pages scrolls the window to the top smoothly.

The API accepts repeated `accountId`, `categoryId`, `tag`, and `ref` parameters plus `startDate` and `endDate`. Multiple tags and multiple references use AND semantics: a returned transaction must contain every requested marker. API results are ordered by transaction creation date descending, then ID descending.

## Period control

The ledger toolbar contains previous-month, month-picker, and next-month controls. The next-month control and future months are disabled. A month selection is committed after a 250 ms delay; it changes the server date range and creates a browser-history entry. A non-month custom date range is possible through Advanced filters.

Clearing all filters restores the current whole-month range, not an unbounded transaction history.

## Financial summary behavior

Three KPI cards present income, expenses, and net flow.

- They use the unpaginated server summary for the selected period and server filters.
- They do not change for ledger pagination or any local type, search, or amount filter.
- Income and expense totals exclude transfer/system-category transactions. Net flow is income plus expense.
- The summary carries native-currency aggregates; the client converts each supported aggregate to the base currency. An aggregate without a usable rate is omitted rather than silently mixed into the displayed base-currency total.
- The segmented All/Income/Expense/Transfer counts also come from the full server summary. Selecting a type filters only the loaded ledger rows.

## Ledger behavior

Rows are grouped by local calendar day, newest first. Day labels use Today, Yesterday, or a localized day/date label. A row shows a comment-derived title, category path or Transfer label, tags, references, amount, optional base-currency equivalent, account, and ISO date.

- Income and expense kinds come from amount sign; a system category is treated as a transfer.
- Clicking a tag or reference opens `/transactions` with that single tag or reference as the server filter.
- Clicking a row, or focusing it and pressing Enter or Space, opens the edit drawer.
- Search matches comment, account name, category name/path, transaction currency, tags, and references. It is case-insensitive and local to the page of rows already loaded.
- Amount limits use absolute amounts. They are available only when all selected accounts share one currency; otherwise the controls are disabled and existing amount limits are cleared.
- The page can truthfully show a no-match state even when matching transactions exist on another server page, because local filters do not query across all pages.

## Filter behavior and URL state

Advanced filters contain From/To dates, multi-select accounts, multi-select categories, keyword parsing, and amount-equivalent limits.

- The keyword field recognizes whitespace-free `#tag` and `@reference` tokens. Other typed words do not become server search filters.
- Dates are used only when both values are valid and From is not later than To. An invalid or incomplete pair clears the server date range until the user corrects it.
- Account/category/tag/reference/date filters are represented in Redux and serialized into the route `filter` query parameter. Type, search, and amount limits are local UI state and are not shareable through that URL.
- Active filters render clearable chips. The chips can clear one criterion; Clear all restores the current month and clears local controls.

## Create flow

The Add transaction action opens a drawer in Expense mode. The mode switch resets local form state.

| Mode | User inputs | Submitted effect |
| --- | --- | --- |
| Expense | Account, positive amount, category, date, optional comment | Creates one ordinary transaction with a negative amount. |
| Income | Account, positive amount, category, date, optional comment | Creates one ordinary transaction with a positive amount. |
| Transfer | Source account/amount, destination account/amount, date, optional comment | Creates a paired debit/credit through `POST /api/transactions/transfer`. |

The client requires a date, positive amount(s), required account/category selections, and different source/destination transfer accounts before submission. The server repeats the positive amount/account/category validation and derives ownership from the authenticated principal. A create failure remains in the drawer and shows a localized error; a successful save resets local state and closes it. The save action is disabled while either create request is pending, while Cancel remains available.

Tags and references are not independent create-form fields in the current backend contract. `#tag` and `@reference` tokens in a comment are parsed on create/update and associated with user-owned tag/reference data; the original comment remains the stored text.

## Edit and delete flow

The row edit drawer prepopulates account, category, amount, date, and comment. Save calls `PUT /api/transactions/{id}`; the request ID must match the route ID. Delete requires a confirmation step and calls `DELETE /api/transactions/{id}`.

The API also exposes bulk delete by IDs, but the current Transactions page has no bulk-selection or bulk-delete interaction.

## Refresh, dependencies, and failure states

Successful create, transfer, update, or delete invalidates the transaction list and summary. It also invalidates the account summary, budget report, category report, and history report caches.

| State | Current response |
| --- | --- |
| Initial ledger or summary load | KPI skeletons and six ledger skeleton rows. |
| Refresh while old rows exist | A compact refreshing status; old rows remain visible. |
| Initial list request fails | Error alert, rendered error detail, and Retry. |
| Refresh fails with old rows | Inline error with Retry; old rows remain visible. |
| No active-data rows for a server filter | Compact filter-empty panel with Clear action. |
| No rows in the selected active period | First-use empty state with Add transaction action. |
| Server page has rows but local controls remove all of them | Ledger headers remain visible with a single no-match row. |

The list waits until account and category data are available before issuing its transaction query. Accounts and categories used for creation/filter selection are restricted to enabled records; the ledger itself displays known active or inactive records returned by the selected API mode.

## Security and data integrity behavior

- Every transaction list, summary, single-record read, update, and delete path receives the authenticated `CurrentUserId`; service queries include that ownership predicate.
- Transaction create verifies the requested account and category belong to the current user. Transfer create resolves both source and destination accounts with the current user predicate.
- Cross-user single-record access follows the same not-found path as a missing transaction or related account/category.
- The client never supplies a trusted user ID in transaction requests.

## Boundaries to carry into future requirements

- Preserve the distinction between full server-scope KPIs and client-page-scoped ledger controls unless product explicitly changes it.
- Preserve authenticated ownership filtering on every transaction and transfer relation path.
- Do not require a live exchange-rate provider to render, test, or summarize this page.
- Preserve current routes, query names, response shapes, and comment-based tag/reference storage unless a versioned API change is approved.
- Treat inactive account/category behavior, custom date range semantics, and missing-rate communication as explicit decisions if any future change touches them.

## Review questions before writing future functional requirements

1. Should search, type, and amount limits remain local to the loaded page, or should any become server-wide filters?
2. Should the selected period continue to default to the current month, and should Clear all always return to that period?
3. How should the page communicate partial base-currency totals when one or more currencies cannot be converted?
4. Is a paired transfer meant to be visibly linked in the ledger and edit flow, beyond sharing a created date/comment?
5. Should users be able to select and delete multiple transactions from this page?
6. Does the backend need date validation and a documented time-zone policy, rather than relying on client-side date selection?

