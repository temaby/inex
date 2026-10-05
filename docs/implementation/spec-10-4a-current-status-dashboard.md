---
title: 'Story 10.4a: Current Status Dashboard'
type: 'feature'
created: '2026-09-30'
status: 'done'
baseline_commit: '002ca2df7c684c4f7f575fd2bed8d584a64c0dac'
context:
  - '{project-root}/docs/implementation/epic-10-context.md'
  - '{project-root}/docs/planning/ux-design-specification.md'
  - '{project-root}/docs/design/docs/design-implementation-guide.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The existing Dashboard spreads current financial status across four numeric cards, budget-derived content, and historical net worth, while the accounts and category composition needed for an immediate answer live elsewhere. Representative second-user feedback says this is insufficiently visual and too fragmented.

**Approach:** Replace it with one shared Current Status Dashboard using existing frontend query contracts: overview-visible account balances and complete total, income-versus-expense columns, and separate income and expense donuts with Parent/Child exploration. Remove budget and net-worth blocks from Dashboard without changing their dedicated pages.

## Boundaries & Constraints

**Always:** Use active accounts with `isFavourite !== false`; show native balances even when a converted total is unavailable; treat every converted aggregate as complete or unavailable rather than partial; preserve authorized linked-account read-only scope; use `apiClient`/existing RTK Query APIs; localize EN/RU; provide keyboard-operable chart legends and accessible summaries; preserve responsive behavior at 1440, 1024, 390, and 360px.

**Ask First:** Any backend/API/schema change; adding a dependency; persisting Dashboard or Parent/Child preferences; changing account ownership, linked-scope, currency-conversion, or transaction-filter contracts.

