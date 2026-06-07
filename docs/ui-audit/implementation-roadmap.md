# UI Audit Implementation Roadmap

Inputs:
- `docs/ui-audit/transactions.md`
- `docs/ui-audit/accounts.md`
- `docs/ui-audit/categories.md`
- `docs/ui-audit/budgets.md`

Scope:
- This roadmap synthesizes the four page audits into implementation-ready work.
- It does not include credentials, test account data, or source changes.
- It treats the mockups as the comparison target unless a listed decision accepts an implementation deviation.

## Story Recommendation

Split implementation into separate stories, not one all-in UI alignment pass.

Recommended split:
1. Shared shell, visual QA policy, and design-system prerequisites.
2. Shared table, toolbar, drawer, form, money, and empty-state primitives.
3. Transactions page alignment.
4. Accounts page alignment.
5. Categories page alignment.
6. Budgets page alignment.
7. Documentation and final cross-page verification.

Reasoning:
- The audits repeatedly identify the same shared gaps: navigation, logo/profile/sign-out chrome, locale baseline, fixture policy, card density, segmented controls, search fields, table/list structure, drawers/forms, `Num`, and filter-empty states.
- Page-local work is large and data-dependent. One pass would mix architectural decisions with page rewrites and make regressions harder to isolate.
- A later `bmad-quick-dev` agent should be able to take one page story after shared decisions are resolved without redoing the audit.

## 1. Shared layout/design-system prerequisites

### 1.1 Resolve authenticated shell IA and landing route

Decision required:
- Choose between the mockup IA (`Transactions`, `Accounts`, `Categories`, `Budgets`, `Reports`) and the actual production IA that adds `Dashboard`.
- Choose the authenticated default route: mockup effectively starts on Transactions, while actual `/` redirects to `/dashboard`.

Shared impact areas:
- `inex/ClientApp/src/App.tsx`
- `inex/ClientApp/src/layouts/AppShell.tsx`
- `inex/ClientApp/src/layouts/AppShell.css`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`

Supported by:
- `transactions.md` findings 1 and 2.
- `accounts.md` findings 1, 2, and 16.
- `categories.md` findings C01, C02, and C20.
- `budgets.md` findings 1 and 2.

Implementation notes:
- If Dashboard is removed from audited management pages, update both desktop nav and mobile bottom nav. Current bottom nav CSS assumes six columns.
- If `/` stops redirecting to `/dashboard`, verify authenticated root behavior and login return behavior.
- Do not treat mockup hash routes (`/#/accounts`, `/#/categories`, `/#/budgets`) as production routing requirements. Those are prototype addresses unless product explicitly asks to preserve hash routing.

Account/Login implications:
- Actual inspection included `/login`, authenticated `/`, and protected page routes. Login was not deeply audited.
- Changing the default authenticated route affects post-login landing and any return-to logic in `ProtectedRoute`.
- Removing or moving the sign-out icon affects the only clearly visible logout control in the shell; verify Account/Profile access or alternate logout placement before removing it.

### 1.2 Resolve shell branding and account controls

Decision required:
- Choose the mockup shell brand treatment: multicolor loop mark plus `InEx`, one profile pill.
- Or accept actual shell treatment: dark square `I`, profile pill, separate sign-out icon button.

Shared impact areas:
- `inex/ClientApp/src/layouts/AppShell.tsx`
- `inex/ClientApp/src/layouts/AppShell.css`

Supported by:
- `transactions.md` finding 2.
- `accounts.md` finding 3.
- `categories.md` finding C02.
- `budgets.md` finding 2.

Implementation notes:
- If the sign-out action remains visible, document it as an accepted mockup deviation.
- If the sign-out action moves behind the profile pill, verify keyboard accessibility and mobile access.

### 1.3 Lock locale and visual QA data policy

Decision required:
- Choose the acceptance baseline for visual parity: English mockup copy, user-selected locale, or separate per-locale baselines.
- Choose whether parity tests use fixed mockup fixtures or live user data.

