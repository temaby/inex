# Story 10.4: Frontend UX - Reports Hub, Dashboard Landing, And Drill-Down Chrome

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an invited account holder,
I want a clear dashboard and report hub,
so that quick financial status and deeper analysis are separated but connected.

## Acceptance Criteria

1. Given FR-FE-002 and FR-FE-003, when the route IA is updated, then the authenticated app has a dashboard/home landing route with month summary cards, while Reports remains the analytical hub.
2. Given the Reports design reference, when `/reports` is opened, then report cards behave as launch points with clear title, description, preview metric, and date period controls.
3. Given a report drill-down route is opened, when the report renders, then the header uses an All reports back affordance and places Share, Export, and Print actions on the drill-down route, not the hub.
4. Given charts render in dashboard or report routes, when the chart is available visually, then an accessible text or table summary is available for screen readers and export-oriented review.
5. Given 1440px and 390px viewports, when dashboard, reports hub, and one drill-down report are opened, then page chrome, cards, charts, and action bars fit without overlap or horizontal overflow.

## Tasks / Subtasks

- [x] Add dashboard landing route and preserve existing route protections. (AC: 1, 5)
  - [x] Finalize the protected dashboard page route (`/dashboard`) and update post-login default redirect from `/` to `/dashboard` by consuming the route/data work delivered by Epic 6; do not recreate Epic 6 functional implementation here.
  - [x] Keep `/reports` nested report routes intact (`index`, `category`, `budget`, `history`) with no behavior regression.
  - [x] Keep `ProtectedRoute` ownership unchanged; do not move auth routes.
- [x] Build dashboard month-summary landing surface. (AC: 1, 5)
  - [x] Apply final Epic 10 visual/chrome treatment to month summary cards (income, expenses, net savings, MoM delta) on dashboard using existing Epic 6 report/state data flows.
  - [x] Provide no-data neutral state (0 values + explanatory copy), not blank or error-only UI.
  - [x] Keep all visible strings in EN/RU locale files.
- [x] Rebuild reports hub as launch-card navigation, not table rows. (AC: 2, 5)
  - [x] Replace current `ReportList` table UX with hub cards that include title, description, preview metric, and grouped sections.
  - [x] Keep date period and configure controls on the hub header only.
  - [x] Preserve existing drill-down route navigation targets.
- [x] Add drill-down chrome contract for report routes. (AC: 3, 5)
  - [x] For `/reports/category`, `/reports/budget`, and `/reports/history`, render header with All reports back affordance.
  - [x] Show Share/Export/Print actions only on drill-down pages (never on hub).
  - [x] Preserve existing report data fetch behavior while changing chrome/layout.
- [x] Add chart accessibility summaries. (AC: 4)
  - [x] For each chart on dashboard and drill-down routes, add a nearby textual/table summary (screen-reader-readable).
  - [x] Ensure summary values match chart source data and can support export review.
  - [x] Keep interactive chart affordances keyboard reachable where relevant.
- [x] Deliver responsive and visual QA verification. (AC: 5)
  - [x] Validate dashboard, reports hub, and at least one drill-down at 1440px and 390px.
  - [x] Confirm no page-level horizontal overflow and no bottom-nav occlusion of final actions/content.
  - [x] Capture screenshots for dashboard, hub, and drill-down states.
- [x] Run engineering quality gates. (AC: 1-5)
  - [x] Run `npm run build` from `inex/ClientApp`.
  - [x] Run `npm run lint` from `inex/ClientApp`.
  - [x] Confirm no new `any` in touched TypeScript files.

### Review Findings

