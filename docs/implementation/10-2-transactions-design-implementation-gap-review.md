# Story 10.2 Transactions Design vs Implementation Gap Review

Date: 2026-06-05
Method: BMad checkpoint-style UI review using the rendered design in the controlled browser, the Story 10.2 implementation sources, and existing visual QA screenshots.

## Scope And Evidence

- Design baseline: controlled browser at `http://localhost:5173/`, rendering `docs/design/Transactions.jsx`.
- Design source: `docs/design/Transactions.jsx`.
- Design guide: `docs/design/docs/design-implementation-guide.md`.
- Implementation source: `inex/ClientApp/src/pages/Transactions.tsx`, `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`, `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx`, shared `Num` and signage primitives.
- Implementation visual evidence: `docs/implementation/visual-qa/10-2/desktop-populated.png`, `filter-active.png`, `drawer-open.png`, `mobile-populated.png`.
- Live implementation inspection note: starting the production Vite app inside the sandbox failed at Vite config load with `spawn EPERM`; an escalated localhost start got past that but Windows refused new localhost binds with `listen UNKNOWN`. The comparison therefore uses implementation source plus existing visual QA captures for the actual UI.

## Summary

The production Transactions page implements the main Story 10.2 shape: KPI strip, ledger card, type segmented control, search, active chips, grouped day headers, right-aligned desktop amounts, pagination, drawers, and mobile stacking.

The remaining gaps are mostly fidelity and data-semantics differences from the design target: period-aware KPI copy, visible currency/period context, type counts, friendly day labels, category paths, USD-equivalent sublines, default signage, drawer parity, and duplicated filter entry points.

## Differences To Implement

### 1. KPI Strip Semantics And Currency Context

Priority: P1

Design target:
- `docs/design/Transactions.jsx:48` computes KPI values for the April period and renders Income, Expenses, and Net Flow.
- `docs/design/Transactions.jsx:69` through `docs/design/Transactions.jsx:82` include transaction-count/cash-deficit supporting text.
- The controlled browser design renders visible `USD` labels beside KPI amounts.

Current implementation:
- `inex/ClientApp/src/pages/Transactions.tsx:192` through `inex/ClientApp/src/pages/Transactions.tsx:207` define KPI rows from the visible ledger summary.
- `inex/ClientApp/public/locales/en/translation.json:167` and `inex/ClientApp/public/locales/en/translation.json:168` use generic text: `Current ledger page` and `Updates with the visible ledger`.
- The actual desktop QA screenshot shows KPI values without a visible currency suffix.

Required change:
- Decide whether KPIs are period totals or current visible-page totals. If they remain visible-page totals, the design copy needs a deliberate product decision. If aligning to the design, calculate and label the active period totals.
- Add visible currency context to each KPI amount, matching the design's `USD` treatment.
- Replace generic supporting text with count/period/cash-flow language, for example `1 transaction in June` and `2,873.49 USD net inflow`, using localized strings.

### 2. Ledger Toolbar Is Missing Period Badge And Top Count

Priority: P1

Design target:
- `docs/design/Transactions.jsx:761` renders the period badge (`April 2026`) next to the `Ledger` title.
- `docs/design/Transactions.jsx:764` renders `20 of 20 transactions in this period` in the toolbar.

