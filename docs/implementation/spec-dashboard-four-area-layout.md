---
title: 'Dashboard Four-Area Layout'
type: 'feature'
created: '2026-10-05'
status: 'done'
baseline_commit: 'b61875345b93ef4801ecabd7cce0335bf972ca2f'
context:
  - '{project-root}/docs/implementation/spec-10-4a-current-status-dashboard.md'
  - '{project-root}/docs/planning/ux-design-specification.md'
  - '{project-root}/docs/design/docs/design-implementation-guide.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The completed Current Status Dashboard splits balance and accounts into separate cards and gives the income-versus-expense comparison an entire full-width row. This weakens the four-part scan path and consumes more vertical space than the information requires.

**Approach:** Recompose the desktop Dashboard as four panels in a two-column, two-row arrangement: cash flow at top left; one combined balance-and-accounts panel at top right; expenses at bottom left; income at bottom right. Match panel heights within each row and give the two category charts brighter, mutually exclusive palettes.

## Boundaries & Constraints

**Always:** Preserve all current query scope, conversion-completeness, linked-account, drill-down, keyboard, loading, empty, unavailable, and error behavior. Keep the mobile reading order as balance/accounts, cash flow, expenses, then income, while desktop uses CSS placement for the requested arrangement. Use labels, signs, and icons in addition to color. Verify 1440px, 1024px, 390px, and 360px without overflow, clipping, blank charts, or bottom-navigation occlusion.

**Ask First:** Any change to APIs, data contracts, category behavior, the global design-token palette, dependencies, or the page's content hierarchy beyond the requested four areas.

