---
title: Show expense category details in the donut center
type: bugfix
created: '2026-10-26'
status: done
baseline_commit: 'b14ce17701bd0d4a9c2cae7a6359ff991e6bda1d'
context:
  - docs/project-context.md
  - docs/design/docs/design-implementation-guide.md
---

<frozen-after-approval reason="User approved the proposed center-detail interaction and authorized PR creation and production merge">

## Intent

**Problem:** The expense donut tooltip overlaps the monthly total. The same category detail can use the existing center without a floating overlay.

**Approach:** At rest show the current expense total and its existing localized label. Hovering a segment or legend row, or focusing a legend row, replaces the center with that category's label, amount and share of displayed expenses. Restore the total when the interaction ends. Preserve matching chart/legend highlighting and existing category actions.

## Boundaries & Constraints

**Always:** Preserve financial values, user scope, existing drill-down and transaction navigation, missing-rate and loading handling. Use shared Num and EN/RU i18n, fixed center geometry, responsive wrapping and accessible legend buttons. Keep touch category actions operational; touch focus can expose the same details before any existing navigation occurs.

**Ask First:** New dependencies, changes to financial calculations or navigation behavior.

**Never:** Change the classic dashboard, income chart, backend, API or database. Do not add provider calls or production-data QA.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Rest | Populated expense slices | Existing total label and total; no floating expense tooltip | Existing panel errors retained |
| Inspect | Hover segment/legend, keyboard focus | Category name, amount, localized share; matching highlight | Unknown key falls back to total |
| Exit | Pointer leaves, focus leaves | Restore total unless another active pointer/focus target remains | No stale category after data changes |
| Navigation | Click, Enter or tap category | Existing drill-down, Other expansion or scoped transaction route | Existing behavior retained |
| Stress | Single category, Other, child view, long RU label/amount | Accurate share, no overlap or page overflow | Zero-total share guarded |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Dashboard/VisualDashboard.tsx` — expense chart, highlighting and center.
- `inex/ClientApp/src/pages/Dashboard/visual-dashboard.css` — scoped expense center geometry.
- `inex/ClientApp/public/locales/{en,ru}/translation.json` — category share copy.
- `inex/ClientApp/src/pages/Dashboard.test.tsx` — mocked dashboard interaction coverage.
- `inex/ClientApp/visual-qa/visual-dashboard.mjs` — isolated browser QA and screenshots.

## Tasks & Acceptance

- [x] Update expense interaction/center rendering and remove its Tooltip.
- [x] Reserve bounded center space and localize the share text.
- [x] Cover hover/focus reset, mixed focus/pointer interaction, scope reset and existing category actions.
- [x] Extend browser fixture QA for actual segment hover, legend focus, restoration and Russian/mobile stress; inspect screenshots before review.
- [x] Run frontend tests, build and lint, review changes, and prepare delivery to master through a PR.

**Acceptance Criteria:**

- Given the populated visual dashboard, when inspecting any expense category, then its center shows the matching label, amount and share with no overlay.
- Given an active legend focus and temporary pointer inspection, when the pointer leaves, then keyboard focus still determines the detail.
- Given a category drill-down, Other expansion or transaction navigation, when activated by existing controls, then its previous behavior remains available.
- Given EN/RU at 1440, 1024, 390 and 360 widths, when details change, then center geometry remains stable and text stays inside the donut without page overflow.

## Spec Change Log

- Review identified missing inspection on expanded Other members. Resolve member details while highlighting their containing slice; preserve member navigation and focused-row fallback.
- Review identified that prior long-amounts fixtures enlarged balances only. Scale actual expense transactions and assert all center children stay within its bounds.

## Verification

Run focused Dashboard Vitest tests, frontend build/lint and the visual-dashboard fixture harness. Inspect generated screenshots, record fixture mode and actual outcomes. Verify PR head before merging and report the production workflow URL/status without waiting for deployment completion.

## Validation results

- Full frontend suite passed 41 files / 324 tests before review patches; final focused Dashboard suite passed 57 tests including expanded Other member inspection and unchanged navigation.
- Final production build/typecheck and lint passed. Existing Vite CJS and bundle-size advisories remain.
- Final visual dashboard harness passed all 64 fixture states, including nine new expense detail captures. Child bounds/scroll width, fixed center geometry, accurate label/amount/share, no expense tooltip, page overflow and final-content bottom-nav clearance passed. No backend or external providers were called.
- Inspected desktop hover, 1024 and mobile focus, restored total, expanded Other and Russian long-label/large-expense captures. Long names clamp to two lines; full names remain in the legend and accessible labels. Very large amounts wrap within the center.
- Aggregate visual verifier fails only on stale summaries for eight unrelated groups: Accounts, Auth, Budgets, Categories, Hero consistency, Profile, Reports and Transactions. Updated visual-dashboard and existing classic-dashboard summaries pass.
- Blind review found no actionable issue; edge and acceptance review findings were patched and both follow-up reviews returned no unresolved findings.
- UI doctor passed. Browser QA required process escalation after a sandbox launch crash. CLI auth probe failed while GitHub connector access succeeded. Suggested durable follow-up: document connector readiness separately from CLI authentication in the doctor guidance.

## Suggested Review Order

- Follow inspection state and grouped member resolution, preserving existing category navigation.
  [VisualDashboard.tsx:30](../../inex/ClientApp/src/pages/Dashboard/VisualDashboard.tsx#L30)
- Check fixed center geometry and bounded translated labels.
  [visual-dashboard.css:65](../../inex/ClientApp/src/pages/Dashboard/visual-dashboard.css#L65)
- Verify real-browser detail and containment checks with fixture isolation.
  [visual-dashboard.mjs:157](../../inex/ClientApp/visual-qa/visual-dashboard.mjs#L157)
- Inspect behavioral coverage for focus fallback and expanded members.
  [Dashboard.test.tsx](../../inex/ClientApp/src/pages/Dashboard.test.tsx)
