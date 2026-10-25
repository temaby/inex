---
title: Compact income distribution in the visual dashboard
type: feature
created: '2026-10-25'
status: done
---

## Behavior

The visual dashboard keeps the expense chart on the left and stacks compact wallet and income cards on the right. Below 1100px the expense card spans the page and the two smaller cards sit side by side; on phones all four cards fill one column. The reporting period appears once in the page header. Currency spacing is scoped to the visual dashboard.

IncomeDistribution consumes the existing income slices, dated currency conversion, query/loading/error state, and category navigation from useDashboardData. It does not infer income categories from receiving wallets. ClassicDashboard, shared data/aggregation logic, backend APIs, calculations, account visibility, and the user-scoped variant switch are unchanged.

- Zero categories: localized compact empty state.
- One category: summary and category action, without a ring. A parent with children exposes View breakdown; selecting it reuses the existing child drill-down.
- Two to four categories: proportional donut with the complete legend.
- Five or more: four leading categories plus Other. Existing grouped slices are flattened before reranking so every underlying amount remains available. Other expands into names, percentages, amounts, and existing category actions.
- Hover/focus highlights matching segments; legend buttons and chart click/tap reuse selection. Escape/back returns to parent categories and restores keyboard focus, including an Other-origin drill-down.
- Donuts use no minimum angle, inter-segment padding, or stroke that would distort tiny proportions. Positive shares below the displayed precision show <0.1% rather than zero. Localized percentages and amounts remain accessible as text.
- The center shows the existing monthly categorized income total; after drill-down it uses the selected-category subtotal and label, matching expense navigation semantics. Missing rates withhold partial income totals and expose the existing retry action.

## Validation

- Project doctor: PASS, all 21 UI checks.
- Full frontend suite: PASS, 40 files / 294 tests with two workers. The first concurrent run hit three unrelated 5-second form-test timeouts; all passed on the bounded rerun without changes to those tests.
- Final dashboard regression run: PASS, 35 tests. New coverage includes 0/1/2/4/5/10 categories, full Other membership and navigation, mixed-sign transactions, system ancestor exclusion, single-parent children and direct parent postings, focus restoration, pending scope, and missing/available dated FX conversion.
- Final build/typecheck and lint: PASS. Existing Vite CJS and chunk-size advisories remain.
- Classic browser fixtures: PASS, all 17 states. Source preservation also checked with git diff.
- Final visual browser fixtures: PASS, all 28 states, including 1440/1024/390/360px, Russian/long amounts, empty/error/rate states, and all income adaptations. Desktop, both mobile sizes, Russian, long amounts, and single-parent/child captures were visually reviewed.
- Canonical visual verifier: FAIL only because seven unrelated page summaries exceed its 24-hour freshness limit. Dashboard, Visual Dashboard, and Profile summaries pass; no missing screenshots or structural failures were reported.
- git diff --check: PASS.

Visual fixtures are isolated from the real backend and all external rate providers. The existing fixture transaction list and cash-flow summary are independently authored: categorized income is 5,453 and categorized expenses are 3,365, while the summary contains 5,400 and 3,400. Both existing calculation inputs are preserved; this pre-existing fixture mismatch is not reconciled by changing production financial logic.

## Evidence and workflow

The visual harness adds two-source, four-source, tiny-segment, single-parent, child-drill-down, and expanded-income-Other states to its existing 22 captures. Its canonical verifier requires all six additions. Screenshot review caught and fixed inherited desktop legend spacing and mobile flex alignment; the harness now checks that phone cards fill the same column width.

The Settings persistence capture once raced navigation against in-flight intercepted API requests. It now waits for the income card and loading indicators to settle before navigating for its reload assertion. Durable workflow recommendation: run browser capture and the full test suite sequentially, using at most two Vitest workers on this host when form tests approach their five-second timeout.

Evidence is under docs/implementation/visual-qa/visual-dashboard/. No live data or provider calls were used.