**Never:** Modify or revert `inex/inex.xml`; change account visibility or ownership rules; present partial converted totals as complete; remove accessible chart summaries or native legend controls; use the same chart color in both income and expense palettes; add new Dashboard content.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Wide desktop | Populated Dashboard at 1200px or wider | Four panels form a 2x2 composition; top and bottom pairs are equal height | Long account names and values remain contained |
| Tablet/mobile | Width below 1200px | Panels stack in priority order: balance/accounts, cash flow, expenses, income | No CSS visual reordering may change keyboard or screen-reader order |
| Dense accounts | More than three visible accounts | Desktop shows the existing list; mobile retains the existing collapsed-list affordance | Combined panel expands without overlap |
| Category density | Multiple expense and income slices | Each donut uses a bright varied palette with no exact color shared between flows | Text legend remains authoritative and usable |
| Panel state | Loading, empty, unavailable, or failed query | State remains confined to its affected content inside the new panel structure | Other panels remain visible and usable |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Dashboard.tsx` -- Dashboard panel composition, semantic DOM order, and chart palette assignment.
- `inex/ClientApp/src/pages/Dashboard/dashboard.css` -- four-area desktop grid, combined position panel, equal-height rows, and responsive stacking.
- `inex/ClientApp/src/pages/Dashboard.test.tsx` -- component regression coverage for combined content and source order.
- `inex/ClientApp/src/test/fixtures/dashboardVisualFixture.ts` -- visual baseline metadata, including the new four-panel contract.
- `inex/ClientApp/visual-qa/dashboard.mjs` -- responsive geometry, panel-count, order, and overflow assertions.
- `docs/design/docs/visual-qa-checklist.md` -- reviewed screenshot evidence for the revised Dashboard.

## Tasks & Acceptance

**Execution:**
- [x] `Dashboard.tsx` -- combine balance and account list in one panel, retain separate state handling, arrange the four semantic areas, and replace overlapping chart palettes.
- [x] `Dashboard/dashboard.css` -- implement the 2x2 desktop grid, equal-height row behavior, usable internal panel sizing, and documented responsive stack.
- [x] Dashboard tests and visual fixture/harness -- assert four panels, correct DOM/mobile order, desktop pair alignment, and unchanged interactive states.
- [x] Visual QA checklist -- capture and inspect the required responsive evidence.

**Acceptance Criteria:**
- Given a populated 1440px Dashboard, when it renders, then cash flow is top left, combined balance/accounts is top right, expenses are bottom left, income is bottom right, and each row's panel bounds align.
- Given a 1024px, 390px, or 360px viewport, when the layout reflows, then the reading and focus order is balance/accounts, cash flow, expenses, income with no page-level overflow.
- Given category slices in both flows, when charts and legends render, then expenses use a bright varied warm palette, income uses a bright varied cool palette, and the palettes share no exact color.
- Given any existing Dashboard loading, empty, missing-rate, linked, drill-down, or error scenario, when the layout changes, then its behavior and panel isolation remain intact.

## Spec Change Log

## Design Notes

Keep the combined position panel first in the DOM to preserve the documented mobile priority. Place it in the desktop top-right cell through CSS Grid, with cash flow in the top-left cell. The Parent/Child toolbar may span the space above the bottom pair but must not become a fifth card or break equal-height category panels.

## Verification

**Commands:**
- `npm test -- --run Dashboard` -- focused Dashboard tests pass.
- `npm run build` -- TypeScript and production build pass.
- `npm run lint` -- no new lint findings.
- `npm run visual-qa:dashboard` -- all Dashboard states pass at required widths and generate updated screenshots.
- `npm run visual-qa:hero-consistency` -- shared page-header and Dashboard top-section checks pass.
- `npm run visual-qa:verify` -- Dashboard summaries validate; unrelated freshness failures are reported separately.

**Implementation evidence (2026-10-05):**
- `npm test -- --run Dashboard` -- 2 files, 10 tests passed.
- `npm run build` -- passed; existing Vite chunk-size advisory only.
- `npm run lint` -- passed with no findings.
- `npm run visual-qa:dashboard` -- passed across 15 fixture states; 1440px row bounds align, responsive order is correct, palettes do not overlap, and no overflow or bottom-nav occlusion was detected.
- `npm run visual-qa:hero-consistency` -- passed after replacing its retired KPI-card contract with the current combined position-panel contract.
- `npm run visual-qa:verify` -- Dashboard and hero-consistency summaries validate; repository-wide verification remains non-green only because seven unrelated page summaries exceed the 24-hour freshness window.
- Manual screenshot inspection completed for populated 1440px, 1024px, 390px, and 360px captures.

**Final review:**
- The primary agent inspected the layout, state-preserving component diff, QA assertions, and populated screenshots against the approved acceptance criteria. No blocking implementation defect was identified.
- Blind-review suggestions were triaged against the approved scope. Desktop CSS placement and mobile source order are intentional; eight-plus-Other category ranking and accessible labels remain unchanged.
- Independent edge-case and acceptance reviews did not complete: reviewer runs were interrupted or failed at the account usage limit. Their completion is not claimed.
- Suggested workflow follow-up: bound reviewer retries and return completed findings before retrying a failed review stage.

## Suggested Review Order

**Composition and responsive behavior**

- Start with the combined position panel and preserved account/balance state handling.
  [Dashboard.tsx:542](../../inex/ClientApp/src/pages/Dashboard.tsx#L542)
- Inspect desktop placement, equal-height rows, and responsive source-order stacking.
  [dashboard.css:10](../../inex/ClientApp/src/pages/Dashboard/dashboard.css#L10)
- Compare the separate income and expense chart palettes.
  [Dashboard.tsx:44](../../inex/ClientApp/src/pages/Dashboard.tsx#L44)

**Regression evidence**

- Verify combined content and the four-panel reading order.
  [Dashboard.test.tsx:145](../../inex/ClientApp/src/pages/Dashboard.test.tsx#L145)
- Review geometry, palette, state-isolation, and responsive assertions.
  [dashboard.mjs:358](../../inex/ClientApp/visual-qa/dashboard.mjs#L358)
