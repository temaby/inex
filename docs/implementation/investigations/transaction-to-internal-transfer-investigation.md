# Investigation: Regular Transaction to Internal Transfer Rejection

## Hand-off Brief

1. **What happened.** Converting a regular transaction to an internal transfer is rejected with `System transactions must retain their system category`.
2. **Where the case stands.** Concluded: the guard is deliberate and preserves the invariant that system categories are assigned only by their dedicated workflows.
3. **What's needed next.** Create a new internal-transfer record through the dedicated workflow; do not change a regular record's category to the system category.

## Case Info

| Field | Value |
| --- | --- |
| Ticket | N/A |
| Date opened | 2026-08-29 |
| Status | Concluded |
| System | InEx transaction API and React ledger |
| Evidence sources | User-reported error, Git history, source code |

## Problem Statement

User reports that changing an existing transaction to an internal transfer produces `System transactions must retain their system category`.

## Evidence Inventory

| Source | Status | Notes |
| --- | --- | --- |
| User-visible error | Available | Exact error text supplied by the user. |
| Commit `3c3d1fa` | Available | Introduced the guard and the internal-transfer creation workflow. |
| Current branch source | Partial | This branch predates the internal-transfer commit, so it does not contain the error text. |

## Confirmed Findings

### Finding 1: The guard rejects conversions across the system-category boundary

**Evidence:** `3c3d1fa:inex.Services/Services/TransactionService.cs` in `UpdateAsync`

**Detail:** Updating is rejected when the existing and requested categories differ in `IsSystem`, or when an existing system transaction is assigned to another system category. This causes a regular transaction to internal-transfer conversion to fail.

### Finding 2: Internal transfers have their own creation endpoint

**Evidence:** `3c3d1fa:inex/Controllers/TransactionsController.cs` and `3c3d1fa:inex.Services/Services/TransactionService.cs`

**Detail:** `POST /api/transactions/internal-transfer` assigns the `internal-transfer` system category server-side and creates the signed user-owned transaction. Standard creation also rejects an explicitly supplied system category.

## Deduced Conclusions

### Deduction 1: A conversion would bypass transfer-specific semantics

**Based on:** Findings 1 and 2.

**Reasoning:** A normal update changes only one ordinary transaction. The dedicated workflow assigns a protected category and applies internal-transfer direction/sign semantics.

**Conclusion:** The rejection is intentional domain validation, not a malformed request or an arbitrary category-permission failure.

## Source Code Trace

| Element | Detail |
| --- | --- |
| Error origin | `TransactionService.UpdateAsync` in commit `3c3d1fa` |
| Trigger | Editing a transaction so its category changes between ordinary and system categories |
| Condition | `source.Category.IsSystem != category.IsSystem` |
| Related files | `TransactionsController.cs`, `CreateInternalTransferRequest.cs`, transaction API client |

## Conclusion

**Confidence:** High

The application deliberately prevents an existing ordinary transaction from becoming an internal transfer. An internal transfer must be recorded through the dedicated creation flow, which applies the system category and direction safely.

## Recommended Next Steps

### Fix direction

For the user workflow, create an internal transfer as a new record and remove or correct the original ordinary transaction if it was entered by mistake. Supporting conversion would require an explicit product and data-integrity design, not a category-only edit.

## Reproduction Plan

1. Create an ordinary income or expense transaction.
2. Submit a regular transaction update with the internal-transfer system category.
3. Observe the `system-category-transaction-update` domain-rule error.