Current implementation:
- `inex/ClientApp/src/pages/Transactions.tsx:253` renders only the `Ledger` heading plus the filter-active indicator.
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:409` moves count context to pagination only.

Required change:
- Add a period badge to the ledger toolbar.
- Add visible toolbar count text for `visible of total transactions in this period`.
- Keep the bottom pagination summary, but do not make it the only place where the current ledger scope is visible.

### 3. Type Segmented Control Lacks Counts

Priority: P1

Design target:
- The controlled browser design renders segmented options as `All 20`, `Income 1`, `Expense 17`, `Transfer 2`.
- `docs/design/Transactions.jsx:724` through `docs/design/Transactions.jsx:731` build filter chips, and the segmented control is rendered with counts around `docs/design/Transactions.jsx:784`.

Current implementation:
- `inex/ClientApp/src/pages/Transactions.tsx:271` renders `All`, `Income`, `Expense`, and `Transfer` without counts.

Required change:
- Compute counts for all four segment values from the current server result or active period dataset.
- Render counts inside each segmented option while preserving keyboard and mobile behavior.

### 4. Duplicate Filter Entry Points Differ From The Design

Priority: P2

Design target:
- The page header exposes only `Add transaction`.
- The ledger toolbar exposes the `Filters` action.
- `docs/design/Transactions.jsx:741` through `docs/design/Transactions.jsx:826` place filter controls inside the ledger card.

Current implementation:
- `inex/ClientApp/src/pages/Transactions.tsx:211` through `inex/ClientApp/src/pages/Transactions.tsx:231` render top-level `Filter` and `Add` header actions.
- `inex/ClientApp/src/pages/Transactions.tsx:263` through `inex/ClientApp/src/pages/Transactions.tsx:267` also render `Advanced filters` inside the ledger toolbar.

Required change:
- Remove the top-level Filter action or confirm it is an intentional production divergence.
- If keeping both actions, document the reason and make the labels consistent (`Filters` vs `Advanced filters`).

### 5. Day Header Labels Are Not Friendly Relative Labels

Priority: P1

Design target:
- The controlled browser design renders `Today`, `Yesterday`, and compact weekday/month labels.
- `docs/design/Transactions.jsx:366` renders day headers with item counts and day totals.

Current implementation:
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:71` through `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:75` formats labels as `Wednesday, 3 Jun` or `Wednesday, 3 Jun YYYY`.
- The actual screenshots show `Wednesday, 3 Jun`, `Tuesday, 2 Jun`, and `Monday, 1 Jun`.

Required change:
- Implement a friendly day label helper for Today, Yesterday, recent dates, and older dates.
- Keep localization support for English and Russian day/month output.

### 6. Row Metadata Omits Parent Category Path

Priority: P1

Design target:
- Controlled browser rows show category paths such as `People > Gifts` and `Food & Drink > Groceries`.
- `docs/design/Transactions.jsx:290` through `docs/design/Transactions.jsx:353` resolve and display parent/child category context.

Current implementation:
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:358` through `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:359` display only `category.name`.

Required change:
- Build a parent-category lookup from the existing category list.
- Render `Parent > Child` when the category has a parent.
- Keep transfer rows neutral and show `Transfer` instead of a category path.

### 7. Non-Base-Currency Rows Do Not Show USD Equivalent Sublines

Priority: P1

Design target:
- Controlled browser rows show native amount plus a second line like `approx 27.28 USD` for non-USD accounts.
- `docs/design/Transactions.jsx:289` through `docs/design/Transactions.jsx:353` render the equivalent USD subline when the account currency is not USD.

Current implementation:
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:391` through `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:397` render only the native account amount.
- Existing exchange-rate state exists under `inex/ClientApp/src/store/rates/rates-action.ts:9`, but the new ledger list does not use it.

Required change:
- Reuse the existing exchange-rate state or an approved helper to compute a base-currency equivalent for non-base-currency rows.
- Render a muted second line under the native amount.
- Localize the approximate/equivalent label.

### 8. Default Amount Signage Is Color-Only

Priority: P1

Design target:
- Controlled browser design uses explicit signs for income and expense amounts, for example `+830.00 PLN` and `-109.99 PLN`.
- Story 10.2 acceptance criteria allow explicit signs or an accessible signage preference.

