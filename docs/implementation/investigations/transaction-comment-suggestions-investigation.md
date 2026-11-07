# Investigation: Transaction comment suggestions

## Hand-off Brief

1. The user asks what is needed to suggest existing #tags and @references while entering a transaction comment.
2. Creation forms share a plain `CreationComment` input, and no suggestions endpoint was found; writes already maintain a user-scoped marker catalog despite the documented parse-on-read rule.
3. Add an owner-scoped bounded read API and token-aware autocomplete; settle catalog versus current-comment semantics before implementation.

## Case Info

| Field | Value |
| --- | --- |
| Ticket | N/A |
| Date opened | 2026-11-07 |
| Status | Concluded |
| System | InEx React/TypeScript frontend and ASP.NET Core backend |
| Evidence sources | Working-tree source, project instructions and planning documents |

## Problem Statement

User question: «что надо сделать, чтобы при добавлении транзакции и вводе комментария, который начинается на # или @ предлагались существующие варианты?»

Scope: read-only analysis and implementation direction; no application changes requested.

## Evidence Inventory

| Source | Status | Notes |
| --- | --- | --- |
| Creation form source | Available | Shared comment field confirmed |
| Metadata API and comment parser | Available | Existing catalog, parser and API surface traced |
| Runtime/browser behavior | Missing | No runtime verification performed |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | Shared comment field and creation flows | High | Done | Shared plain input confirmed |
| 2 | Existing tag/ref metadata and ownership | High | Done | Catalog exists; read endpoint absent |
| 3 | Implementation and verification direction | Medium | Done | Read API plus shared autocomplete proposed |

## Confirmed Findings

### Finding 1: Income and expense forms share a comment field

**Evidence:** `inex/ClientApp/src/pages/Transactions/TransactionCreateIncomeForm.tsx:115`; `inex/ClientApp/src/pages/Transactions/TransactionCreateExpenseForm.tsx:115`.

Both render `CreationComment` imported from `TransactionCreationFields`.

### Finding 2: The shared field lacks autocomplete

**Evidence:** `inex/ClientApp/src/pages/Transactions/TransactionCreationFields.tsx:74`; `inex/ClientApp/src/pages/Transactions/TransactionCreationFields.tsx:86`.

The field is a controlled Ant Design Input. Transfer and internal-transfer forms also use it (`TransactionCreateTransferForm.tsx:119`, `TransactionCreateInternalTransferForm.tsx:94` in the same directory). Editing uses a separate input (`TransactionEditForm.tsx:206`).

### Finding 3: There is persisted marker data, but no suggestions API

**Evidence:** `inex.Services/Services/TransactionCommentMarkers.cs:10`, `:11`, `:33`, `:35`, `:48`; `inex.Services/Services/TransactionService.cs:140`, `:266`.

Writes maintain a Tag catalog and transaction links; marker values are lowercased and divided into TAG and REF. Catalog lookups include UserId and Type. This contradicts documentation that parsed values are never stored separately. Response parsing still occurs on read (`inex.Services/Models/Records/Transaction/TransactionResponse.cs:23`, `:24`): tokens start at the beginning or after a literal space and end at the next space; response values omit the marker.

No tag/ref read endpoint was found when searching controllers, service interfaces/implementations and frontend store APIs. Relevant API surfaces: `inex/Controllers/TransactionsController.cs:28`, `:33`; `inex/ClientApp/src/store/transactions/transactions-api.ts:210`.

## Deduced Conclusions

An implementation needs both a read API and UI behavior. Existing marker storage suggests no migration is needed, subject to deciding whether stale catalog entries qualify as existing values. The shared field allows creation modes to receive the behavior together; editing would require separate integration.

## Hypothesized Paths

### Hypothesis 1: Existing metadata may support a frontend-only enhancement

**Status:** Refuted.

**Would confirm:** Existing owner-scoped API returns all distinct tags and references, and shared comment field lacks suggestions.

**Would refute:** Metadata endpoint is absent or does not supply usable values.

**Resolution:** Storage exists but no usable read endpoint was found; a frontend-only change cannot provide complete historical suggestions through current contracts.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | --- | --- |
| Runtime interaction | Cannot claim tested UI behavior | Focused component tests and browser QA during implementation |

## Conclusion

**Confidence:** High for source structure; runtime behavior unverified.

Source inspection supports a small backend-plus-frontend enhancement. The catalog/documentation discrepancy and orphaned-entry semantics remain implementation decisions. No application code, schema, runtime or tests were changed.

## Recommended Next Steps

Add an authenticated bounded marker lookup filtered by CurrentUserId and marker type. Prefer distinct values still used in current owned transactions if “existing” means currently used; verify provider query translation against MySQL. Add a shared token-aware comment autocomplete: # selects tags, @ selects references; preserve surrounding text and allow new values. Reuse RTK Query and apiClient, debounce searches, isolate user cache and reject stale results.

Verify ownership, type/prefix filtering, limits, caret replacement, Cyrillic, free text, keyboard/touch selection and Enter suppression. Errors must leave comment entry usable. Run focused tests, frontend build/lint and visual QA during implementation. Recommended next implementation workflow: `bmad-quick-dev`, once implementation is requested.
