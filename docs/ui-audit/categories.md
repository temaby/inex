# Categories UI Audit

## Summary

Investigation slug: `mockup-audit-categories`.

Evidence discipline: BMad evidence grading was used in this document. The BMad customization resolver `_bmad/scripts/resolve_customization.py` was missing in this worktree, so the investigation was completed manually in the assigned audit file. No separate BMad case file was created.

Inspected mockup screens:
- `http://127.0.0.1:5173/#/categories` desktop default.
- `http://127.0.0.1:5173/#/categories` add drawer.
- `http://127.0.0.1:5173/#/categories` filter-empty search state.
- `http://127.0.0.1:5173/#/categories` By spend state.
- `http://127.0.0.1:5173/#/categories` first row expanded edit state.
- `http://127.0.0.1:5173/#/categories` mobile viewport `390x844`.

Inspected actual app screens:
- `http://localhost:5000/login` authentication screen.
- `http://localhost:5000/categories` desktop default.
- `http://localhost:5000/categories` add drawer.
- `http://localhost:5000/categories` filter-empty search state.
- `http://localhost:5000/categories` By spend state.
- `http://localhost:5000/categories` first row expanded edit state.
- `http://localhost:5000/categories` mobile viewport `390x844`.

Confirmed mismatch count: 20.

## Confirmed mismatches

### C01 - Shell navigation content and route model differ

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, desktop default and mobile.
- Actual app route or screen inspected: `http://localhost:5000/categories`, desktop default and mobile.
- Evidence: Confirmed. Mockup top navigation shows `Transactions`, `Accounts`, `Categories`, `Budgets`, `Reports`; the actual app shows `Дашборд`, `Транзакции`, `Счета`, `Категории`, `Бюджеты`, `Отчёты`. Mockup uses hash prototype route `/#/categories`; actual uses protected SPA route `/categories`.
- Implementation files and line references: `inex/ClientApp/src/layouts/AppShell.tsx:34` defines actual nav items including dashboard; `inex/ClientApp/src/layouts/AppShell.tsx:84` renders top nav; `inex/ClientApp/src/layouts/AppShell.tsx:137` renders bottom nav; `inex/ClientApp/src/App.tsx:85`-`inex/ClientApp/src/App.tsx:90` defines protected route `/categories`.
- Classification: routing/navigation change.

### C02 - Branding and top-right actions do not match the mockup

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, desktop and mobile.
- Actual app route or screen inspected: `http://localhost:5000/categories`, desktop and mobile.
- Evidence: Confirmed. Mockup shows a colored loop mark plus `InEx`, and one profile pill. Actual shows a dark square `I` mark plus `InEx`, a profile pill, and a separate sign-out icon button. On mobile, actual still shows the sign-out icon; mockup mobile only shows `TE`.
- Implementation files and line references: `inex/ClientApp/src/layouts/AppShell.tsx:53`-`inex/ClientApp/src/layouts/AppShell.tsx:57` renders the actual logo; `inex/ClientApp/src/layouts/AppShell.tsx:104`-`inex/ClientApp/src/layouts/AppShell.tsx:124` renders profile and sign-out; `inex/ClientApp/src/layouts/AppShell.css:31`-`inex/ClientApp/src/layouts/AppShell.css:56` styles the actual logo; `inex/ClientApp/src/layouts/AppShell.css:160`-`inex/ClientApp/src/layouts/AppShell.css:179` styles the sign-out icon button.
- Classification: shared component/design-system change.

