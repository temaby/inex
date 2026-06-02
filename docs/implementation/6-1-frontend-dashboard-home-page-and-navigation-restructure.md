# Story 6.1: Frontend - Dashboard Home Page and Navigation Restructure

Status: done

<!-- Note: Validation is optional. Run bmad-create-story validate before dev-story. -->

## Story

As a user opening the app,
I want to land on a meaningful home dashboard,
So that I see my financial overview immediately rather than navigating blind.

## Acceptance Criteria

1. Given the app currently lands on `/transactions` after login, When this story is complete, Then the default post-login route is `/dashboard` (or `/`) and the navigation menu reflects the new structure.

2. Given the Reports section in the navigation, When this story is complete, Then Reports is reorganized as a top-level nav item (or submenu) clearly separate from the dashboard - no functional regression on existing report pages.

3. Given the new `/dashboard` route, When it renders, Then it displays a placeholder layout ready to receive the month summary cards and charts from subsequent stories - the shell is wired, not empty.

4. Given all navigation label strings, When reviewed, Then every label is in `en/translation.json` and `ru/translation.json`.

5. Given `npm run build` and `npm run lint`, When run after this change, Then both pass with no regressions on existing routes (`/transactions`, `/accounts`, `/categories`, `/budgets`, `/reports`).

## Tasks / Subtasks

- [x] Add the dashboard route and landing redirect. (AC: 1, 3)
  - [x] Create a lightweight protected dashboard page component, likely `inex/ClientApp/src/pages/Dashboard.tsx`.
  - [x] Register `/dashboard` inside the existing `ProtectedRoute` route tree in `inex/ClientApp/src/App.tsx`.
  - [x] Change the protected `/` redirect from `/transactions` to `/dashboard`.
  - [x] Preserve public `/login` and `/register` routes and all existing protected route boundaries.

- [x] Wire dashboard into the existing navigation without redesigning the app shell. (AC: 1, 2, 4)
  - [x] Add a dashboard navigation item to `BasicPage` using existing Ant Design menu patterns and current icon dependency.
  - [x] Keep Reports visible as a distinct top-level navigation item unless a minimal submenu is required by the implementation; do not merge Reports into Dashboard.
  - [x] Ensure selected navigation state works for `/dashboard`, `/reports`, and nested report paths.
  - [x] Add `nav.dashboard` and dashboard page labels to both EN and RU locale files.

- [x] Build a functional dashboard placeholder, not final dashboard UI. (AC: 3, 4)
  - [x] Render a non-empty dashboard page using existing layout/page patterns.
  - [x] Include clearly separated placeholder regions for upcoming Epic 6 widgets: month summary cards, spending heatmap, and historical net worth chart.
  - [x] Use localized EN/RU strings for all visible dashboard text.
  - [x] Do not fetch new data, calculate summary metrics, render charts, or introduce widget-specific business logic in this story.

- [x] Preserve Reports behavior. (AC: 2, 5)
  - [x] Keep `/reports`, `/reports/category`, `/reports/budget`, and `/reports/history` route targets unchanged.
  - [x] Keep `ReportList` launch behavior and existing drill-down components working.
  - [x] Keep Reports page title/back-button behavior stable unless a minimal adjustment is required by route selection or dashboard separation.

- [x] Verify frontend quality gates. (AC: 5)
  - [x] From `inex/ClientApp`, run `npm run build`.
  - [x] From `inex/ClientApp`, run `npm run lint`.
  - [x] Manually smoke-check navigation to `/dashboard`, `/transactions`, `/accounts`, `/categories`, `/budgets`, `/reports`, and existing report drill-down routes.

## Dev Notes

### Source Requirements

- Story 6.1 implements FR-FE-003: dashboard home page established as app landing and Reports navigation restructured. [Source: `docs/planning/epics.md`, Story 6.1]
- Epic 6 is a functional dashboard/reporting scaffold before Epic 10. This story establishes the route and navigation foundation for Story 6.2, Story 6.3, and Story 6.4. [Source: `docs/planning/epics.md`, Epic 6]
- The PRD places FR-FE-003 under frontend core UX, not under the final design-system rebuild. [Source: `docs/planning/prds/prd-inex-2026-05-20/prd.md`]
- The sprint change proposal and readiness report require Epic 6 report/data work to stay clearly bounded and prevent later design scope from leaking into functional dashboard stories. [Source: `docs/planning/sprint-change-proposal-2026-05-26.md`; `docs/planning/implementation-readiness-report-2026-05-26.md`]
- `ux-design.md` is an index pointing at the design-system sources for Epic 10. For this Epic 6 story, use those sources only to understand out-of-scope boundaries, not to implement the final visual system. [Source: `docs/planning/ux-design.md`; `docs/planning/design-update-plan.md`]

### Dependencies

