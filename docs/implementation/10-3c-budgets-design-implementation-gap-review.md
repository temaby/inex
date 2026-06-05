# Story 10.3c Budgets Design vs Implementation Gap Review

Date: 2026-06-05
Method: BMad checkpoint-style UI review using the rendered Budgets design in the controlled browser, Story 10.3c context, implementation source, and existing visual QA screenshots.

## Scope And Evidence

- Design baseline: controlled browser at `http://localhost:5173/`, navigated through the visible design navigation to `#/budgets`.
- Design source: `docs/design/Budgets.jsx`, `docs/design/EmptyState.jsx`, `docs/design/responsive.css`.
- Design guide: `docs/design/docs/design-implementation-guide.md`.
- Story context: `docs/implementation/10-3c-frontend-ux-budgets-management-redesign.md`.
- Implementation source: `inex/ClientApp/src/pages/Budgets.tsx`, `inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx`, `inex/ClientApp/src/pages/Budgets/budgets.css`.
- Shared primitive evidence used where the page delegates behavior: `inex/ClientApp/src/components/primitives/Progress.tsx`, `inex/ClientApp/src/components/primitives/Num.tsx`, `inex/ClientApp/src/components/primitives/EmptyState.tsx`, `inex/ClientApp/src/layouts/AppShell.css`.
- Implementation visual evidence: `docs/implementation/visual-qa/10-3c/desktop-populated-1440.png`, `tablet-populated-1024.png`, `mobile-populated-390.png`, `mobile-populated-360.png`, `empty-1440.png`, `filter-empty-390.png`, `drawer-open-390.png`, and `qa-summary.json`.
- Controlled browser design inspection covered desktop 1440px, tablet 1024px, mobile 390px and 360px, first-use empty via `?empty=1`, search/filter-empty, add-drawer open, and over-budget rows. The rendered design showed no horizontal overflow at those widths.
- Live implementation inspection note: the production frontend dev server initially failed in the sandbox with Vite/esbuild `spawn EPERM`. An escalated localhost start made `http://localhost:3000` reachable, but direct `/budgets?year=2026&month=6` inspection redirected to `/login`. The live app comparison is therefore blocked by route protection and missing authenticated app state; implementation evidence below uses source plus existing visual QA screenshots.

## Summary

The production Budgets page implements the broad Story 10.3c surface: page title, month-planning hero, month controls, search, copy-from-previous-month, Add budget, responsive budget rows, progress bars, over-budget copy, inline edit, add drawer, localized empty/filter-empty states, loading/error paths, and mobile overflow checks.

The largest residual gaps are design-contract gaps rather than missing CRUD. Production uses a generic metric-card hero instead of the design's burn-rate rollup with today marker, pace verdict, legend, and highest-burn list. Rows expose spent/remaining/budgeted scan targets but omit the daily pace column and parent category context, and the desktop budgeted amount has no header. The drawer and inline edit still expose technical year/month fields instead of the design's period selector, and inline edit does not include the design snapshot panel. Report-derived hero metrics also need stronger unavailable/error handling and a stable currency source.

## Differences To Implement

### 1. Hero Burn-Rate Summary Is Replaced By Generic Metric Cards

Priority: P1

Design target:
- `docs/design/Budgets.jsx:57` through `docs/design/Budgets.jsx:80` define the hero as a total budget rollup plus highest-burn sorting.
- `docs/design/Budgets.jsx:72` through `docs/design/Budgets.jsx:77` compute day-of-month, days-in-month, expected spend, and pace delta.
- `docs/design/Budgets.jsx:93` through `docs/design/Budgets.jsx:153` render the spent/total amount, today marker, remaining amount, and pace verdict.
- `docs/design/Budgets.jsx:160` through `docs/design/Budgets.jsx:227` render the burn-rate label, status legend, and compact highest-burn row list.
- `docs/design/docs/design-implementation-guide.md:370` and `docs/design/docs/design-implementation-guide.md:392` define the page purpose as monthly budget planning and burn-rate tracking, with burn rate and remaining as strongest scan targets.
- The controlled browser design rendered `APRIL 2026 BUDGET`, `2,575 / 3,100 PLN`, `525 PLN left`, `198 PLN ahead of pace`, and burn rows such as `Going out 136%`.

Current implementation:
- `inex/ClientApp/src/pages/Budgets.tsx:362` through `inex/ClientApp/src/pages/Budgets.tsx:388` render a `Month planning` hero with a description, one progress bar, and metric cards for Budgeted, Spent, Remaining, Used, and Over budget.
- `inex/ClientApp/src/pages/Budgets/budgets.css:50` through `inex/ClientApp/src/pages/Budgets/budgets.css:84` style those values as a generic metric grid.
- Existing QA (`docs/implementation/visual-qa/10-3c/desktop-populated-1440.png`) shows the metric-card hero and no burn-rate list or today marker.

