# Summary

Investigation slug: `mockup-audit-transactions`.

Evidence discipline: BMad-style evidence grading was applied directly in this assigned audit document. No separate BMad case file was created.

Browser evidence inspected:
- Mockup Transactions screen: `http://127.0.0.1:5173/`
- Mockup filter drawer: `http://127.0.0.1:5173/` after `Filters`
- Mockup add drawer: `http://127.0.0.1:5173/` after `Add transaction`
- Mockup no-match search: `http://127.0.0.1:5173/` after searching `zzzz-no-match`
- Mockup mobile: `http://127.0.0.1:5173/` at 390px viewport
- Actual app login route: `http://localhost:5000/`
- Actual Transactions route: `http://localhost:5000/transactions`
- Actual filter drawer: `http://localhost:5000/transactions` after `Фильтры`
- Actual add drawer: `http://localhost:5000/transactions` after `Добавить`
- Actual no-match search: `http://localhost:5000/transactions` after searching `zzzz-no-match`
- Actual mobile: `http://localhost:5000/transactions` at 390px viewport

Locale note: the actual app rendered in Russian for the supplied account. Findings do not treat translated Russian labels as defects by themselves; where label semantics differ, the English locale keys confirm the implementation copy.

Confirmed mismatch count: 16.

# Confirmed mismatches

1. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` desktop and mobile. Actual app route or screen inspected: `http://localhost:5000/`, `http://localhost:5000/dashboard`, and `http://localhost:5000/transactions`.

   Evidence: [Confirmed] The mockup root renders the Transactions page directly and its nav contains `Transactions`, `Accounts`, `Categories`, `Budgets`, `Reports`. The actual app root redirects to `/dashboard`, and both desktop/mobile app nav include `Dashboard` before Transactions.

   Implementation files and line references: `inex/ClientApp/src/App.tsx:86` redirects `/` to `/dashboard`; `inex/ClientApp/src/App.tsx:88` defines `/transactions`; `inex/ClientApp/src/layouts/AppShell.tsx:34` through `inex/ClientApp/src/layouts/AppShell.tsx:40` add Dashboard to `NAV_ITEMS`; `inex/ClientApp/src/layouts/AppShell.tsx:137` through `inex/ClientApp/src/layouts/AppShell.tsx:156` render the same six-item list into the bottom nav; `inex/ClientApp/src/layouts/AppShell.css:226` through `inex/ClientApp/src/layouts/AppShell.css:239` define a six-column bottom nav.

   Classification: routing/navigation change; shared component/design-system change.

2. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` desktop and mobile shell. Actual app route or screen inspected: `http://localhost:5000/transactions` desktop and mobile shell.

   Evidence: [Confirmed] The mockup shell uses a multicolor infinity-style mark and only a profile pill. The actual shell uses a navy square `I` mark and renders a separate sign-out icon button next to the profile pill. This is visible on desktop and mobile.

   Implementation files and line references: `inex/ClientApp/src/layouts/AppShell.tsx:53` through `inex/ClientApp/src/layouts/AppShell.tsx:57` define the actual logo text/mark; `inex/ClientApp/src/layouts/AppShell.css:38` through `inex/ClientApp/src/layouts/AppShell.css:50` style the navy square mark; `inex/ClientApp/src/layouts/AppShell.tsx:104` through `inex/ClientApp/src/layouts/AppShell.tsx:123` render the profile and sign-out buttons; `inex/ClientApp/src/layouts/AppShell.css:160` through `inex/ClientApp/src/layouts/AppShell.css:173` style the sign-out icon button.

   Classification: shared component/design-system change; routing/navigation change.

3. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` desktop and 390px mobile. Actual app route or screen inspected: `http://localhost:5000/transactions` desktop and 390px mobile.

   Evidence: [Confirmed] The mockup header CTA reads `Add transaction`; on mobile it spans the content width. The actual CTA reads `Добавить` / English key `Add`, remains compact on mobile, and does not fill the available width.

   Implementation files and line references: `inex/ClientApp/src/pages/Transactions.tsx:202` through `inex/ClientApp/src/pages/Transactions.tsx:205` render the header CTA with `t("transactions.add")`; `inex/ClientApp/public/locales/en/translation.json:107` through `inex/ClientApp/public/locales/en/translation.json:108` define `Add Transaction` for the drawer title and `Add` for the header button; `inex/ClientApp/src/components/primitives/Button.tsx:75` through `inex/ClientApp/src/components/primitives/Button.tsx:90` keep buttons `inline-flex`; `inex/ClientApp/src/layouts/AppShell.css:340` through `inex/ClientApp/src/layouts/AppShell.css:342` give the mobile header action container full width but do not stretch the button.

   Classification: page-local UI change; documentation update needed if the compact mobile CTA is intentional.

4. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` default ledger. Actual app route or screen inspected: `http://localhost:5000/transactions` default ledger.

   Evidence: [Confirmed] The mockup KPI strip is scoped to `April 2026` and shows period copy such as `1 transactions in April`, `17 transactions in April`, and `154.76 USD cash deficit`. The actual app shows `All active dates`, `20 visible rows`, and `Visible page shown in USD where rates exist`, with totals based on the visible fetched page rather than the mockup period totals.

   Implementation files and line references: `inex/ClientApp/src/pages/Transactions.tsx:181` through `inex/ClientApp/src/pages/Transactions.tsx:199` build KPI copy from `ledgerMetrics` and `periodLabel`; `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:200` through `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:223` compute `ledgerMetrics` from `visibleTransactions`; `inex/ClientApp/src/pages/Transactions.tsx:95` through `inex/ClientApp/src/pages/Transactions.tsx:98` use the fallback period label when no range is active; `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts:166` through `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts:171` only formats a date period when a two-sided range exists; `inex/ClientApp/public/locales/en/translation.json:181` through `inex/ClientApp/public/locales/en/translation.json:184` define the visible-page KPI copy.

   Classification: data/API/state dependency; page-local UI change; unclear/requires decision.

5. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` default ledger. Actual app route or screen inspected: `http://localhost:5000/transactions` default ledger.

   Evidence: [Confirmed] The mockup renders KPI currency as a smaller suffix adjacent to large tabular numbers. The actual `Num` output renders amount and currency as one same-size string, for example `+214.19 USD`, in the KPI value line.

   Implementation files and line references: `inex/ClientApp/src/pages/Transactions.tsx:216` through `inex/ClientApp/src/pages/Transactions.tsx:221` renders KPIs via `Num` with `size={30}`; `inex/ClientApp/src/components/primitives/Num.tsx:81` through `inex/ClientApp/src/components/primitives/Num.tsx:98` builds one `visibleValue` string and applies one font size to the whole string.

   Classification: shared component/design-system change; page-local UI change.

6. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` default ledger. Actual app route or screen inspected: `http://localhost:5000/transactions` default ledger.

   Evidence: [Confirmed] The mockup second ledger toolbar row includes a left `View` label, the segmented control after it, and a search field right-aligned on desktop. The actual app omits the visible `View` label and places the segmented control and search field together from the left.

   Implementation files and line references: `inex/ClientApp/src/pages/Transactions.tsx:257` through `inex/ClientApp/src/pages/Transactions.tsx:276` render only `SegmentedControl` and search; `inex/ClientApp/src/pages/Transactions/transactions-ledger.css:125` through `inex/ClientApp/src/pages/Transactions/transactions-ledger.css:140` left-align controls and cap search at 360px; no source renders a `View` label.

   Classification: page-local UI change.

7. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` default ledger and 390px mobile. Actual app route or screen inspected: `http://localhost:5000/transactions` default ledger and 390px mobile.

   Evidence: [Confirmed] Mockup day headers have no leading icon and show labels such as `Today`, `Yesterday`, and compact weekday/month labels. Actual day headers show a calendar icon before each date and rendered full localized weekday/date strings for the visible data, such as `воскресенье, 31 мая`.

   Implementation files and line references: `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:363` through `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:371` render `CalendarDays` plus the group label; `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts:150` through `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts:163` returns today/yesterday only for dates matching the current day or prior day, otherwise full weekday formats; `inex/ClientApp/src/pages/Transactions/transactions-ledger.css:226` through `inex/ClientApp/src/pages/Transactions/transactions-ledger.css:256` place the date label and totals.

   Classification: page-local UI change; data/API/state dependency for whether Today/Yesterday appears.

8. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` at 390px mobile. Actual app route or screen inspected: `http://localhost:5000/transactions` at 390px mobile.

   Evidence: [Confirmed] The mockup mobile ledger rows do not show a trailing chevron. The actual mobile ledger rows show a right-side chevron, making each row visibly look like a drill-in/edit row.

   Implementation files and line references: `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:388` through `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:399` make each row a clickable `role="button"`; `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:457` renders `ChevronRight`; `inex/ClientApp/src/pages/Transactions/transactions-ledger.css:541` through `inex/ClientApp/src/pages/Transactions/transactions-ledger.css:546` displays the chevron on mobile.

   Classification: page-local UI change; unclear/requires decision.

9. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` filter drawer. Actual app route or screen inspected: `http://localhost:5000/transactions` filter drawer.

   Evidence: [Confirmed] The mockup filter drawer uses simple boxed controls: two date inputs (`From`, `To`), native-looking `All accounts` and `All categories` selects, and one text input with example `BIEDRONKA, ALINA_SHAPOVA`. The actual drawer uses an AntD `RangePicker`, custom menu-style account/category dropdown rows with chevrons, and a `#tag @ref` text input.

   Implementation files and line references: `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:211` through `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:306` render the AntD form; `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:215` through `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:223` render `RangePicker`; `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:229` through `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:249` render custom `Dropdown` for account/category; `inex/ClientApp/src/components/Dropdown.tsx:22` through `inex/ClientApp/src/components/Dropdown.tsx:52` implement the menu-style dropdown; `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:253` through `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:263` set the `#tag @ref` placeholder.

   Classification: page-local UI change; shared component/design-system change.

10. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` filter drawer. Actual app route or screen inspected: `http://localhost:5000/transactions` filter drawer.

   Evidence: [Confirmed] The mockup filter drawer has one `Amount equivalent` label with adjacent `Min`/`Max` boxes and `USD` suffix blocks. The actual drawer has separate labels `Minimum equivalent` and `Maximum equivalent`, no visible currency suffix blocks, and placeholders `0.00` / `Any`.

   Implementation files and line references: `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:266` through `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:288` render separate min/max `Input` controls; `inex/ClientApp/public/locales/en/translation.json:153` and `inex/ClientApp/public/locales/en/translation.json:157` through `inex/ClientApp/public/locales/en/translation.json:158` define `Any`, `Minimum equivalent`, and `Maximum equivalent`.

   Classification: page-local UI change; documentation update needed if the split-label form is intentional.

11. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` filter drawer. Actual app route or screen inspected: `http://localhost:5000/transactions` filter drawer.

   Evidence: [Confirmed] With no filter values entered, mockup drawer actions `Clear all` and `Apply filters` are right-aligned, content-width buttons and appear enabled. Actual drawer actions are two equal-width block buttons and are disabled in the no-filter state.

   Implementation files and line references: `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:120` through `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:122` compute `filterActive`; `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:290` through `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx:303` render block Reset/Apply buttons with `disabled={!filterActive}`.

   Classification: page-local UI change; unclear/requires decision.

12. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` add drawer. Actual app route or screen inspected: `http://localhost:5000/transactions` add drawer.

   Evidence: [Confirmed] Mockup add drawer title is `New transaction` with subtitle `Record a new expense`; the type selector is a pill/segmented control with Expense active. Actual drawer title is `Add Transaction`, subtitle is `Record income, expense, or transfer movement.`, and the type selector is AntD card tabs.

   Implementation files and line references: `inex/ClientApp/src/pages/Transactions.tsx:309` through `inex/ClientApp/src/pages/Transactions.tsx:320` render the add drawer and `TransactionCreate`; `inex/ClientApp/public/locales/en/translation.json:107` and `inex/ClientApp/public/locales/en/translation.json:146` define the actual title/subtitle; `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx:208` through `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx:213` render AntD `Tabs` with `type="card"`.

   Classification: page-local UI change; documentation update needed if the actual copy is intentional.

13. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` add drawer. Actual app route or screen inspected: `http://localhost:5000/transactions` add drawer.

   Evidence: [Confirmed] Mockup add expense form order is Amount, Account, Category, Date, Comment, Tags. Actual expense form order is Account, Category, Amount, Date, Comment, and no Tags field is visible.

   Implementation files and line references: `inex/ClientApp/src/pages/Transactions/TransactionCreateExpenseForm.tsx:13` through `inex/ClientApp/src/pages/Transactions/TransactionCreateExpenseForm.tsx:49` render Account, Category, Amount, Date, Comment in that order; there is no Tags field in `TransactionCreateExpenseForm.tsx`; `inex/ClientApp/src/pages/Transactions/TransactionCreateIncomeForm.tsx:13` through `inex/ClientApp/src/pages/Transactions/TransactionCreateIncomeForm.tsx:49` shows the same omission for income; `inex/ClientApp/src/pages/Transactions/TransactionCreateTransferForm.tsx:13` through `inex/ClientApp/src/pages/Transactions/TransactionCreateTransferForm.tsx:56` also has no Tags field.

   Classification: page-local UI change; data/API/state dependency if create tags are not supported by current API.

14. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` add drawer. Actual app route or screen inspected: `http://localhost:5000/transactions` add drawer.

   Evidence: [Confirmed] Mockup add drawer actions are `Save expense` and `Cancel`. Actual add drawer shows only a generic `Save` action and no visible Cancel button.

   Implementation files and line references: `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx:214` through `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx:218` render a single primary AntD `Button` using `t("transactions.save")`; `inex/ClientApp/public/locales/en/translation.json:124` defines `Save`; no cancel action is rendered in `TransactionCreate.tsx`.

   Classification: page-local UI change.

15. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` after no-match search. Actual app route or screen inspected: `http://localhost:5000/transactions` after no-match search.

   Evidence: [Confirmed] Searching `zzzz-no-match` in the mockup leaves the KPI strip at its original April totals (`205.84`, `360.60`, `-154.76`) and changes only ledger count to `0 of 20`. The actual app zeroes the KPI values and segmented counts because local search feeds `visibleTransactions` and `ledgerMetrics`.

   Implementation files and line references: `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:160` through `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:185` filter local visible transactions by search/type; `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:200` through `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:223` compute all KPI metrics and type counts from the filtered result; `inex/ClientApp/src/pages/Transactions.tsx:181` through `inex/ClientApp/src/pages/Transactions.tsx:199` display those metrics.

   Classification: data/API/state dependency; unclear/requires decision.

16. Page: Transactions. Mockup route or screen inspected: `http://127.0.0.1:5173/` after no-match search. Actual app route or screen inspected: `http://localhost:5000/transactions` after no-match search.

   Evidence: [Confirmed] Mockup no-match state shows column headers and a single centered message: `No transactions match these filters`. Actual app shows a larger dashed empty-state panel with icon, title, explanatory text, and a `Clear filters` button; actual also adds a separate `Filters active` badge in the ledger toolbar, which the mockup no-match state does not show.

   Implementation files and line references: `inex/ClientApp/src/pages/Transactions.tsx:240` through `inex/ClientApp/src/pages/Transactions.tsx:245` render the `Filters active` toolbar badge; `inex/ClientApp/src/pages/Transactions.tsx:279` through `inex/ClientApp/src/pages/Transactions.tsx:290` render active chips and `Clear all`; `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:352` through `inex/ClientApp/src/pages/Transactions/TransactionList.tsx:359` render `FilterEmpty` when local filters produce zero visible transactions; `inex/ClientApp/src/components/primitives/EmptyState.tsx:94` through `inex/ClientApp/src/components/primitives/EmptyState.tsx:140` define the icon/title/description/action empty panel.

   Classification: page-local UI change; shared component/design-system change.

# Implementation flow

Confirmed source flow:
- Routing starts in `inex/ClientApp/src/App.tsx`; `/` redirects to `/dashboard`, while `/transactions` is protected and lazy-loads `Transactions`.
- Shell chrome comes from `inex/ClientApp/src/layouts/AppShell.tsx`; `NAV_ITEMS` drive both desktop top nav and mobile bottom nav.
- Transactions page composition is in `inex/ClientApp/src/pages/Transactions.tsx`; it renders `BasicPage`, the KPI strip, ledger toolbar, active chips, `TransactionList`, and the add/filter drawers.
- Ledger data and visible row state are owned by `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`; it fetches transactions through `useGetTransactionsQuery`, applies local search/type/amount filters, groups rows by date, and reports metrics back to `Transactions.tsx`.
- Filter drawer form implementation is `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx`; it combines server filter URL state with local amount filter state and uses AntD `RangePicker`, custom `Dropdown`, `Input`, and `Button`.
- Add drawer implementation starts in `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx`; it uses AntD card tabs and delegates fields to `TransactionCreateExpenseForm`, `TransactionCreateIncomeForm`, and `TransactionCreateTransferForm`.
- Drawer shell behavior is shared through `inex/ClientApp/src/components/primitives/InExDrawer.tsx`, which wraps AntD `Drawer` and always supplies a close icon.