### C03 - Actual page locale is Russian while mockup copy is English

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, all inspected states.
- Actual app route or screen inspected: `http://localhost:5000/categories`, all inspected states.
- Evidence: Confirmed. Mockup copy includes `Manage`, `Categories`, `Add category`, `April spend`, `By Category`, `Status`, `Tree`, `By spend`, and `Search categories...`. Actual copy includes Russian equivalents such as `Управление`, `Категории`, `Добавить`, `Расходы: июнь 2026 г.`, `По категориям`, `Активные`, `Дерево`, `По расходам`, and `Поиск категорий...`.
- Implementation files and line references: `inex/ClientApp/public/locales/en/translation.json:307`-`inex/ClientApp/public/locales/en/translation.json:415`; `inex/ClientApp/public/locales/ru/translation.json:309`-`inex/ClientApp/public/locales/ru/translation.json:417`; `inex/ClientApp/src/pages/Categories.tsx:162`-`inex/ClientApp/src/pages/Categories.tsx:167` uses `useTranslation`.
- Classification: unclear/requires decision.

### C04 - Period and spend data differ from the mockup

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, desktop default.
- Actual app route or screen inspected: `http://localhost:5000/categories`, desktop default.
- Evidence: Confirmed. Mockup is an April 2026 populated state with `360.60 USD`, top parent `Food & Drink`, and distribution values. Actual is a June 2026 no-spend state with a dash and `Расходы не записаны`.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories.tsx:134`-`inex/ClientApp/src/pages/Categories.tsx:160` derives the current period from `new Date()`; `inex/ClientApp/src/pages/Categories.tsx:95`-`inex/ClientApp/src/pages/Categories.tsx:131` fetches transactions for that period; `inex/ClientApp/src/pages/Categories.tsx:242`-`inex/ClientApp/src/pages/Categories.tsx:261` loads period transactions; `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx:52`-`inex/ClientApp/src/pages/Categories/CategoriesHero.tsx:159` switches between spend distribution and no-spend empty panel.
- Classification: data/API/state dependency.

### C05 - Hero card content and layout diverge in no-spend actual state

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, desktop default and mobile.
- Actual app route or screen inspected: `http://localhost:5000/categories`, desktop default and mobile.
- Evidence: Confirmed. Mockup hero is one compact card with left spend summary and right distribution bar/legend. Actual hero shows left no-spend summary, three metric tiles (`Активные`, `Родители`, `Дочерние`), and a large dashed empty distribution panel. On mobile this makes the actual hero 527px tall, pushing toolbar controls below the first viewport; the mockup still shows the populated distribution and top of the toolbar in the first viewport.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx:61`-`inex/ClientApp/src/pages/Categories/CategoriesHero.tsx:161`; `inex/ClientApp/src/pages/Categories/categories.css:17`-`inex/ClientApp/src/pages/Categories/categories.css:22`; `inex/ClientApp/src/pages/Categories/categories.css:63`-`inex/ClientApp/src/pages/Categories/categories.css:76`; `inex/ClientApp/src/pages/Categories/categories.css:108`-`inex/ClientApp/src/pages/Categories/categories.css:130`; `inex/ClientApp/src/pages/Categories/categories.css:480`-`inex/ClientApp/src/pages/Categories/categories.css:488`.
- Classification: page-local UI change; data/API/state dependency.

### C06 - Add category primary action is placed in the wrong surface

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, desktop and mobile default.
- Actual app route or screen inspected: `http://localhost:5000/categories`, desktop and mobile default.
- Evidence: Confirmed. Mockup places `Add category` in the page header area to the right of the title on desktop and as a full-width primary button directly below the title on mobile. Actual places `Добавить` inside the toolbar card beside the status segmented control; on mobile it appears much lower, after the hero and partly near the bottom navigation.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories.tsx:413`-`inex/ClientApp/src/pages/Categories.tsx:437` passes no page-head `extra` and renders the toolbar in the page body; `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:52`-`inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:67` renders the add button; `inex/ClientApp/src/layouts/AppShell.tsx:127`-`inex/ClientApp/src/layouts/AppShell.tsx:132` supports page-head right content.
- Classification: page-local UI change.

### C07 - Toolbar and table are split into separate cards instead of one composed list panel

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, desktop default.
- Actual app route or screen inspected: `http://localhost:5000/categories`, desktop default.
- Evidence: Confirmed. Mockup renders one continuous list card: title/count/status controls, a divider, view/search controls, another divider, and table rows. Actual renders a separate toolbar card followed by a separate list card with a gap between them.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories.tsx:426`-`inex/ClientApp/src/pages/Categories.tsx:437` renders `CategoriesToolbar`; `inex/ClientApp/src/pages/Categories.tsx:481`-`inex/ClientApp/src/pages/Categories.tsx:508` renders a separate `categories-list`; `inex/ClientApp/src/pages/Categories/categories.css:8`-`inex/ClientApp/src/pages/Categories/categories.css:15` gives hero, toolbar, and list their own card chrome; `inex/ClientApp/src/pages/Categories/categories.css:217`-`inex/ClientApp/src/pages/Categories/categories.css:254` styles toolbar/list separately.
- Classification: page-local UI change.

### C08 - Toolbar control dimensions and grouping differ

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, desktop default.
- Actual app route or screen inspected: `http://localhost:5000/categories`, desktop default.
- Evidence: Confirmed. Mockup status buttons are compact 27px-high controls at the far right of the list header with a `Status` label; view buttons are also 27px high. Actual uses 34px-high segmented controls from the shared primitive, with status and Add grouped together in a separate toolbar card.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:37`-`inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:88`; `inex/ClientApp/src/components/primitives/SegmentedControl.tsx:15`-`inex/ClientApp/src/components/primitives/SegmentedControl.tsx:61`; `inex/ClientApp/src/pages/Categories/categories.css:221`-`inex/ClientApp/src/pages/Categories/categories.css:233`.
- Classification: page-local UI change; shared component/design-system change.

### C09 - Search input placement and styling differ

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, desktop default and filter-empty state.
- Actual app route or screen inspected: `http://localhost:5000/categories`, desktop default and filter-empty state.
- Evidence: Confirmed. Mockup search is a 220x34 input aligned on the same filter bar as `View`, with white background and icon inside the field. Actual search is a 243x39 shared input in the toolbar bottom row, with a muted prefix block and localized placeholder.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:70`-`inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:86`; `inex/ClientApp/src/components/primitives/Input.tsx:40`-`inex/ClientApp/src/components/primitives/Input.tsx:81`; `inex/ClientApp/src/pages/Categories/categories.css:248`-`inex/ClientApp/src/pages/Categories/categories.css:250`.
- Classification: page-local UI change; shared component/design-system change.

### C10 - Category count and active scope data do not match

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, default and filter-empty states.
- Actual app route or screen inspected: `http://localhost:5000/categories`, default and filter-empty states.
- Evidence: Confirmed. Mockup default count is `22 of 24 categories · active only`; actual default count is `51 из 87 категорий · активные`. After a no-result search, mockup says `0 of 24 categories · active only`; actual says `0 из 87 категорий · активные`.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories.tsx:175`-`inex/ClientApp/src/pages/Categories.tsx:181` loads `ALL` categories; `inex/ClientApp/src/pages/Categories.tsx:283`-`inex/ClientApp/src/pages/Categories.tsx:298` applies active/search filtering; `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:40`-`inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:49` renders count summary.
- Classification: data/API/state dependency.

### C11 - Initial category order and category taxonomy differ

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, desktop default.
- Actual app route or screen inspected: `http://localhost:5000/categories`, desktop default.
- Evidence: Confirmed. Mockup starts with `Food & Drink`, then children such as `Groceries`, `Bars, cafés`, and `Going out`. Actual starts with `Доход`, then income-related children such as `Деньги в дар`, `Долг (взял)`, `Зарплата`, etc. Actual taxonomy contains many more categories and localized/user-specific names.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories/categories.utils.ts:73`-`inex/ClientApp/src/pages/Categories/categories.utils.ts:108` preserves root order from API and only moves system roots after user roots; `inex/ClientApp/src/store/categories/categories-api.ts:42`-`inex/ClientApp/src/store/categories/categories-api.ts:45` fetches API category order.
- Classification: data/API/state dependency.

### C12 - Row text repeats category name as description in the actual app

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, desktop default.
- Actual app route or screen inspected: `http://localhost:5000/categories`, desktop default.
- Evidence: Confirmed. Mockup row name column shows a single category label plus optional `Budgeted` pill. Actual rows show the category name twice, for example `Доход` as title and `Доход` again as description.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories/CategoryRow.tsx:80`-`inex/ClientApp/src/pages/Categories/CategoryRow.tsx:83` renders `category.description` under the title; `inex/ClientApp/src/store/categories/categories-api.ts:9`-`inex/ClientApp/src/store/categories/categories-api.ts:18` defines description as a category API field.
- Classification: data/API/state dependency; page-local UI change.

### C13 - Row density, stripe behavior, and hierarchy styling differ

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, desktop default.
- Actual app route or screen inspected: `http://localhost:5000/categories`, desktop default.
- Evidence: Confirmed. Mockup parent rows are about 60px high, child rows are 60px or 44px when empty, parent rows have subtle stripe styling and a left active accent on the selected/first parent. Actual rows are about 67px high, use white button rows, and do not show the mockup's first-row left accent.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories/CategoryRow.tsx:51`-`inex/ClientApp/src/pages/Categories/CategoryRow.tsx:60`; `inex/ClientApp/src/pages/Categories/categories.css:270`-`inex/ClientApp/src/pages/Categories/categories.css:302`; `inex/ClientApp/src/pages/Categories/categories.css:315`-`inex/ClientApp/src/pages/Categories/categories.css:348`; `inex/ClientApp/src/pages/Categories/categories.css:373`-`inex/ClientApp/src/pages/Categories/categories.css:391`.
- Classification: page-local UI change.

