---
title: Respect overview account visibility in Visual Dashboard balances
type: bugfix
created: '2026-11-06'
status: done
route: one-shot
---

# Respect overview account visibility in Visual Dashboard balances

## Intent

**Problem:** The Visual Dashboard money section includes every active account, ignoring the Show in overviews setting.

**Approach:** Use enabled accounts explicitly selected for overviews for balance requests, totals, account counts, positive distribution and selection. Preserve the Classic Dashboard compatibility rule and monthly reporting scope across all active accounts. Update EN/RU scope text. No backend, persistence, rate provider or financial conversion changes.

## Suggested Review Order

- Apply the Visual-only strict visibility flag while preserving the Classic default.
  [Dashboard.tsx:13](../../inex/ClientApp/src/pages/Dashboard.tsx#L13)
- Filter balance accounts separately from reporting accounts before queries and arithmetic.
  [useDashboardData.ts:53](../../inex/ClientApp/src/pages/Dashboard/useDashboardData.ts#L53)
- Verify hidden/disabled/unspecified accounts, empty selection, cached summaries and own/linked workspaces.
  [Dashboard.test.tsx:948](../../inex/ClientApp/src/pages/Dashboard.test.tsx#L948)
- Validate visible-account selection and overview totals in isolated browser fixtures.
  [visual-dashboard.mjs:525](../../inex/ClientApp/visual-qa/visual-dashboard.mjs#L525)

## Verification

- UI doctor: PASS, 21 checks.
- Dashboard regression tests: PASS, 66 tests, including own/linked 2-to-1-to-0-to-1 visibility transitions.
- Frontend production build/typecheck and lint: PASS.
- Visual Dashboard browser QA: PASS, 87 fixture states across 1440/1024/390/360px; inspected desktop, Russian narrow selection and empty overview screenshots.
- Aggregate visual summary verifier: FAIL only for eight unrelated stale page summaries; Visual Dashboard and Classic Dashboard pass.
- All browser API traffic intercepted; no live backend or rate provider calls.

## Review

Independent adversarial review found no demonstrated runtime defect. Applied its test-coverage suggestion for removing the last visible account and restoring the first, plus corrected a nullable assertion during the final typecheck. No deferred product work.

## Environment follow-up

Proposed durable update: document the existing `INEX_VISUAL_QA_PORT` override in `docs/operations/project-doctor.md` for a port that appears free but fails to bind. In this run, the default port failed twice and the override succeeded. Keep normal sandbox access requests and the initial npm working-directory correction as one-off notes.
