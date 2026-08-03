---
title: "Transactions Page Enhancements"
status: final
created: 2026-08-03
updated: 2026-08-03
---

# PRD: Transactions Page Enhancements

## 0. Document Purpose

This PRD defines the next, deliberately scoped enhancement of InEx's authenticated Transactions page. It is for product review, UX design, architecture, story creation, and implementation. It builds on the [current-state functionality baseline](../../transactions-current-state-functionality.md), [current-state UI/UX baseline](../../transactions-current-state-ui-ux.md), and the existing InEx PRD. It describes product behavior and acceptance conditions; API/React implementation choices belong in the addendum or downstream design/architecture artifacts.

### Approved change snapshot

- Filter the full Selected Period before pagination and make every remaining filter URL-restorable.
- Show `N/A` with rate evidence instead of a silently partial converted KPI.
- Add Native Balance context without adding a converted cross-account total.
- Put Amount last on desktop and first on mobile; close edit after a successful save.
- Defer linked-transfer management, bulk actions, and a time-zone model.

## 1. Vision

Transactions should be a dependable monthly working ledger: a user selects a period, sees truthful financial summaries, locates any matching transaction in that full period, and records or corrects a transaction without losing context. Filtering must describe the whole selected period rather than an arbitrary loaded page.

The page should also support the common entry-time question, "What is available in this account?" without requiring navigation to Accounts. It preserves InEx's established calm, dense, table-first finance visual language so the reusable patterns can later guide the remaining management pages.

## 2. Target User

### 2.1 Primary persona: Manual ledger manager

The **Manual ledger manager** is an authenticated InEx account holder who manually records income, expenses, and transfers for accounts in one or more currencies. They use a selected month as their normal working period and need accurate records, account context, and clear evidence when currency conversion data is incomplete.

### 2.2 Jobs to be done

- Find every transaction matching a known type, phrase, tag/reference, account, or category in the selected period.
- Confirm how many income and expense transactions occurred, not merely the total number of rows.
- Record a transaction while checking the source or destination account's available balance.
- Correct or delete one transaction and return immediately to the updated ledger.
- Notice and investigate a missing exchange rate before relying on a converted financial total.

### 2.3 Key user journeys

- **UJ-1. Manual ledger manager reviews a fully filtered month.** The Manual ledger manager opens Transactions, which defaults to the current month. They choose a filter such as Income, Account, Category, or a search phrase. The page searches the complete selected-period result set, resets to the first matching page, and shows every matching record through normal pagination. The Manual ledger manager can clear the filter in one action and returns to the current month.
- **UJ-2. Manual ledger manager records an expense with balance context.** The Manual ledger manager opens New transaction, selects an active paying account, checks its Native Balance under the field, selects a category, enters an amount/date/comment, and saves. The drawer closes and the refreshed ledger shows the result.
- **UJ-3. Manual ledger manager investigates an incomplete summary.** The Manual ledger manager sees a visible Rate Warning on a KPI card, identifies the affected currency/period from the supporting information, and does not mistake the displayed converted total for complete financial data.

## 3. Glossary

- **Selected Period** - The server-filtered calendar range shown by Transactions. It defaults to the current whole month; a user may choose a past month or valid custom range.
- **Server Filter** - A criterion applied before summary calculation and pagination. It includes account, category, tag, reference, date, Type, and Search filters defined in this PRD.
- **Ledger Row** - One displayed transaction record in the paginated ledger.
- **Active Account** - An enabled account belonging to the authenticated user.
- **Native Balance** - An account balance displayed in that account's own currency, without conversion.
- **Rate Warning** - A visible state that says converted KPI information is incomplete because a required exchange rate is unavailable.
- **Transfer Record** - One of the two transaction records created by a transfer. Each remains independently editable and deletable.
- **KPI** - A summary card for Income, Expenses, or Net flow.
- **Base Currency** - The currency in which an aggregate KPI is presented after supported native-currency values are converted.
- **System Category** - The category classification that identifies a Transfer Record rather than income or expense.

## 4. Features

### 4.1 Full-Selected-Period Filtering

**Description:** Filters must describe the complete Selected Period, not merely Ledger Rows on the current page. This realizes UJ-1 and ensures a user can find every matching transaction in the month.

#### FR-1: Apply filters before pagination

The system shall apply every Server Filter to the authenticated user's complete Selected Period before calculating summary counts or paginating Ledger Rows.

**Consequences (testable):**

- When five Income transactions match a Selected Period and only one was on the unfiltered first page, the Income filter returns all five matches across the filtered result set; it does not show only the original page's one match.
- Changing any Server Filter resets the ledger to page 1.
- If matching records exceed the selected page size, pagination applies to the filtered result set; otherwise all matches appear on the first page.
- All list and summary queries remain constrained to the authenticated user.

