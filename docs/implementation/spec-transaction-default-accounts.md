---
title: 'Preselect frequently used accounts for expenses and income'
type: 'feature'
created: '2026-11-05'
status: 'done'
baseline_commit: '784dc7f'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/inex/ClientApp/AGENTS.md'
---

<frozen-after-approval reason="User approved the proposed rules and explicitly requested implementation, PR and production merge on 2026-11-05">

## Intent

**Problem:** Every expense or income starts with an unselected account, requiring repetitive manual selection even when the user predominantly uses one account.

**Approach:** Recommend active accounts separately for expenses and income using transaction frequency over the preceding 30 days. Preselect the recommendation in the shared creation drawer while preserving manual selection and other transaction modes.

## Boundaries & Constraints

**Always:** Scope accounts, transactions and category ownership to the authenticated current user. Count ordinary, non-system transactions only, using signed values to distinguish expense and income. Use the existing injectable clock, date conventions, repository/unit-of-work, authenticated apiClient and RTK Query patterns. Preserve form validation, edit behavior and existing financial contracts. Refresh recommendations after transaction mutations and account changes. Recommendations must not depend on list filters, pagination, linked-user scope or the date entered into the form.

**Ask First:** Changes to the agreed selection rules, new dependencies or permissions beyond current-user data.

**Never:** Automatically select accounts for transfers, internal transfers or corrections; change ledger balances; persist recommendation counters or settings; call exchange-rate providers; overwrite a manual choice with a delayed or refreshed recommendation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Normal ranking | Multiple active accounts with recent ordinary postings | Separate expense/income recommendations by count, then latest transaction date, then stable account ID | Return nullable IDs |
| Period | Transactions on lower boundary, today and in future | Include dates in the 30-calendar-day window ending today; exclude tomorrow onward | Use server UTC calendar date, matching existing date-only semantics |
| No recent history | Ordinary postings exist before the window | Recommend account of latest eligible posting for that direction | Disabled accounts never participate |
| No history | One or multiple active accounts | Select the sole active account; otherwise return no recommendation | Empty account list also returns null |
| Exclusions | System-category postings, another user's data, disabled accounts | Exclude from both ranking and historical fallback | No linked-user override |
| Slow response | User selected an account before the query completed | Preserve manual selection for the current form mode | Errors leave manual selection available |
| Mode switch | Expense to income or another mode | Reset as before, apply matching recommendation only for expense/income | Ignore responses for unrelated modes |

</frozen-after-approval>

## Code Map

- `inex.Services/Services/TransactionService.cs`, `Services/Base/ITransactionService.cs` and `Models/Records/Transaction/` — authenticated recommendation query and nullable response contract.
- `inex/Controllers/TransactionsController.cs` — additive current-user-only GET route.
- `inex/ClientApp/src/store/accounts/accounts-api.ts` — authenticated recommendation query; existing account LIST/SUMMARY tags reuse transaction-dependent and account mutation invalidation.
- `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx` — initial selection, mode reset and manual-choice protection.
- `inex.Tests/Transactions/`, `inex.Services.Tests/` and frontend adjacent tests — ranking, authorization, API/cache and asynchronous form regression coverage.
- `inex/ClientApp/visual-qa/transactions.mjs` — isolated expense/income fixture scenarios.

## Tasks & Acceptance

- [x] Add owner-scoped server query, response and authenticated endpoint without changing existing contracts.
- [x] Add deterministic server regression tests for ranking, period boundaries, exclusions and fallbacks; verify anonymous and cross-user requests.
- [x] Add authenticated client query with transaction/account invalidation and fresh recommendations when the drawer opens.
- [x] Apply recommendations for expense/income and protect manual choices; test delayed responses, mode switches and failures.
- [x] Run focused then broad backend/frontend checks, verify generated SQL through read-only MySQL MCP and capture fixture visual evidence.
- [x] Complete independent Blind Hunter, Edge Case Hunter and Acceptance Auditor reviews; resolve blocking findings and prepare the verified change for PR/production delivery.

**Acceptance Criteria:** Given distinct frequent accounts for expense and income, when opening the form and switching direction, then each matching account is selected. Given manual input, when recommendations arrive or refresh, then the selected account remains unchanged. Given arbitrary list filters or another user's identity in query parameters, when requesting recommendations, then only the authenticated user's complete eligible history determines the result. Given another transaction mode, when opening it, then its existing account-selection behavior remains unchanged.

## Design Notes

Thirty calendar days means today plus the preceding 29 dates; historical fallback also excludes future postings. Resolve ties with ascending account ID after latest date, ensuring deterministic results. No new tables or migrations are expected. The existing UI fields display the selected account without additional copy or styling.

## Verification

