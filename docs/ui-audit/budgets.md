## Summary

Investigation slug: `mockup-audit-budgets`. Evidence discipline: BMad-style evidence grading in this document only; no separate BMad case file was created. The BMad customization resolver documented by the skill was not present at `_bmad/scripts/resolve_customization.py`, so normal skill activation could not run, but the investigation used Confirmed/Deduced/Hypothesized grading below.

Browser evidence inspected:
- Mockup desktop: `http://127.0.0.1:5173/#/budgets`.
- Mockup mobile: `http://127.0.0.1:5173/#/budgets` at 390x844.
- Actual default navigation: `http://localhost:5000/dashboard` -> `http://localhost:5000/budgets?year=2026&month=6`.
- Actual comparison route: `http://localhost:5000/budgets?year=2026&month=4`.
- Actual mobile comparison route: `http://localhost:5000/budgets?year=2026&month=4` at 390x844.

Confirmed high-level result: the actual Budgets page implements the same broad feature area, but it is not visually aligned with the mockup. The biggest visible gaps are header action placement, oversized hero density, externalized toolbar controls, missing list title/count toolbar, different table schema, row density/content, currency/data fixture mismatch, and shell/navigation differences. Mobile has no horizontal overflow in either surface, but the actual hero consumes 1088px before the toolbar appears versus 428px in the mockup.

## Confirmed mismatches

1. **Shell navigation has an extra Dashboard route and different route behavior**
   - Page name: Budgets.
   - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`, desktop and 390px mobile.
   - Actual app route or screen inspected: nav click from `http://localhost:5000/dashboard` to `http://localhost:5000/budgets?year=2026&month=6`; direct comparison at `http://localhost:5000/budgets?year=2026&month=4`.
   - Classification: routing/navigation change; shared component/design-system change.
   - Evidence: Confirmed. Mockup top nav shows `Transactions, Accounts, Categories, Budgets, Reports`; actual top and bottom nav show `Дашборд, Транзакции, Счета, Категории, Бюджеты, Отчёты`. Actual root redirects to `/dashboard` and Budgets route normalizes to `?year=2026&month=6` by default.
   - Implementation refs: `inex/ClientApp/src/layouts/AppShell.tsx:25`, `inex/ClientApp/src/layouts/AppShell.tsx:34`, `inex/ClientApp/src/layouts/AppShell.tsx:84`, `inex/ClientApp/src/App.tsx:86`, `inex/ClientApp/src/App.tsx:91`.

2. **Actual brand/header controls differ from mockup**
   - Page name: Budgets.
   - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
   - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
   - Classification: shared component/design-system change; unclear/requires decision.
   - Evidence: Confirmed. Mockup brand uses a multicolor infinity mark and only a user pill at the right. Actual uses a dark square `I` mark and shows an additional logout icon button beside the profile pill.
   - Implementation refs: `inex/ClientApp/src/layouts/AppShell.tsx:53`, `inex/ClientApp/src/layouts/AppShell.tsx:104`, `inex/ClientApp/src/layouts/AppShell.css:38`, `inex/ClientApp/src/layouts/AppShell.css:160`.

3. **Page header actions are missing from the actual page header**
   - Page name: Budgets.
   - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
   - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
   - Classification: page-local UI change.
   - Evidence: Confirmed. Mockup page header contains right-aligned `Copy from March` and primary `Add budget` at y=106. Actual page header contains only `План` and `Бюджеты`; copy/add appear later in an external toolbar at y=804 on desktop.
   - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:648`, `inex/ClientApp/src/pages/Budgets.tsx:672`, `inex/ClientApp/src/pages/Budgets.tsx:683`, `docs/design/docs/design-implementation-guide.md:55`, `docs/design/docs/design-implementation-guide.md:378`.

4. **Copy action label and sizing differ**
   - Page name: Budgets.
   - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
   - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
   - Classification: page-local UI change; documentation update needed.
   - Evidence: Confirmed. Mockup copy button is `Copy from March` and is 171px wide in the page header. Actual button is `Скопировать из март 2026`, 228px wide, and appears in the toolbar. In English, the implementation source uses `Copy from {{month}}`, which includes the year through the formatter.
   - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:273`, `inex/ClientApp/src/pages/Budgets.tsx:679`, `inex/ClientApp/src/pages/Budgets.tsx:681`, `inex/ClientApp/public/locales/en/translation.json:459`, `inex/ClientApp/public/locales/ru/translation.json:461`.