#### FR-2: Support full-period Type and Search filters

The system shall treat Type and Search as Server Filters and shall remove Amount filtering from Transactions.

**Consequences (testable):**

- Type supports All, Income, Expense, and Transfer. Transfer means a system-category transaction; Income and Expense use the existing signed amount semantics.
- Search is case-insensitive and matches the same transaction information presently searchable in the ledger: comment, account name, category name/path, account currency, tags, and references.
- Server-wide Search is an MVP commitment. Architecture must use a database-side query that preserves full-period results before pagination.
- The advanced-filter drawer, active-filter chips, URL state, and no-match logic contain no Amount-filter controls or values.
- The Transactions API contract used by this page does not add an Amount filter.
- The no-match state means no record in the complete Selected Period matches the active filters. It must not be caused only by local page filtering.

#### FR-3: Retain and quickly clear filter state

The system shall retain applied filters when the filter drawer closes/reopens and restore server filters from the Transactions URL when provided.

**Consequences (testable):**

- A URL containing a valid Transactions filter restores the same Selected Period and Server Filters on load.
- The Transactions URL uses a stable, URL-safe representation for every Server Filter: account, category, tag, reference, date range, Type, and Search. Opening a copied URL restores every valid value.
- An unknown, malformed, or invalid URL filter value is ignored without preventing the remaining valid filter values from loading; the resulting UI and URL reflect only the valid filter state.
- The active-filter indicator includes an immediately available Clear filters action.
- Clear filters clears all Server Filters and resets the Selected Period to the current whole month.
- Clear filters does not leave stale local criteria that make the refreshed ledger appear filtered.

### 4.2 Trustworthy Summary and Rate Evidence

**Description:** The KPI strip must remain useful and never silently represent a partial converted total as complete. This realizes UJ-1 and UJ-3.

#### FR-4: Show meaningful KPI support information

The system shall show income-only and expense-only transaction counts in the respective Income and Expenses KPI cards.

**Consequences (testable):**

- The Income card secondary row uses the count of income transactions in the complete Selected Period after applicable Server Filters.
- The Expenses card secondary row uses the count of expense transactions in the same scope.
- The Net flow card secondary row compares the Selected Period's net flow with the immediately preceding comparable period. A whole month compares with the preceding whole month; a custom range compares with the immediately preceding range of equal length.
- When the previous comparable period has non-zero net flow, the comparison shows both absolute and percentage change. When it has zero net flow, it shows only absolute change.
- When the preceding comparable period has no transactions, the comparison shows only absolute change and `No activity in [period]`. When either compared period has incomplete conversion data, the comparison displays `N/A` and the same affected-currency/period Rate Warning as the KPI.
- The comparison with the preceding comparable period is clearly labelled and is not calculated from the currently paginated Ledger Rows.

#### FR-5: Surface incomplete exchange-rate conversions

The system shall show a Rate Warning whenever a KPI's base-currency calculation omits any native-currency aggregate because a required rate is unavailable.

**Consequences (testable):**

- Affected KPI values display `N/A`, rather than a normal-looking complete total or literal `NaN`.
- The warning identifies the affected currency or currencies and the relevant Selected Period so the user has evidence for investigation.
- The warning is discoverable from the KPI itself through visible supporting text and an accessible hint/tooltip; it is not colour-only.
- The page continues to render its ledger and native-currency transaction amounts without calling an external exchange-rate provider.
- A KPI may show a short conversion hint only when no Rate Warning is present.

### 4.3 Ledger Layout and Reusable Visual Language

**Description:** The ledger preserves the current type scale, colours, spacing, numeric alignment, and calm financial-operations tone while making scan order more logical. This realizes UJ-1.

#### FR-6: Reorder and align desktop ledger columns

The desktop ledger shall use the column order Description, Account, Date, Amount. Mobile Ledger Rows shall retain their Amount-first presentation because the desktop table header is absent and the financial impact is the primary compact scan target.

**Consequences (testable):**

- Amount is the final desktop column and is right-aligned, including its optional base-currency equivalent.
- The final column creates a clear visual right boundary without horizontal overflow at 1440px or 1024px.
- Mobile visual QA verifies Amount is the first transactional datum in each Ledger Row at 390px and 360px.
- Existing semantic income, expense, and transfer treatment, tabular numerics, date grouping, tags/references, and keyboard row activation remain available.

**Design rationale:** Keeping Amount next to Description on mobile would make each compact row read more like a table, but it competes with the title/category hierarchy and forces the user to scan farther before finding financial impact. Amount-first intentionally differs from desktop after table headers disappear.

#### FR-7: Document transferable page patterns

The UX specification delivered with this PRD shall document the Transactions page's reusable visual patterns for later page work.

