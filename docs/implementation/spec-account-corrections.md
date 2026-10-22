---
title: 'Create account corrections from the shared transaction form'
type: 'feature'
created: '2026-10-22'
status: 'done'
baseline_commit: '2438d471b92e3649e7cafe4eeaca4fa0957d2b51'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/inex/ClientApp/AGENTS.md'
---

<frozen-after-approval reason="User approved the proposed shared-form correction flow and explicitly requested implementation, PR and production merge on 2026-10-22">

## Intent

**Problem:** The correction system category exists but users cannot manually create corrections. These operations adjust account balances without representing income or expense.

**Approach:** Add Correction to the existing shared transaction creation form beside expense, income, transfer and internal transfer. Keep the category system-owned and create one posting through a dedicated server workflow.

## Boundaries & Constraints

**Always:** Require authentication and owner-scoped account/category lookup. Assign the current user's correction system category on the server. Reuse shared apiClient, RTK Query invalidation, form primitives, decimal monetary values, comment markers and EN/RU localization. Preserve existing transaction behavior. Corrections affect balances, remain visible in history, have a separate type/filter/count, and do not count as income, expenses or budget spending. Editing and deletion remain owner-only; edits preserve the correction category, nonzero amount and required reason.

**Ask First:** A change to agreed financial semantics, ownership permissions or new dependencies.

**Never:** Expose arbitrary system-category creation through the ordinary transaction endpoint; introduce actual-balance reconciliation, a new database table, exchange-provider calls, or linked-user correction writes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Create | Own account, positive amount, increase/decrease, date, nonblank reason | One signed correction posting in account currency | Display localized API failure without closing form |
| Invalid form | Missing account/date/reason, zero/negative amount, invalid direction | No posting | Machine-readable validation and localized feedback |
| Ownership | Another user's account or mutation target | No disclosure or write | Same 404 as missing resource |
| Classification | Positive/negative correction | Only correction filter/count, visible in all; no income/expense/transfer totals | Preserve transfer and internal-transfer behavior |
| Budget | Correction category included in a budget | No spending attributed to correction | Other category spending unchanged |
| Edit/delete | Own correction | Recompute balances through existing transaction model; preserve category on edit | Reject zero amount/blank reason and category reassignment |
| Form switch | Switch away from correction | Existing mode reset behavior and fields restored | No linked-recipient submission from correction |

</frozen-after-approval>

## Code Map

- `inex.Services/Services/TransactionService.cs` and `inex/Controllers/TransactionsController.cs` — additive creation, ownership, filtering and counts.
- `inex.Services/Models/Records/Transaction/` and `inex.Services/Validators/Transaction/` — creation contract and validation.
- `inex.Services/Services/BudgetReportService.cs` — exclude corrections from budget category spending.
- `inex/ClientApp/src/pages/Transactions/` — shared creation, editing, history presentation and filters.
- `inex/ClientApp/src/store/transactions/transactions-api.ts` — authenticated mutation and shared cache invalidation.

## Tasks & Acceptance

- [x] Add owner-scoped correction creation contract, validator, service and endpoint; guard edit invariants.
- [x] Add exact correction/transfer filtering and additive correction summary counts; exclude correction budget spending.
- [x] Add correction mode to shared form with direction, own account, positive amount, date and required reason; automatic category, localized explanation.
- [x] Add localized ledger/filter/count/edit behavior, URL persistence and cache refresh.
- [x] Add regression coverage for create/validation/ownership, signed balance effects, summaries/budgets, editing/deletion and frontend submission/filtering.
- [x] Run focused then broad tests/build/lint; capture fixture visual QA desktop/mobile EN/RU before independent review.

**Acceptance Criteria:** Given a valid correction, when saved, then exactly one posting changes only the owner's balance and appears as Correction. Given income, expense, transfer or budget reporting, when corrections exist, then they contribute no cash-flow or budget spending. Given an invalid or cross-user request, when submitted, then nothing is written. Given a correction edit or deletion, when saved, then existing balance aggregation reflects the resulting history.

## Design Notes

Use explicit increase/decrease plus positive magnitude during creation; persist the signed amount. Category remains `IsSystem = true`, `SystemCode = correction`. Existing history editing can use signed amounts but must lock the system category and retain mandatory reason. No schema migration is expected. Scope is one shared-form correction feature, including its financial classification and verification.

