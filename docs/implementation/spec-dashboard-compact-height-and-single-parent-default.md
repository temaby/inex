---
title: Compact dashboard height and automatic single-parent breakdown
type: bugfix
created: '2026-10-25'
status: done
---

## Behavior

The visual dashboard uses two desktop rows: spending and wallets above monthly flow and income distribution. This removes the tall stacked right column that stretched spending into a large blank panel. Page spacing, card padding, legend rows and chart diameters are compact and scoped to the visual presentation. Below 1101px the existing tablet and phone reading order remains spending, wallets, income, monthly flow. Cards retain natural height for expanded lists, long content and smaller viewports; financial content is never clipped to force a viewport fit.

Expense and income breakdowns independently inspect their active, non-system parent slices. If a flow has exactly one parent and it has non-system children, the initial presentation shows its existing child breakdown. Direct postings to the parent remain included, totals and transaction filters use the existing aggregation. A single leaf retains its summary; multiple parents retain the parent overview. Automatic selection is derived from loaded data rather than a mount-time side effect, so asynchronous loading and later data changes work.

Returning to parents is an explicit local override and is preserved through rerenders and refetches. Changing the category level, financial workspace or current month resets the initial selection. Automatic expansion does not focus a lower-page heading or scroll the dashboard; explicit drill-down retains focus management, Escape and return controls. Income uses the concise localized Parents label with the complete accessible return label. Classic dashboard presentation retains its previous category default.

## Validation

- Project doctor: PASS, all 21 UI checks, no warnings.
- Full frontend regression suite: PASS, 40 files / 295 tests with two workers.
- Focused dashboard, category aggregation and preference tests: PASS, 51 tests. Coverage includes independent expense/income defaults after asynchronous loading, direct parent transactions, leaves, explicit return, workspace reset, child mode, scoped transaction links and keyboard focus.
- Production build/typecheck and lint: PASS. Existing Vite CJS/chunk-size advisories remain.
- Visual dashboard browser harness: PASS, 32 fixture states; desktop 1440px, tablet 1024px, phones 390/360px, Russian and long amounts, hierarchy/Other interactions, empty/error/rate states and Settings persistence. Desktop, Russian linked workspace and mobile screenshots were visually inspected.
- Height assertions: document height equals viewport height for populated 1440x800 and 1440x900, automatically expanded single-parent 1440x800 and Russian linked/read-only single-parent 1440x900. No fixed-height clipping or inner scroll containers are used.
- Classic dashboard browser harness: PASS, all 17 states.

Evidence is under `docs/implementation/visual-qa/visual-dashboard/` and `dashboard/`. All browser data is fixture-only; API interception prevents backend and external rate-provider calls. The canonical verifier also requires the four new desktop height captures. The aggregate verifier still reports seven unrelated page summaries older than its 24-hour freshness limit; affected dashboard summaries pass. Windows browser-profile cleanup can emit a non-blocking temporary-directory warning after successful checks.