# File/component impact map

| Area | Files | Impact |
| --- | --- | --- |
| Routing/navigation | `inex/ClientApp/src/App.tsx`, `inex/ClientApp/src/layouts/AppShell.tsx`, `inex/ClientApp/src/layouts/AppShell.css` | Root redirect, Dashboard nav item, six-item bottom nav, logo, profile/sign-out chrome. |
| Transactions page header and KPI strip | `inex/ClientApp/src/pages/Transactions.tsx`, `inex/ClientApp/src/pages/Transactions/transactions-ledger.css`, `inex/ClientApp/src/components/primitives/Num.tsx`, locale JSON | Add CTA copy/width, KPI scope/copy, currency typography. |
| Ledger toolbar and list | `inex/ClientApp/src/pages/Transactions.tsx`, `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`, `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts`, `transactions-ledger.css` | Missing `View` label, search placement, day header icon/labels, mobile row chevron, no-match KPI behavior. |
| Filter drawer | `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx`, `inex/ClientApp/src/components/Dropdown.tsx`, `inex/ClientApp/src/components/primitives/InExDrawer.tsx`, locale JSON | Control style/ordering, amount-equivalent inputs, disabled block actions, drawer close icon/width. |
| Add drawer | `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx`, `TransactionCreateExpenseForm.tsx`, `TransactionCreateIncomeForm.tsx`, `TransactionCreateTransferForm.tsx`, `ExpressionInputNumber.tsx`, locale JSON | Title/subtitle, tabs vs segmented control, field order, missing Tags field, save/cancel actions. |
| Empty state | `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`, `inex/ClientApp/src/components/primitives/EmptyState.tsx`, locale JSON | Rich dashed empty-state panel vs mockup single message; extra active-filter badge. |

# Documentation updates needed later

- If Dashboard in shell and `/` redirect to `/dashboard` are intentional despite the mockup root showing Transactions, update the design mockup or design implementation guide to reflect the current IA.
- If KPI scope is intentionally "visible page / all active dates" instead of mockup "selected period totals", update `docs/planning/epics.md` and the design guide language so future page audits do not keep re-raising this mismatch.
- If AntD drawer controls, disabled filter actions, and add-form tabs are intentional production deviations, document them as accepted design-system decisions.
- If create tags are not supported by the API, document the API limitation before asking implementation agents to add the mockup Tags field.
- If actual Russian rendering is expected for this test user, future visual QA baselines should specify locale explicitly.

# Open questions

- Should the implementation align with the mockup IA where Transactions is the root/default page, or is Dashboard now the accepted app landing route?
- Should the Transactions KPI strip remain period-total based even when local search filters produce zero visible rows?
- Should the filter drawer use design-mockup boxed controls, or is the current AntD `RangePicker` plus menu dropdown pattern accepted?
- Should add transaction support tags at creation time, or is the mockup Tags field ahead of the current backend contract?
- Should mobile rows show a chevron/edit affordance, or should they match the mockup's non-chevron ledger rows?
- Should the shared drawer close icon remain visible even though the mockup drawers did not show it?

# Verification checklist

- [x] Used Browser plugin for mockup desktop route.
- [x] Used Browser plugin for actual app login and Transactions desktop route.
- [x] Used Browser plugin for mockup and actual filter drawers.
- [x] Used Browser plugin for mockup and actual add drawers.
- [x] Used Browser plugin for mockup and actual 390px mobile route.
- [x] Used Browser plugin for mockup and actual no-match search state.
- [x] Reset Browser viewport after mobile inspection.
- [x] Used BMad evidence grading in this document with investigation slug `mockup-audit-transactions`.
- [x] Did not create a separate BMad case file.
- [x] Did not edit source implementation files, shared docs, docs indexes, roadmap files, configs, package files, screenshots, or generated assets.
- [ ] Loading and API error states were not forced; no visible mismatch is claimed for those states.
- [ ] No tests were run because this is a documentation-only audit.
