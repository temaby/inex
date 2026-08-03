---
title: Transactions UX Design Specification
status: approved-for-downstream-design
created: 2026-08-03
source_prd: docs/planning/prds/prd-inex-2026-08-03/prd.md
related_shared_specification: docs/planning/ux-design-specification.md
---

# Transactions UX Design Specification

## Purpose and scope

This specification defines the authenticated `/transactions` experience for the "Transactions Page Enhancements" PRD. It is the page-level source of truth for product design, implementation stories, visual QA, and accessibility review. The shared page-frame, token, typography, and primitive rules remain in [UX Design Specification](ux-design-specification.md).

Transactions is a dependable monthly working ledger. A user selects a period, understands whether its converted summaries are complete, finds every matching transaction in that period, and records or corrects a transaction without losing their ledger context.

This specification supersedes the Transactions-specific route row and scan-order guidance previously held in the shared UX specification. It does not redesign Accounts, Categories, Budgets, Reports, authentication, or the application shell.

## Inputs and precedence

| Source | Role |
| --- | --- |
| [Transactions PRD](prds/prd-inex-2026-08-03/prd.md) | Approved future product behaviour and acceptance conditions. |
| [Transactions PRD addendum](prds/prd-inex-2026-08-03/addendum.md) | Rationale for date handling, transfers, empty state, and account-balance context. |
| [Current functionality baseline](transactions-current-state-functionality.md) | Implemented behaviour that must be deliberately changed only where the PRD requires it. |
| [Current UI/UX baseline](transactions-current-state-ui-ux.md) | Visual and interaction baseline. |
| [InEx design implementation guide](../design/docs/design-implementation-guide.md) | Shared visual language, shell, drawer, numeric, and responsive rules. |
| [Shared UX Design Specification](ux-design-specification.md) | Cross-route page frame and design-system contract. |

Where these sources differ, the current Transactions PRD takes precedence for this page. In particular, it replaces page-local Type/Search filtering and removes Amount filtering; it also changes the Expense and Income form order to Account, Category, Amount, Date, Comment.

## Experience outcome

### Primary user and jobs

The primary user is an authenticated manual ledger manager who records income, expenses, and transfers across one or more currencies. They need to:

- find every matching record in a selected month or valid custom range;
- understand Income, Expenses, and Net flow without mistaking incomplete converted data for a complete total;
- check an active account's native balance while entering or editing a record; and
- save, correct, or delete a single record and resume the same ledger context.

### Experience principles

1. One selected period and one server-filtered scope govern the ledger, counts, summaries, pagination, chips, and empty states.
2. A converted KPI is either trustworthy or explicitly unavailable; it never appears as a silently partial total.
3. The ledger stays calm, dense, grouped by day, and table-first on desktop; mobile preserves its hierarchy in an Amount-first stack.
4. Account context is available on demand and beside the Account field, without turning Transactions into a second Accounts page.
5. Create, edit, filter, and companion-panel work uses the shared accessible drawer contract and does not disorient the user on return.

### Main journey

1. The page opens on the current whole month unless a valid shared Transactions URL restores another period and filters.
2. The user scans the KPI strip and ledger, then optionally narrows by Type, Search, or advanced filters.
3. Every filter applies to the entire selected period before summaries and pagination. Any filter change returns the ledger to page 1.
4. The user can open Account balances, add a transaction, or open a row to edit it without leaving the route.
5. After a successful create, update, or delete, ledger and summary data refresh. A successful edit closes its drawer and returns focus to the edited row or another predictable ledger location.

## Page composition

The route uses the shared **Management** page frame: fluid inside shell gutters through 1439px and capped at 1360px from a 1440px viewport upward. The header inner content, KPI strip, ledger, companion panel, and pagination align to the same frame edges.

### Page header

| Element | Desktop | Mobile |
| --- | --- | --- |
| Eyebrow and title | `Overview` then `Transactions`; follows the shared page-header hierarchy. | Same hierarchy with mobile type scale. |
| Primary action | Green `Add transaction` button with an additive icon, aligned to the header's right edge. | Full-width below the title; the label must not clip. |

There is one visually primary action: `Add transaction`. The ledger workspace owns the secondary Account balances and Filters controls.

### KPI strip

The KPI strip is one continuous bordered white surface immediately below the page header. It contains equal Income, Expenses, and Net flow regions separated by restrained vertical dividers on desktop and stacked within the same surface on mobile.

| KPI | Primary value | Supporting information |
| --- | --- | --- |
| Income | Converted income total in the base currency. | Income-only count from the full selected-period filtered scope. |
| Expenses | Converted expense total in the base currency. | Expense-only count from the same scope. |
| Net flow | Converted income plus expense total, with explicit directional signage. | Comparison with the immediately preceding comparable period. |