5. **Hero card is much taller and denser in the actual app**
   - Page name: Budgets.
   - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`, desktop and 390px mobile.
   - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`, desktop and 390px mobile.
   - Classification: page-local UI change.
   - Evidence: Confirmed. Mockup desktop hero measured 1190x245. Actual desktop hero measured 1185x568. Mockup mobile hero measured 348x428. Actual mobile hero measured 343x1088 before the toolbar appears.
   - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:526`, `inex/ClientApp/src/pages/Budgets.tsx:590`, `inex/ClientApp/src/pages/Budgets/budgets.css:7`, `inex/ClientApp/src/pages/Budgets/budgets.css:107`, `inex/ClientApp/src/pages/Budgets/budgets.css:633`.

6. **Hero summary content does not match the mockup hierarchy**
   - Page name: Budgets.
   - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
   - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
   - Classification: page-local UI change; data/API/state dependency.
   - Evidence: Confirmed. Mockup summary reads `April 2026 Budget`, `2,575 / 3,100 PLN`, `525 PLN left · 198 PLN ahead of pace`. Actual reads `Планирование месяца`, `Бюджет на апр. 2026`, a descriptive paragraph, `3,198.89 USD / 3,195.00 USD`, five metric cards, and `3.89 USD сверх лимита / сверх бюджета`.
   - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:528`, `inex/ClientApp/src/pages/Budgets.tsx:531`, `inex/ClientApp/src/pages/Budgets.tsx:563`, `inex/ClientApp/src/pages/Budgets.tsx:590`, `inex/ClientApp/public/locales/en/translation.json:450`, `inex/ClientApp/public/locales/ru/translation.json:452`.

7. **Currency and fixture values differ**
   - Page name: Budgets.
   - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
   - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
   - Classification: data/API/state dependency; unclear/requires decision.
   - Evidence: Confirmed. Mockup displays PLN values throughout the hero and rows. Actual displays USD values for the same April route. The implementation derives `reportCurrency` from loaded currencies/user currency and passes it to the report endpoint.
   - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:165`, `inex/ClientApp/src/pages/Budgets.tsx:211`, `inex/ClientApp/src/store/budgetReport/budgetReport-api.ts:20`, `inex/ClientApp/src/store/budgetReport/budgetReport-api.ts:21`.

8. **Actual hero keeps secondary metric cards that the mockup does not show**
   - Page name: Budgets.
   - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
   - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
   - Classification: page-local UI change.
   - Evidence: Confirmed. Mockup left hero has rollup, progress bar, and remaining/pace sentence only. Actual adds `Запланировано`, `Потрачено`, `Остаток`, `Использовано`, and `Превышено` cards, which account for most of the extra height.
   - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:590`, `inex/ClientApp/src/pages/Budgets.tsx:591`, `inex/ClientApp/src/pages/Budgets.tsx:610`, `inex/ClientApp/src/pages/Budgets/budgets.css:107`, `inex/ClientApp/src/pages/Budgets/budgets.css:115`.

9. **Burn-rate status taxonomy differs**
   - Page name: Budgets.
   - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
   - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
   - Classification: unclear/requires decision; documentation update needed.
   - Evidence: Confirmed. Mockup legend reads `On track`, `Close to limit`, `Over budget`, `Severely over`, `Not touched`. Actual legend reads `В норме`, `Близко к лимиту`, `На лимите`, `Сверх бюджета`, `Не использован`; the implementation uses `atLimit` instead of the mockup's `Severely over` state.
   - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:623`, `inex/ClientApp/src/pages/Budgets/budget-planning-utils.ts:24`, `inex/ClientApp/public/locales/en/translation.json:490`, `inex/ClientApp/public/locales/ru/translation.json:492`.

10. **Burn-rate rows are too tall and vertically sparse**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: page-local UI change.
    - Evidence: Confirmed. Mockup burn list occupies 138px for five rows. Actual burn list occupies 302px; each actual burn row is about 51px tall. This contributes directly to the actual 568px hero.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:631`, `inex/ClientApp/src/pages/Budgets.tsx:633`, `inex/ClientApp/src/pages/Budgets/budgets.css:223`, `inex/ClientApp/src/pages/Budgets/budgets.css:228`.

