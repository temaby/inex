---
title: 'Confirm internal transfers with linked users'
type: 'feature'
created: '2026-10-16'
status: 'in-review'
baseline_commit: '7affd95c533bf98ff70c4327a5afd05a537eae52'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/implementation/spec-gh-399-linked-account-transactions-view.md'
---

# Confirm internal transfers with linked users

## Planning status

Planning approved on 2026-10-16; ready for implementation. Confirmed: post the master's side immediately; post the linked user's side only after confirmation; the linked user selects their own financial account; only accounts matching the original operation currency are eligible. Editing/deletion rules below are approved. This session remains planning-only; application implementation and database writes have not started.

<frozen-after-approval reason="human-owned intent approved on 2026-10-16; changes require agreement">

## Intent

**Problem:** Internal transfers create one user-owned record. A master cannot select a linked user and request confirmation of the corresponding operation.

**Approach:** Add an optional linked-user selector and separate request workflow. Display pending requests within the recipient's Transactions page, outside booked rows. Acceptance creates exactly one opposite-side transaction; rejection creates none.

## Boundaries & Constraints

**Always:** Authenticate every action; authorize the active master-to-linked relationship and each financial account's owner. Only the addressed user can accept/reject. Resolve each user's system category separately. Preserve manual internal transfers and linked read-only views. Use existing API client, EN/RU, financial semantics and shared styles.

**Confirmed posting/account policy:** Atomically create the master's booked transaction and Pending request. That transaction immediately participates in the master's account balance and existing internal-transfer reporting, without becoming ordinary income/expense. The request changes no linked-user totals. At acceptance, the linked user selects an eligible own financial account and authorizes the opposite-side posting; the master does not select that account.

**Confirmed currency policy:** Persist the original operation currency. Offer only eligible recipient accounts with that same currency; acceptance uses the original amount and opposite sign, without editable amount or conversion. Revalidate currency server-side. If none exist, keep the request pending and explain that a matching-currency account is required; reject remains available.

**Confirmed editing/deletion policy:** While Pending, block edits and deletion of the master's associated operation; cancel the request first. After acceptance, each owner can edit/delete only their own record, without changing the other owner's record. Preserve the original request terms and decision history even if postings are changed/deleted. After rejection/cancellation, the master's operation remains and can be edited/deleted independently. Retain existing incoming/outgoing directions with explicit recipient credit/debit consent and the existing system-category restriction.

**Ask First:** Changes to these approved posting, currency, ownership or editing rules; new notification channels or expanded linked-account mutation permissions.

**Never:** Grant generic linked-user writes, trust supplied ownership, count pending requests in balances/reports, call exchange providers, or silently undo booked money after rejection. Email/push and generic notifications are outside scope.

## I/O & Edge-Case Matrix

| Action/state | Required result |
|---|---|
| No linked user selected | Existing one-sided flow unchanged. |
| Create | Atomically persist immutable terms, Pending request and master's booked transaction; update master's balance immediately. |
| Accept | Linked user selects their own eligible account. Revalidate link/account; atomically post opposite side and set Accepted. Original operation date retained; decision timestamp separate. |
| Reject/cancel | Recipient rejects or master cancels Pending; no recipient posting. Any existing master posting remains with visible outcome. |
| Retry/race | Submission key prevents duplicates; one terminal decision/posting; competing decision returns 409. |
| Revoked/replaced relationship | Acceptance unavailable; relinking cannot revive old requests. Booked records remain. |
| Invalid account/category | No partial posting; localized error and recoverable selection. |
| Other actor / master confirming for recipient | Generic 404; no disclosure or mutation. |
| Currency mismatch / no matching account | Exclude mismatched accounts; server rejects attempted mismatch. Keep Pending if no eligible account exists, with explanatory UI. Acceptance amount cannot change. |
| Source edited/deleted while Pending | Block edit/delete, including bulk deletion and account-deletion cascades; cancellation must resolve Pending first. |
| Accepted posting edited/deleted | Allow only its owner; never change the other posting or original request/decision history. |
| Rejected/cancelled request | Retain master's operation; owner can edit/delete it independently. |

</frozen-after-approval>

## Code Map

- `inex.Services/Services/TransactionService.cs`, `inex/Controllers/TransactionsController.cs` — existing owner-only creation; retain legacy endpoint.
- `inex.Services/Services/Authorization/LinkedAccountReadScopeResolver.cs` — read authorization only.
- `inex.Data/Models/UserAccountLink.cs` — original relationship identity and Active status.
- `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx`, `TransactionCreateInternalTransferForm.tsx` — optional recipient selection.
- `inex/ClientApp/src/pages/Transactions.tsx`, `store/transactions/transactions-api.ts` — request panels, decisions, refresh.