### C14 - By spend mode does not match the populated mockup behavior

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, By spend state.
- Actual app route or screen inspected: `http://localhost:5000/categories`, By spend state.
- Evidence: Confirmed. Mockup By spend mode lists leaf categories sorted by spend, starting with `Other income 205.84`, `Groceries 200.98`, `Going out 38.24`, etc. Actual By spend mode has no spend data and shows a flat list of zero-spend categories, starting with `Tопливо`, `Арендная плата`, `Бар\\Кафе\\Ресторан`; every rendered row has parent styling because depth is set to 0.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories.tsx:331`-`inex/ClientApp/src/pages/Categories.tsx:343` builds By spend rows and forces `depth: 0`; `inex/ClientApp/src/pages/Categories/categories.utils.ts:364`-`inex/ClientApp/src/pages/Categories/categories.utils.ts:383` sorts leaf categories by spend with index fallback; `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:70`-`inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:78` controls the view mode.
- Classification: page-local UI change; data/API/state dependency.

### C15 - Filter-empty state is heavier than the mockup

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, search query `zzzzzz`.
- Actual app route or screen inspected: `http://localhost:5000/categories`, search query `zzzzzz`.
- Evidence: Confirmed. Mockup shows a simple table-area line: `No categories match these filters`. Actual shows a full empty-state block with heading, description, icon treatment, and `Сбросить фильтры` action.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories.tsx:500`-`inex/ClientApp/src/pages/Categories.tsx:505` renders `FilterEmpty`; `inex/ClientApp/src/components/primitives/EmptyState.tsx:94`-`inex/ClientApp/src/components/primitives/EmptyState.tsx:140` defines the full filter-empty UI.
- Classification: shared component/design-system change; page-local UI change.

### C16 - Add drawer field order, controls, and actions differ

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, Add category drawer.
- Actual app route or screen inspected: `http://localhost:5000/categories`, Add category drawer.
- Evidence: Confirmed. Mockup field order is Name, Parent category, Description, Active checkbox, then Cancel/Create footer. Actual field order is Name, Description, Parent category, Status radio buttons, then a single full-width create button. Actual has no visible Cancel button in the drawer body.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories/CategoryCreateForm.tsx:51`-`inex/ClientApp/src/pages/Categories/CategoryCreateForm.tsx:90`; `inex/ClientApp/src/pages/Categories.tsx:394`-`inex/ClientApp/src/pages/Categories.tsx:411`.
- Classification: page-local UI change.

### C17 - Add drawer component styling differs from the mockup

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, Add category drawer.
- Actual app route or screen inspected: `http://localhost:5000/categories`, Add category drawer.
- Evidence: Confirmed. Mockup drawer is a right-side panel with close icon on the far right, compact native-looking controls, helper text per field, and bottom-right Cancel/Create actions. Actual drawer uses Ant Design controls, a close icon on the left side of the drawer header in the inspected locale, full-width primary submit button, and 440px drawer width.
- Implementation files and line references: `inex/ClientApp/src/components/primitives/InExDrawer.tsx:14`-`inex/ClientApp/src/components/primitives/InExDrawer.tsx:58`; `inex/ClientApp/src/pages/Categories/CategoryCreateForm.tsx:4` imports Ant Design form controls; `inex/ClientApp/src/pages/Categories/CategoryCreateForm.tsx:61`-`inex/ClientApp/src/pages/Categories/CategoryCreateForm.tsx:88` renders Ant Design inputs/select/radio/button.
- Classification: shared component/design-system change; page-local UI change.