- The base currency is the authenticated user's preferred currency. The complete summary contract supplies date-and-currency cash-flow buckets, so each non-zero transaction value is converted at its local transaction date rather than as a period-wide currency aggregate.
- The number uses tabular numerics; the currency suffix is smaller but adjacent; sign and accessible label convey direction independently of colour.
- A whole month compares with the preceding whole month. A custom range compares with the immediately preceding range of equal length.
- If the previous period has non-zero net flow, show absolute and percentage change. If it is zero, show absolute change only. If it has no activity, show absolute change with `No activity in [period]`.
- A cached rate is usable only for its transaction date or when the existing cache explicitly records an effective prior-business-date rate for a weekend/holiday. The KPI never initiates a lookup, cache repair, or provider request.
- If a required exchange rate is missing for a KPI or comparison, show `N/A` and a visible Rate Warning. The warning names the affected currency, local transaction date, and selected period, and has an accessible hint or tooltip. It is not colour-only.
- The ledger continues to show native-currency amounts when a rate is missing. The page must not call an external rate provider to repair the display.
- A short conversion hint is allowed only when no Rate Warning is present.
- For a Transfer-only Type scope, retain all three KPI cards with zero values and the Transfer count. Transfer-only scope produces neither a rate lookup nor a Rate Warning.

## Ledger workspace

### Toolbar and filter state

The ledger is a single continuous bordered panel with no desktop card grid. Its toolbar contains the Ledger heading, previous/month/next period controls, period and count context, text-labelled `Account balances`, Filters, the visible `View` label with All/Income/Expense/Transfer segmented control, and a Search field. The Account balances control exposes its expanded/collapsed state and is not icon-only. Search is right-aligned on desktop; controls wrap into a readable vertical sequence on mobile.

| Interaction | Required outcome |
| --- | --- |
| Select a period | Select a past month or valid custom range; future months remain unavailable. |
| Select Type or Search | Apply it to the complete Selected Period before summary calculation and pagination; reset to page 1. |
| Open Filters | Open the existing accessible filter drawer with the current values preserved. |
| Apply advanced filters | Apply account, category, tag, reference, and valid date-range filters to the complete Selected Period; reset to page 1. |
| Use an active-filter chip | Clear only that criterion and refresh the full filtered scope. |
| Clear filters | Clear every server filter, Type, and Search; restore the current whole month; reset to page 1. |
| Open a shared URL | Restore every valid account, category, tag, reference, date, Type, and Search value. Ignore malformed or unknown values while retaining valid ones, then reflect only valid state in the URL and UI. |

Amount filtering is out of scope. It must not appear in the advanced drawer, chips, URL state, no-match logic, or Transactions API contract.

The active filter summary is always actionable: users can clear individual chips or all filters without hunting through the drawer. A no-match result means no record in the complete Selected Period matches the active filters; it must never mean only that the loaded page has no local matches.

### Desktop ledger

At 1440px and 1024px, the desktop table header and every ledger row use this logical order:

1. Description
2. Account
3. Date
4. Amount

Amount is the final column and the visual right boundary. Its header and values are right-aligned, use tabular numerics, retain semantic income/expense/transfer treatment, and may show a muted approximate base-currency equivalent beneath the native amount when a rate is available. No secondary column follows Amount and no column creates page-level horizontal overflow.

Description contains the comment-derived title, category path or Transfer label, and compact tags/references. Account and Date remain independently scannable. Do not replace the desktop ledger with individual transaction cards or hide core financial information behind hover or disclosure.

Rows are grouped by local calendar day, newest first. A compact day header uses Today, Yesterday, or a localized date label plus item count; it does not need a leading calendar icon. Row activation remains available by click, Enter, and Space.

### Mobile ledger

At 768px and below, hide the desktop table header and render each ledger row as a single pressable stack. The first transaction datum is Amount, followed by title, category/transfer context, tags and references, then Account and Date. The row has no trailing chevron; its button semantics, visible focus, click handling, and Enter/Space edit activation remain intact.

KPI regions stack within their shared surface. Month controls, filter controls, segmented Type control, and Search may wrap, but the page itself must not scroll horizontally. Pagination and the final ledger content require bottom clearance from the fixed mobile navigation.

### Ledger states

| State | Treatment |
| --- | --- |
| Initial load | KPI skeletons and ledger skeleton rows; never a blank page. |
| Refresh with existing data | Keep existing rows and show compact refreshing feedback. |
| Initial load failure | Error alert with actionable Retry. |
| Refresh failure | Inline error and Retry while preserving rows. |
| No active records in the selected period | First-use empty state with a clear `Add transaction` action. |
| No complete-period matches after filters | Compact filter-empty state with Clear filters. |
| Rate data incomplete | Ledger remains usable; affected KPI/comparison uses `N/A` and Rate Warning. |

## Account-balance context