- [x] [Review][Patch] Hub period control did not propagate to drill-down launch targets [`inex/ClientApp/src/pages/Reports/ReportList.tsx`]
- [x] [Review][Patch] Category report active-category filtering and parent aggregation changed data semantics [`inex/ClientApp/src/pages/Reports/ReportCategory.tsx`]
- [x] [Review][Patch] Monthly history chart drill-through was mouse-only [`inex/ClientApp/src/pages/Reports/ReportMonthlyHistory.tsx`]
- [x] [Review][Patch] Budget report transaction drill-through was mouse-only [`inex/ClientApp/src/pages/Reports/ReportBudgetSpending.tsx`]
- [x] [Review][Patch] Dashboard MoM card showed a misleading 0% when prior savings baseline was zero [`inex/ClientApp/src/pages/Dashboard.tsx`]
- [x] [Review][Patch] Report actions had weak fallback behavior for share/export/configure [`inex/ClientApp/src/pages/Reports.tsx`]
- [x] [Review][Patch] Accessible summary rows used unstable label keys and unclear label column headers [`inex/ClientApp/src/pages/Reports/ReportAccessibleSummary.tsx`]
- [x] [Review][Patch] Budget progress displayed spent-with-zero-budget as 0% instead of over budget [`inex/ClientApp/src/components/primitives/Progress.tsx`]
- [x] [Review][Defer] Monthly history report still uses the pre-existing USD report currency behavior [`inex/ClientApp/src/pages/Reports/ReportMonthlyHistory.tsx`] - deferred, pre-existing

## Prerequisites

- Story 10.1a (tokens/theme bridge) is mandatory before starting this story so dashboard/reports chrome uses token contracts, not ad hoc colors.
- Story 10.1b (shared primitives) is mandatory before starting this story so button, icon, action, empty-state, and card treatments use the shared Epic 10 primitives.
- Story 10.1c (app shell/navigation) is mandatory before starting this story. Build 10.4 against the implemented authenticated shell/navigation contract, then add `/dashboard` navigation and default-landing behavior as this story's route ownership.
- Epic 6 dashboard/report data work is mandatory before starting this story. Story 6.1 must provide the dashboard route/navigation restructure baseline, Story 6.2 must provide the month-summary card data behavior, and Story 6.5 must be complete before any category-report preview metric is shown from category report data.
- If the branch lacks the Epic 6 `/dashboard` route, month-summary data surface, or required report data fixes, block this story and send the missing functional work back to Epic 6. Story 10.4 owns final visual design, Reports hub/drill-down chrome, action placement, and chart accessibility polish; it does not create backend reporting endpoints or duplicate dashboard/report data flows.
- If a branch still has `BasicPage` as the only available shell, do not start 10.4 as a fallback implementation. Merge or rebase the 10.1c shell/navigation work first, then implement dashboard/reports chrome on that baseline.

## Anti-Patterns / Guardrails

| Do NOT do this | Do this instead |
| --- | --- |
| Keep `/` redirecting to `/transactions` after adding dashboard | Move protected default landing to `/dashboard` while preserving all existing protected routes |
| Put Share/Export/Print buttons on `/reports` hub | Keep those actions on drill-down routes only (`/reports/category`, `/reports/budget`, `/reports/history`) |
| Build dashboard cards from new backend endpoints or recreate Epic 6 dashboard data logic | Reuse existing Epic 6 report/transaction data contracts and thunks; block if the functional data surface is missing |
| Treat hub cards as static marketing tiles | Make cards route launch points with meaningful metric/context copy |
| Expose chart visuals without accessible summary | Add text/table summary adjacent to each dashboard/drill-down chart |
| Introduce new `any` while refactoring reports pages | Narrow existing types where possible and avoid adding any new untyped surface |
| Hardcode new report/dashboard labels | Add EN/RU locale keys and read via i18next |

## Shared Ownership Hotspots