**Never:** Add Dashboard templates, Profile settings, free-form widgets, budget content, or historical net worth; call external rate providers from tests/visual QA; present partial multi-currency totals as complete; rename the `isFavourite` API field; modify or revert unrelated `inex/inex.xml` changes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Populated | Visible accounts, complete cached rates, current activity | Account list/total, two cash-flow columns, two donuts | N/A |
| Missing rate | Non-zero foreign balance or cash-flow bucket lacks cached conversion | Native balances remain; affected total/chart values show unavailable evidence | Never substitute a partial value |
| Empty | No visible accounts or no monthly activity | Scoped empty account state, zero cash-flow state, explicit empty donuts | Other panels remain usable |
| Category density | More than eight categories | Eight ranked sectors plus actionable Other list | Exact values remain in summary |
| Parent view | Parent mode and a parent is selected | Aggregate parents first, then show that parent's children with Back | Child selection opens filtered Transactions |
| Child view | Child mode | Rank child categories directly with parent context | Orphan/top-level activity remains identifiable |
| Linked view | Authorized linked user selected | All reads include linked scope and page remains read-only | Existing unauthorized-scope handling is preserved |
| Panel failure | One query fails | Show panel-local error while retaining successful panels | No whole-page blank state |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Dashboard.tsx` -- current budget/net-worth composition to replace; owns query orchestration and drill-down navigation.
- `inex/ClientApp/src/pages/Dashboard/dashboard.css` -- responsive Dashboard layout and chart/legend styling.
- `inex/ClientApp/src/pages/Dashboard/dashboard-utils.ts` -- new pure hierarchy, ranking, Other, and navigation-data helpers.
- `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts` -- existing complete-or-unavailable account/cash-flow conversion helpers to reuse.
- `inex/ClientApp/src/store/accounts/accounts-api.ts` -- active account and balance summaries, including linked scope.
- `inex/ClientApp/src/store/transactions/transactions-api.ts` -- visible-account current-period cash-flow summary and unpaged monthly transaction source for gross category composition.
- `inex/ClientApp/public/locales/{en,ru}/translation.json` -- Dashboard and Show in overviews copy.
- `inex/ClientApp/src/test/fixtures/dashboardVisualFixture.ts` and `inex/ClientApp/visual-qa/dashboard.mjs` -- isolated visual states and responsive evidence.

## Tasks & Acceptance

**Execution:**
- [x] `Dashboard/dashboard-utils.ts` + tests -- derive flow-specific parent/child series, rank eight plus Other, and retain category IDs for drill-down.
- [x] `Dashboard.tsx` -- orchestrate existing account, summary, monthly transaction, and cached-rate queries; render account status, cash-flow columns, two donuts, accessible legends/summaries, and linked mode.
- [x] `Dashboard/dashboard.css` -- implement the approved information hierarchy and mobile-safe reflow without fixed-width chart overflow.
- [x] locale files + account form tests -- add localized Dashboard states and rename Favourite presentation to Show in overviews while preserving payloads.
- [x] Dashboard fixture and visual-QA harness -- replace budget/net-worth fixtures with accounts, summaries, categories, rates, empty, missing-rate, error, Parent/Child, and linked states.
- [x] sprint/story artifacts -- record implementation, verification evidence, and final status without rewriting completed Story 10.4 history.

**Acceptance Criteria:**
- Given a user opens `/dashboard`, when data settles, then the first scan path is visible-account total/list, income-versus-expense columns, expense donut, and income donut.
- Given Parent or Child mode, when the user operates legends with pointer, Enter, or Space, then hierarchy changes or Transactions opens with current month, flow type, and category filter.
- Given missing conversion or one failed query, when the page renders, then no partial aggregate or unrelated panel is lost.
- Given linked view and mobile widths, when the same flows run, then scope remains authorized/read-only and the page has no horizontal overflow or bottom-nav occlusion.

## Spec Change Log

## Design Notes

Use one global Parent/Child control for both donuts and independent parent drill-down state per donut. Recharts provides the visual marks; native legend buttons and compact summary tables are the authoritative interactive and accessible controls.

## Verification

**Commands:**
- `npm test -- --run Dashboard` -- Dashboard helper/component and account-label tests pass.
- `npm run build` -- TypeScript and production build pass.
- `npm run lint` -- no new lint failures or `any` usage in touched files.
- `npm run visual-qa:dashboard` -- fixture-only screenshots and assertions pass at all required widths without real backend/provider calls.
- `npm run visual-qa:verify` -- visual-QA summary remains valid.

**Implementation evidence (2026-10-05):**
- `npm test -- --run Dashboard transaction-ledger-utils transactions-api AccountFavouriteForms` -- 5 files, 41 tests passed.
- `npm test -- --run Dashboard` -- final post-review rerun passed: 2 files, 8 tests.
- `npm run build` -- passed; existing Vite chunk-size advisory only.
- `npm run lint` -- passed with no findings.
- `npm run visual-qa:dashboard` -- passed; 15 isolated fixture states, no unhandled API requests, no horizontal overflow, and no mobile bottom-nav occlusion.
- `npm run visual-qa:verify` -- Dashboard canonical summary passed; command remains non-zero only because the eight unrelated page summaries are older than the repository-wide 24-hour freshness limit.
- Visual evidence: `docs/implementation/visual-qa/dashboard/qa-summary.json` and its referenced PNGs.

**Review resolution:**
- Category composition uses gross monthly transactions scoped to overview-visible accounts, preserving mixed income and expense activity.
- Currency conversion selects the latest applicable cached rate and keeps each incomplete aggregate explicitly unavailable.
- Hierarchy traversal covers direct and deep descendants, excludes system subtrees, and supports keyboard drill-down and Escape navigation.
- Account, summary, category, empty, one-sided, missing-rate, linked, and mobile states are isolated and visually verified.
- The current-month range refreshes automatically when a long-lived Dashboard crosses a calendar-month boundary.

## Suggested Review Order

**Dashboard orchestration**

- Start with query scope, conversion completeness, month rollover, and panel isolation.
  [`Dashboard.tsx:262`](../../inex/ClientApp/src/pages/Dashboard.tsx#L262)

- Review responsive hierarchy, account collapsing, and mobile-safe chart layout.
  [`dashboard.css:3`](../../inex/ClientApp/src/pages/Dashboard/dashboard.css#L3)

**Category exploration**

- Follow parent/child aggregation, eight-plus-Other ranking, and transaction filter construction.
  [`dashboard-utils.ts:123`](../../inex/ClientApp/src/pages/Dashboard/dashboard-utils.ts#L123)

- Confirm gross-flow, deep-hierarchy, system-category, and overflow behavior through focused tests.
  [`dashboard-utils.test.ts:23`](../../inex/ClientApp/src/pages/Dashboard/dashboard-utils.test.ts#L23)

**Data correctness boundaries**

- Check latest-rate selection and complete-or-unavailable account aggregation.
  [`transaction-ledger-utils.ts:234`](../../inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts#L234)

- Verify inclusive end-date serialization and safe skipped-query cache keys.
  [`transactions-api.ts:195`](../../inex/ClientApp/src/store/transactions/transactions-api.ts#L195)

- Confirm every linked read stays scoped and uses only overview-visible accounts.
  [`Dashboard.test.tsx:121`](../../inex/ClientApp/src/pages/Dashboard.test.tsx#L121)

**Visual and product evidence**

- Inspect the fixture contract shared by all responsive and failure scenarios.
  [`dashboardVisualFixture.ts:8`](../../inex/ClientApp/src/test/fixtures/dashboardVisualFixture.ts#L8)

- Review runtime-error capture and invariant assertions across fifteen screenshots.
  [`dashboard.mjs:193`](../../inex/ClientApp/visual-qa/dashboard.mjs#L193)

- Compare delivered scope against the accepted single-Dashboard product decision.
  [`ux-design-specification.md:325`](../planning/ux-design-specification.md#L325)
