---
title: Dashboard whole-unit summaries
type: feature
created: '2026-11-06'
status: done
baseline_commit: c0aa602
context:
  - docs/project-context.md
  - docs/design/docs/design-implementation-guide.md
---

<frozen-after-approval reason="Implementation and delivery authorized in the user request">

## Intent

**Problem:** Repeated cents in dashboard summaries make the overview harder to scan.

**Approach:** Display monetary summaries as locale-aware whole units in both dashboard variants. Preserve fractional amounts below one unit and keep exact amounts available through existing detail views and tooltips.

## Boundaries & Constraints

**Always:** Preserve underlying values, aggregation, conversion, percentages, chart geometry, current-user and linked-account scope, signs, currencies, navigation and loading/error behavior. Keep tabular numerals. Show nonzero amounts below one unit with two decimals. The monthly comparison must agree with the displayed income and expense values. Keep financial details at the existing two-decimal precision.

**Ask First:** Changes to API, persistence, exchange-rate behavior, dependencies, or global formatting defaults.

**Never:** Round stored values, alter transaction rendering, hide small nonzero balances through integer rounding, or change dashboard layout.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected display | Detail behavior |
|---|---|---|---|
| Summary rounding | 12458.37 / 12458.68 | 12,458 / 12,459 in English | Exact cents remain available in details |
| Negative and small values | -12.68 / 0.42 / -0.42 / 0 | -13 / 0.42 / -0.42 / 0 with existing sign semantics | No false integer zero for sub-unit values |
| Russian locale | 12458.68 | Locale-aware grouped integer | Fractional detail uses comma separator |
| Monthly comparison | Rounded income and expenses match | Equality wording and zero delta | Underlying totals and bar geometry remain unchanged |
| Missing conversion | Required FX unavailable | Existing unavailable state | No partial totals |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Dashboard/{ClassicDashboard,VisualDashboard,IncomeDistribution,VisualAccountDistribution}.tsx` — dashboard amounts and detail surfaces.
- `inex/ClientApp/src/pages/Dashboard/` — local precision/formatting helper; shared Num defaults stay unchanged.
- `inex/ClientApp/src/pages/Dashboard.test.tsx` — both variants, small values, comparison and localization.
- `inex/ClientApp/visual-qa/{dashboard,visual-dashboard}.mjs` — fixture browser evidence and assertions.

## Tasks & Acceptance

- [x] Implement dashboard-only whole-unit summary formatting and preserve detailed precision.
- [x] Keep monthly comparison consistent with visible summaries without mutating source values.
- [x] Update focused regressions and browser assertions for the new presentation.
- [x] Run focused tests, lint, production build, and both dashboard fixture harnesses; inspect screenshots before independent review.
- [x] Address independent review findings and prepare the verified change for PR delivery.

**Acceptance Criteria:**
- Given either dashboard variant, when summary values render, then monetary amounts at or above one unit have no decimal digits and values below one retain cents.
- Given detailed account inspection or a chart tooltip, when the user inspects an amount, then the existing exact two-decimal precision is retained.
- Given English or Russian and 1440, 1024, 390 or 360px width, when the overview renders, then values remain localized and there is no page overflow or clipped controls.
- Given monthly cash flow, when comparison wording renders, then its sign and amount agree with the displayed flow totals.

## Spec Change Log

## Verification

- Project doctor UI: PASS. GitHub connector access confirmed; CLI auth also passes outside the sandbox. No master branch protection or applicable branch rules were configured at delivery.
- `npm test`: PASS, 47 files / 403 tests. After review fixes, repeated focused Dashboard/helper tests: PASS, 87 tests.
- `npm run lint` and `npm run build`: PASS, repeated after review fixes. Existing Vite CJS/chunk-size advisories remain.
- Fixture-only browser harnesses: PASS, all 17 classic states and all 91 visual states, including two new fractional inspection scenarios. No backend or external provider calls. The aggregate verifier is not applicable because only page-specific harnesses ran.
- Independent Blind Hunter, Edge Case Hunter and Acceptance Auditor passes completed. Fixed single-income precision on focus/hover, a stale monthly navigation wait, and exact-amount browser assertions. Follow-up reviewers confirmed closure, with no blocking findings.
- Screenshots and machine-readable summaries: `visual-qa/dashboard-whole-amounts/{classic,visual}/`. Inspected desktop 1440px, mobile 360px, Russian 390px, and detailed inspection screenshots.

## Suggested Review Order

- Start with the local precision rule; shared numeric defaults remain unchanged.
  [dashboard-money.ts:2](../../inex/ClientApp/src/pages/Dashboard/dashboard-money.ts#L2)
- Monthly comparison follows visible totals while bar geometry retains original amounts.
  [VisualDashboard.tsx:97](../../inex/ClientApp/src/pages/Dashboard/VisualDashboard.tsx#L97)
- Single-source income preserves its layout and reveals cents during inspection.
  [IncomeDistribution.tsx:125](../../inex/ClientApp/src/pages/Dashboard/IncomeDistribution.tsx#L125)
- Regression coverage protects focus, hover and precision restoration.
  [Dashboard.test.tsx:647](../../inex/ClientApp/src/pages/Dashboard.test.tsx#L647)