### Account balances companion

`Account balances` is progressive disclosure, not a permanent ledger sidebar.

- On desktop, it opens a named optional companion panel beside the ledger. It lists every active account, including zero-balance accounts, with account name and native-currency balance.
- It must not permanently reduce ledger width or introduce a converted cross-account total.
- Its open or closed state persists for the current page session only. It never opens automatically when an Account field receives focus.
- On mobile, the same control opens the shared full-width drawer pattern with visible close control, focus containment, Escape close, and return focus to the invoking control.

| Companion state | Treatment |
| --- | --- |
| Initial load | Show a compact companion-local loading state; do not replace the ledger. |
| No active accounts | Show a localized companion-local empty state. |
| Load/refresh failure | Show a localized actionable Retry state while preserving visible close, Escape, and focus-return behavior. |

### Create and edit drawers

All transaction drawers use the shared right-side desktop / full-width mobile accessible drawer contract. They have a title, subtitle, visible close control, contained scroll, Escape close, focus trap, and focus return.

| Flow | Required form order and outcome |
| --- | --- |
| Expense | Account, Category, Amount, Date, Comment. After account selection, show its Native Balance directly below the Account field. |
| Income | Account, Category, Amount, Date, Comment. After account selection, show its Native Balance directly below the Account field. |
| Transfer | Separate source and destination accounts plus amount fields, Date, and Comment. Do not add paired-record management in this scope. |
| Edit | Show selected-account Native Balance below Account; preserve single-record delete with confirmation. |

Comment text continues to carry `#tag` and `@reference` tokens; do not introduce a separate persisted tags contract in this scope. New and edit forms show actionable validation/error feedback without clearing entered values. A failed update keeps the edit drawer open. A successful update closes it, refreshes ledger and KPI data, and returns focus predictably.

## Visual language and shared boundaries

| Shared token or primitive | Transactions-specific use |
| --- | --- |
| Management page frame, shell gutters, page header | Align header, KPIs, ledger, companion panel, and pagination. |
| InEx semantic colour, Inter UI font, JetBrains Mono numerics | Income is positive, Expenses are negative, Transfers neutral; direction and Rate Warning also have text/signage. |
| Buttons, segmented control, inputs/selects, chips, drawer, empty/error states, money rendering | Preserve their shared visual and keyboard contracts; page CSS composes them without reimplementing them. |
| Borders, restrained surfaces, 4px spacing scale | Keep one continuous KPI strip and ledger panel, subtle day separators, dense metadata, and calm scanning rhythm. |

The page must preserve the shared authenticated client, route protection, Redux/data-loading patterns, i18n, existing date grouping, and currency-calculation boundaries. All newly visible strings require English and Russian translations.

## Accessibility and responsive acceptance criteria

| Area | Acceptance criteria |
| --- | --- |
| Filter consistency | Type, Search, account, category, tag, reference, and date filters are URL-restorable server filters applied before pagination; invalid URL values degrade safely. |
| Monetary trust | Direction is not colour-only. Each non-zero value converts by local transaction date into the preferred base currency. Missing conversion data produces `N/A`, named currency/date/period evidence, and accessible explanatory text rather than a partial total. Transfer-only scope keeps zero KPI cards without a rate warning. |
| Controls | Every action is keyboard reachable. Segmented controls, chips, period controls, and `Account balances` have accessible names and state. |
| Drawers | Focus is trapped while open; Escape and visible close work; focus returns to the trigger. Mobile drawers fit the viewport. |
| Ledger rows | Desktop rows and mobile stacks remain click, Enter, and Space operable with visible focus. |
| 1440px | Management frame is 1360px within 1px rounding; desktop columns use Description, Account, Date, Amount without overflow. |
| 1024px | Desktop/tablet ledger retains a readable final Amount column and does not create page-level horizontal overflow. |
| 390px and 360px | Amount is first in each row; controls and labels do not clip or overlap; no page-level horizontal overflow or bottom-nav occlusion occurs. |
| Content stress | Test long English/Russian labels, long amounts, populated, first-use empty, filter-empty, rate-warning, filter drawer, add drawer, edit drawer, account-balances panel, and expanded-row where supported. |

## Delivery checklist

Before implementation is accepted, capture fixture-backed visual evidence at 1440px, 1024px, 390px, and 360px for the required states. Record the `dataMode`, confirm no real backend or external exchange-rate provider was called, and treat overlap, clipped text, horizontal overflow, bottom-navigation occlusion, a partial converted KPI, or inaccessible drawer behaviour as acceptance failures.

## Explicitly deferred

- Bulk selection and bulk deletion.
- A linked-transfer relationship, paired drill-in, or synchronized transfer editing.
- A converted cross-account total in Account balances.
- Amount filters.
- Account or user time-zone settings, time-zone conversion, and automated-feed date handling.