- Epic 2 is a prerequisite for Epic 6 overall because later time-series dashboard work depends on UTC-normalized timestamps. Story 6.1 itself is frontend route/navigation scaffolding and should not add time-series calculations.
- Story 6.5 report correctness is intentionally separate from this dashboard UI scaffold. Do not change category report backend behavior in this story.
- Story 6.2 depends on this story for the dashboard route/home page where month summary cards will be added.
- Story 6.3 and Story 6.4 can use the route/navigation foundation from this story but must own their own widgets/data requirements.
- Epic 10 owns the final dashboard/report visual design and app-shell/navigation redesign. Do not pull Epic 10 prerequisites into this story.

### Current State Analysis

`inex/ClientApp/src/App.tsx`

- Public routes are `/login` and `/register`.
- Protected routes are wrapped by `ProtectedRoute`.
- The protected root route currently redirects `/` to `/transactions`.
- Existing protected pages are `/transactions`, `/accounts`, `/categories`, `/budgets`, `/profile`, and nested `/reports` routes.
- Reports routes are currently:
  - `/reports` -> `ReportList`
  - `/reports/category` -> `ReportCategory`
  - `/reports/budget` -> `ReportBudgetSpending`
  - `/reports/history` -> `ReportMonthlyHistory`
- No `Dashboard` page is currently present under `src/pages`.

`inex/ClientApp/src/layouts/BasicPage.tsx`

- Authenticated pages use the current Ant Design shell with desktop horizontal menu, mobile drawer menu, profile affordance, logout affordance, and footer.
- Navigation items currently include Transactions, Accounts, Categories, Budgets, and Reports.
- `currentPage` is derived from the first URL segment, which should support `/dashboard` naturally once a matching nav key exists.
- The component uses `props: any` and `handleNavSelect(e: any)`. This story should not expand typing debt; minor local typing cleanup is acceptable only if needed while touching the file.

`inex/ClientApp/src/pages/Reports.tsx`

- Reports page is already distinct from other top-level routes.
- It wraps nested report pages in `BasicPage`, maps report route titles, and shows a Back button on drill-down paths.
- This story must preserve those nested route behaviors. A full Reports hub redesign is Epic 10 scope, not Story 6.1 scope.

`inex/ClientApp/public/locales/en/translation.json` and `ru/translation.json`

- `nav` currently has no dashboard label.
- `reports` already has labels for existing report routes.
- Add new labels under stable namespaces such as `nav.dashboard` and `dashboard.*`; update both language files in the same implementation.

### Implementation Guidance

- Keep the implementation minimal and additive:
  - add a `Dashboard` page,
  - add a `/dashboard` protected route,
  - redirect `/` to `/dashboard`,
  - add a dashboard nav item,
  - add localized placeholder copy.
- The dashboard placeholder should be useful as a scaffold for developers, not a marketing page. Prefer compact sections or simple panels that identify future widget slots.
- Use existing React Router 6 route composition. Do not introduce data loaders/actions or a router upgrade.
- Use existing Ant Design components and current local styling conventions. Do not add a CSS token system, shared primitive layer, new icon package, or custom shell.
- Keep all authenticated API behavior untouched. This story should not call backend APIs or change Redux thunks/slices.
- Do not add frontend tests; the committed frontend quality gate is currently build plus lint.

### Epic 6 / Epic 10 Guardrails

- This story is Epic 6 functional dashboard/reporting scaffold work only.
- Keep scope to the functional dashboard route/home page and minimal navigation restructure required by the source acceptance criteria.
- Do not implement month summary cards, spending heatmap, historical net worth chart, category report fixes, or report drill-down redesign in this story.
- Do not take final design-system scope: no tokens, theme bridge, shared primitives, finance money primitives, visual QA baseline, or Epic 10 shell replacement.
- Do not take Reports hub redesign scope: no launch-card hub, report preview metrics, Share/Export/Print action placement, or drill-down chrome rebuild.
- Do not take mobile navigation scope beyond preserving the current `BasicPage` drawer behavior after adding the dashboard nav item.
- Do not create shared primitives.
- Do not own responsive visual QA baseline. Basic smoke checks for no obvious route/navigation breakage are enough for this story.
- Do not add chart accessibility polish; no charts should be implemented here.
- Do not create Epic 10 stories or modify existing Epic 10 story files.

### Files Likely to Change

- `inex/ClientApp/src/App.tsx` - import/register `Dashboard`, add `/dashboard`, redirect `/` to `/dashboard`.
- `inex/ClientApp/src/layouts/BasicPage.tsx` - add dashboard nav item and icon using current Ant Design menu pattern.
- `inex/ClientApp/src/pages/Dashboard.tsx` - new minimal dashboard placeholder page.
- `inex/ClientApp/public/locales/en/translation.json` - add dashboard nav/page labels.
- `inex/ClientApp/public/locales/ru/translation.json` - add dashboard nav/page labels.

Files to avoid unless an implementation blocker requires them:

- `inex/ClientApp/src/pages/Reports/**` - preserve existing report behavior; do not redesign hub/drill-down UX.
- `inex/ClientApp/src/store/**` - no new data fetching or Redux state is required.
- `inex/ClientApp/src/components/ProtectedRoute.tsx` - route protection should remain unchanged.
- `inex/ClientApp/package.json` and `package-lock.json` - no dependency changes.
- Backend projects (`inex`, `inex.Services`, `inex.Data`) - no backend work belongs in this story.
- `docs/implementation/10-*.md` - Epic 10 story files are out of scope.

