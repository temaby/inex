---
title: Show personal internal transfers in the Visual Dashboard
type: feature
created: '2026-11-08'
status: done
baseline_commit: 'a53194d'
context:
  - docs/project-context.md
  - docs/implementation/spec-dashboard-report-account-scope.md
---

<frozen-after-approval reason="User authorized implementation of stage one in this conversation">

## Intent

**Problem:** Personal dashboard balances include internal-transfer postings, but monthly income/expense statistics deliberately exclude them and provide no explanation of those movements. Existing category reports have a transfer summary, but the dashboard's transaction summary API has only transfer counts.

**Approach:** Add a compact secondary internal-transfer summary beneath the existing monthly flow/result inside Visual Dashboard. Show Sent, Received and signed Net transfers in the selected reporting currency, with an action opening the existing filtered transaction list. Stage one covers self and the selected linked user's existing authorized individual context. Family visualization is stage two.

## Boundaries & Constraints

**Always:** Keep income/expense/monthly-result and account-balance semantics. Derive amounts from actual user-owned internal-transfer ledger postings, including manually recorded transfers and booked postings from requests, rather than request status/history. Use all enabled reporting accounts, the selected month, existing ownership resolution and dated FX/precision rules. Sent and Received are positive magnitudes; Net is Received minus Sent and displays an explicit sign. Reuse API/cache/i18n/Num transfer semantics. Add only backward-compatible response fields. Preserve unrelated changes.

**Ask First:** Expanding to family aggregation, a mixed-owner ledger, changes to transfer creation/permissions/accounting, or database writes.

**Never:** Include ordinary account transfers/corrections in this summary; infer counterparties; turn transfers into income/expenses; add another card/chart; modify Classic or Family presentation; change provider synchronization policy or schema; contact real external providers during validation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Activity | Incoming/outgoing/both | Positive direction totals and signed difference, separately from monthly result | Existing summary error handling |
| Balanced | Equal incoming/outgoing, nonzero count | Show section with zero net | Do not hide by net value |
| Empty | No internal-transfer postings | Omit section entirely | Existing layout retained |
| Foreign currency | Different dates/currencies | Convert each dated bucket before adding and calculating net | No double conversion |
| Missing FX | Any nonzero transfer bucket lacks dated rate | Withhold incomplete transfer totals and offer retry | Valid ordinary cash flow remains available |
| Context switch | Self/linked user or month changes | Current-scope data only; existing pending/error handling | No stale totals under new labels |
| Navigation | Transfer details activated | Existing transaction list filtered by internalTransfer, active account IDs and selected dates | Selected linked-user context remains authorized |

</frozen-after-approval>

## Code Map

- `inex.Services/Services/TransactionService.cs` and transaction summary records: existing scoped summary and dated currency grouping.
- `inex/ClientApp/src/store/transactions/transactions-api.ts`: typed summary contract.
- `inex/ClientApp/src/pages/Dashboard/useDashboardData.ts`: selected accounts/month/currency, FX state and navigation.
- `inex/ClientApp/src/pages/Dashboard/VisualDashboard.tsx`, `visual-dashboard.css`: existing monthly flow card and responsive layout.
- `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts`: established dated conversion and completeness rules.
- `inex/ClientApp/src/pages/Dashboard.test.tsx`, backend summary tests and `visual-qa/visual-dashboard.mjs`: behavior, security and fixture evidence.

## Tasks & Acceptance

**Execution:**
- [x] Extend existing transaction summary with dated/currency internal-transfer buckets, received/sent magnitudes and posting counts; preserve existing filters and cash-flow fields.
- [x] Extend frontend summary types and shared dashboard data with independent transfer conversion/completeness state and scoped navigation.
- [x] Add compact neutral/lavender summary inside Visual monthly flow card, EN/RU copy and translation cache-version update.
- [x] Cover incoming/outgoing/both, all net signs, zero/empty, dated FX/missing FX, user/account/month scopes and unchanged financial calculations in focused tests.
- [x] Update fixture harness/evidence for populated/empty, mobile, Russian, linked and historical cases; inspect screenshots before review.