| Hotspot | Rule for this story |
| --- | --- |
| `inex/ClientApp/src/App.tsx` | This story owns adding `/dashboard` and changing the protected default redirect from `/transactions` to `/dashboard`. Preserve public auth routes, `ProtectedRoute`, provider wrappers from 10.1a/10.1b, and existing nested report routes. |
| Locale files | Add dashboard/report hub/drill-down labels to both EN and RU files; preserve page-story keys from 10.2 through 10.3c and sibling 10.5 work. |
| Shared primitives | Consume 10.1b action, icon, empty-state, money, and chart-summary patterns; do not create report-only replacements for shared contracts. |
| Routes | Keep `/reports`, `/reports/category`, `/reports/budget`, and `/reports/history` stable; add `/dashboard` without breaking existing deep links. |
| `package.json` / `package-lock.json` | Do not modify. Dashboard/reports chrome uses existing Recharts, Ant Design, and shared primitives. |

## Dev Notes

### Story Intelligence From Planning Artifacts

- Story 10.4 directly implements FR-UX-005 and depends on FR-FE-002 and FR-FE-003 behavior (dashboard summary landing + report IA separation). [Source: `docs/planning/epics.md`, Story 10.4 and Epic 6 Story 6.1/6.2]
- The design update plan requires Reports and Dashboard to be converted together to avoid split IA models and route confusion. [Source: `docs/planning/design-update-plan.md`]
- PRD maps this as UX-004 and requires drill-down action placement plus chart accessibility summaries. [Source: `docs/planning/prds/prd-inex-2026-05-20/prd.md`]
- UX input index for this story is explicitly: design implementation guide + design update plan + Epic 10 scope. [Source: `docs/planning/ux-design.md`]

### Current State Analysis (Files Being Updated)

- `inex/ClientApp/src/App.tsx`
  - Protected default route currently redirects `/` to `/transactions`.
  - Reports route is nested and wired as:
    - `/reports` -> `ReportList`
    - `/reports/category` -> `ReportCategory`
    - `/reports/budget` -> `ReportBudgetSpending`
    - `/reports/history` -> `ReportMonthlyHistory`
  - This must be evolved without breaking existing protected route boundaries.
- `inex/ClientApp/src/pages/Reports.tsx`
  - Uses `BasicPage` and a generic primary back button for all non-hub paths.
  - No dashboard awareness; title map only handles current report routes.
  - `props: any` currently present; story should avoid adding more `any` and should narrow where practical.
- `inex/ClientApp/src/pages/Reports/ReportList.tsx`
  - Current hub uses Ant Design `Table` with name + arrow, no rich launch cards, no preview metrics, no grouped sections.
- `inex/ClientApp/src/pages/Reports/ReportCategory.tsx`
  - Uses visual cards and table/chart-like summaries but no explicit text/table accessibility companion for every visual chart context.
  - Uses hardcoded positive/negative colors and `any` in several places.
- `inex/ClientApp/src/pages/Reports/ReportBudgetSpending.tsx`
  - Rich metric cards + progress bars + clickable table rows are present.
  - Chrome contract (drill-down header actions and back affordance placement) is handled outside this component today and needs consistent route-level handling.
- `inex/ClientApp/src/pages/Reports/ReportMonthlyHistory.tsx`
  - Recharts-based visualization exists and is interactive.
  - Lacks explicit export-oriented textual/tabular summary adjacent to the chart.
- `inex/ClientApp/src/layouts/BasicPage.tsx`
  - Historical shell baseline only. After the prerequisite sequence is satisfied, authenticated dashboard/reports pages should target the Story 10.1c shell/navigation contract rather than extending `BasicPage` as a parallel fallback.
  - Use `BasicPage` only as source-of-truth context for what currently exists in older branches; do not build new 10.4 chrome around it if 10.1c has not landed.

### Existing Behaviors To Preserve

- Keep all authenticated routing under `ProtectedRoute`.
- Keep report fetch contracts and API call path ownership via `apiClient` in existing thunks.
- Keep nested reports routes stable to avoid breaking existing links/navigation into report pages.
- Keep i18n route labels and report labels in `translation.json` for EN/RU.
- Keep navigation from reports to transactions filters where already implemented (for example category/budget drill actions).

### Design And UX Guardrails