11. **Burn-rate row data/order does not match the mockup**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: data/API/state dependency.
    - Evidence: Confirmed. Mockup top burn rows are `Going out 136%`, `Groceries 105%`, `Housing 79%`, `Utilities 44%`, `Transport 20%`. Actual April top burn rows are `Прочее 162%`, `Отдых 134%`, `Автомобиль 133%`, `Обучение 105%`, `Жилье 98%`.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:294`, `inex/ClientApp/src/pages/Budgets.tsx:304`, `inex/ClientApp/src/store/budgets/budgets-api.ts:59`, `inex/ClientApp/src/store/budgetReport/budgetReport-api.ts:20`.

12. **Budgets list title/count toolbar is missing in actual**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: page-local UI change.
    - Evidence: Confirmed. Mockup list card starts with `Budgets` and `5 budgets for April 2026`. Actual has no list title/count/scope header; it goes from an external toolbar to the table header.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:648`, `inex/ClientApp/src/pages/Budgets.tsx:788`, `docs/design/docs/design-implementation-guide.md:379`.

13. **Month controls are outside the list card and use different controls**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: page-local UI change; shared component/design-system change.
    - Evidence: Confirmed. Mockup month switcher is inside the list toolbar and includes previous/next icon buttons, month chips, disabled later-month affordance, and `Jump to…`. Actual shows five segmented month chips in a separate toolbar plus an Ant Design month input `2026-04`; no previous/next arrow buttons or `Jump to…` button are visible.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:102`, `inex/ClientApp/src/pages/Budgets.tsx:648`, `inex/ClientApp/src/pages/Budgets.tsx:650`, `inex/ClientApp/src/pages/Budgets.tsx:656`, `inex/ClientApp/src/pages/Budgets/budgets.css:293`, `inex/ClientApp/src/pages/Budgets/budgets.css:301`.

14. **View/sort segmented controls are missing**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: page-local UI change; unclear/requires decision.
    - Evidence: Confirmed. Mockup has `View` plus `Burn rate`, `Remaining`, `Amount`, and `Name` controls. Actual has no equivalent view/sort control.
    - Implementation refs: no matching state/control found in `inex/ClientApp/src/pages/Budgets.tsx`; current controls are month picker/search/actions at `inex/ClientApp/src/pages/Budgets.tsx:648` through `inex/ClientApp/src/pages/Budgets.tsx:687`.

15. **Search placement and placeholder differ**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: page-local UI change.
    - Evidence: Confirmed. Mockup search is a 220px right-aligned control in the list filter bar with placeholder `Search budgets…`. Actual search is a wide toolbar input with label `Поиск бюджетов` and placeholder `Искать бюджет или категорию`.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:663`, `inex/ClientApp/src/pages/Budgets.tsx:669`, `inex/ClientApp/src/pages/Budgets/budgets.css:310`, `inex/ClientApp/public/locales/en/translation.json:461`, `inex/ClientApp/public/locales/ru/translation.json:463`.