## Tasks & Acceptance

- [x] Confirm immediate master posting, deferred linked-user posting, and linked-user account selection at confirmation.
- [x] Confirm same-currency recipient accounts only, without conversion or amount changes.
- [x] Approve editing/deletion policies and mark plan ready-for-dev.
- [x] `inex.Data/Models/InternalTransferRequest.cs`, matching configuration, migration, context/repositories — participants/link, immutable terms/currency, status, submission key, posting IDs, audit times, concurrency token; restricted deletes, participant/status indexes and uniqueness constraints.
- [x] `inex.Services/Services/InternalTransferRequestService.cs`, interface, validators, records and DI — scoped lifecycle, idempotency, atomic posting/decision; serialize acceptance against revocation. Use IClock. Existing unit-of-work only exposes SaveAsync: specify the narrow atomic persistence mechanism during implementation design.
- [x] `inex.Services/Services/TransactionService.cs` and account deletion paths — enforce Pending guards atomically against acceptance/cancellation across update, single/bulk delete and cascades. Permit owner-only edits/deletes after resolution; preserve request history with posting references that tolerate approved deletion, without cascading deletion of the request or other posting.
- [x] `inex/Controllers/InternalTransferRequestsController.cs` — proposed additive POST/GET `/api/internal-transfer-requests`, POST `/{id}/accept`, `/reject`, `/cancel`. Participant-scoped pagination; 201 create, 404 inaccessible, 409 conflicts, 422 validation.
- [x] `inex/ClientApp/src/pages/Transactions/InternalTransferRequests.tsx`, creation/API files — incoming/sent panels, pending badge, explicit credit/debit confirmation, account selection per decision, errors and cache refresh. Requests stay discoverable independently of ledger filters. Master read-only view cannot decide.
- [x] EN/RU locale files and transaction visual harness — responsive, accessible states.
- [ ] `inex.Services.Tests/Services/InternalTransferRequestServiceTests.cs`, `inex.Tests/Transactions/InternalTransferRequestTests.cs`, frontend tests — ownership, lifecycle, retries, races, aggregate exclusion, legacy compatibility.

**Acceptance:** Given master creation succeeds, when committed, then the master's operation affects their balance immediately and the recipient sees a pending request without changes to their totals. Given recipient acceptance with an eligible own same-currency account, when successful, then exactly one correctly owned opposite-side posting exists. Given a Pending request, when its master posting is edited/deleted, then the mutation is blocked until cancellation. Given a resolved request, when an owner edits/deletes their posting, then the other owner's posting and original request history remain unchanged. Given unauthorized/repeated/conflicting decisions, when submitted, then no unintended posting occurs. Given manual creation or linked read-only view, when used, then existing behavior remains intact.

## Design Notes

Source and read-only MySQL schema inspection on 2026-10-16 confirmed no request/notification storage or transaction confirmation status. Use a separate entity to keep pending data out of existing aggregates. Relationship Pending is not transaction approval. Transaction.Created represents operation date, not audit time. All product decisions are approved; implementation must preserve immutable request history independently of mutable/deletable booked records.

## Verification

Focused service/frontend tests; `dotnet test inex.Services.Tests/`, `dotnet test inex.sln`, `dotnet build inex.sln`; frontend build/lint. Real MySQL must verify constraints, rollback, duplicate submission, decision races and concurrent revocation; separately approve database writes. EF InMemory is insufficient.

Run UI doctor before fixture QA at 1440/1024/390/360px and Russian 360px. Cover creation, pending, acceptance/rejection, empty/error, revocation, account changes, keyboard, overflow and bottom navigation. Refresh visual evidence before code review and report summary verification separately from unrelated stale evidence.

## Implementation verification — 2026-10-16

Code review is complete with the findings corrected; status remains in-review pending separately approved real MySQL verification. Frozen intent above is unchanged. The initial planning-only note records the earlier planning phase.

