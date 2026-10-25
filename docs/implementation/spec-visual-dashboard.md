---
title: Alternative visual dashboard
type: feature
created: '2026-10-25'
status: done
baseline_commit: '567fef06f20cb68e481235faff02047dc87a76f5'
context:
  - docs/project-context.md
  - docs/design/docs/design-implementation-guide.md
---

## Intent and design summary

Add an optional, visualization-first dashboard while retaining the classic layout unchanged. The user's attached task is the active specification; implementation is authorized in the same task without a separate approval checkpoint.

The current React dashboard uses Recharts, RTK Query account/category/transaction reads, dated conversion helpers, and user/linked-workspace scope. Enabled overview-visible accounts (`isFavourite !== false`) determine all dashboard reads. Existing category aggregation excludes system categories, ranks small categories into Other, and supports parent/child navigation and transaction links. These rules remain shared and unchanged.

The new composition has three cards: a dominant expense donut and legend at roughly 60% desktop width, a quieter available-money card with three native-currency wallets and a proportional account bar, and a full-width monthly flow comparison. Mobile stacks in that reading order. The donut center shows the displayed expense total; drill-down changes that total and retains a clear parent breadcrumb. Legend buttons provide keyboard selection, amounts and percentages; category actions preserve existing drill-down/filter behavior. No income donut is added.

## Boundaries and tradeoffs

- No backend, database, dependency, financial calculation, account visibility, or API changes. Shared theme tokens, Num, buttons, i18n and Recharts remain authoritative.
- Extract the existing dashboard's data/state logic into `Dashboard/useDashboardData.ts`; preserve classic markup and CSS in `Dashboard/ClassicDashboard.tsx`. The route selects ClassicDashboard or VisualDashboard from one shared model so switching does not duplicate fetching or reset scope.
- Use a small `useDashboardVariant` hook with explicit `classic | visual` values at `inex.dashboard.variant.user-<authenticated-id>`, matching existing per-user local preferences. Default classic, strict validation, guarded storage access, immediate same-tab updates and storage-event synchronization. Do not scope to a viewed linked user.
- Settings exposes an immediate localized switch, independent of server profile Save. Storage unavailable/corrupt at read time falls back to classic; a write failure leaves the chosen variant usable for the mounted session.
- Account shares use the existing account balance conversion helper and reporting currency. Hide the bar when conversions are incomplete, total is zero, or balances are negative; explain the limitation while preserving native balances. Explicitly hidden wallets are never a fallback. Empty selections link to Accounts.
- Preserve loading, errors, missing-rate retry, linked workspace notice, category hierarchy and current-month rollover. Both views retain the existing current-month scope and rollover; show its period label in the visual header. A new historical month selector would require separating current-balance FX from historical flow FX and is outside this presentation-only change. Classic retains its original header.
- Use a local harmonious category palette, rounded cards, restrained tinted accents and reduced-motion support. Do not modify global tokens or classic styling.

## Code map and execution

- [x] `inex/ClientApp/src/pages/Dashboard.tsx` and `Dashboard/{ClassicDashboard,useDashboardData}.tsx` — isolate presentation and retain shared calculations and scope.
- [x] `inex/ClientApp/src/pages/Dashboard/{VisualDashboard.tsx,visual-dashboard.css}` — implement three sections and responsive/accessible interactions.
- [x] `inex/ClientApp/src/pages/Dashboard/dashboard-variant.ts`, `Profile.tsx`, `Profile.css` — add user-scoped local preference and Settings switch.
- [x] `inex/ClientApp/public/locales/{en,ru}/translation.json` — localize all new labels, outcomes, hints and accessibility text.
- [x] Focused dashboard/preference/profile tests — cover switching, persistence, scope, values, states, proportional bars, monthly outcomes and category navigation.
- [x] `inex/ClientApp/visual-qa/visual-dashboard.mjs` and QA evidence — capture desktop/tablet/mobile, Russian, drill-down, empty, missing rates, negative and positive wallet states; rerun classic harness to check preservation.

## Acceptance