Required change:
- Replace or extend the hero so it includes the design's spent-vs-budget rollup, current-day marker, remaining/pace sentence, burn-rate legend, and highest-burn list.
- Keep the useful production metric cards only if product wants them as secondary information, not as a replacement for burn-rate planning.
- Localize all new pace and legend copy in EN/RU.

### 2. Report Currency Source Is Unstable

Priority: P1

Design target:
- `docs/design/Budgets.jsx:5` establishes one budget currency for the mock page.
- `docs/implementation/10-3c-frontend-ux-budgets-management-redesign.md:28` calls out the report comparison endpoint with a `currency=USD` parameter.
- `docs/implementation/10-3c-frontend-ux-budgets-management-redesign.md:29` says the page should consume report `metadata` along with report items.
- `inex/ClientApp/src/model/Report/BudgetReport.ts:10` through `inex/ClientApp/src/model/Report/BudgetReport.ts:21` expose `metadata.currency` in the report response shape.

Current implementation:
- `inex/ClientApp/src/pages/Budgets.tsx:149` through `inex/ClientApp/src/pages/Budgets.tsx:162` derives the report/display currency from the first loaded account, falling back to `USD`, and passes that to the budget report query.
- `inex/ClientApp/src/pages/Budgets.tsx:180` reads only `budgetReport?.data`; the page does not use `budgetReport.metadata.currency`.
- Existing QA shows `USD` because the mocked first account is USD, while the design preview uses `PLN`. The current implementation depends on account ordering rather than a clear budget/report currency contract.

Required change:
- Use one explicit source of truth for budget/report currency: Story 10.3c's `USD`, the authenticated user's base currency, or `budgetReport.metadata.currency`.
- Do not derive the budget report currency from `accounts[0]`.
- Render all hero and row amounts from the same currency source used to request the report.

### 3. Report-Metric Failure Handling Does Not Cover Hero Metrics

Priority: P1

Design target:
- `docs/implementation/10-3c-frontend-ux-budgets-management-redesign.md:31` requires localized unavailable/error treatment only for report-derived metrics when report data fails while budgets still load.
- `docs/implementation/10-3c-frontend-ux-budgets-management-redesign.md:40` requires a failed-report inline treatment with retry while keeping budget editing usable.

Current implementation:
- `inex/ClientApp/src/pages/Budgets.tsx:198` through `inex/ClientApp/src/pages/Budgets.tsx:202` compute total spent, remaining, used percent, and over-budget count from `reportItems`; when the report is missing or errored, `reportItems` is an empty array.
- `inex/ClientApp/src/pages/Budgets.tsx:377` through `inex/ClientApp/src/pages/Budgets.tsx:387` render hero metric cards regardless of `reportError`.
- `inex/ClientApp/src/pages/Budgets.tsx:477` through `inex/ClientApp/src/pages/Budgets.tsx:488` render an inline warning and retry action, but the hero can still show report-derived zero or stale-looking values.
- Row-level metrics do handle unavailable/error copy at `inex/ClientApp/src/pages/Budgets.tsx:565` through `inex/ClientApp/src/pages/Budgets.tsx:588`.

Required change:
- Gate hero Spent, Remaining, Used, and Over budget on report loading/error state.
- Keep Budgeted visible because it comes from budgets, but show localized `Metrics unavailable` or loading treatment for report-derived hero values when the report is unavailable.
- Keep the existing retry alert and row-level fallback.

### 4. Month Switcher And List Toolbar Affordances Are Reduced

Priority: P2

Design target:
- `docs/design/Budgets.jsx:578` through `docs/design/Budgets.jsx:616` render the month switcher with earlier/later chevrons, four visible month chips, and a `Jump to...` picker.
- `docs/design/Budgets.jsx:770` through `docs/design/Budgets.jsx:783` place the switcher in the Budgets list toolbar beside `Budgets` and `5 budgets for April 2026`.
- `docs/design/docs/design-implementation-guide.md:378` through `docs/design/docs/design-implementation-guide.md:379` call out header actions and a prominent month switcher.
- `docs/design/responsive.css:242` through `docs/design/responsive.css:250` define internal horizontal scrolling for the month switcher on mobile.