Shared impact areas:
- `inex/ClientApp/src/i18n.ts`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`
- Page-level API calls and store endpoints for transactions, accounts, categories, budgets, currencies, and budget reports.
- Visual QA/test setup and seed data.

Supported by:
- `transactions.md` locale note and findings 4, 15.
- `accounts.md` findings 4, 9, 10, 11, and 18.
- `categories.md` findings C03, C04, C10, C11, and C14.
- `budgets.md` findings 6, 7, 11, 17, and 25.

Implementation notes:
- The mockups use English copy and mostly April 2026 fixture data.
- Actual inspected pages rendered Russian for the supplied account.
- Budgets mockup uses PLN, while actual April route displayed USD.
- Categories actual page used the current month derived from browser date, while the mockup showed April 2026 spend.
- Transactions KPI behavior depends on whether metrics should use period totals or locally filtered visible rows.

### 1.4 Normalize page-head action behavior

Shared target:
- Primary page creation actions should live in the page header area when the mockup shows them there.
- On mobile, header CTAs should become full-width content buttons directly under the page title when the mockup shows that behavior.

Shared impact areas:
- `inex/ClientApp/src/layouts/AppShell.tsx`
- `inex/ClientApp/src/layouts/AppShell.css`
- `inex/ClientApp/src/components/primitives/Button.tsx`
- Page owners that pass `BasicPage` head content.

Supported by:
- `transactions.md` finding 3.
- `categories.md` finding C06.
- `budgets.md` findings 3 and 4.
- `accounts.md` summary and page header references.

Implementation notes:
- Transactions CTA label should be `Add transaction` in the English baseline, not a generic `Add`.
- Categories `Add category` should move from the toolbar into the page head if the mockup remains authoritative.
- Budgets `Copy from March` and `Add budget` should move from the external toolbar into the page head if the mockup remains authoritative.

### 1.5 Establish compact card, spacing, and row-density tokens

Shared target:
- Audit pages should use the mockup's compact operational density: tighter card radii, lighter card chrome, compact toolbars, dense rows, and mobile first viewports that expose useful content above the bottom nav.

Shared impact areas:
- `inex/ClientApp/src/layouts/AppShell.css`
- Page CSS files:
  - `inex/ClientApp/src/pages/Accounts/Accounts.css`
  - `inex/ClientApp/src/pages/Categories/categories.css`
  - `inex/ClientApp/src/pages/Budgets/budgets.css`
  - `inex/ClientApp/src/pages/Transactions/transactions-ledger.css`
- Shared primitives where density is centralized:
  - `SegmentedControl.tsx`
  - `Input.tsx`
  - `Button.tsx`
  - `InExDrawer.tsx`

Supported by:
- `accounts.md` findings 14 and 15.
- `categories.md` findings C05, C07, C08, C13, and C20.
- `budgets.md` findings 5, 10, 17, 24, and 26.
- `transactions.md` findings 6, 9, 10, and 16.

Implementation notes:
- Do not solve density separately in every page if the same primitive dimensions can be fixed once.
- Keep page-specific CSS for page-specific grid schemas and row content.

## 2. Shared table/filter/form/component work

### 2.1 Add compact labeled toolbar control patterns

Shared target:
- Toolbars need visible labels such as `STATUS`, `Status`, `VIEW`, and `View`.
- Segmented controls need a compact mode suitable for list cards, roughly matching the mockups' 27px to 34px control heights depending on page context.

Shared impact areas:
- `inex/ClientApp/src/components/primitives/SegmentedControl.tsx`
- Page toolbar components:
  - `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx`
  - `inex/ClientApp/src/pages/Accounts.tsx`
  - `inex/ClientApp/src/pages/Transactions.tsx`
  - `inex/ClientApp/src/pages/Budgets.tsx`

Supported by:
- `transactions.md` finding 6.
- `accounts.md` finding 7.
- `categories.md` finding C08.
- `budgets.md` findings 13 and 14.

Implementation notes:
- Prefer extending the existing primitive with a label/size variant if it avoids four local label wrappers.
- Budgets needs missing view/sort controls: `Burn rate`, `Remaining`, `Amount`, `Name`.

### 2.2 Align search input behavior and compact field styling

Shared target:
- Search fields should match mockup placement, width, icon treatment, and placeholder copy.
- Common mockup width is about 220px in list filter bars; Transactions right-aligns search in the ledger toolbar.

Shared impact areas:
- `inex/ClientApp/src/components/primitives/Input.tsx`
- Page toolbars:
  - `Transactions.tsx`
  - `Accounts.tsx`
  - `CategoriesToolbar.tsx`
  - `Budgets.tsx`
- Locale files for placeholders.

Supported by:
- `transactions.md` finding 6.
- `accounts.md` finding 6.
- `categories.md` finding C09.
- `budgets.md` finding 15.

Implementation notes:
- Accounts placeholder should align with `Search accounts...` in the English baseline.
- Categories placeholder should align with `Search categories...`.
- Budgets placeholder should align with `Search budgets...`.
- Preserve responsive wrapping without letting search controls collide with bottom nav on mobile.

### 2.3 Create or standardize list-panel/table composition

Shared target:
- Management list areas should use one composed panel when the mockup shows a continuous card: title/count row, filter row, table header, rows, and simple empty row.
- Desktop headers should appear where the mockups show them; mobile can keep stacked rows.

Shared impact areas:
- Page components:
  - `inex/ClientApp/src/pages/Accounts.tsx`
  - `inex/ClientApp/src/pages/Categories.tsx`
  - `inex/ClientApp/src/pages/Budgets.tsx`
  - `inex/ClientApp/src/pages/Transactions.tsx`
- Page CSS files listed in section 1.5.

Supported by:
- `accounts.md` finding 8.
- `categories.md` findings C07 and C13.
- `budgets.md` findings 12, 16, and 17.
- `transactions.md` finding 16.

Implementation notes:
- Accounts needs desktop headers `ACCOUNT`, `CURRENCY`, `SHARE`, `BALANCE`.
- Budgets needs list title/count and mockup columns `Budget`, `Categories`, `Progress`, `Daily pace`, `Remaining`.
- Transactions no-match state should preserve column headers and show one centered message if the mockup remains authoritative.
- Categories toolbar and list should be recomposed into one panel if the mockup remains authoritative.

### 2.4 Extend money/number display for mockup typography

Shared target:
- Currency suffixes need smaller adjacent typography where the mockups show that treatment.
- Large row balances need compact notation where the mockups abbreviate them.
- Budget remaining values need signed amount plus state/currency sublabel.

Shared impact areas:
- `inex/ClientApp/src/components/primitives/Num.tsx`
- Page helpers and row renderers:
  - `Transactions.tsx`
  - `Accounts.tsx`
  - `Budgets.tsx`
  - `budget-planning-utils.ts`

Supported by:
- `transactions.md` finding 5.
- `accounts.md` finding 12.
- `budgets.md` findings 20 and 21.

Implementation notes:
- Do not break existing `Num` call sites that expect one same-size string.
- Consider explicit props such as compact notation and currency-suffix sizing instead of ad hoc spans in each page.

### 2.5 Align drawer and form conventions

Shared target:
- Right drawers should match mockup width, close icon placement, header copy, body padding, compact control styling, and footer action alignment.
- Forms should use mockup field order and visible Cancel/Create or Cancel/Save actions where shown.

Shared impact areas:
- `inex/ClientApp/src/components/primitives/InExDrawer.tsx`
- `inex/ClientApp/src/components/Dropdown.tsx`
- `inex/ClientApp/src/components/primitives/Button.tsx`
- Transactions forms:
  - `TransactionFilterForm.tsx`
  - `TransactionCreate.tsx`
  - `TransactionCreateExpenseForm.tsx`
  - `TransactionCreateIncomeForm.tsx`
  - `TransactionCreateTransferForm.tsx`
- Categories forms:
  - `CategoryCreateForm.tsx`
  - `CategoryInlineEdit.tsx`

Supported by:
- `transactions.md` findings 9, 10, 11, 12, 13, and 14.
- `categories.md` findings C16, C17, C18, and C19.
- `accounts.md` finding 17 for edit interaction decision.

Implementation notes:
- Transactions filter drawer has several explicit mockup controls: separate `From` and `To` date inputs, native-looking account/category selects, keyword placeholder `BIEDRONKA, ALINA_SHAPOVA`, one `Amount equivalent` row with `Min`/`Max` boxes and `USD` suffix blocks.
- Transactions add drawer needs title/subtitle decision, segmented type selector, field order, optional Tags field, and `Save expense` plus `Cancel`.
- Categories add drawer needs field order `Name`, `Parent category`, `Description`, `Active`, then `Cancel`/`Create`.
- If Ant Design controls remain an accepted production choice, document that deviation before implementation.

### 2.6 Split filter-empty from rich empty/error states

Shared target:
- Filter-empty states inside populated lists should be simple table-area messages when the mockup shows that behavior.
- Initial empty, loading, error, and partial error states can remain richer if accepted and verified separately.

Shared impact areas:
- `inex/ClientApp/src/components/primitives/EmptyState.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`
- `inex/ClientApp/src/pages/Categories.tsx`
- `inex/ClientApp/src/pages/Accounts.tsx`

Supported by:
- `transactions.md` finding 16.
- `categories.md` finding C15.
- `accounts.md` finding 18.

Implementation notes:
- Transactions and Categories both show the same conflict: mockup uses a simple no-match row, actual uses rich `FilterEmpty` with icon, description, and action.
- Accounts loading/error/empty states were source-traced but not visually forced; verify with fixtures before changing.

### 2.7 Normalize status/progress treatment

Shared target:
- Over-limit rows and progress states should match mockup semantics and visual affordances before page work duplicates logic.

Shared impact areas:
- `inex/ClientApp/src/pages/Budgets/budget-planning-utils.ts`
- `inex/ClientApp/src/pages/Budgets.tsx`
- `inex/ClientApp/src/pages/Budgets/budgets.css`
- Potential shared progress/status CSS if extracted later.

Supported by:
- `budgets.md` findings 9, 20, 21, and 22.
- `categories.md` finding C14 for spend-mode status/order behavior.

Implementation notes:
- Resolve `At limit` versus `Severely over` taxonomy before rewriting Budgets.
- Budgets over-budget rows should use the mockup's narrow left rail if the mockup remains authoritative.

## 3. Page-local implementation work

### 3.1 Transactions

Primary impact areas:
- `inex/ClientApp/src/pages/Transactions.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionCreateExpenseForm.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionCreateIncomeForm.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionCreateTransferForm.tsx`
- `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts`
- `inex/ClientApp/src/pages/Transactions/transactions-ledger.css`
- `inex/ClientApp/public/locales/en/translation.json`

Implementation items:
1. Align header CTA copy and mobile width: `Add transaction` and full-width mobile button. Supported by `transactions.md` finding 3.
2. Resolve KPI semantics: mockup period totals for April 2026 versus actual visible-page/active-date totals. Supported by findings 4 and 15.
3. Apply smaller currency suffix typography in KPI values through shared `Num` work. Supported by finding 5.
4. Add `View` label, right-align desktop search, and preserve responsive toolbar layout. Supported by finding 6.
5. Remove calendar icon from day headers and align labels to mockup compact date language. Supported by finding 7.
6. Decide whether mobile ledger chevrons remain as edit/drill-in affordances. Supported by finding 8.
7. Rework filter drawer controls and amount-equivalent row after shared drawer/form decisions. Supported by findings 9, 10, and 11.
8. Rework add drawer copy, selector style, field order, Tags support, and Save/Cancel actions. Supported by findings 12, 13, and 14.
9. Replace rich no-match state and extra `Filters active` badge with mockup simple state if accepted. Supported by finding 16.

Open page decisions:
- Should local search leave KPI totals unchanged?
- Is Tags creation supported by the API?
- Are enabled no-filter drawer actions acceptable, or should disabled actions remain a production guardrail?
- Should row click/edit affordance be visible on mobile?

### 3.2 Accounts

Primary impact areas:
- `inex/ClientApp/src/pages/Accounts.tsx`
- `inex/ClientApp/src/pages/Accounts/Accounts.css`
- `inex/ClientApp/src/components/primitives/SegmentedControl.tsx`
- `inex/ClientApp/src/components/primitives/Num.tsx`
- `inex/ClientApp/src/store/accounts/accounts-api.ts`
- Locale files.

Implementation items:
1. Align page/workspace title with mockup `Accounts` if the English mockup is authoritative. Supported by `accounts.md` finding 5.
2. Align search placeholder with `Search accounts...`. Supported by finding 6.
3. Add visible `STATUS` and `VIEW` toolbar labels. Supported by finding 7.
4. Add desktop column headers `ACCOUNT`, `CURRENCY`, `SHARE`, `BALANCE`. Supported by finding 8.
5. Resolve inventory denominator: selected-scope total (`17 of 17`) versus all-account total (`17 / 37`). Supported by finding 9.
6. Extend net-worth hero delta to include absolute movement, percent movement, and comparison-month helper text. Supported by finding 10.
7. Decide fixture/live-data policy for net worth, currency distribution, extra EUR group, and account counts. Supported by finding 11.
8. Compact large row balances where the mockup abbreviates values. Supported by finding 12.
9. Suppress duplicate descriptions when `description` equals `name`, or normalize API fixture data. Supported by finding 13.
10. Tighten group header punctuation, padding, and density while preserving accessibility if collapse/expand remains. Supported by finding 14.
11. Rework mobile row grid and spacing so rows do not become tall detail cards. Supported by finding 15.
12. Decide whether row expansion/edit panels are an accepted production enhancement. Supported by finding 17.
13. Add controlled visual checks for empty, loading, error, filter-empty, and expanded-row states before changing those states. Supported by finding 18.

Open page decisions:
- Should row expansion remain the edit pattern?
- Should visual parity use seeded account fixture data?
- Should actual locale remain user-selected during QA?

### 3.3 Categories

Primary impact areas:
- `inex/ClientApp/src/pages/Categories.tsx`
- `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx`
- `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx`
- `inex/ClientApp/src/pages/Categories/CategoryRow.tsx`
- `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx`
- `inex/ClientApp/src/pages/Categories/CategoryCreateForm.tsx`
- `inex/ClientApp/src/pages/Categories/categories.css`
- `inex/ClientApp/src/pages/Categories/categories.utils.ts`
- `inex/ClientApp/src/store/categories/categories-api.ts`
- Locale files.

Implementation items:
1. Align page-head `Add category` placement and mobile full-width behavior. Supported by `categories.md` finding C06.
2. Resolve period/data policy: mockup April populated spend versus actual current-month no-spend state. Supported by findings C04 and C05.
3. Recompose toolbar and list into one continuous list panel if the mockup remains authoritative. Supported by finding C07.
4. Apply compact toolbar controls, labels, and search placement after shared primitive work. Supported by findings C08 and C09.
5. Resolve count denominator and active-scope behavior. Supported by finding C10.
6. Resolve taxonomy/order fixture policy. Supported by finding C11.
7. Suppress duplicate row descriptions when `description === name`. Supported by finding C12.
8. Tighten row density, stripe treatment, hierarchy styling, and first-row/selected left accent. Supported by finding C13.
9. Fix By spend mode to show sorted leaf rows and avoid parent styling when all rows are leaves. Supported by finding C14.
10. Use simple filter-empty row if accepted. Supported by finding C15.
11. Align add drawer field order, control type, active checkbox, and Cancel/Create footer. Supported by findings C16 and C17.
12. Add or defer expanded-row snapshot actions `View transactions` and `Set budget`; remove disabled parent selector unless accepted. Supported by findings C18 and C19.
13. Rework mobile first viewport so header, title, add button, hero, and top toolbar fit like the mockup and do not collide with bottom nav. Supported by finding C20.

Open page decisions:
- Should no-spend retain the mockup footprint or use actual metric/empty panels?
- Should inline edit expose cross-page actions now?
- Should disabled parent reparenting be hidden until supported?

### 3.4 Budgets

Primary impact areas:
- `inex/ClientApp/src/pages/Budgets.tsx`
- `inex/ClientApp/src/pages/Budgets/budgets.css`
- `inex/ClientApp/src/pages/Budgets/budget-planning-utils.ts`
- `inex/ClientApp/src/store/budgets/budgets-api.ts`
- `inex/ClientApp/src/store/budgetReport/budgetReport-api.ts`
- Locale files.
- `docs/design/docs/design-implementation-guide.md` for later documentation decisions, not in this audit worktree edit.

Implementation items:
1. Move `Copy from March` and `Add budget` into the page header if the mockup remains authoritative. Supported by `budgets.md` findings 3 and 4.
2. Resolve copy label formatting: mockup omits year in `Copy from March`; actual includes year through month formatting. Supported by finding 4.
3. Compress hero height and hierarchy to mockup structure: title, budgeted/spent rollup, progress bar, remaining/pace sentence, and compact burn list. Supported by findings 5, 6, 8, and 10.
4. Resolve currency/fixture policy: mockup April PLN versus actual user/report currency USD. Supported by finding 7.
5. Resolve burn-rate status taxonomy and top-row fixture/order. Supported by findings 9 and 11.
6. Add list title/count/scope header: `Budgets` and `5 budgets for April 2026` when using mockup fixture. Supported by finding 12.
7. Move month controls into list toolbar and add previous/next icon buttons plus `Jump to...` if the mockup remains authoritative. Supported by finding 13.
8. Add missing view/sort segmented controls: `Burn rate`, `Remaining`, `Amount`, `Name`. Supported by finding 14.
9. Align search placement and placeholder with `Search budgets...`. Supported by finding 15.
10. Align table schema to mockup columns and remove or document extra `Spent`/`Budgeted` columns. Supported by finding 16.
11. Reduce row count/height through fixture policy and row layout changes. Supported by finding 17.
12. Simplify row first-cell content by removing description from the collapsed row if the mockup remains authoritative. Supported by finding 18.
13. Reduce category chip density to one small tag or document multi-chip behavior. Supported by finding 19.
14. Reorganize progress cell to show spent/budget pair plus percent above the progress bar. Supported by finding 20.
15. Align Remaining semantics to signed amount plus `over`/`left` and currency sublabel. Supported by finding 21.
16. Add mockup over-budget left rail and progress coloring if accepted. Supported by finding 22.
17. Add clear row expand/caret affordance on desktop. Supported by finding 23.
18. Tighten card radius/shadow and mobile hierarchy. Supported by findings 24 and 26.

Open page decisions:
- Should Budgets remain user-currency/live-data driven, or should visual parity use April 2026 PLN fixtures?
- Should extra metric cards and extra table columns be accepted product changes?
- Should `At limit` replace `Severely over` in the design taxonomy?

## 4. Documentation updates

Required documentation outcomes after implementation decisions:
1. Update design/navigation documentation if Dashboard remains in the authenticated shell or `/` continues to redirect to `/dashboard`.
2. Document visual QA baseline: locale, fixture month, fixture currency, seeded data requirements, and expected route for each audited page.
3. Document accepted mockup deviations before implementation agents skip them:
   - Dashboard nav item.
   - Visible sign-out button.
   - Actual React routes versus prototype hash routes.
   - User-selected locale.
   - Live data and user currency.
   - Ant Design drawer/form controls.
   - Accounts row expansion.
   - Categories disabled parent selector.
   - Budgets extra metric cards, extra columns, and status taxonomy.
4. Document API limitations before adding UI fields or actions:
   - Transactions create Tags field.
   - Categories reparenting.
   - Categories `View transactions` and `Set budget` actions if routes/workflows are incomplete.
5. Keep `docs/ui-audit/index.md` updated with the four page audits and this roadmap.

Supported by:
- Documentation sections in all four page audits.
- `transactions.md` open questions and documentation update list.
- `accounts.md` documentation updates and open questions.
- `categories.md` documentation updates and open questions.
- `budgets.md` documentation updates and open questions.

## 5. Final verification pass

Run final verification only after shared prerequisites and page-local stories are complete.

Cross-page verification:
1. Desktop shell:
   - Verify nav item count, active state, logo, profile/logout treatment, and page-head actions on Transactions, Accounts, Categories, and Budgets.
2. Mobile shell at `390x844`:
   - Verify bottom nav item count, label fit, no overlap with toolbar/list content, and full-width page-head actions where expected.
3. Locale:
   - Verify English visual baseline if chosen.
   - If user-selected locale remains accepted, verify that layout still holds for Russian labels.
4. Data fixtures:
   - Verify April 2026 fixture states if selected for visual QA.
   - Verify live-data tolerance if fixtures are not selected.
5. List states:
   - Default populated state.
   - Search/filter no-match state.
   - Empty initial state.
   - Loading state.
   - Error and partial-error state where implemented.
6. Drawer/form states:
   - Transactions filter drawer.
   - Transactions add drawer.
   - Categories add drawer.
   - Any account/category/budget edit expansion or drawer that remains in scope.
7. Page-specific modes:
   - Transactions type tabs/search behavior and KPI behavior.
   - Accounts grouped and flat list modes.
   - Categories Tree and By spend modes, plus expanded edit row.
   - Budgets month navigation, view/sort controls, row expansion, and over-budget rows.
8. Account/Login regression:
   - Verify unauthenticated protected-route redirect to login.
   - Verify post-login landing route after any `/` or Dashboard decision.
   - Verify logout remains reachable if shell account controls change.

Constraints for future implementation agents:
- Do not use credentials in files.
- Do not assume the actual Russian browser state is a defect unless locale policy says English is the baseline.
- Do not implement page-local visual changes before resolving shared shell, locale, data, and primitive decisions.