16. **Table/list columns do not match**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: page-local UI change.
    - Evidence: Confirmed. Mockup header columns are `Budget`, `Categories`, `Progress`, `Daily pace`, `Remaining`. Actual columns are `Название`, `Категории`, `Прогресс`, `Дневной темп`, `Потрачено`, `Остаток`, `Запланировано`, adding Spent/Budgeted and changing the first-column label.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:789`, `inex/ClientApp/src/pages/Budgets.tsx:790`, `inex/ClientApp/src/pages/Budgets.tsx:796`, `inex/ClientApp/src/pages/Budgets/budgets.css:366`, `inex/ClientApp/src/pages/Budgets/budgets.css:373`.

17. **Visible row count and table height are much larger in actual**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: data/API/state dependency; page-local UI change.
    - Evidence: Confirmed. Mockup displays five budget rows in a 556px list card. Actual April displays fourteen budget rows in a 1636px list card. Actual rows vary from 98px to 151px tall; mockup rows are 78px tall.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:798`, `inex/ClientApp/src/store/budgets/budgets-api.ts:59`, `inex/ClientApp/src/pages/Budgets/budgets.css:377`, `inex/ClientApp/src/pages/Budgets/budgets.css:383`.

18. **Row first-cell content is heavier than the mockup**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: page-local UI change.
    - Evidence: Confirmed. Mockup row first cell shows budget name and parent context, for example `Going out` and `Food & Drink`. Actual first cell is a button containing budget name, parent context, and description, for example `Автомобиль`, `Транспорт`, `Расходы на авто`, making rows taller.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:828`, `inex/ClientApp/src/pages/Budgets.tsx:834`, `inex/ClientApp/src/pages/Budgets.tsx:840`, `inex/ClientApp/src/pages/Budgets/budgets.css:394`, `inex/ClientApp/src/pages/Budgets/budgets.css:412`.

19. **Category chip density/style differs**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: page-local UI change; data/API/state dependency.
    - Evidence: Confirmed. Mockup rows show one small category tag in the Categories column. Actual rows render all selected categories as filled gray chips, often two to four chips and multiple wrapped lines.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:844`, `inex/ClientApp/src/pages/Budgets.tsx:846`, `inex/ClientApp/src/pages/Budgets/budgets.css:427`, `inex/ClientApp/src/pages/Budgets/budgets.css:435`.

20. **Progress cell content is reorganized away from mockup**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: page-local UI change.
    - Evidence: Confirmed. Mockup progress cell shows spent/budget pair and percent together, such as `340 / 250` and `136%`, above the progress bar. Actual progress cell shows a bar and status text such as `Превышение на 23.41 USD`; spent and budgeted numbers are split into separate columns.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:849`, `inex/ClientApp/src/pages/Budgets.tsx:857`, `inex/ClientApp/src/pages/Budgets.tsx:880`, `inex/ClientApp/src/pages/Budgets.tsx:898`.

21. **Remaining value semantics do not match**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: page-local UI change.
    - Evidence: Confirmed. Mockup Remaining column combines signed amount and state/currency, such as `−90` with `over · PLN` or `380` with `left · PLN`. Actual Remaining column shows a positive currency value like `23.41 USD` for over-budget rows and lacks the compact `over · currency` / `left · currency` sublabel.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:887`, `inex/ClientApp/src/pages/Budgets.tsx:891`, `inex/ClientApp/public/locales/en/translation.json:470`, `inex/ClientApp/public/locales/ru/translation.json:472`.

22. **Over-budget row treatment differs**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: page-local UI change; shared component/design-system change.
    - Evidence: Confirmed. Mockup over-budget rows use a narrow left status rail and red/brown progress color. Actual over-budget rows use a subtle full-row gradient and a text notice `Превышен бюджет`; no matching left rail is visible.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:827`, `inex/ClientApp/src/pages/Budgets.tsx:901`, `inex/ClientApp/src/pages/Budgets/budgets.css:386`, `inex/ClientApp/src/pages/Budgets/budgets.css:471`.

23. **Actual row expand/edit affordance is not visibly equivalent**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: page-local UI change; unclear/requires decision.
    - Evidence: Confirmed. Mockup rows show a right-side affordance column/caret. Actual makes only the row main text block a button with `aria-expanded`; no clear right-side caret is visible in the desktop row.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets.tsx:828`, `inex/ClientApp/src/pages/Budgets.tsx:831`, `inex/ClientApp/src/pages/Budgets.tsx:907`.

