---
title: 'Configure monthly PDF report accounts and financial summary signals'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_commit: 'ffa4065'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/AGENTS.md'
---

## Intent

**Problem:** The monthly PDF summary omits the reporting currency for monetary metrics, `Income spent` does not communicate its level at a glance, and the report cannot be limited to a deliberate subset of a user's active accounts.

**Approach:** Preserve the existing all-active-accounts report as the default. Add a temporary Configure dialog that starts with every active account selected and can pass a selected-account list to the PDF endpoint. Render currency codes on all monetary Summary values and use the agreed `Income spent` status thresholds.

## Boundaries & Constraints

**Always:** Scope the account list and all selected account IDs to the authenticated user and active accounts. Keep the selection local to an open configuration dialog; do not persist it. Keep existing period selection, base-currency conversion, category summaries, transfer exclusion, and PDF route behavior.

**Ask First:** Persisting account selections, changing default inclusion from all active accounts, changing the reporting currency, or changing the four `Income spent` thresholds.

**Never:** Permit an inactive or another user's account ID to affect the report, change database schema, or make external currency-provider calls in tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Default export | No account IDs supplied | Includes all of the current user's active accounts | Existing monthly-report validation applies |
| Configured export | One or more active account IDs supplied | Includes only those accounts in transactions and balances | Selection is local to the dialog |
| Invalid selection | An ID is not an active account of the current user | No report is generated from that selection | Return a generic validation failure |
| No income | `Income spent` unavailable | Display `Unavailable` in neutral color | N/A |
| Spending threshold | Percentage is `<75`, `<100`, `<125`, or `>=125` | Green, orange, red, or dark-red value respectively | N/A |

## Tasks & Acceptance

- [x] Add an optional, authenticated-user-scoped active-account selection to monthly report generation and PDF export.
- [x] Add an accessible Reports Configure dialog with all active accounts selected when opened.
- [x] Display the report currency beside monetary values in Financial summary.
- [x] Apply the agreed `Income spent` value colors.
- [x] Cover account scoping and selection in report-service tests, run frontend/backend verification, and visually inspect a generated PDF.
