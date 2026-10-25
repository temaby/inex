---
title: Improve Visual Dashboard account distribution and favorites
type: feature
created: '2026-10-25'
status: done
baseline_commit: 25da16d5142eefac6d50bb7ef9c57888e274bdb4
context: []
---

<frozen-after-approval reason="user authorized direct implementation and production merge">

## Intent

**Problem:** The Visual Dashboard shows only three balances with no reliable connection to account segments. Its shared balance scope currently excludes non-favorites, preventing the requested non-favorite selection and no-favorites distribution.

**Approach:** Show up to five explicitly favorite accounts separately from an interactive distribution of all eligible active account balances. Preserve the existing conversion functions, net-total arithmetic, authenticated own/linked scope, and Classic Dashboard behavior. The new Visual-only balance scope supersedes the favorite-only Visual balance scope in the completed dashboard report spec; that historical record remains unchanged.

## Boundaries & Constraints

**Always:** Respect enabled-account and selected workspace scope; get favorite flags from account metadata; require an explicit true flag. Reuse native monetary formatting and EN/RU translations. Keep favorites stable under chart interactions. Derive colors from account IDs. Use the same positive converted denominator for widths and percentages; include debt in net total but never turn it into positive chart shares. Keep incomplete-rate/loading/error protections. Make segments accessible with mouse, touch and keyboard. Clear stale selected details on account removal or workspace changes.

**Ask First:** Backend/schema/persistence changes, dependency additions, unrelated redesign.

