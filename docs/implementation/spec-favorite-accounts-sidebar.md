---
title: Favorite accounts sidebar on Transactions
type: feature
created: '2026-11-07'
status: done
baseline_commit: dfb666eb8f61a342ff593bb61877e687ccd35d78
context:
  - docs/project-context.md
  - docs/design/docs/design-implementation-guide.md
---

<frozen-after-approval reason="User supplied implementation scope and authorized execution without a separate approval checkpoint">

## Intent

**Problem:** The Transactions account overview is a passive accounting list with prominent pin controls. Users need a compact overview of favorite balances that also provides quick access to existing account filters.

**Approach:** Restyle the existing companion as a secondary mint-accented utility widget and connect semantic account buttons directly to the canonical Transactions account selection. Reuse favorites, scoped account queries, balance summaries, conversion utilities, formatting, and pin persistence.

## Boundaries & Constraints

**Always:** Show every explicitly favorite, enabled account returned by the current authorized owner scope; preserve deterministic reference-data order. Keep balance collection and current-balance conversion independent of transaction filters. Preserve the multi-account selection model, native currencies, reporting currency, unavailable-rate states, and non-favorite standard filter options. Localize all visible copy in EN/RU and expose keyboard selection, focus, and pressed states.

**Ask First:** Expansion into backend endpoints, schema, favorite management, or currency conversion algorithm changes.