- Given missing, invalid or inaccessible local storage, when Dashboard opens, then classic renders unchanged.
- Given an authenticated user changes the Settings switch, when Dashboard renders or storage is reread, then it immediately uses that user's saved choice without financial mutations.
- Given populated data, when visual mode renders, then exactly three primary cards show the same balance, income, expenses and category values as classic.
- Given income exceeds expenses, expenses exceed income, or they match, when flow renders, then bars share one scale and the localized result uses those displayed values, including zero.
- Given a parent, child, Other, single category or empty expense set, when the chart/legend is used, then percentages, amounts, highlights, drill-down, focus and existing transaction navigation remain usable.
- Given incomplete rates or failed reads, when affected cards render, then no partial financial aggregate is presented as complete and unaffected cards remain usable.
- Given 1440px, 1024px, 390px and 360px layouts including Russian, when charts and controls render, then there is no horizontal overflow, clipped text, blank chart or bottom-navigation occlusion.

## Verification

Project doctor: PASS, 20 UI checks, no warnings. Use fixture-only browser interception; no real backend or external provider calls.

Run focused Vitest tests, frontend build/typecheck and lint, classic and visual dashboard fixture harnesses, then visual summary verification. Inspect generated screenshots before review and record data mode, results and known limitations here.

### Implementation evidence — 2026-10-25

- `npm test`: PASS, 40 files / 285 tests after all review fixes. New coverage includes strict default/storage validation, same-tab updates, remount persistence, user changes, blocked storage, Settings without server Save, both route variants, native/converted amounts, positive/negative/equal/zero results, fractional rounding, category drill-down, keyboard highlighting, empty scope, and pending/error transitions.
- `npm run build` and `npm run lint`: PASS. Existing Vite CJS API and vendor chunk-size advisories remain.
- `npm run visual-qa:visual-dashboard`: PASS, 22 fixture states; no backend/provider calls, unhandled API requests, horizontal overflow, blank charts or final-content bottom-nav occlusion. Registered in the aggregate runner and canonical summary verification.
- `npm run visual-qa:dashboard`: PASS, all 17 classic fixture states. Classic CSS and panel markup remain unchanged.
- `npm run visual-qa:profile`: PASS, all 8 Settings fixture states with the additional preference card.
- Inspected populated 1440/1024/390/360 screenshots, Russian and long-amount states, missing rates, account failure, negative wallet beyond the preview, and the Settings switch. Evidence is under `visual-qa/{visual-dashboard,dashboard,profile}/` relative to this document.
- `npm run visual-qa:verify`: FAIL only on freshness of seven unrelated summaries (Accounts, Auth, Budgets, Categories, Hero consistency, Reports, Transactions). The three changed-area summaries pass; unrelated baselines were not regenerated.

### Independent review

Blind, edge-case and acceptance reviewers completed. All actionable findings were patched: unknown account scope stays pending rather than presenting complete zero totals; empty-scope flow controls cannot create unrestricted transaction filters; negative-wallet warnings link to complete account details; an in-flight balance scope transition cannot appear as an inferred failure. Added focused regressions and repeated validation. Acceptance and blind reviewers confirmed their findings closed; no outstanding review finding remains.

### Limits and workflow follow-up

Both variants retain current-month reporting. Explicitly hidden accounts stay excluded even when that leaves no selected wallets. Account-share bars are omitted for negative/zero/incomplete balances. User preferences remain browser-local, and clearing browser storage restores classic.

Proposed durable QA improvement: keep shared reviewer handoffs in a workspace-owned temporary directory because Windows sandbox Temp directories differ between tool processes. The new harness logs each state to make stalled capture diagnosis practical. Browser launch required process escalation; Chrome profile cleanup emitted non-blocking temporary-file warnings. One capture stalled while sources were being edited and passed after restarting against settled sources.

## Suggested Review Order

- Start at the variant route; both presentations share one financial model.
  [Dashboard.tsx:10](../../inex/ClientApp/src/pages/Dashboard.tsx#L10)
- Verify existing scope, rates, aggregation and navigation were extracted without financial changes.
  [useDashboardData.ts:14](../../inex/ClientApp/src/pages/Dashboard/useDashboardData.ts#L14)
- Inspect three-card composition, incomplete-state guards, keyboard controls and proportional bars.
  [VisualDashboard.tsx:17](../../inex/ClientApp/src/pages/Dashboard/VisualDashboard.tsx#L17)
- Check per-user persistence and the immediate Settings switch.
  [dashboard-variant.ts:20](../../inex/ClientApp/src/pages/Dashboard/dashboard-variant.ts#L20)
  [Profile.tsx:460](../../inex/ClientApp/src/pages/Profile.tsx#L460)
- Review behavioral regressions and fixture isolation.
  [Dashboard.test.tsx](../../inex/ClientApp/src/pages/Dashboard.test.tsx)
  [visual-dashboard.mjs](../../inex/ClientApp/visual-qa/visual-dashboard.mjs)