### C18 - Row expanded edit state is missing mockup actions

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, first row expanded.
- Actual app route or screen inspected: `http://localhost:5000/categories`, first row expanded.
- Evidence: Confirmed. Mockup expanded edit panel includes `View transactions` and `Set budget` buttons in the snapshot column. Actual expanded edit panel has edit actions `Отмена`, `Удалить`, `Сохранить` and snapshot metrics, but no view-transactions or set-budget actions.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:147`-`inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:175` renders only cancel/delete/save actions; `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:177`-`inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:213` renders snapshot metrics without those mockup actions; translation keys exist at `inex/ClientApp/public/locales/en/translation.json:379`-`inex/ClientApp/public/locales/en/translation.json:380`.
- Classification: page-local UI change; routing/navigation change.

### C19 - Row expanded edit state includes an extra disabled parent selector

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, first row expanded.
- Actual app route or screen inspected: `http://localhost:5000/categories`, first row expanded.
- Evidence: Confirmed. Mockup expanded edit form shows Name, Description, Active checkbox, Save changes, Cancel, Delete. Actual adds a disabled parent-category combobox with many options and the hint that reparenting is not supported, increasing density and noise in the expanded row.
- Implementation files and line references: `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:120`-`inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:136`; `inex/ClientApp/src/pages/Categories/categories.css:393`-`inex/ClientApp/src/pages/Categories/categories.css:408`.
- Classification: page-local UI change.