24. **Card radius/shadow treatment is larger in actual**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: shared component/design-system change; page-local UI change.
    - Evidence: Confirmed. Mockup cards visually use tighter 6px-style radii matching the design guide's compact card language. Actual computed styles for `.budgets-hero` and `.budgets-list` are `border-radius: 10px`, `border: 1px solid rgb(229, 234, 241)`, and a two-layer subtle shadow.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets/budgets.css:7`, `inex/ClientApp/src/pages/Budgets/budgets.css:10`, `inex/ClientApp/src/pages/Budgets/budgets.css:11`, `inex/ClientApp/src/pages/Budgets/budgets.css:358`, `inex/ClientApp/src/pages/Budgets/budgets.css:361`.

25. **Localization/copy policy is visually unresolved against the mockup**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets`.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4`.
    - Classification: unclear/requires decision; documentation update needed.
    - Evidence: Confirmed. Mockup is English. Actual app rendered Russian for the provided account. Even the English translation source differs from mockup in several places: `Month planning`, `{{month}} budget`, `Search budget or category`, `At limit`, and `{{percent}}% used`.
    - Implementation refs: `inex/ClientApp/public/locales/en/translation.json:450`, `inex/ClientApp/public/locales/en/translation.json:461`, `inex/ClientApp/public/locales/en/translation.json:493`, `inex/ClientApp/public/locales/ru/translation.json:451`.

26. **Mobile information hierarchy diverges substantially**
    - Page name: Budgets.
    - Mockup route or screen inspected: `http://127.0.0.1:5173/#/budgets` at 390x844.
    - Actual app route or screen inspected: `http://localhost:5000/budgets?year=2026&month=4` at 390x844.
    - Classification: page-local UI change; responsive behavior.
    - Evidence: Confirmed. Both surfaces show bottom navigation and no horizontal overflow (`bodyWidth` 380 mockup, 375 actual). Mockup mobile first row starts around y=901 after a 428px hero and 141px list toolbar. Actual mobile first row starts around y=1510 after a 1088px hero and 245px toolbar.
    - Implementation refs: `inex/ClientApp/src/pages/Budgets/budgets.css:633`, `inex/ClientApp/src/pages/Budgets/budgets.css:646`, `inex/ClientApp/src/pages/Budgets/budgets.css:667`, `inex/ClientApp/src/layouts/AppShell.css:226`, `inex/ClientApp/src/layouts/AppShell.css:349`.

## Implementation flow

Confirmed route flow:
- `App.tsx` redirects authenticated `/` to `/dashboard` and registers `/budgets` as the Budgets page at `inex/ClientApp/src/App.tsx:86` and `inex/ClientApp/src/App.tsx:91`.
- `AppShell` renders the shared desktop/mobile navigation from `NAV_ITEMS`, including Dashboard and Budgets, at `inex/ClientApp/src/layouts/AppShell.tsx:34` through `inex/ClientApp/src/layouts/AppShell.tsx:40`.
- `Budgets.tsx` reads `year` and `month` from URL search params, falls back to the default budget month, then writes normalized params back to the URL at `inex/ClientApp/src/pages/Budgets.tsx:143` through `inex/ClientApp/src/pages/Budgets.tsx:161`.
- Budget list data comes from `useGetBudgetsQuery({ year, month })` at `inex/ClientApp/src/pages/Budgets.tsx:196` through `inex/ClientApp/src/pages/Budgets.tsx:203`; the endpoint calls `/budgets` with `year` and `month` params at `inex/ClientApp/src/store/budgets/budgets-api.ts:59` through `inex/ClientApp/src/store/budgets/budgets-api.ts:63`.
- Budget metrics come from `useGetBudgetReportQuery({ year, month, currency })` at `inex/ClientApp/src/pages/Budgets.tsx:205` through `inex/ClientApp/src/pages/Budgets.tsx:217`; the endpoint calls `/reports/budget/comparison` at `inex/ClientApp/src/store/budgetReport/budgetReport-api.ts:20` through `inex/ClientApp/src/store/budgetReport/budgetReport-api.ts:23`.
- Totals, over-budget count, hero pace, and top burn rows are calculated locally at `inex/ClientApp/src/pages/Budgets.tsx:261` through `inex/ClientApp/src/pages/Budgets.tsx:305`.
- The visible hero renders at `inex/ClientApp/src/pages/Budgets.tsx:526` through `inex/ClientApp/src/pages/Budgets.tsx:644`.
- The visible toolbar renders at `inex/ClientApp/src/pages/Budgets.tsx:648` through `inex/ClientApp/src/pages/Budgets.tsx:687`.
- The visible list rows render at `inex/ClientApp/src/pages/Budgets.tsx:788` through `inex/ClientApp/src/pages/Budgets.tsx:921`.