Current implementation:
- `inex/ClientApp/src/pages/Budgets.tsx:68` through `inex/ClientApp/src/pages/Budgets.tsx:75` generate five month options around the selected month, but there are no earlier/later chevrons.
- `inex/ClientApp/src/pages/Budgets.tsx:391` through `inex/ClientApp/src/pages/Budgets.tsx:405` render a standalone toolbar with segmented month options plus a separate Ant Design month picker.
- `inex/ClientApp/src/pages/Budgets.tsx:519` through `inex/ClientApp/src/pages/Budgets.tsx:527` start the list directly at the column header; there is no list toolbar showing visible count and month scope.
- `inex/ClientApp/src/pages/Budgets/budgets.css:94` through `inex/ClientApp/src/pages/Budgets/budgets.css:97` do implement internal month-switcher scrolling.

Required change:
- Add the Budgets list toolbar with visible row count and active month scope.
- Restore equivalent earlier/later navigation and a jump-to-month affordance, or make the current DatePicker visibly equivalent to the design's jump control.
- Preserve the existing internal-scroll behavior at 390px and 360px.

### 5. Copy/Add Actions Are Not In The Header Contract

Priority: P2

Design target:
- `docs/design/docs/design-implementation-guide.md:55` maps `#/budgets` to header actions `Copy from March, Add budget`.
- The controlled browser design rendered Copy from March and Add budget in the page header, with Add budget as the primary action.
- `docs/implementation/10-3c-frontend-ux-budgets-management-redesign.md:33` requires copy-from-previous-month to remain visually secondary to Add budget.

Current implementation:
- `inex/ClientApp/src/pages/Budgets.tsx:360` calls `BasicPage` with only `title` and `subtitle`; no header `extra` is provided.
- `inex/ClientApp/src/pages/Budgets.tsx:415` through `inex/ClientApp/src/pages/Budgets.tsx:427` place Copy and Add inside the toolbar after the month controls and search.
- Existing QA screenshots show the page header with no actions and the toolbar carrying both actions.

Required change:
- Move Copy and Add to `BasicPage` header `extra`, or document that Budgets intentionally keeps actions in the planning toolbar.
- Preserve the current hierarchy: Copy as secondary/ghost, Add budget as primary.
- Keep the selected previous-month label if product prefers it over the static mock label.

### 6. Budget Rows Omit Daily Pace, Parent Context, And A Desktop Budgeted Header

Priority: P1

Design target:
- `docs/design/Budgets.jsx:233` through `docs/design/Budgets.jsx:277` define `PaceCell`, including daily average and pace delta text.
- `docs/design/Budgets.jsx:300` through `docs/design/Budgets.jsx:363` render budget name, parent category context, category tags, progress values, percent used, progress bar, and daily pace.
- `docs/design/Budgets.jsx:365` through `docs/design/Budgets.jsx:375` render remaining amount with `over` or `left` copy and currency.
- `docs/design/docs/design-implementation-guide.md:376` through `docs/design/docs/design-implementation-guide.md:393` define the burn row and budget row layouts, mobile compression, strongest scan targets, and non-color-only over-budget cue.

Current implementation:
- `inex/ClientApp/src/pages/Budgets.tsx:519` through `inex/ClientApp/src/pages/Budgets.tsx:527` render desktop headers for Name, Categories, Progress, Spent, and Remaining, then an empty final header cell.
- `inex/ClientApp/src/pages/Budgets.tsx:535` through `inex/ClientApp/src/pages/Budgets.tsx:555` render only selected category names as chips, not parent category context.
- `inex/ClientApp/src/pages/Budgets.tsx:557` through `inex/ClientApp/src/pages/Budgets.tsx:577` render progress and percent/over-by text, but no daily pace or pace delta.
- `inex/ClientApp/src/pages/Budgets.tsx:579` through `inex/ClientApp/src/pages/Budgets.tsx:599` render Spent, Remaining, and Budgeted scan targets; the Budgeted value has no desktop column label.
- `inex/ClientApp/src/pages/Budgets/budgets.css:231` through `inex/ClientApp/src/pages/Budgets/budgets.css:236` provide tabular numeric alignment for row amounts.

Required change:
- Add daily pace and pace delta to each row, using report data plus selected month metadata.
- Add parent category/group context for each budget, not only child category chips.
- Either add a visible desktop `Budgeted` header for the final amount column or fold budgeted into the progress cell as `spent / budgeted`, matching the design.
- Keep the existing non-color over-budget cue and mobile `data-label` scan targets.

### 7. Add Drawer And Inline Edit Use Technical Period Fields

Priority: P2