**Acceptance Criteria:**
- Given a selected individual workspace, when summary loads, then transfer totals use the same enabled-account and monthly scope as other reports without changing its income, expense or result.
- Given internal-transfer activity, when Visual Dashboard renders, then the existing card contains a compact secondary summary and no additional top-level card/chart.
- Given a transfer summary, when its details action is activated, then the transaction page receives type/date/account filters and retains existing selected-user authorization.
- Given Classic or Family mode, when Dashboard renders, then their presentation remains unchanged.
- Given desktop/tablet/390px/360px and EN/RU, when the section renders, then content remains readable without overflow or bottom-navigation occlusion.

## Spec Change Log

## Design Notes

Use the existing summary infrastructure instead of adding a category-report request or relying on complete transaction histories. Ledger postings explain individual balances, including pending/rejected/cancelled request postings that remain booked. Unique logical transfer counts and counterpart names belong to the later family stage. Reuse dated currency conversion without affecting existing scope-specific rate fetching. Hide empty content by posting count, not by net. Transfer FX gaps must not invalidate ordinary cash-flow totals.

## Verification

- Project doctor UI: passed all 22 checks before implementation.
- Focused service tests first, then `dotnet build inex.sln` and `dotnet test inex.sln`; verify new SQL aggregation read-only through MySQL MCP if query shape changes.
- Focused/full frontend Vitest, `npm run build`, `npm run lint`.
- Fixture-only `npm run visual-qa:visual-dashboard`, Classic regression and summary verification; inspect desktop/mobile/Russian screenshots.

### Results — 2026-11-08

- Backend focused service suite: 165 passed. Full solution build: passed, zero warnings/errors. Full tests: 401 passed and one existing opt-in MySQL lifecycle test skipped.
- MySQL MCP: executed the generated owner/account-scoped aggregation against the real schema with sentinel IDs (no user records returned); synthetic read-only decimal/date grouping verified direction totals, zero-posting counts and currency/date boundaries. No writes or providers.
- Full frontend suite: 56 files / 500 tests passed. After the review rounding fix, 95 focused dashboard/conversion tests passed, including the additional fractional-zero regression. Production build/typecheck and lint passed.
- New fixture harness: all 17 states passed at 1440/1024/390/360px, including incoming/outgoing/balanced/empty, actual system ledger rows, fractional zero, historical FX, missing rates, Russian, long amounts and selected linked user. Inspected desktop, narrow Russian and fractional-zero captures.
- Classic fixture regression: all 17 states passed. Full Visual regression: 94 states completed, with four pre-existing geometry failures reproduced with identical measurements using baseline source `a53194d`; comparison is in `visual-qa/personal-dashboard-transfers-regression/regression-comparison.json`. They are recorded in deferred work and do not affect the new passing feature states.
- Canonical summary verification: the new personal-transfer summary passes; the command still fails for ten untouched canonical baselines older than 24 hours. Existing baselines were preserved to avoid unrelated screenshot churn.
- Three independent reviewers found one actionable P3: floating-point residuals could render balanced fractional transfers as +0.00. Normalize only the displayed two-decimal net before signed formatting; retain the original conversion arithmetic. Component and real-browser fractional fixtures verify unsigned zero. No outstanding introduced finding remains.

### Limits and follow-up

Personal totals describe booked ledger postings, including manual transfers and request postings that remain after cancellation/rejection. They do not identify counterparties or count unique family movements. Family implementation remains stage two. No deployment or real-provider call occurred. A proposed named-state/baseline comparison improvement is recorded in the feature's regression session notes.

## Suggested Review Order

- Follow existing owner/date/account filters into separate server-side transfer buckets.
  [TransactionService.cs:491](../../inex.Services/Services/TransactionService.cs#L491)
- Verify dated conversion, independent completeness and account/month-scoped navigation.
  [useDashboardData.ts:165](../../inex/ClientApp/src/pages/Dashboard/useDashboardData.ts#L165)
- Inspect compact secondary presentation and signed-zero display without changing monthly results.
  [VisualDashboard.tsx:346](../../inex/ClientApp/src/pages/Dashboard/VisualDashboard.tsx#L346)
- Check system-category exclusion before category FX warnings.
  [useDashboardData.ts:91](../../inex/ClientApp/src/pages/Dashboard/useDashboardData.ts#L91)
- Verify ownership, linked authorization and period/account behavior through the API.
  [TransactionsControllerTests.cs:311](../../inex.Tests/Transactions/TransactionsControllerTests.cs#L311)
- Review dynamic totals, navigation, empty/missing-rate and fractional-zero coverage.
  [Dashboard.test.tsx:1232](../../inex/ClientApp/src/pages/Dashboard.test.tsx#L1232)
