---
title: Browse monthly history in the visual dashboard
type: feature
created: '2026-11-05'
status: done
baseline_commit: '3f49cd4'
context:
  - docs/project-context.md
  - docs/design/docs/design-implementation-guide.md
---

<frozen-after-approval reason="User authorized implementation, PR and production merge in this chat">

## Intent

**Problem:** The visual dashboard only shows the current month, preventing quick review of past income, expenses and category composition.

**Approach:** Add previous/next month buttons, a month/year picker and a return-to-current-month action to the optional visual dashboard. Monthly reports and transaction links follow the selection. Current account balances remain explicitly labelled as current, with current-period currency conversion independent of historical reporting rates.

## Boundaries & Constraints

**Always:** Preserve authenticated own/linked workspace scoping, active-account report scope, current balance account scope, complete-or-unavailable conversion, EN/RU localization, shared primitives and keyboard access. Store selection in the URL as `month=YYYY-MM`; ordinary navigation without that parameter opens the current month. Retain unrelated query parameters. Refresh and browser Back restore the selection. Current mode follows calendar rollover; an explicitly selected historical month stays fixed.

**Ask First:** Backend/API contract changes, historical balance reconstruction, dependency changes or expansion into other dashboard variants.

**Never:** Change classic dashboard behavior, edit completed story history, expose historical FX as current balance FX, show future months, call real external providers during tests/QA, or mutate financial data.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default | Visual route without month | Current month, next disabled, no return button | Existing panel states |
| History | Valid past month in URL or controls | Matching summaries/categories and drill-down dates; explicit current balance label | Local panel failures retained |
| Navigation | Refresh, Back, next/previous, picker | URL and displayed period agree; current action removes month parameter | Preserve unrelated URL state |
| Invalid | Malformed, impossible or future month | Fall back to current month | No invalid date or unrestricted request |
| Rollover | Calendar advances while mounted | Current mode advances; fixed historical selection does not | Timer cleanup on unmount |
| Currency | Foreign current wallet and historical transactions | Current wallet rates and dated reporting rates remain independent | Missing rates show unavailable only in affected panels |
| Scope | Switch own/linked user while history selected | Same month, new workspace and its rates only | Late old-workspace responses cannot populate current balances |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Dashboard.tsx` selects classic/visual and passes feature options to the shared model.
- `inex/ClientApp/src/pages/Dashboard/useDashboardData.ts` owns ranges, account/report queries, conversion and transaction navigation.
- `inex/ClientApp/src/pages/Dashboard/{VisualDashboard,IncomeDistribution,VisualAccountDistribution}.tsx` render the selected report period and current account composition.
- `inex/ClientApp/src/store/rates/rates-action.ts` owns authenticated on-demand range requests and linked cache-only behavior; its Redux range slot cannot safely hold two concurrent ranges.
- `inex/ClientApp/src/pages/Dashboard/visual-dashboard.css` owns visual-only responsive styling.
- `inex/ClientApp/public/locales/{en,ru}/translation.json` own user-visible copy.
- `inex/ClientApp/src/pages/Dashboard.test.tsx` and adjacent tests cover route behavior, scope, conversion and rendering.
- `inex/ClientApp/visual-qa/{visual-dashboard,dashboard}.mjs` provide isolated browser fixtures and evidence.

## Tasks & Acceptance

**Execution:**
- [x] Add URL-backed month selection and safe default/rollover behavior, enabled only for visual mode.
- [x] Add accessible responsive controls and localized current-balance/selected-period copy; adapt month-sensitive empty states and flow headings.
- [x] Isolate current-balance FX from selected historical reporting FX without competing writes to the singleton Redux range cache; preserve existing rate-loading behavior for classic/current mode.
- [x] Cover URL parsing, navigation, leap/year boundaries, rollover, own/linked scoping, current-balance FX isolation and missing/error states with focused tests.
- [x] Extend fixture browser QA for historical selection, picker, current reset, refresh/Back, Russian/mobile and financial values; verify classic preservation and inspect screenshots.
- [x] Complete frontend tests, build, lint and independent risk-appropriate review. PR and production merge are authorized delivery steps in the current chat.

**Acceptance Criteria:**
- Given the visual preference is enabled, when the user selects a past month, then every report panel and transaction drill-down uses that month while balances remain explicitly current.
- Given classic mode, when a URL contains a historical month, then the classic dashboard still uses its existing current-month behavior.
- Given missing historical rates, when history renders, then current balances remain usable and historical totals never appear partially complete.
- Given 1440px, 1024px, 390px or 360px including Russian, when controls and reports render, then there is no overlap, clipped text, horizontal overflow, blank chart or bottom-nav occlusion.

## Spec Change Log

- Guard nonpositive month-start timestamps because transaction serialization treats them as an absent date filter. Preserve current/history conversion separation and all existing normal-month behavior.

## Design Notes

The visual dashboard already separates account summary requests from transaction ranges. The remaining coupling is currency conversion: the shared Redux range slot currently supplies both. Keep current balance FX scoped independently when reporting a historical month, and retain dated conversion for category transactions and cash-flow buckets. No historical balance calculation is introduced. User approval of the proposed behavior and delivery is recorded in the current chat; no separate planning approval is needed.

## Verification

- Project doctor: PASS, 21 UI checks, zero failures/warnings.
- Focused dashboard/rates Vitest tests, followed by full frontend tests with bounded workers.
- `npm run build` and `npm run lint`.
- Visual and classic dashboard fixture harnesses; direct screenshot inspection. Page-specific QA only, so full-suite freshness verification is not applicable.
- Fresh PR CI and required review checks before merge; after production CI is triggered, report its URL/status without monitoring deployment completion.

### Implementation evidence — 2026-11-05

- Full frontend regression suite: 43 files / 353 tests passed. After adding the minimum timestamp guard, the affected Dashboard, month, balance-FX and rate suites passed again: 4 files / 96 tests.
- Final production build/typecheck and lint passed. Existing Vite CJS and vendor chunk-size advisories remain.
- Classic dashboard fixture QA: all 17 states passed.
- Visual dashboard fixture QA: all 87 states passed, including 12 new month states. Inspected history at 1440/1024, Russian history at 360 and the open picker at 360. No unhandled API requests, runtime errors, horizontal overflow, blank charts or bottom-nav occlusion.
- All browser requests are intercepted; no real backend or exchange-rate provider is called.
- Independent Blind Hunter, Edge Case Hunter and Acceptance Auditor reviews completed with no confirmed actionable findings. Two blind-review uncertainties were checked against existing code: balance metadata uses today's date, and the browser runner always returns its resolved route path.

## Suggested Review Order

- Start with the visual-only feature option at the route entry.
  [Dashboard.tsx:13](../../inex/ClientApp/src/pages/Dashboard.tsx#L13)
- Check strict URL month validation, safe date boundaries and calendar rollover.
  [useDashboardMonth.ts:6](../../inex/ClientApp/src/pages/Dashboard/useDashboardMonth.ts#L6)
- Follow report scope and independent balance conversion.
  [useDashboardData.ts:34](../../inex/ClientApp/src/pages/Dashboard/useDashboardData.ts#L34)
- Verify keyed current-balance requests reject obsolete workspace results.
  [useCurrentBalanceRates.ts:7](../../inex/ClientApp/src/pages/Dashboard/useCurrentBalanceRates.ts#L7)
- Inspect localized accessible controls and explicit current balances.
  [VisualDashboard.tsx:115](../../inex/ClientApp/src/pages/Dashboard/VisualDashboard.tsx#L115)
- Check URL navigation and scoped financial regressions.
  [useDashboardMonth.test.tsx:29](../../inex/ClientApp/src/pages/Dashboard/useDashboardMonth.test.tsx#L29)
  [Dashboard.test.tsx:235](../../inex/ClientApp/src/pages/Dashboard.test.tsx#L235)
- Review browser fixture assertions and captured month states.
  [visual-dashboard.mjs:14](../../inex/ClientApp/visual-qa/visual-dashboard.mjs#L14)
