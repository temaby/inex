---
title: 'Hide transfer requests when none are pending'
type: 'bugfix'
created: '2026-10-25'
status: 'done'
route: 'one-shot'
---

# Hide transfer requests when none are pending

## Intent

**Problem:** The Transactions page displays the transfer requests section even when no transfers await confirmation.

**Approach:** Hide the section when the current query response reports zero total pending requests. Keep the query subscription, polling and financial cache refresh active so new requests reappear and the last resolved request still refreshes booked totals. Preserve loading and retry feedback when the pending count is unknown or a failed refresh leaves it stale.

## Suggested Review Order

1. Check the visibility condition after all hooks and cache refresh logic.
   [InternalTransferRequests.tsx:87](../../inex/ClientApp/src/pages/Transactions/InternalTransferRequests.tsx#L87)
2. Check terminal history and empty-to-pending-to-resolved regression coverage.
   [InternalTransferRequests.test.tsx:25](../../inex/ClientApp/src/pages/Transactions/InternalTransferRequests.test.tsx#L25)
3. Check browser assertions for hidden sections after decisions and zero-pending responses.
   [transactions.mjs:1078](../../inex/ClientApp/visual-qa/transactions.mjs#L1078)
4. Review refreshed fixture evidence: 15 states, no failures, no real backend calls.
   [qa-summary.json](visual-qa/linked-internal-transfer/qa-summary.json)
