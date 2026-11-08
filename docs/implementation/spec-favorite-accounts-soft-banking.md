---
title: Soft Banking favorite accounts sidebar
type: feature
created: '2026-11-08'
status: done
baseline_commit: ed808e755131d30502e76750d29b0938dbaf6943
context:
  - docs/project-context.md
  - docs/design/docs/design-implementation-guide.md
---

<frozen-after-approval reason="User supplied detailed visual requirements and explicitly authorized implementation and validation without stopping at a plan">

## Intent

**Problem:** The Transactions favorite account list resembles an accounting table and lacks the soft hierarchy of the Visual Dashboard.

**Approach:** Polish the existing widget with a compact count badge, softly rounded interactive rows, persistent mint selection, restrained money typography, and a stacked mint total. Reuse the component, shared money formatter, design tokens, and existing controls.

## Boundaries & Constraints

**Always:** Preserve every account visibility rule, deterministic order, canonical multi-account filter, external filter synchronization, current transaction query parameters, reporting currency, total calculation, native amount precision and negative signage. Retain natural list height from the accepted follow-up, existing rail/inline/drawer presentations, collapse, pin persistence, navigation, loading, error and conversion states. Keep semantic buttons and links, complete accessible names, pressed states and visible keyboard focus. All visible copy and accessible count labels remain localized in EN/RU.

**Ask First:** Changes to backend, filtering, financial calculations, dependencies or sidebar functionality.

**Never:** Add analytics, charts, decorative icons, per-account color markers, new selection state, custom currency formatting or unrelated dashboard changes. Do not truncate balances, force every row to stack, introduce horizontal scrolling or use live exchange providers during QA.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Header | EN/RU title and favorite count | Small neutral numeric badge beside title; localized full account-count accessible label; actions vertically aligned | Existing collapse/menu behavior |
| Rows | Ordinary and long names, large UZS amount | Ordinary rows stay on one line where they fit; constrained content wraps cleanly with all digits visible | No overlap or horizontal scroll |
| Selection | Hovered, selected and keyboard-focused accounts | Light hover, stronger mint selection with teal edge and existing check; visible focus independent of selection | Existing controlled callback |
| Money | Positive, zero and negative native balances | Medium tabular amounts, muted zero, neutral negatives; unchanged precision/currency | Existing unavailable conversion/retry |
| Summary | Eligible favorite conversion | Label above prominent amount in compact approximately 70–80px rounded mint area | Loading/unavailable content wraps naturally |
| Responsive | Rail 280–320px, inline/mobile and drawer | Stable page layout, comfortable touch targets, natural height and accessible menu | Existing page/drawer scrolling |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Transactions/AccountBalancesCompanion.tsx` — existing widget and shared Num calls.
- `inex/ClientApp/src/pages/Transactions/transactions-ledger.css` — scoped widget styles and breakpoints.
- `inex/ClientApp/src/styles/tokens.css` — existing mint, neutral, typography, spacing and motion tokens, reused unchanged.
- `inex/ClientApp/src/pages/Dashboard/visual-dashboard.css` — visual reference only, unchanged.
- `inex/ClientApp/src/pages/Transactions/AccountBalancesCompanion.test.tsx` — existing behavior/locale coverage.
- `inex/ClientApp/visual-qa/transactions.mjs` — isolated fixture states and geometry checks.
- `docs/design/docs/visual-qa-checklist.md` — refreshed evidence record.

## Tasks & Acceptance

**Execution:**
- [x] Widget and scoped CSS — compact badge, soft rows and distinct selection, restrained typography, stacked total, secondary footer and reduced motion.
- [x] Existing component regressions — adapt count queries to the accessible numeric badge; verify native amounts, keyboard, menu and controlled selection.
- [x] Fixture harness — add representative nine-account EN/RU and hover/focus states plus geometry assertions; refresh relevant evidence.
- [x] Validate — run focused component/page tests, build/typecheck and lint; inspect screenshots and record QA before independent review.

**Acceptance Criteria:**
- Given a selected favorite and other active filters, when its row is activated, then the same callback and canonical selection behavior are preserved and a persistent mint/check/accent treatment follows the controlled state.
- Given a normal account row, when sufficient space exists, then its name and full native balance share a line; given long content, when space is constrained, then they wrap without overlap, clipping or page overflow.
- Given the same favorite balances and reporting currency, when the widget is restyled, then the same total appears below its label without changing calculation inputs.
- Given supported viewports and EN/RU, when navigating by keyboard or using the menu, then focus remains visible and the existing pin/collapse/navigation actions remain usable.

## Spec Change Log

## Verification

- `npm test -- --run src/pages/Transactions/AccountBalancesCompanion.test.tsx src/pages/Transactions.month-controls.test.tsx` — behavior and locale regressions pass.
- `npm run build` — TypeScript and production bundle pass.
- `npm run lint` — no lint errors.
- `$env:INEX_VISUAL_QA_STATE_FILTER='account-overview'; npm run visual-qa:transactions` — isolated fixture states pass at 1440/1024/390/360px; inspect compact, selected, hover/focus, long-amount and Russian screenshots.

## Verification Results

- UI doctor: PASS, 22 checks, zero warnings/failures.
- Build/typecheck and lint: PASS. Existing Vite CJS and vendor chunk-size warnings remain.
- Focused tests: PASS, 52 tests across the companion (14), Transactions month/filter integration (20), and financial balance utilities (18).
- Fixture browser QA: PASS, 31 states, zero failures/unhandled API requests. All calls intercepted; no backend or exchange-rate provider called. Nine-account totals measure 76px at every tested width and language. All 17 stress favorites remain present without internal list scrolling.
- Inspected nine-account desktop, narrow Russian, selected, hover, viewport keyboard focus and Russian stress drawer screenshots. Natural layout, ordinary single-line rows, complete large balances, neutral negatives, muted zeros and all existing actions remain usable.
- Independent blind, edge-case and acceptance reviews: no introduced product defects. Acceptance identified a focus-evidence problem in cropped capture; switching the keyboard screenshot to viewport capture closes it. Hover is asserted before screenshot capture can disturb the pointer state.
- Updated [visual QA checklist](../design/docs/visual-qa-checklist.md). Detailed evidence: [QA summary](visual-qa/favorite-accounts-sidebar/qa-summary.json).

## Tooling Follow-up

Proposed durable documentation improvement: specify viewport capture for keyboard-focus evidence in the shared visual QA guide. Cropped CDP capture can move hover/focus during capture, producing misleading post-capture assertions. The feature harness now tests hover before capture and captures keyboard focus in viewport mode. Browser process startup used the documented sandbox escalation; temporary-profile cleanup warnings did not invalidate results.

## Suggested Review Order

- Start with the compact badge and unchanged component handlers.
  [AccountBalancesCompanion.tsx:56](../../inex/ClientApp/src/pages/Transactions/AccountBalancesCompanion.tsx#L56)
- Inspect the stacked mint summary and restrained hierarchy.
  [transactions-ledger.css:182](../../inex/ClientApp/src/pages/Transactions/transactions-ledger.css#L182)
- Check flexible rows, persistent accent, focus and reduced motion.
  [transactions-ledger.css:222](../../inex/ClientApp/src/pages/Transactions/transactions-ledger.css#L222)
- Check controlled selection, native currencies and localized count regressions.
  [AccountBalancesCompanion.test.tsx:57](../../inex/ClientApp/src/pages/Transactions/AccountBalancesCompanion.test.tsx#L57)
- Compare captured interaction and responsive states.
  [QA summary](visual-qa/favorite-accounts-sidebar/qa-summary.json)