Run `dotnet test inex.Services.Tests/` first, focused API tests, then `dotnet test inex.sln` and `dotnet build inex.sln`. Run focused frontend tests, full suite, `npm run build` and `npm run lint`. Use MySQL MCP SELECT/EXPLAIN on actual Pomelo-generated SQL and inspect its ownership predicates and plan. Run doctor before fixture browser QA at 1440/1024/390/360px and RU360, with every API intercepted and no application/provider startup. Review all three required sensitive-path remits. PR targets `master`; production deployment is triggered by the merge and is reported without polling deployment completion.

## Implementation Verification

- Services: 148 passed, including six new pure ranking/query-translation tests. Focused API: three passed. Full solution: Services 148, Application 12, API 207 passed; one existing opt-in MySQL integration test skipped. Backend build: zero warnings/errors.
- Frontend final: 45 files / 374 tests passed, including delayed responses/manual-choice preservation, three real-store retained-cache tests and seven authenticated-query/cache tests. Build and lint passed; existing Vite chunk-size/CJS and test-library warnings remain.
- MySQL MCP executed the actual Pomelo-generated grouped SELECT and EXPLAIN using synthetic owner zero. Ownership predicates cover postings, accounts and categories. Plan uses transaction user index and account/category primary-key joins. No schema change, SQL writes, private row output or provider calls.
- Feature-scoped browser fixture QA: ten expense/income states at 1440/1024/390/360 and RU360 passed. No unhandled API requests, real backend calls, horizontal overflow or out-of-viewport drawers. Evidence: `visual-qa/transaction-default-accounts/qa-summary.json`. This page-scoped run does not regenerate or claim freshness for unrelated full-site baselines.
- Client query lives in accountsApi and provides existing LIST/SUMMARY account tags. This reuses existing transaction-dependent invalidation without introducing a reverse API import. Authenticated user ID partitions the cache but is never sent as an ownership override. Opening the form requests fresh data; manual selections are guarded in both the effect and reducer.
- Independent review found one P2 cached-data race on reopening before refetch began. The form now forces a fresh lazy query and gates automatic application on successful completion for this opening/user. A real RTK Query store reproduces retained cache plus delayed success/failure/manual selection and verifies the cached account is never rendered. All three reviewers rechecked the delta; no blocking findings remain. Final ten-state fixture visual QA rerun passed.

## Session Retrospective

Audit: scope remained one feature; MySQL MCP and GitHub connector were preferred, focused verification preceded broad checks, and browser QA used isolated fixtures. No issue was created and no private data was published. Time loss came from sandbox network/browser restrictions and review-packet paths scoped to individual tool processes. Existing doctor documentation already covers browser escalation; task-specific test-clock setup needs no permanent rule.

### Keep shared review artifacts in the workspace

Finding: OS temporary paths were not shared reliably between tool processes and reviewer agents.

Evidence: all three reviewers could not access the original temporary patch; regenerating it inside an ignored workspace build directory made the same artifact accessible.

Durable fix: document ignored workspace paths for cross-agent artifacts, with an explicit check that they remain excluded from commits.

Recommended artifact: `doc`

Priority: `low`

Exact follow-up prompt:

```text
Update docs/operations/agent-prompt-templates.md to recommend an ignored workspace directory for shared review packets when OS temporary directories are process-scoped. Verify access from the intended reviewers and git exclusion before sharing. Keep temporary packets out of PRs and avoid exposing private data. Do not add a task-specific AGENTS.md rule.
```

One-off notes:
- Network and browser sandbox escalation were local environment fixes; no repository configuration change is proposed.
- Freezing only the transaction-service clock kept authentication token validation realistic in the new test fixture.

Safety check:
- Local environment fixes separated from repo changes: yes.
- No local absolute paths, private evidence URLs, credentials or secrets included: yes.
- Every durable fix is tied to repeated or likely-recurring evidence: yes.

## Suggested Review Order

- Start at the authenticated endpoint: recommendations always use the current principal.
  [TransactionsController.cs:58](../../inex/Controllers/TransactionsController.cs#L58)
- Follow ownership, eligibility, date-window aggregation and deterministic fallback ranking.
  [DefaultAccountRecommendations.cs:15](../../inex.Services/Helpers/DefaultAccountRecommendations.cs#L15)
- Check fresh-opening completion and manual-selection protection in the shared form.
  [TransactionCreate.tsx:141](../../inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx#L141)
- Verify account cache tags reuse existing mutation invalidation without sending user overrides.
  [accounts-api.ts:73](../../inex/ClientApp/src/store/accounts/accounts-api.ts#L73)
- Exercise actual retained-cache timing with the real RTK Query store.
  [TransactionCreate.recommendation-cache.test.tsx:42](../../inex/ClientApp/src/pages/Transactions/TransactionCreate.recommendation-cache.test.tsx#L42)
