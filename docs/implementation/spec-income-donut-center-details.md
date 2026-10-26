---
title: Show income category details in the donut center
type: bugfix
created: '2026-10-26'
status: done
baseline_commit: '8ab303f1ad21a2a2d119995c0233f07e57de266d'
context:
  - docs/project-context.md
  - docs/design/docs/design-implementation-guide.md
---

<frozen-after-approval reason="User requested the same approved expense interaction for income and authorized PR creation and production merge">

## Intent

**Problem:** Income still uses a floating tooltip over its total while the expense donut now shows details in its center.

**Approach:** Remove the income tooltip. Hovering an income segment or legend row, or focusing a legend row, shows its category name, amount and localized share of displayed income in the existing center. Restore the current income total when inspection ends. Mirror expense pointer/focus precedence and expanded Other member inspection.

## Boundaries & Constraints

**Always:** Retain income percentage formatting, including positive shares below 0.1%; preserve grouped slice amounts, user/account scope, drill-down, return focus, scoped navigation, error/loading/missing-rate behavior. Use existing Num and EN/RU i18n. Keep center geometry fixed during inspection and content inside the compact ring at desktop/mobile sizes. Single-category summary stays ringless and retains its existing actions. Touch actions remain available.

**Ask First:** Dependencies, calculations, API or navigation changes.

**Never:** Change expense interactions, classic dashboard, shared financial aggregation, backend or database. Never call external exchange-rate providers during QA.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Rest | Multiple income categories | Current total and existing localized label; no floating tooltip | Existing panel guards |
| Inspect | Segment/legend hover or legend focus | Category amount, name and formatted share; matching slice and row highlight | Unknown key falls back to total |
| Mixed input | Focused row then pointer inspects another | Pointer wins; pointer exit restores focused row | Blur clears only focus |
| Other | Expanded member inspection | Member amount/share and grouped segment highlight | Collapse clears unavailable member detail |
| Reset | Data/workspace/period/category view changes | No stale inspected category | Existing pending/error handling |
| Stress | RU long labels, large income, tiny share | Bounded text, stable center, accurate localized share | Existing tiny-share formatter |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Dashboard/IncomeDistribution.tsx`: chart, center and legend interactions.
- `inex/ClientApp/src/pages/Dashboard/visual-dashboard.css`: compact income center geometry and typography.
- `inex/ClientApp/public/locales/{en,ru}/translation.json`: localized income share.
- `inex/ClientApp/src/pages/Dashboard.test.tsx`: focused income regressions.
- `inex/ClientApp/visual-qa/{visual-dashboard,verify-summaries}.mjs`: browser evidence and canonical captures.

## Tasks & Acceptance

- [x] Update income inspection/rendering, remove Tooltip and preserve single summary/actions.
- [x] Localize income share; bound long center labels/amounts without shifting layout.
- [x] Test pointer/focus/reset, expanded Other and existing drill-down/navigation.
- [x] Capture actual hover/focus/restoration, grouped member, tiny share, RU and large income at 1440/1024/390/360; inspect screenshots before review.
- [x] Run build/lint/focused tests, review and prepare validated PR delivery to master.

**Acceptance Criteria:**

- Given an income donut, when a category is inspected, then its name, amount and formatted share replace the center total with no tooltip or overlap.
- Given focused income details, when pointer inspection ends, then the focused category returns; when focus also ends, then the total returns.
- Given expanded Other or parent/child categories, when controls are used, then detail inspection and existing scoped actions remain usable.
- Given the compact chart in EN/RU at supported widths, when labels or amounts are long, then the center remains stable and its text stays within the ring without page overflow.

## Spec Change Log

## Verification

UI doctor, focused Dashboard Vitest, frontend build/lint and visual-dashboard fixture harness. Inspect screenshots and record dataMode: fixture, no backend/provider access, automated outcomes and aggregate baseline freshness limits. Review before PR; verify head when merging and report production workflow status without waiting for deployment completion.

## Validation results

- UI doctor: all 21 checks passed, no warnings.
- Focused Dashboard Vitest: 61 tests passed, including new pointer/focus fallback, restored total, Other member amount/share/group highlight/navigation, tiny-share/data reset and unchanged single-category summary checks.
- Production build/typecheck and lint passed; existing Vite CJS and large-chunk advisories remain.
- Visual dashboard fixture harness passed 75 states, including 11 new income captures. Actual segment hover, legend/member focus, blur restoration, tiny positive income, RU labels and large positive income were exercised. Center geometry/child containment, page overflow and final-content bottom-nav clearance all passed. Existing expense, drill-down and classic captures passed. No backend or external provider calls.
- Inspected desktop hover, compact desktop long/RU label plus large amount, 360px RU/large-income, expanded Other and tiny-share screenshots. Long labels clamp to two lines with full names available in legend/accessible labels; large amounts wrap within the center.
- Aggregate verifier reports eight unrelated stale summary groups: Accounts, Auth, Budgets, Categories, Hero consistency, Profile, Reports, Transactions. Updated visual-dashboard and existing classic-dashboard summaries pass.

- Independent blind, edge-case and acceptance reviews returned no actionable findings.

## Suggested Review Order

- Follow independent pointer/focus state and grouped member resolution.
  [IncomeDistribution.tsx:21](../../inex/ClientApp/src/pages/Dashboard/IncomeDistribution.tsx#L21)
- Check fixed compact center styling and bounded labels/amounts.
  [visual-dashboard.css:133](../../inex/ClientApp/src/pages/Dashboard/visual-dashboard.css#L133)
- Inspect real-browser interactions and containment assertions.
  [visual-dashboard.mjs:168](../../inex/ClientApp/visual-qa/visual-dashboard.mjs#L168)
- Verify regression coverage for pointer/focus precedence, tiny shares and Other.
  [Dashboard.test.tsx](../../inex/ClientApp/src/pages/Dashboard.test.tsx)