**Never:** Change Classic Dashboard behavior, favorite configuration, exchange-rate providers, or financial conversion algorithms. Do not call real providers in validation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Favorite counts | Zero to more than five eligible favorites | Show zero to five; no fallback non-favorites; balance-descending converted order, ID tie-break | Missing rates retain native list with deterministic ID fallback |
| Distribution | Eligible favorites and non-favorites | All positive converted balances contribute, independently of list cap | Loading or incomplete data hides chart |
| Debt/zero | Mixed, zero-only or debt-only balances | Net total includes debt; positive chart excludes debt/zero; explain positive scope | No chart with zero positive denominator |
| Select | Hover/focus/click/tap any segment | Name, native amount, converted amount, percentage and stable swatch; persistent selection with clear action | Escape clears; stale scope cannot display old account |
| Empty favorites | Active non-favorite accounts | Preserve total/bar; explain favorites and link to account management | Do not infer new favorites |
| Linked view | Another authorized workspace | Query IDs and values remain scoped; preserve read-only behavior | Do not retain prior selection |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Dashboard.tsx` and `Dashboard/useDashboardData.ts` — explicit Visual-only balance scope option; Classic default remains unchanged.
- `inex/ClientApp/src/pages/Dashboard/VisualDashboard.tsx` — existing money card integration.
- `inex/ClientApp/src/pages/Dashboard/VisualAccountDistribution.tsx` — cohesive chart/details/favorites presentation.
- `inex/ClientApp/src/pages/Dashboard/visual-dashboard.css` — compact card and responsive interactions.
- `inex/ClientApp/public/locales/{en,ru}/translation.json` — user-visible wording.
- `inex/ClientApp/src/pages/Dashboard.test.tsx` — existing component and scope regression coverage.
- `inex/ClientApp/visual-qa/visual-dashboard.mjs` — intercepted fixture screenshots and assertions.

## Tasks & Acceptance

**Execution:**
- [x] `Dashboard.tsx`, `Dashboard/useDashboardData.ts` — pass an explicit all-active balance option for Visual only.
- [x] `Dashboard/VisualAccountDistribution.tsx`, `VisualDashboard.tsx` — interactive positive distribution and separate five-favorite list; retain monetary data rules.
- [x] `Dashboard/visual-dashboard.css`, locale JSON files — stable swatches, readable compact details, responsive EN/RU copy.
- [x] `Dashboard.test.tsx`, focused component tests — cover counts, strict favorites, visibility, all-account distribution, interactions, stale selection, conversion and debt.
- [x] `visual-qa/visual-dashboard.mjs`, visual evidence — update obsolete scope expectations and capture interactions, empty favorites, debt and responsive states.

**Acceptance Criteria:**
- Given Classic mode, when rendering balances, then its favorite-only scope and presentation remain unchanged.
- Given Visual mode in an own or linked workspace, when changing favorites, then eligible active balances still determine the net total and positive distribution.
- Given more than five favorites, when selecting any non-favorite segment, then exactly the same five favorites remain visible and separate selected details identify that account.
- Given a translated narrow viewport, when viewing five favorites or selected details, then controls and amounts remain readable without horizontal overflow or bottom-nav occlusion.

## Spec Change Log

Review patches: enabled focus-only tooltips, restored picker focus on clear/Escape, and retained the selected account through transient balance refreshes. Scope and financial behavior are unchanged. Three independent reviews found no remaining demonstrated defect; optional palette collision avoidance was rejected as out of scope because identity is also conveyed by account names.

## Design Notes

No persisted favorite order exists. Sort by converted balance when all required conversions are available, otherwise ID; always use an ID tie-break. Positive distribution uses the sum of strictly positive converted balances, independent of a net total that may include debt. Tooltip and persistent details share the same data. Scoped account summary queries are extended only for the Visual variant.

## Verification

- `npm test -- --maxWorkers=2` — full frontend regression suite.
- `npm run build` — TypeScript and production bundle succeed.
- `npm run lint` — no lint errors.
- `npm run visual-qa:visual-dashboard` — fixture-only browser checks and screenshots at 1440, 1024, 390 and 360 pixels, plus selected/empty/negative states.
- `npm run visual-qa:dashboard` — unchanged Classic fixture checks.
- Inspect generated screenshots; review changes; create PR into `master` and merge as explicitly requested. Report deployment run URL/status after trigger without polling for completion.

## Verification Results

- Project doctor UI readiness: PASS. GitHub CLI authentication was unavailable; connected GitHub tools work for repository and PR operations.
- Full frontend regression suite: 41 files, 321 tests passed. Following review patches, all 54 Dashboard tests passed, including focus-only tooltips, clear/Escape focus restoration and selection retention during refresh.
- Production build/TypeScript and lint: PASS after review patches.
- Classic browser fixtures: 17 states passed. Visual fixtures: 55 states passed across 1440/1024/390/360px, EN/RU, own/linked workspaces, favorite counts, native/converted money, debt/zero, tiny segments, selection, hover/focus and empty favorites. Screenshot inspection confirms compact 1440×800 presentation and readable narrow mobile details.
- Canonical visual verifier reports only seven unrelated summaries older than 24 hours; affected Dashboard summaries pass. The browser runner requires sandbox escalation for local CDP connectivity and emits a non-blocking Windows temporary-profile cleanup warning.

## Suggested Review Order

**Scope and financial presentation**

- Enable all-active balances only for the Visual variant.
  [Dashboard.tsx:13](../../inex/ClientApp/src/pages/Dashboard.tsx#L13)
- Preserve Classic defaults and existing conversion inputs.
  [useDashboardData.ts:75](../../inex/ClientApp/src/pages/Dashboard/useDashboardData.ts#L75)
- Separate strict favorites from the positive-balance denominator.
  [VisualAccountDistribution.tsx:29](../../inex/ClientApp/src/pages/Dashboard/VisualAccountDistribution.tsx#L29)

**Interaction and validation**

- Present persistent selection, focusable tooltips and compact native favorites.
  [VisualAccountDistribution.tsx:47](../../inex/ClientApp/src/pages/Dashboard/VisualAccountDistribution.tsx#L47)
- Verify selection never changes favorites and survives transient refreshes.
  [Dashboard.test.tsx:719](../../inex/ClientApp/src/pages/Dashboard.test.tsx#L719)
- Reproduce responsive and financial states with isolated API fixtures.
  [visual-dashboard.mjs:10](../../inex/ClientApp/visual-qa/visual-dashboard.mjs#L10)