### Testing Requirements

- Required commands from `inex/ClientApp`:
  - `npm run build`
  - `npm run lint`
- Manual smoke checks:
  - Login/restored-session flow reaches `/dashboard` via protected `/` redirect.
  - Desktop navigation can open Dashboard, Transactions, Accounts, Categories, Budgets, and Reports.
  - Current mobile drawer navigation still opens and includes Dashboard without breaking existing items.
  - Existing report routes still render: `/reports`, `/reports/category`, `/reports/budget`, `/reports/history`.
- No backend tests are required because this story does not change backend behavior.

### References

- `docs/planning/epics.md` - Epic 6 Story 6.1 source of record.
- `docs/planning/prds/prd-inex-2026-05-20/prd.md` - FR-FE-003 and frontend core UX roadmap context.
- `docs/planning/sprint-change-proposal-2026-05-26.md` - Epic 6 boundary and report-integrity separation.
- `docs/planning/implementation-readiness-report-2026-05-26.md` - Epic 6 ready with story-boundary caution.
- `docs/planning/design-update-plan.md` - Epic 10 design sequencing and scope boundaries.
- `docs/planning/ux-design.md` - UX source index; design details are not Story 6.1 implementation scope.
- `docs/planning/architecture.md` - frontend stack, routing, i18n, and Epic 10 boundary guidance.
- `docs/project-context.md` - frontend route, API-client, i18n, build/lint, and no-new-dependency rules.
- `inex/ClientApp/src/App.tsx` - current route tree and `/` redirect.
- `inex/ClientApp/src/layouts/BasicPage.tsx` - current authenticated navigation shell.
- `inex/ClientApp/src/pages/Reports.tsx` - current reports nesting/chrome behavior.
- `inex/ClientApp/public/locales/en/translation.json` and `ru/translation.json` - current locale baseline.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-01: `python3 _bmad/scripts/resolve_customization.py ...` could not run because `python3` is not installed in the Windows shell; workflow customization was resolved manually from the skill TOML files.
- 2026-06-01: Initial sandboxed `npm run build` and `npm run lint` attempts failed with Node `EPERM` on `C:\Users\artio`; reran both outside the sandbox per approval flow and they passed.
- 2026-06-01: In-app browser smoke check could not run because the browser connector failed to start in this Windows sandbox (`spawn setup refresh`); route availability was checked through Vite HTTP responses instead.
- 2026-06-01: Review follow-up found two stale login redirects to `/transactions`; updated both to `/dashboard`.
- 2026-06-01: Review-fix validation repeated `npm run build` and `npm run lint`; sandboxed attempts still failed with Node `EPERM` on `C:\Users\artio`, rerun outside sandbox passed.

### Completion Notes List

- Story context created via bmad-create-story workflow for key `6-1-frontend-dashboard-home-page-and-navigation-restructure`.
- Story status set to `ready-for-dev`.
- Story intentionally limits scope to functional dashboard route/navigation scaffold before Epic 10.
- Sprint status was not updated because this orchestration run was constrained to create exactly one story file.
- Added a protected `/dashboard` route and changed the protected `/` redirect to `/dashboard` while keeping public auth routes and existing protected routes intact.
- Added Dashboard to the existing `BasicPage` Ant Design navigation, leaving Reports as a distinct top-level item and preserving nested report route behavior.
- Added a localized functional dashboard placeholder with separate month summary, spending heatmap, and historical net worth chart regions; no dashboard data fetching, charting, or widget business logic was introduced.
- Verified `npm run build` and `npm run lint` from `inex/ClientApp`; both passed. Vite HTTP route checks returned 200 for `/`, `/dashboard`, `/transactions`, `/accounts`, `/categories`, `/budgets`, `/reports`, `/reports/category`, `/reports/budget`, and `/reports/history`.
- Addressed review fix by changing authenticated-login and post-submit login redirects from `/transactions` to `/dashboard`.
- Re-verified `npm run build` and `npm run lint` from `inex/ClientApp`; both passed after the login redirect fix.

### File List

- docs/implementation/6-1-frontend-dashboard-home-page-and-navigation-restructure.md
- docs/implementation/sprint-status.yaml
- inex/ClientApp/public/locales/en/translation.json
- inex/ClientApp/public/locales/ru/translation.json
- inex/ClientApp/src/App.tsx
- inex/ClientApp/src/layouts/BasicPage.tsx
- inex/ClientApp/src/pages/Login.tsx
- inex/ClientApp/src/pages/Dashboard.tsx

### Change Log

- 2026-06-01: Implemented Story 6.1 dashboard route, landing redirect, navigation entry, localized placeholder scaffold, and frontend verification.
- 2026-06-01: Addressed review follow-up by routing successful/already-authenticated login flow to `/dashboard` and rerunning frontend build/lint.