### C20 - Mobile first viewport hierarchy differs materially

- Page name: Categories.
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/categories`, mobile viewport `390x844`.
- Actual app route or screen inspected: `http://localhost:5000/categories`, mobile viewport `390x844`.
- Evidence: Confirmed. Mockup mobile first viewport shows header, page title, full-width `Add category`, populated hero distribution, and top of the Categories toolbar. Actual mobile first viewport shows header with sign-out icon, page title, tall no-spend hero metric stack, and the toolbar only near the bottom; the bottom nav overlaps the lower toolbar area. Mockup bottom nav has five items; actual bottom nav has six items including dashboard.
- Implementation files and line references: `inex/ClientApp/src/layouts/AppShell.css:293`-`inex/ClientApp/src/layouts/AppShell.css:360`; `inex/ClientApp/src/pages/Categories/categories.css:465`-`inex/ClientApp/src/pages/Categories/categories.css:536`; `inex/ClientApp/src/pages/Categories/categories.css:538`-`inex/ClientApp/src/pages/Categories/categories.css:542`; `inex/ClientApp/src/layouts/AppShell.tsx:137`-`inex/ClientApp/src/layouts/AppShell.tsx:157`.
- Classification: page-local UI change; shared component/design-system change; routing/navigation change.

## Implementation flow