**Never:** Add dependencies, arbitrary account limits, charts, usage-based favorites, separate selection state, new navigation routes, or unrelated page redesigns. Do not disclose restricted accounts or use live provider calls in verification.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Favorites | Enabled true favorites plus inactive/non-favorite records | Only eligible favorites in existing order; all remain visible under transaction filtering | Empty state links to Accounts without exposing unavailable names |
| Selection | Existing account IDs plus other active filters | Clicking adds/removes only the clicked ID; canonical URL/Redux state drives pressed state | Existing transaction request and filter error behavior |
| External filters | Standard filter, chips, navigation, non-favorite IDs | Sidebar reflects selected favorites without adding non-favorites | Existing owner switch clears owner-specific IDs |
| Balances | Native zero, positive, negative and mixed currencies | Original currencies without positive signs; neutral negative balances; complete converted favorites total | Missing rates show explicit unavailable conversion, never a partial sum |
| Period change | Historical/date/category/type/tag filter | Favorite list, balances and total stay unchanged | Current balance rate request stays independently scoped |
| Layout | Many favorites, long names, large amounts | Bounded scrolling list, persistent heading/summary, wrapping rows without clipped amounts | Loading and retry stay inside widget |
| Pinning | Drawer, desktop rail, narrow inline panel | Existing persistence and responsive presentation preserved; compact menu contains existing action | Storage failure keeps in-memory behavior |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Transactions.tsx` — canonical URL filter, owner scope, favorite IDs, balance queries, pin persistence.
- `inex/ClientApp/src/pages/Transactions/AccountBalancesCompanion.tsx` — existing rail/inline/drawer widget.
- `inex/ClientApp/src/pages/Transactions/transactions-ledger.css` — scoped widget layout and responsive styles.
- `inex/ClientApp/src/pages/Dashboard/useCurrentBalanceRates.ts` — existing independently scoped current-month rate hook.
- `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts` — existing native balance conversion, unchanged.
- `inex/ClientApp/public/locales/{en,ru}/translation.json` — localized widget labels and account pluralization.
- `inex/ClientApp/visual-qa/transactions.mjs` — fixture-only visual and interaction evidence.

## Tasks & Acceptance

**Execution:**
- [x] Companion, stylesheet and locales — implement compact header/menu, accessible controlled account buttons, neutral money, summary, footer, bounded scrolling and empty/loading/error states.
- [x] Transactions page — require explicit favorites, retain deterministic order, toggle canonical multi-account IDs, and reuse independent current balance rates.
- [x] Focused component/page tests — cover eligibility, owner scope, external selection, preserved filters, native/converted balances and pin behavior.
- [x] Fixture visual QA — capture relevant 1440/1024/390/360 EN/RU states and inspect screenshots; record results in QA checklist.
- [x] Build, lint, focused regression tests and review — fix introduced issues and report verification.

**Acceptance Criteria:**
- Given a favorite account, when activated by mouse or keyboard, then its membership in the existing account filter toggles while other fields and selected IDs remain.
- Given standard filter changes, when the widget rerenders, then pressed rows match canonical IDs and the full eligible favorite list remains.
- Given mixed currencies or historical transaction filters, when the widget renders, then native balances and complete current-balance conversion preserve existing financial rules independently of the ledger period.
- Given narrow viewports or long content, when the panel is opened or pinned, then controls and balances stay readable with no page overflow and a visible focus indicator.

## Spec Change Log

## Design Notes

Use the Dashboard's existing independently scoped current-balance rate hook with the actual current month. This avoids ledger date changes replacing the rates used by the favorites total without changing the conversion algorithm. Clicking uses additive membership toggling because the standard filter is a multi-select. Keep current drawer/rail/inline presentation and browser-local pin key.

## Verification

- `npm test -- --run <focused files>` — component, page, filter and conversion regressions pass with mocked rates.
- `npm run build` — TypeScript and Vite production build pass.
- `npm run lint` — frontend lint passes.
- Focused fixture QA and screenshot inspection — EN/RU states at required breakpoints, no backend leakage, overflow or clipped money.


## Verification Results

- Project doctor UI: PASS, 21 checks, zero failures/warnings.
- Six focused Vitest files: PASS, 65 tests. Covers explicit favorites and missing flags, >5 favorites, order, empty/linked scope, additive selection for income/expense/transfers/internal transfers/corrections, preserved filters, external URL synchronization, current FX independence, native zero/negative balances, loading/error/retry, menu keyboard behavior and Russian pluralization.
- `npm run build`: PASS, including TypeScript. Existing Vite CJS and large vendor chunk warnings remain.
- `npm run lint`: PASS.
- Fixture browser QA: PASS, 21 states at 1440/1024/390/360px, including Russian long names/large UZS amounts, 17 favorites with bounded scrolling, current total under selection, pinning, all recovery states and physical Escape from the menu. All API calls intercepted; no real backend or exchange provider called.
- Screenshots and structured checks: `visual-qa/favorite-accounts-sidebar/qa-summary.json`. Inspected desktop, tablet, narrow selected, Russian pinned and Russian drawer stress screenshots.
- Aggregate `npm run visual-qa:verify`: FAIL because all ten canonical page summaries exceed its 24-hour freshness limit. The fresh feature-specific summary has zero failures and no unhandled API requests. Untouched canonical baselines were not refreshed.
- Three independent review layers completed. One introduced keyboard issue was fixed: menu Escape no longer bubbles into its containing drawer. Component regression and real-browser fixture pass; reviewer confirmed closure. Fresh transaction-summary currency takes precedence over a stale linked-account selector snapshot. No remaining actionable review findings.

## Session Retrospective

Audit: time loss came from browser sandbox startup and the default QA port; the existing doctor and documented alternate-port workflow resolved them. The feature stayed within frontend scope. The committed CDP harness was sufficient and isolated all APIs. Verification began with the doctor, used mocked unit requests and fixture screenshots, and preceded review. No DB inspection, backend startup, GitHub writes or provider calls were needed. Existing agent rules were sufficient; no AGENTS changes are proposed.

### Validate fresh feature evidence independently

Finding: The aggregate visual verifier excludes feature-specific summaries and fails on unrelated stale canonical baselines.
Evidence: This task produced 21 passing feature states, while the aggregate command rejected ten untouched stale page summaries. The previous quick-entry and autocomplete QA records document the same mismatch.
Durable fix: Add an explicit summary or area option that retains freshness, screenshot and failure checks for selected evidence, while preserving the default full-suite behavior.
Recommended artifact: `script`
Priority: `medium`
Exact follow-up prompt:
```text
Add a scoped verification option to inex/ClientApp/visual-qa/verify-summaries.mjs for a selected feature QA summary. Preserve default canonical-suite validation and all freshness, screenshot existence, fixture isolation and failure checks. Cover invalid selections and stale/failing evidence; document invocation in the visual QA guide. Do not regenerate unrelated screenshots or change production UI.
```

One-off notes:
- Browser process escalation and an alternate available port resolved local runtime restrictions; these are environment actions, not product defects.
- The Russian fixture auth response needed the same locale as its browser initialization; the scenario now supplies it consistently.

Safety check:
- Local environment fixes separated from repo changes: yes.
- No local absolute paths, localhost URLs, credentials or secrets included in this record: yes.
- Every durable fix is tied to repeated or likely-recurring evidence: yes.

## Suggested Review Order

- Start with eligible favorite scope and deterministic summary order.
  [Transactions.tsx:154](../../inex/ClientApp/src/pages/Transactions.tsx#L154)

- Check current balance FX isolation and scoped reporting currency retention.
  [Transactions.tsx:231](../../inex/ClientApp/src/pages/Transactions.tsx#L231)

- Verify additive membership updates use the canonical transaction filter.
  [Transactions.tsx:326](../../inex/ClientApp/src/pages/Transactions.tsx#L326)

- Inspect compact actions and Escape handling within the existing drawer.
  [AccountBalancesCompanion.tsx:53](../../inex/ClientApp/src/pages/Transactions/AccountBalancesCompanion.tsx#L53)

- Inspect controlled account buttons, native amounts and converted summary.
  [AccountBalancesCompanion.tsx:137](../../inex/ClientApp/src/pages/Transactions/AccountBalancesCompanion.tsx#L137)

- Review bounded list scrolling, wrapping amounts and selection styling.
  [transactions-ledger.css:202](../../inex/ClientApp/src/pages/Transactions/transactions-ledger.css#L202)

- Check page integration regressions and preserved transaction filters.
  [Transactions.month-controls.test.tsx:438](../../inex/ClientApp/src/pages/Transactions.month-controls.test.tsx#L438)

- Check localized keyboard, amount and recovery component regressions.
  [AccountBalancesCompanion.test.tsx:57](../../inex/ClientApp/src/pages/Transactions/AccountBalancesCompanion.test.tsx#L57)
