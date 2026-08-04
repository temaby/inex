---
title: 'Keep the transactions page populated during progressive loading'
type: 'bugfix'
created: '2026-08-04'
status: 'done'
context:
  - 'AGENTS.md'
  - 'inex/ClientApp/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After delivery #291, the transactions ledger can enter its empty state despite a successful first-page response. The new progressive paging flow renders only its delayed accumulator state, leaving a visible gap between RTK Query receiving page one and the effect that records it.

**Approach:** Treat the fulfilled first response as the display source until the progressive accumulator has accepted a page. Keep the accumulator as the source once it owns the sequence, preserving existing deduplication and sequential-page guarantees.

## Boundaries & Constraints

**Always:** Keep filtering, request arguments, ownership scoping, API response contracts, and pagination behavior unchanged. Show the same first-page items and total that the existing query returns. Preserve progressive-page ordering and deduplication after the first page has been accumulated.

**Ask First:** Changing server endpoints, transaction filter semantics, pagination sizes, URL behavior, or visual design requires user direction.

**Never:** Do not remove progressive loading, add a client-side transaction cache, change the backend, or mask a failed request as an empty successful result.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| First page fulfilled | Progressive accumulator has no accepted page; current RTK Query response has transaction items and total | Ledger renders those returned items and total immediately | N/A |
| Accumulator owns sequence | Page one or later has been accepted | Ledger renders only accumulated, deduplicated items and accumulated total | Reject stale or out-of-order pages as before |
| No result | First-page response is fulfilled with no items | Existing empty or filtered-empty state remains visible | N/A |
| Request failure | No successful page and query errors | Existing failure state remains visible | Retry uses the existing query refetch path |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx` -- chooses the ledger's visible items and total during progressive loading.
- `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts` -- owns pure progressive-page display and accumulation rules.
- `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.test.ts` -- verifies the first-response handoff without a browser timing dependency.

## Tasks & Acceptance

**Execution:**
- [x] `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts` -- expose a pure display resolver that uses the initial response only until the accumulator has accepted a page -- prevent the ledger from rendering a false empty state.
- [x] `inex/ClientApp/src/pages/Transactions/TransactionList.tsx` -- use the resolver for progressive item and total rendering -- retain existing loading, error, and follow-up page behavior.
- [x] `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.test.ts` -- cover a fulfilled page-one response before the state effect and the post-accumulation state -- lock in the regression repair.

**Acceptance Criteria:**
- Given a successful first page for a progressive range, when RTK Query exposes the response before the accumulator effect runs, then the transactions ledger renders that page rather than an empty state.
- Given that a progressive page has been accumulated, when the next page is requested or the query has no current response, then the ledger retains the accumulated sequence and total.
- Given that the active filter changes before its reset effect commits, when a prior filter has accumulated pages, then the ledger does not display rows from that prior request.
- Given a fulfilled empty first page or a failed request, when the ledger renders, then the existing empty and failure states remain unchanged.

## Spec Change Log

- Adversarial review identified that a populated accumulator can belong to a prior filter while the reset effect is pending. The display boundary now includes the active request key and returns only current-query data (or no rows) on a key mismatch, avoiding stale rows during rapid filter changes.

## Design Notes

The query response is already tied to the active query argument through RTK Query's `currentData`. It is therefore a safe short-lived source for page one. The accumulator remains authoritative immediately after it accepts a page, which avoids exposing a later page by itself while its effect has not yet appended it.

```text
fulfilled page 1 + empty accumulator -> display page 1
accepted page 1 + later request       -> display accumulator
fulfilled empty page 1                -> display empty state
```

## Verification

**Commands:**
- `npm test -- --run src/pages/Transactions/transaction-ledger-utils.test.ts` (from `inex/ClientApp`) -- expected: all ledger utility tests pass, including the first-page display regression.
- `npm run lint` (from `inex/ClientApp`) -- expected: no lint errors.
- `npm run build` (from `inex/ClientApp`) -- expected: production build succeeds.