## Verification

Focused correction tests and `dotnet test inex.Services.Tests/` first; then `dotnet test inex.sln` and `dotnet build inex.sln`. Frontend focused tests, full tests, build and lint. Doctor passed 20/20 before UI work. Fixture screenshots at 1440/1024/390/360px plus Russian 360px; inspect actual images and record fixture mode. Use MySQL MCP read-only if provider-dependent filtering requires verification; no database writes or external providers. Review financial/ownership paths through Blind Hunter, Edge Case Hunter and Acceptance Auditor. Create PR against master, merge only when required checks/reviews permit; report production deployment URL/status without monitoring deployment completion.


## Implementation Verification (2026-10-22)

- Added `POST /api/transactions/correction` with authenticated owner-scoped account lookup and server-selected owner correction category. Positive magnitude plus increase/decrease persists one signed posting; date/reason/direction, decimal(12,2) precision/range and 255-character reason are validated. Correction edits preserve category and validate nonzero signed amount and reason.
- Shared form, EN/RU strings, separate ledger type/count/filter, URL round-trip, neutral signed amounts, immutable system-category edit display and shared dependent-cache invalidation are implemented. Switching mode uses the existing reset and removes linked-recipient selection. Budget spending skips corrections even when explicitly budgeted.
- `dotnet test inex.Services.Tests/`: 142 passed. `dotnet test inex.sln`: Services 142, Application 12 and API/integration 204 passed; one existing opt-in MySQL integration test skipped. `dotnet build inex.sln`: 0 warnings/errors on final incremental build.
- Frontend final full suite: 39 files / 252 tests passed, including the added classification and authenticated endpoint tests. Production build and lint passed (existing Vite CJS/chunk-size and test-library warnings).
- Parent verified both Pomelo-generated owner-zero correction/transfer SELECTs with MySQL MCP read-only `EXPLAIN`: accepted, using `IX_transaction_user_fk` and category PK `eq_ref`. No migration, database writes or provider calls were required.
- Fixture visual QA: `INEX_VISUAL_QA_STATE_FILTER=correction npm run visual-qa:transactions` passed eight states in `docs/implementation/visual-qa/account-corrections/qa-summary.json`. Actual screenshots inspected: creation EN 1440/1024/390/360, RU360, signed correction ledger 1440/360, locked-category edit360. No horizontal overflow, clipped mode controls or out-of-viewport drawers; all API requests intercepted.
- `npm run visual-qa:verify` reports FAIL solely because all nine unrelated canonical summaries exceed its 24-hour freshness window (150–1102 hours). The new feature-scoped summary reports no failures and zero unhandled API requests. Full-site screenshots were not regenerated for this feature.
- Repeated QA friction produced a durable narrow harness fix: navigate each test-owned page to `about:blank` before closing its CDP socket, stopping mounted polling before request interception detaches. Fixture interaction now selects the exact correction mode within the form, and correction readiness uses locale-independent ledger markup.
- Independent fresh-context review completed: Blind Hunter, Edge Case Hunter and Acceptance Auditor reported no confirmed actionable defects. Blind hypotheses about ordinary system-category creation and client cash-flow aggregation were rejected after inspecting the existing system-category guard and summary pipeline. No blocking findings remain. PR checks and production merge follow implementation verification.

## Suggested Review Order

- Start with signed correction creation and owner-scoped account/category resolution.
  [TransactionService.cs:103](../../inex.Services/Services/TransactionService.cs#L103)
- Check edit invariants and exact correction versus transfer classification.
  [TransactionService.cs:231](../../inex.Services/Services/TransactionService.cs#L231)
- Verify corrections never contribute budget spending.
  [BudgetReportService.cs:134](../../inex.Services/Services/BudgetReportService.cs#L134)
- Follow correction submission through the shared creation form.
  [TransactionCreate.tsx:298](../../inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx#L298)
- Check regression coverage for signed balances, edits, deletion and user isolation.
  [TransactionsControllerTests.cs:18](../../inex.Tests/Transactions/TransactionsControllerTests.cs#L18)