Design target:
- `docs/design/Budgets.jsx:887` through `docs/design/Budgets.jsx:923` render the Add budget drawer with Name, Description, Categories, Amount, a single Period select, Cancel, and Create budget.
- `docs/design/Budgets.jsx:436` through `docs/design/Budgets.jsx:446` render inline edit Amount plus a single Period select.
- `docs/design/docs/design-implementation-guide.md:253` through `docs/design/docs/design-implementation-guide.md:270` define drawer behavior, including mobile full width, focus trapping, Escape close, return focus, and internal drawer scroll.

Current implementation:
- `inex/ClientApp/src/pages/Budgets.tsx:300` through `inex/ClientApp/src/pages/Budgets.tsx:348` render the Add drawer with a required Key field and separate numeric Year and Month fields.
- `inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx:174` through `inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx:205` render inline edit Amount, Year, and Month as a three-column grid.
- `inex/ClientApp/src/pages/Budgets/budgets.css:261` through `inex/ClientApp/src/pages/Budgets/budgets.css:268` style the drawer period fields as a year/month grid.
- Existing QA (`docs/implementation/visual-qa/10-3c/drawer-open-390.png`) shows the mobile drawer with Key, Amount, Year, and Month fields.

Required change:
- Replace separate Year and Month controls with one localized Period picker/select in the Add drawer and inline edit form while still submitting `year` and `month` to the existing API.
- Decide whether Key must remain visible because of backend contract requirements; if it does, document it as a deliberate production divergence from the mock.
- Verify the shared drawer still satisfies focus, Escape, return-focus, scroll, and mobile full-width behavior after the form changes.

### 8. Inline Edit Lacks The Design Snapshot Panel

Priority: P2

Design target:
- `docs/design/Budgets.jsx:456` through `docs/design/Budgets.jsx:475` render a `Snapshot - April 2026` panel with Budget, Spent, Remaining, Daily avg left, View transactions, and Duplicate to May.

Current implementation:
- `inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx:140` through `inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx:231` render only the editable form, delete confirmation, cancel, and save.
- `inex/ClientApp/src/pages/Budgets.tsx:606` through `inex/ClientApp/src/pages/Budgets.tsx:613` mount that form inside the expanded budget row with no adjacent snapshot content.

Required change:
- Add the snapshot panel to expanded rows using the same row report metrics already used for spent and remaining.
- Add Daily avg left if the product agrees with the design calculation.
- Clarify whether View transactions and Duplicate to next month are in scope before wiring those actions.

### 9. Exact-Limit Budgets Are Classified As Over Budget

Priority: P3

Design target:
- `docs/design/Budgets.jsx:49` through `docs/design/Budgets.jsx:51` define over-budget as spent greater than budget value.
- `docs/design/Budgets.jsx:17` through `docs/design/Budgets.jsx:21` classify `near` separately from `over`.

Current implementation:
- `inex/ClientApp/src/pages/Budgets.tsx:104` through `inex/ClientApp/src/pages/Budgets.tsx:105` classify `percentageUsed >= 100` as over budget.

Required change:
- Use `percentageUsed > 100` or `remainingAmount < 0` for over-budget status.
- If exactly 100% should have its own "at limit" status, add a localized label rather than reusing over-budget copy.

## Differences To Clarify Before Implementing

### A. First-Use Empty State Scope

Design source:
- `docs/design/Budgets.jsx:720` through `docs/design/Budgets.jsx:724` short-circuit `?empty=1` to render only `EmptyBudgets`.
- `docs/design/EmptyState.jsx:185` through `docs/design/EmptyState.jsx:193` define `EmptyBudgets` with Create and Copy actions.

Current implementation:
- `inex/ClientApp/src/pages/Budgets.tsx:360` through `inex/ClientApp/src/pages/Budgets.tsx:430` still render hero and toolbar before the first-use empty state.
- `inex/ClientApp/src/pages/Budgets.tsx:491` through `inex/ClientApp/src/pages/Budgets.tsx:511` render the shared empty state with Add and Copy actions.
- Existing QA (`docs/implementation/visual-qa/10-3c/empty-1440.png`) shows a zeroed hero and toolbar above the empty state.

Clarification needed:
- Decide whether a true first-use month should hide the planning hero and toolbar like the design preview, or keep month controls visible so users can switch/copy months.

### B. Filter-Empty Source Of Truth

Design source:
- `docs/design/EmptyState.jsx:63` through `docs/design/EmptyState.jsx:85` define the shared `FilterEmpty` pattern with Clear filters.
- `docs/design/Budgets.jsx:859` through `docs/design/Budgets.jsx:867` render `No budgets for this month` with Copy and Add when the visible list is empty, which is also what the controlled browser design showed after entering a no-match search.