- Confirmed. `App.tsx` protects `/categories` behind `ProtectedRoute` and lazy-loads `Categories` at `inex/ClientApp/src/App.tsx:85`-`inex/ClientApp/src/App.tsx:90`.
- Confirmed. `AppShell` renders the top nav, page head, page body, and bottom nav; the Categories page uses this through `BasicPage` at `inex/ClientApp/src/layouts/AppShell.tsx:77`-`inex/ClientApp/src/layouts/AppShell.tsx:158`.
- Confirmed. `Categories.tsx` owns page state: add drawer open state, active-only filter, search, view mode, expanded row, period transactions, currencies, categories, budgets, and spend stats at `inex/ClientApp/src/pages/Categories.tsx:162`-`inex/ClientApp/src/pages/Categories.tsx:343`.
- Confirmed. Category data comes from RTK Query `useGetCategoriesQuery("ALL")` at `inex/ClientApp/src/pages/Categories.tsx:175`-`inex/ClientApp/src/pages/Categories.tsx:181`; API definitions are in `inex/ClientApp/src/store/categories/categories-api.ts:37`-`inex/ClientApp/src/store/categories/categories-api.ts:84`.
- Confirmed. Current-period transaction data is fetched directly through `apiClient.get("/transactions")` with `mode: "ALL"`, page size 250, date range, and pagination at `inex/ClientApp/src/pages/Categories.tsx:95`-`inex/ClientApp/src/pages/Categories.tsx:131`.
- Confirmed. Current period is always derived from browser date at `inex/ClientApp/src/pages/Categories.tsx:134`-`inex/ClientApp/src/pages/Categories.tsx:160`, which explains the June 2026 actual period versus April 2026 mockup period.
- Confirmed. The hero computes active/parent/child counts and switches between distribution and empty panel in `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx:26`-`inex/ClientApp/src/pages/Categories/CategoriesHero.tsx:159`.
- Confirmed. The toolbar renders count summary, active/all segmented control, Add button, view segmented control, and search in `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:36`-`inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:88`.
- Confirmed. Rows are rendered through `CategoryRow`; expanded rows render `CategoryInlineEdit` immediately after the row in `inex/ClientApp/src/pages/Categories.tsx:358`-`inex/ClientApp/src/pages/Categories.tsx:390`.
- Confirmed. Add drawer content uses `InExDrawer` plus Ant Design `Form`, `Input`, `Select`, `Radio`, and `Button` in `inex/ClientApp/src/pages/Categories.tsx:392`-`inex/ClientApp/src/pages/Categories.tsx:412` and `inex/ClientApp/src/pages/Categories/CategoryCreateForm.tsx:51`-`inex/ClientApp/src/pages/Categories/CategoryCreateForm.tsx:90`.
- Confirmed. Empty, loading, full-error, partial-error, filter-empty, and row-rendering branches are controlled at `inex/ClientApp/src/pages/Categories.tsx:344`-`inex/ClientApp/src/pages/Categories.tsx:508`.

## File/component impact map