- Reports hub must read as launch points, not table rows or dashboard widgets.
- Hub controls: date period + configure belong on hub only.
- Drill-down controls: All reports back + Share/Export/Print belong on drill-down only.
- Dashboard must be the authenticated landing route and must present month summary scan targets first.
- Charts in dashboard and drill-down routes must include an adjacent accessible text/table representation.
- No horizontal overflow at 390px; bottom nav and action bars must not occlude content.

### Architecture Compliance Requirements

- Keep frontend architecture stack unchanged (React 18 + TS strict + Redux Toolkit + Ant Design + Recharts + i18next).
- Do not migrate to RTK Query in this story (that belongs to Epic 7.4 track).
- Do not change backend routes/contracts for reports to satisfy this UX story.
- Keep `apiClient` as the only HTTP client path in touched flows.
- Do not introduce new global state patterns when local composition/state can solve page chrome and routing UX.

### File Structure Requirements

Primary files expected to be touched:

- `inex/ClientApp/src/App.tsx`
- `inex/ClientApp/src/pages/Reports.tsx`
- `inex/ClientApp/src/pages/Reports/ReportList.tsx`
- `inex/ClientApp/src/pages/Reports/ReportCategory.tsx` (accessibility summary and chrome integration touchpoints)
- `inex/ClientApp/src/pages/Reports/ReportBudgetSpending.tsx` (accessibility summary and chrome integration touchpoints)
- `inex/ClientApp/src/pages/Reports/ReportMonthlyHistory.tsx` (accessibility summary and chrome integration touchpoints)
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`

Recommended additive files for maintainability:

- `inex/ClientApp/src/pages/Dashboard.tsx` (new landing page)
- `inex/ClientApp/src/pages/Reports/ReportsHubCards.tsx` (hub card UI)
- `inex/ClientApp/src/pages/Reports/ReportsRouteHeader.tsx` (hub vs drill-down chrome)
- `inex/ClientApp/src/pages/Reports/ReportAccessibleSummary.tsx` (reusable chart text/table summary)
- `inex/ClientApp/src/pages/Reports/reports.css` and `inex/ClientApp/src/pages/Dashboard/dashboard.css`

Files to avoid changing unless required:

- `inex/ClientApp/src/components/ProtectedRoute.tsx`
- `inex/ClientApp/src/utils/apiClient.ts`
- backend projects (`inex`, `inex.Services`, `inex.Data`)

### Library And Framework Requirements

- Reuse existing dependencies only; do not add new chart/navigation/state libraries.
- Use existing Recharts stack and add semantic summaries around charts.
- Keep Ant Design where already used for date/month controls unless a local primitive already replaces it.
- Keep day/month formatting on `dayjs`.

### Data And Integration Guardrails

- Dashboard summary cards should be computed from existing report/transaction sources already available in app state or existing report endpoints.
- Do not introduce new backend endpoint requirements for this story.
- Any new helper for summary aggregation must preserve currency behavior and neutral zero-data handling.
- Keep drill-down route query param compatibility (`interval`, filter links to transactions) unchanged.

### Testing And Verification Requirements

- Required command checks from `inex/ClientApp`:
  - `npm run build`
  - `npm run lint`
- Manual checks:
  - `/dashboard` desktop and mobile (summary cards + no-data handling)
  - `/reports` hub desktop and mobile (launch cards + controls)
  - one drill-down route desktop and mobile (All reports + Share/Export/Print)
  - at least one chart route with explicit text/table summary verification
- Screenshot matrix minimum:
  - dashboard populated (1440)
  - dashboard mobile (390)
  - reports hub populated (1440)
  - reports hub mobile (390)
  - report drill-down populated (1440)
  - report drill-down mobile (390)

### Previous Story Intelligence

- Story 10.3b (Categories redesign) established pattern discipline that should carry forward:
  - preserve Redux contracts while rebuilding UX,
  - avoid backend/schema drift in frontend UX stories,
  - enforce explicit mobile no-overflow checks,
  - include concrete screenshot states and route-level guardrails.
- Story 10.5a context confirms Epic 10 stories are being authored as route-safe visual rebuilds with strict i18n and no-new-`any` direction. Keep the same bar here.

### Git Intelligence Summary (Recent Repository History)

Recent commit titles:

1. `117430a` - story 1.5: verify frontend build artifacts are not tracked (#129)
2. `dde85c8` - Story 1.4: externalize local secret config (#128)
3. `cfe865c` - fix(accounts): include key in account update payload (#127)
4. `2937892` - Story 1 1 owned delete not found cleanup (#126)
5. `cfbe606` - Normalize owned delete not-found handling (#125)

Implications for this story:

- Recent work is stability/security-oriented; keep 10.4 frontend-scoped with low blast radius.
- Avoid mixing architecture migrations with UX rebuild; focus on IA/chrome/accessibility completion.

### Latest Technical Context

- Current reports flow already uses nested routes and report thunks; this is a strong base for hub/drill-down chrome split.
- Existing report-related slices include `any` usage in state and action signatures; story should not expand this debt.
- Current reports translations are minimal; story will require additional keys for dashboard labels, hub card copy, drill-down action labels, and accessibility-summary headings.

### Project Context Reference

- Keep API calls on shared `apiClient`. [Source: `docs/project-context.md`]
- Keep strict TS direction and avoid adding `any` in touched files. [Source: `docs/project-context.md`]
- Keep all user-visible text in i18n dictionaries (EN/RU). [Source: `docs/project-context.md`]
- Converted routes must pass mobile overflow checks at 390px and 360px. [Source: `docs/project-context.md`]

### References

- `docs/planning/epics.md` (Epic 10 Story 10.4; Epic 6 Story 6.1/6.2 dependencies)
- `docs/planning/prds/prd-inex-2026-05-20/prd.md` (FR-FE-002, FR-FE-003, FR-UX-005)
- `docs/planning/design-update-plan.md` (Reports+Dashboard combined migration requirement)
- `docs/planning/ux-design.md` (UX source index)
- `docs/design/docs/design-implementation-guide.md` (Route map, Reports section, Accessibility requirements)
- `docs/design/Reports.jsx` (hub card and drill-down visual behavior reference)
- `docs/design/ReportsExtra.jsx` (extended report presentation patterns)
- `inex/ClientApp/src/App.tsx` (route baseline)
- `inex/ClientApp/src/pages/Reports.tsx` (route chrome baseline)
- `inex/ClientApp/src/pages/Reports/ReportList.tsx` (current hub baseline)
- `inex/ClientApp/src/pages/Reports/ReportCategory.tsx` (category drill-down baseline)
- `inex/ClientApp/src/pages/Reports/ReportBudgetSpending.tsx` (budget drill-down baseline)
- `inex/ClientApp/src/pages/Reports/ReportMonthlyHistory.tsx` (history drill-down baseline)
- `inex/ClientApp/public/locales/en/translation.json` and `inex/ClientApp/public/locales/ru/translation.json` (current i18n baseline)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- 2026-06-04: Confirmed prerequisites from `docs/implementation/sprint-status.yaml`: Epic 6, Story 10.1c, Story 10.2, Story 10.3a, Story 10.3b, and Story 10.3c are marked `done`. Individual 10.1c/10.2/10.3a/10.3b story docs still show `review`, so sprint status is treated as the current delivery state for this run.
- 2026-06-04: `AGENTS.md` and `docs/project-context.md` were requested but are absent from this worktree. Prompt-provided AGENTS instructions and `CLAUDE.md` plus planning/story context were loaded instead.
- 2026-06-04: `npm ci` was required because `inex/ClientApp/node_modules` was absent. No package files were changed.
- 2026-06-04: `npm run build` and `npm run lint` initially hit sandbox-related Node filesystem access errors and passed when rerun with escalation.
- 2026-06-05: In-app Browser/Node REPL control failed with `windows sandbox failed: spawn setup refresh`; visual QA used headless Chrome DevTools Protocol fallback against local Vite and mocked existing API responses.
- 2026-06-05: Visual QA refreshed after mobile bottom-nav fix. Evidence saved under `docs/implementation/visual-qa/10-4/`; summary confirms no horizontal overflow and no bottom-nav occlusion for `/dashboard`, `/reports`, and `/reports/category` at 1440px and 390px.
- 2026-06-05: Added-`any` diff scan returned no matches.
- 2026-06-05: BMad code review completed with Blind Hunter, Edge Case Hunter, and Acceptance Auditor layers. Fixed hub period propagation, preserved category data semantics, added keyboard drill-through paths, hardened report actions, fixed MoM zero-baseline display, stabilized accessible summary rows, and fixed zero-budget progress display.
- 2026-06-05: Final `npm run build`, `npm run lint`, added-`any` scan, and visual QA refresh passed after review fixes. `qa-summary.json` generated at `2026-06-05T07:17:38.752Z`.

### Completion Notes List

- Rebuilt Dashboard as the authenticated landing surface using existing report API flows for month cards, spending heatmap, and net-worth chart summary.
- Rebuilt Reports hub as grouped launch cards with hub-only period/configure controls while preserving nested report routes.
- Added drill-down route chrome with All reports, Share, Export, and Print actions only on report detail routes.
- Added reusable accessible report summaries and route-specific summaries for dashboard charts, category report, budget progress, monthly history, and spending heatmap.
- Completed required build, lint, added-`any` scan, and visual QA screenshot matrix.
- Resolved BMad review patch findings and deferred one pre-existing monthly-history currency behavior for future report-domain work.

### File List

- docs/implementation/10-4-frontend-ux-reports-hub-dashboard-landing-and-drill-down-chrome.md
- docs/implementation/deferred-work.md
- docs/implementation/sprint-status.yaml
- docs/implementation/visual-qa/10-4/dashboard-1440.png
- docs/implementation/visual-qa/10-4/dashboard-390.png
- docs/implementation/visual-qa/10-4/reports-hub-1440.png
- docs/implementation/visual-qa/10-4/reports-hub-390.png
- docs/implementation/visual-qa/10-4/report-category-1440.png
- docs/implementation/visual-qa/10-4/report-category-390.png
- docs/implementation/visual-qa/10-4/qa-summary.json
- inex/ClientApp/public/locales/en/translation.json
- inex/ClientApp/public/locales/ru/translation.json
- inex/ClientApp/src/components/SpendingHeatmap.tsx
- inex/ClientApp/src/components/primitives/Progress.tsx
- inex/ClientApp/src/layouts/AppShell.css
- inex/ClientApp/src/layouts/AppShell.tsx
- inex/ClientApp/src/model/Report/ReportCategoryDetails.ts
- inex/ClientApp/src/pages/Dashboard.tsx
- inex/ClientApp/src/pages/Dashboard/dashboard.css
- inex/ClientApp/src/pages/Reports.tsx
- inex/ClientApp/src/pages/Reports/ReportAccessibleSummary.tsx
- inex/ClientApp/src/pages/Reports/ReportBudgetSpending.tsx
- inex/ClientApp/src/pages/Reports/ReportCategory.tsx
- inex/ClientApp/src/pages/Reports/ReportList.tsx
- inex/ClientApp/src/pages/Reports/ReportMonthlyHistory.tsx
- inex/ClientApp/src/pages/Reports/ReportSpendingHeatmap.tsx
- inex/ClientApp/src/pages/Reports/reports.css

### Change Log

- 2026-06-05: Implemented Dashboard/Reports chrome split, accessible summaries, responsive visual QA evidence, and required frontend quality gates for Story 10.4.
- 2026-06-05: Applied BMad code review fixes for period propagation, preserved category data semantics, keyboard drill-through access, report action fallbacks, MoM baseline handling, and progress/summary accessibility.