Current implementation:
- `inex/ClientApp/src/components/primitives/SignageContext.tsx:20` defaults to `color-only` when no saved preference exists.
- `inex/ClientApp/src/components/primitives/Num.tsx:48` through `inex/ClientApp/src/components/primitives/Num.tsx:61` only prefixes income/expense values when signage is `signed`.
- `rg` finds `setSignage` only inside the provider, so there is no visible user control to change the preference.
- Actual screenshots show red expenses without a minus sign in the visible text.

Required change:
- Either default Transactions ledger amounts to signed mode, or expose a reachable user preference control before relying on color-only signage.
- Preserve `aria-label` coverage from `inex/ClientApp/src/components/primitives/Num.tsx:91`.

### 9. Filter Drawer Is Functionally Present But Not Fully Integrated To The Design Contract

Priority: P2

Design target:
- `docs/design/Transactions.jsx:530` through `docs/design/Transactions.jsx:580` define a single advanced-filter drawer with date range, account, category, tags/refs, amount equivalent, Clear all, and Apply filters.
- The controlled browser design renders amount min/max inside the same drawer field set.

Current implementation:
- `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:24` still uses `props: any`.
- `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:151` renders the older AntD form.
- `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:180` and `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:194` render tags/refs and range fields.
- `inex/ClientApp/src/pages/Transactions.tsx:345` through `inex/ClientApp/src/pages/Transactions.tsx:359` append amount fields outside `TransactionFilterForm`.

Required change:
- Move amount min/max into the filter form component so the drawer is one coherent form.
- Replace `any` props and filter detail types while touching this area.
- Align field order and labels with the design: Date range, Account, Category, Tags/refs, Amount equivalent.

### 10. Pagination Defaults Differ From The Design

Priority: P2

Design target:
- `docs/design/Transactions.jsx:888` renders `Showing 20 of 20 transactions for April 2026`.
- `docs/design/Transactions.jsx:910` uses page-size options `20 / page`, `50 / page`, `100 / page`.

Current implementation:
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:119` defaults to page size `25`.
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:418` uses page-size options `[25, 50, 100]`.
- `inex/ClientApp/public/locales/en/translation.json:158` omits period context from the pagination summary.

Required change:
- Change the default page size to 20 and use options 20/50/100 if the API supports it.
- Add active period context to the pagination summary.

## Differences To Clarify Before Implementing

### A. Budget Glance Strip

Design source includes a Budget progress strip below the ledger:
- `docs/design/Transactions.jsx:588` defines `BudgetGlance`.
- `docs/design/Transactions.jsx:918` through `docs/design/Transactions.jsx:920` render it when enabled.

Story 10.2 acceptance criteria do not mention a budget glance. Treat this as product-scope clarification before implementation.

### B. Design Preview Horizontal Overflow

The controlled browser design preview at approximately 781px viewport reported page-level horizontal overflow. The production QA summary says mobile overflow passed at 390px and 360px:
- `docs/implementation/10-2-frontend-ux-transactions-ledger-redesign.md:236`
- `docs/implementation/10-2-frontend-ux-transactions-ledger-redesign.md:292`

Do not copy the design preview's mid-width overflow behavior. Keep the production responsive constraints.

## Already Aligned

- KPI strip, ledger card, type segmented control, search, grouped day headers, amount column, pagination, active filter chips, and drawers exist in production.
- Mobile screenshots show KPI strip collapsing to one column and ledger rows stacking.
- Filter-active visual state exists and clearable chips exist.
- Row amount cells use the shared `Num` primitive, which provides tabular numerics and semantic coloring.

## Recommended Implementation Order

1. KPI and ledger scope: period badge, toolbar count, KPI currency/copy.
2. Segment counts and pagination default/period text.
3. Row fidelity: friendly day labels, category path, USD-equivalent subline.
4. Signage: default signed ledger mode or expose the preference control.
5. Drawer cleanup: integrate amount fields into the filter form and remove `any` types.
6. Filter entry-point decision: remove duplicate top-level Filter or document intentional divergence.
7. Clarify BudgetGlance scope before building it.