## File/component impact map

- `inex/ClientApp/src/pages/Budgets.tsx`: primary owner for header action placement, hero content, metric cards, burn list, toolbar composition, search, missing view/sort controls, list header/count, row schema, row content, expand affordance, currency use, and query-param month behavior.
- `inex/ClientApp/src/pages/Budgets/budgets.css`: primary owner for hero height/density, burn row density, toolbar placement/wrapping, search width, list/table grid, row height, category chip style, over-budget row treatment, card radius/shadow, and mobile behavior.
- `inex/ClientApp/src/pages/Budgets/budget-planning-utils.ts`: owner for budget usage statuses, pace statuses, supported month normalization, and currency selection helpers.
- `inex/ClientApp/src/store/budgets/budgets-api.ts`: owner for budget data source and row count/data dependency.
- `inex/ClientApp/src/store/budgetReport/budgetReport-api.ts`: owner for metric data source and requested report currency.
- `inex/ClientApp/src/layouts/AppShell.tsx` and `inex/ClientApp/src/layouts/AppShell.css`: owner for Dashboard nav item, brand mark, profile/logout controls, desktop nav, and mobile bottom nav.
- `inex/ClientApp/public/locales/en/translation.json` and `inex/ClientApp/public/locales/ru/translation.json`: owner for visible Budgets copy and the English/Russian mismatch against mockup labels.
- `docs/design/docs/design-implementation-guide.md`: design-contract source for `#/budgets`, header actions, month switcher prominence, desktop layout, row layout, and burn-rate scan priority.

## Documentation updates needed later

- Decide whether the mockup contract still requires the Budgets page to match the English static `#/budgets` April/PLN fixture, or whether actual localized user data is allowed to differ.
- If the actual Dashboard IA is now intended, update the design route map and navigation contract; current design guide maps Budgets under `Transactions, Accounts, Categories, Budgets, Reports` without Dashboard.
- If actual USD/user-currency display is intended, document that Budgets no longer uses the mockup's PLN fixture.
- If metric cards, added Spent/Budgeted columns, and fourteen-row data density are intended, update the design guide so later page agents do not treat them as regressions.
- If `At limit` replaces `Severely over`, update the design guide and status taxonomy.

## Open questions

- Should implementation target the static mockup's April 2026 PLN fixture for visual parity, or should comparisons use live user data and user currency?
- Should copy/add actions return to the page header, or is the external planning toolbar an intentional product decision?
- Should the list card regain the mockup's title/count/month scope toolbar?
- Should the row schema remove `Spent` and `Budgeted` columns to match the mockup, or should the mockup/design docs be updated?
- Should the actual extra Dashboard nav item and logout icon remain visible on all authenticated pages?
- Should English be forced for design parity checks, or should account locale be part of expected visual output?

## Verification checklist

- [x] Browser inspected mockup Budgets at `http://127.0.0.1:5173/#/budgets`.
- [x] Browser inspected actual Budgets default navigation to `http://localhost:5000/budgets?year=2026&month=6`.
- [x] Browser inspected actual April comparison route at `http://localhost:5000/budgets?year=2026&month=4`.
- [x] Browser inspected mockup and actual at 390x844 responsive viewport.
- [x] Source traced for route registration, shell nav, Budgets rendering, CSS, translations, and budget/report APIs.
- [x] No implementation files were edited.
- [x] No separate BMad case file was created.
- [ ] Normal BMad resolver activation was not completed because `_bmad/scripts/resolve_customization.py` is absent in this worktree.
