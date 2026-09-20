---
title: 'Show linked-account transactions in read-only mode'
type: 'feature'
created: '2026-09-20'
status: 'review'
baseline_commit: '7396d2b0a7e9794bc1d937e45dd77f8f53a9a5b1'
context:
  - '{project-root}/inex/ClientApp/AGENTS.md'
  - '{project-root}/docs/design/docs/design-implementation-guide.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Transactions page ignores the selected linked-account workspace, so it reads the signed-in user's financial data and still exposes transaction mutations while another user's workspace is selected.

**Approach:** Scope transaction list, summary, account, category, account-summary, and cached-rate reads to the selected linked user, and make the existing ledger explicitly read-only while preserving the self-view experience and existing page states.

## Boundaries & Constraints

**Always:** Use the global linked-account selection as the single scope source; use the selected user's accounts, categories, active flags, base currency, and cached exchange rates; reset pagination and account/category filters at scope changes; keep month, type, search, tag/ref filters and established loading/empty/error/filter/pagination behavior; use localized UI copy; recover to self-view when a linked 404 clears the global selection.

**Ask First:** Any backend-contract change, new transaction-detail UI, or behavior that changes self-view filtering or mutation flows.

**Never:** Send linked-user mutation requests; expose Add/Edit/Delete/transfer controls in linked mode; allow linked rows to open the edit form by pointer or keyboard; combine users' feeds; persist the linked selection; call external rate providers.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Linked view | Active selected linked user | All reference data, list, summary, conversions, and account overview belong to that user; a named read-only indicator is visible | Existing partial/initial loading and error states remain available |
| Scope switch | Self-to-linked, linked-to-self, or linked-to-linked | Account/category filters and pagination reset; other compatible filters remain | No stale scoped rows or filters render |
| Revoked link | Scoped read returns 404 | Global selection clears and self transactions reload | Existing global unavailable warning explains the fallback |
| Empty linked ledger | Authorized linked user has no transactions | Read-only empty state has no create action | No mutation drawer can open |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/store/transactions/transactions-api.ts` -- transaction list/summary query arguments, URLs, and cache identity.
- `inex/ClientApp/src/pages/Transactions.tsx` -- selected scope, linked reference data, filter reset, read-only indicator, and mutation visibility.
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx` -- pagination scope identity and row/empty-state edit affordances.
- `inex/ClientApp/src/pages/Transactions.month-controls.test.tsx` -- page integration test harness for scope switches and controls.
- `inex/ClientApp/src/pages/Transactions/TransactionList.test.tsx` -- ledger interaction coverage.
- `inex/ClientApp/src/store/transactions/__tests__/transactions-api.test.ts` -- request and cache-scope coverage.
- `inex/ClientApp/visual-qa/transactions.mjs` -- fixture states when the harness can model linked context.

## Tasks & Acceptance

**Execution:**
- [ ] `inex/ClientApp/src/store/transactions/transactions-api.ts` -- add optional linked scope to list and summary query contracts, URLs, and serialization.
- [ ] `inex/ClientApp/src/pages/Transactions.tsx` -- consume global scope, request linked financial context, reset incompatible state, pass read-only scope to the ledger, and suppress creation UI.
- [ ] `inex/ClientApp/src/pages/Transactions/TransactionList.tsx` -- reset pagination by owner and render linked rows/empty states without mutation affordances.
- [ ] Focused frontend tests -- cover scoped requests, context changes, read-only interactions, and revoked-link fallback.

**Acceptance Criteria:**
- Given a selected active linked user, when Transactions loads, then list, summary, references, base currency, activity state, balances, and cached conversions are scoped to that user.
- Given linked mode, when the user inspects an empty or populated ledger, then no create/edit/delete/transfer entry point is present and row pointer/keyboard activation cannot open `TransactionEditForm`.
- Given the data owner changes or becomes unavailable, when Transactions rerenders, then pagination and owner-specific filters reset, no foreign stale data remains, and self-view resumes after revocation.
- Given no linked user is selected, when Transactions loads, then existing self reads, mutation controls, and page states are unchanged.

## Spec Change Log

## Verification

**Commands:**
- `npm test -- --run <focused transaction tests>` -- expected: scoped request and read-only interaction tests pass.
- `npm run build` -- expected: TypeScript and production build pass.
- `npm run lint` -- expected: frontend lint passes.
- `npm run visual-qa:transactions` -- expected: run only if the fixture harness can represent linked mode without broad harness work.