- `inex/ClientApp/src/pages/Categories.tsx`: Page orchestration, period/data loading, view state, add drawer, toolbar/list composition, loading/error/empty branches, row expansion.
- `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx`: Hero populated/no-spend behavior, metrics, distribution bar and legend.
- `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx`: Count summary, status/view segmented controls, Add placement, search placement.
- `inex/ClientApp/src/pages/Categories/CategoryRow.tsx`: Row layout, description duplication, activity/spend rendering, icons, budget/system chips.
- `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx`: Expanded edit panel, missing mockup snapshot actions, disabled parent select, snapshot metrics.
- `inex/ClientApp/src/pages/Categories/CategoryCreateForm.tsx`: Add drawer field order, copy, controls, status selector, submit-only behavior.
- `inex/ClientApp/src/pages/Categories/categories.css`: Page card composition, hero grid, toolbar layout, list/table dimensions, row density, mobile layout.
- `inex/ClientApp/src/layouts/AppShell.tsx` and `inex/ClientApp/src/layouts/AppShell.css`: Top nav, bottom nav, logo, profile/sign-out actions, page head and mobile shell.
- `inex/ClientApp/src/components/primitives/SegmentedControl.tsx`: Segmented control height, padding, active styling.
- `inex/ClientApp/src/components/primitives/Input.tsx`: Search input wrapper, prefix styling, height/padding.
- `inex/ClientApp/src/components/primitives/EmptyState.tsx`: Filter-empty block that diverges from the mockup's simple row.
- `inex/ClientApp/src/components/primitives/InExDrawer.tsx`: Drawer width, header, close icon placement, body/header padding.
- `inex/ClientApp/public/locales/en/translation.json` and `inex/ClientApp/public/locales/ru/translation.json`: Locale/copy decisions for page labels, form labels, empty states, inline edit actions.
- `inex/ClientApp/src/store/categories/categories-api.ts`: Category dataset and API shape affecting counts, descriptions, hierarchy, system rows.

## Documentation updates needed later

- Update UX/design documentation if the product decision is to keep the actual app's Russian user-localized page instead of matching the English mockup copy.
- Update visual QA baseline documentation after the Categories implementation is corrected, including desktop default, add drawer, filter-empty, By spend, expanded row, and mobile `390x844`.
- If April 2026 populated data is intended for visual parity tests, document required seed data or fixture state for Categories.
- If the design intentionally changed to include Dashboard/sign-out in the app shell, document that shell delta separately from Categories page-local work.
- If disabled parent reparenting is intentionally exposed in inline edit, document why it diverges from the mockup and what future behavior will enable it.

## Open questions

- Should the audit target exact English mockup copy, or should actual app output remain localized by the signed-in user's language?
- Should Categories visual QA use fixed April 2026 fixture data, or should the UI adapt to the current month while still matching the mockup layout?
- Should Add category live in the page head as in the mockup, or in the toolbar as currently implemented?
- Should no-spend states preserve the mockup hero footprint, or is the actual metric-card empty state acceptable?
- Should By spend hide parent styling and show only leaf categories even when all spend is zero?
- Should inline edit expose `View transactions` and `Set budget` actions now, or are those deferred workflows?
- Should duplicate row descriptions be suppressed when `description === name`?
- Should the disabled parent selector be removed from inline edit until reparenting is supported?
- Evidence gap: BMad customization resolver `_bmad/scripts/resolve_customization.py` is absent from this worktree, so local workflow customization could not be loaded.

## Verification checklist

- Desktop default: open `http://127.0.0.1:5173/#/categories` and `http://localhost:5000/categories`; verify shell, title/add placement, hero, toolbar, search, list header, rows, and counts.
- Add drawer: open `Add category` / `Добавить`; verify drawer width, close icon placement, copy, field order, control type, cancel/create actions, and status control.
- Filter empty: enter a no-match search query such as `zzzzzz`; verify mockup simple empty row versus actual full `FilterEmpty` block.
- By spend: switch to `By spend` / `По расходам`; verify sorted leaf rows, row hierarchy classes, and zero-spend fallback behavior.
- Row expansion: expand the first row; verify inline edit form fields, snapshot metrics, missing/present actions, and disabled parent selector.
- Mobile: set viewport to `390x844`; verify header actions, add placement, hero height, toolbar visibility, bottom nav item count, and overlap with lower controls.
- Data state: verify whether the actual app has period transaction data for the target visual QA month before judging populated spend/distribution parity.