Current implementation:
- `inex/ClientApp/src/pages/Budgets.tsx:512` through `inex/ClientApp/src/pages/Budgets.tsx:517` use the shared `FilterEmpty` primitive for search-empty.
- `inex/ClientApp/public/locales/en/translation.json:434` through `inex/ClientApp/public/locales/en/translation.json:437` provide product-specific filter-empty copy.

Clarification needed:
- Treat the shared `FilterEmpty` and Story 10.3c acceptance criteria as the source of truth, or update `docs/design/Budgets.jsx` so the rendered design no longer shows the first-use empty copy for search-empty.

### C. Design Currency vs Product Currency

Design source:
- `docs/design/Budgets.jsx:5` fixes the design preview at `PLN`.
- `docs/implementation/10-3c-frontend-ux-budgets-management-redesign.md:28` and `docs/implementation/10-3c-frontend-ux-budgets-management-redesign.md:29` reference the existing report endpoint with `currency=USD`.

Current implementation:
- Existing QA screenshots show `USD`.
- The code currently derives currency from the first account, which should be fixed regardless of whether the final product currency is PLN, USD, or user-configured.

Clarification needed:
- Confirm whether Budgets should display the user base currency, the report metadata currency, or the story's explicit USD report currency.

## Already Aligned

- The route keeps the `Budgets` title and `Plan` subtitle through `BasicPage` at `inex/ClientApp/src/pages/Budgets.tsx:360`.
- Copy and Add actions are both present, with Copy secondary and Add primary, at `inex/ClientApp/src/pages/Budgets.tsx:415` through `inex/ClientApp/src/pages/Budgets.tsx:427`.
- The copy action targets the previous selected month at `inex/ClientApp/src/pages/Budgets.tsx:247` through `inex/ClientApp/src/pages/Budgets.tsx:259`.
- Rows include progress bars, percent-used text, spent/remaining/budgeted values, and over-budget non-color cues at `inex/ClientApp/src/pages/Budgets.tsx:557` through `inex/ClientApp/src/pages/Budgets.tsx:604`.
- `BudgetProgress` uses semantic progressbar markup and percent labels at `inex/ClientApp/src/components/primitives/Progress.tsx:59` through `inex/ClientApp/src/components/primitives/Progress.tsx:72`.
- `Num` provides tabular numeric rendering and accessible labels at `inex/ClientApp/src/components/primitives/Num.tsx:81` through `inex/ClientApp/src/components/primitives/Num.tsx:95`.
- Empty and filter-empty states use shared primitives at `inex/ClientApp/src/pages/Budgets.tsx:491` through `inex/ClientApp/src/pages/Budgets.tsx:517`, backed by `inex/ClientApp/src/components/primitives/EmptyState.tsx:21` through `inex/ClientApp/src/components/primitives/EmptyState.tsx:141`.
- EN and RU Budgets locale keys exist for the redesigned visible copy at `inex/ClientApp/public/locales/en/translation.json:372` through `inex/ClientApp/public/locales/en/translation.json:459` and `inex/ClientApp/public/locales/ru/translation.json:374` through `inex/ClientApp/public/locales/ru/translation.json:461`.
- Dayjs locale synchronization exists at `inex/ClientApp/src/App.tsx:45` through `inex/ClientApp/src/App.tsx:50`, so month labels from `formatMonthLabel` can localize with app language.
- Mobile layout stacks the hero and rows, makes toolbar controls full width, adds mobile scan labels, and keeps month-switcher overflow internal at `inex/ClientApp/src/pages/Budgets/budgets.css:334` through `inex/ClientApp/src/pages/Budgets/budgets.css:392`.
- App shell mobile body padding and fixed bottom navigation are defined at `inex/ClientApp/src/layouts/AppShell.css:344` through `inex/ClientApp/src/layouts/AppShell.css:350`.
- Existing visual QA summary reports no horizontal overflow at 1440px, 1024px, 390px, or 360px in `docs/implementation/visual-qa/10-3c/qa-summary.json`.

## Recommended Implementation Order

1. Fix report data semantics first: stable currency source and unavailable/loading treatment for report-derived hero metrics.
2. Rework the hero into the design's burn-rate planning summary with today marker, pace verdict, legend, and highest-burn list.
3. Update budget rows with daily pace, parent category context, a labeled budgeted scan target, and exact-limit status handling.
4. Restore the list toolbar/month switcher affordances and decide whether Copy/Add belong in the page header or planning toolbar.
5. Replace technical year/month fields with a single Period control in add and edit flows.
6. Add the inline snapshot panel and its follow-up actions, or explicitly descope them.
7. Resolve the first-use/filter-empty design source-of-truth differences, then refresh visual QA at 1440px, 1024px, 390px, and 360px.