**Consequences (testable):**

- It defines the page header, primary/secondary actions, KPI strip, ledger panel, dense row, day group, filter state, drawer, empty/error state, typography, colour roles, spacing, borders, and numeric treatment.
- It identifies which rules are shared design-system tokens/primitives versus Transactions-specific layout rules.
- It includes desktop 1440px/1024px and mobile 390px/360px behavior and accessibility acceptance criteria.

### 4.4 Account-Balance Context and Single-Record Editing

**Description:** The page adds on-demand account context without making the ledger a second Accounts page. This realizes UJ-2.

#### FR-8: Show active account balances on demand

The system shall provide an explicit Account balances control on Transactions.

**Consequences (testable):**

- On desktop, the control opens an optional companion panel that lists every Active Account by name and Native Balance. It does not permanently reduce the ledger width.
- On mobile, the same control opens the existing accessible full-width drawer pattern; it has a visible close control, Escape support, focus containment, and focus return.
- The control exposes its expanded/collapsed state to assistive technology and is not icon-only.
- The account list remains open/closed as chosen during the current page session and never opens merely because an account field receives focus.
- This feature does not add a cross-account converted total.

#### FR-9: Show selected-account balance during entry and edit

The system shall show the selected Active Account's Native Balance directly beneath the account selection in the new-transaction and edit drawers.

**Consequences (testable):**

- The balance updates after the user selects a different account.
- It does not announce every selection change through a live region; after a successful save, the UI may announce a material selected-account balance change.
- Expense and income forms order fields as Account, Category, Amount, Date, Comment.
- The Transfer form retains separate source-account and destination-account fields, plus its amount fields.

#### FR-10: Close the edit drawer after a successful save

The system shall close the edit drawer after a successful single-record update and refresh the ledger/summary data.

**Consequences (testable):**

- An update failure keeps the drawer open and presents an actionable error.
- A successful update returns focus to the edited Ledger Row or another predictable ledger location.
- Single-record delete remains available through the edit UI with confirmation.

## 5. Delivery Constraints

- **Data isolation:** Every read, summary, create, update, and delete query for user-owned data must derive ownership from the authenticated principal and include the ownership predicate. Cross-user access returns not found.
- **Date input:** The server must reject an omitted transaction date or a date with the language/runtime default value. A user-entered date is treated as a local calendar date; time-zone conversion, account time-zone settings, and automated-feed time-zone rules are out of scope.
- **Accessibility:** Controls, filter state, drawers, warnings, and monetary direction must remain keyboard operable and screen-reader understandable. Colour alone must not convey money direction or incomplete-rate status.
- **Internationalisation:** All user-visible additions must be translated into supported locales. English is the visual baseline; Russian is a responsive long-label test.
- **Responsive quality:** No page-level horizontal overflow, clipped control labels, or bottom-navigation occlusion at 390px and 360px.
- **External-rate safety:** Tests and exploratory work must not invoke live exchange-rate providers.

## 6. Out of Scope

- Bulk selection or bulk deletion of transactions.
- A paired-transfer drill-in, linked edit, or synchronized management experience; Transfer Records remain independently managed.
- A global converted account-balance total in the Account balances companion.
- Amount filtering on Transactions.
- Time-zone settings, time-zone conversions, or automated transaction-feed date handling.
- Changing the default Selected Period or Clear filters outcome away from the current whole month.
- Replacing the existing shared authenticated API client, i18n system, drawer primitive, or transaction ownership model.

## 7. MVP Scope

### 7.1 In scope

- Full-Selected-Period Type/Search filtering, filter URL retention, reset, KPI count improvements, previous-month net comparison, and Rate Warnings.
- Desktop ledger column reordering/right alignment and reusable UI pattern documentation.
- Account balances companion, selected-account Native Balance context, form reordering, and successful-edit drawer close.
- Required backend/service/API evolution and test coverage needed to preserve secure full-period behavior.

## 8. Release Validation Outcomes

- **RV-1:** Regression coverage proves that filtered result pagination contains all matches in a Selected Period, with no page-local filtering discrepancy. Validates FR-1 and FR-2.
- **RV-2:** Visual and automated coverage prove that each affected KPI shows a Rate Warning rather than a silent partial total. Validates FR-5.
- **RV-3:** UX and automated coverage prove that a Manual ledger manager can view an Active Account's Native Balance without leaving Transactions. Validates FR-8 and FR-9.
- **Guardrail:** The account-balance companion introduces no desktop ledger overflow or inaccessible mobile entry flow. Counterbalances FR-8 and FR-9.

## 9. Decisions Required Before Finalisation

No unresolved product decisions block UX design, architecture, or story creation.

## 10. Assumptions Index

No unconfirmed product assumptions remain.