- Backend: separate immutable request terms/audit, same-currency acceptance, user-scoped lifecycle, serializable create/decisions/mutation guards, concurrency version and MySQL unique/FK constraints. Existing comment marker handling is shared by both posting paths.
- Frontend: optional linked recipient, participant names, requests outside ledger filters, global pending count, explicit credit/debit consent, eligible own-account selection, terminal history and localized recoverable errors; linked views expose no decision controls.
- `dotnet build inex.sln --no-restore`: PASS (2 existing IBudgetService hiding warnings).
- `dotnet test inex.sln --no-build`: PASS — 12 application + 131 service + 191 integration tests; 1 explicit MySQL suite skipped.
- `npm test`: PASS — 239 tests across 39 files. `npm run build` and `npm run lint`: PASS. Existing Vite chunk-size/deprecation and React test warnings remain.
- UI doctor: PASS, 20 checks. Fixture visual QA: PASS, 15 states at 1440/1024/390/360px, Russian 360px, acceptance via keyboard account selection, rejection, creation, sent, no-account, revoked, accepted/rejected, empty/error. Actual desktop/mobile/Russian/create screenshots inspected. No horizontal overflow, out-of-bounds request controls, or bottom-nav obstruction of final content. Evidence: `docs/implementation/visual-qa/linked-internal-transfer/qa-summary.json`.
- Global `npm run visual-qa:verify`: FAIL only because 8 unrelated canonical summaries are stale (259–954 hours); this feature has fresh isolated passing evidence. Existing canonical summaries were preserved.
- MySQL: read-only inspection succeeded; **migration not applied, write/concurrency suite not run**. Review SQL: `docs/implementation/linked-transfer-migration.sql`; explicit opt-in plan: `docs/implementation/linked-transfer-mysql-verification.md`. EF InMemory coverage does not establish MySQL correctness.

Durable tooling follow-up from sandbox/QA friction: add a scoped summary-verification option for feature-specific fixture evidence, so unrelated stale canonical screenshots do not obscure a fresh scoped result.

### Code review patches — 2026-10-16

- Normalize operation timestamps to MySQL microseconds before both persistence and submission-key comparison. Pure unit, lifecycle, and opt-in MySQL regression use seven fractional digits.
- Serialize account updates and prevent currency changes while that account contains a Pending master posting. Metadata remains editable; resolved postings retain independent currency edits. Ownership, metadata, Pending and resolved cases are covered.
- Scope request cache entries to the authenticated user and page, skip anonymous reads, reset pagination on every account switch, and reset per-card state across owners. Verify A(page 2) → B(page 1) → A(page 1) and isolation from another user's cached comments.
- When polling observes Pending → Accepted, a pending-count decrease, or disappearance of a Pending request from the same page, refresh ledger plus shared account/budget/report caches. Tests prove pagination transitions, one-time invalidation, and actual ledger cache refetch.
- Compute page offsets as long values; extreme pages return an empty participant-scoped result without integer overflow.

Post-patch checks: final full solution run PASS — 12 application + 132 service + 197 integration tests (341 total), 1 opt-in MySQL SKIP. Final full frontend run PASS — 247 tests across 39 files; typecheck/build/lint PASS. Fixture QA refreshed: all 15 states PASS, acceptance screenshot inspected. No real database writes or migration application performed.


## Suggested Review Order

- Start with atomic creation and recipient-only decisions.
  [InternalTransferRequestService.cs:14](../../inex.Services/Services/InternalTransferRequestService.cs#L14)
- Check transaction scope and serializable persistence.
  [InExUnitOfWork.cs:28](../../inex.Data/Repositories/InExUnitOfWork.cs#L28)
- Check immutable request history, unique indexes, and deletion behavior.
  [InternalTransferRequestConfiguration.cs:8](../../inex.Data/Configurations/InternalTransferRequestConfiguration.cs#L8)
- Check pending operation and account mutation guards.
  [TransactionService.cs:186](../../inex.Services/Services/TransactionService.cs#L186)
  [AccountService.cs:101](../../inex.Services/Services/AccountService.cs#L101)
- Check account consent, polling refresh, and authenticated cache scope.
  [InternalTransferRequests.tsx:14](../../inex/ClientApp/src/pages/Transactions/InternalTransferRequests.tsx#L14)
  [transactions-api.ts:210](../../inex/ClientApp/src/store/transactions/transactions-api.ts#L210)
- Review resolved findings and the separately approved MySQL verification scope.
  [Code review](linked-transfer-code-review.md)
  [MySQL verification](linked-transfer-mysql-verification.md)


## Release request — 2026-10-22

The user explicitly requested a pull request and merge into production. The earlier refusal of test database writes remains in effect: no disposable MySQL database was created, the migration was not tested against MySQL, and the real-provider concurrency suite remains skipped. Production startup applies EF migrations through the existing deployment path. Release authorization does not change the incomplete verification status.
