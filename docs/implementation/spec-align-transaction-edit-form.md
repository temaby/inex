---
title: 'Align transaction editing with the updated add form'
type: 'bugfix'
created: '2026-11-21'
status: 'done'
baseline_commit: '0edee5fe4e97f88ab2a88bd4c375f0935757b33d'
context:
  - 'docs/project-context.md'
  - 'inex/ClientApp/AGENTS.md'
  - 'docs/implementation/spec-transaction-quick-entry.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Adding transactions uses the new quick-entry presentation, but editing an existing transaction still displays the old category-before-amount layout, small amount field, standalone date picker, and permanently expanded comment field.

**Approach:** Bring the editor into the same visual language by reusing the current add-form controls and styling where appropriate. Order fields as Account, Amount, Category, Date, Comment, retain existing values, and keep the editor's Save and confirmed Delete actions.

## Boundaries & Constraints

**Always:** Preserve signed amounts, historical dates, selected archived accounts and disabled historical categories, system-category restrictions, correction reason requirements, update/delete payloads, error recovery, and return-to-ledger behavior. Keep financial state local and use the existing authenticated mutations. Reuse localized labels and shared design tokens. Existing comments must be visible on opening; empty optional comments may collapse. Required correction reasons remain visible. Account currency changes retain the numeric amount.

**Ask First:** Changes to transaction type semantics, backend contracts, ownership rules, dependencies, or persisted data beyond ordinary user-initiated editing.

**Never:** Apply creation account recommendations or reset historical values when opening an editor. Add transaction-type switching, linked-transfer management, or automatic category selection. Call live exchange providers from verification. Rewrite completed story records or include generated build output.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Expense or income | Existing signed amount and date | Prominent amount, currency, searchable category, compact date; values retained | Existing mutation error remains actionable |
| Historical selections | Archived account or disabled category | Current selection remains displayed and preserved unless deliberately replaced | Unknown-account fallback remains available |
| System transaction | Correction or transfer category | System category remains read-only; signed amount retained | Correction reason stays visible and required |
| Optional comment | Existing text or empty string | Existing text expanded; empty comment expandable; marker text preserved | Failed save retains draft |
| Save/delete | Modified record or confirmed deletion | Existing request contracts, loading states, and success callback | Failed requests leave drawer open |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Transactions/TransactionEditForm.tsx` — editor state, historical selections, fields and mutations.
- `inex/ClientApp/src/pages/Transactions/TransactionCreationFields.tsx` — existing amount, compact date and expandable comment presentation.
- `inex/ClientApp/src/components/ExpressionInputNumber.tsx` — signed arithmetic input; retain editing semantics when sharing presentation.
- `inex/ClientApp/src/pages/Transactions/transaction-creation.css` and `transactions-ledger.css` — current quick-entry appearance and editor sizing/actions.
- `inex/ClientApp/src/pages/Transactions/TransactionEditForm.test.tsx` — historical selection and update payload coverage.
- `inex/ClientApp/visual-qa/transactions.mjs` and `transaction-quick-entry.mjs` — fixture data, drawer interactions and screenshot infrastructure.

## Tasks & Acceptance

**Execution:**
- [x] `TransactionEditForm.tsx` — replace old field composition with the updated presentation, preserving financial state and mutation behavior.
- [x] `TransactionCreationFields.tsx`, `ExpressionInputNumber.tsx`, transaction styles — share presentation with explicit compatibility handling where creation and editing differ; avoid changing add behavior.
- [x] `TransactionEditForm.test.tsx` and affected shared-field tests — verify signed amounts, historical selections, dates/comments, correction restrictions, and save/delete recovery using existing test infrastructure.
- [x] `visual-qa/transaction-edit.mjs`, `docs/implementation/visual-qa/transaction-edit/` — capture isolated fixture screenshots and behavioral results at 1440, 1024, 390 and 360px, including Russian narrow-screen stress.
- [x] Run focused tests, frontend build/lint and feature visual QA; inspect screenshots before reviewing the final diff.

**Acceptance Criteria:**
- Given an existing transaction, when its edit drawer opens, then its field order, amount emphasis, pickers, spacing and optional comment presentation align with the add form.
- Given a historical or system transaction, when another field is edited and saved, then signed amount, historical ownership references, date and system semantics are retained unless explicitly changed.
- Given an update failure, when the user retries, then the entered draft remains available and success returns to the existing ledger context.
- Given English or Russian at the required viewport widths, when editing, then controls remain readable and reachable without clipping or horizontal overflow.

## Spec Change Log

## Design Notes

The completed quick-entry spec explicitly left editing unchanged. This follow-up extends its presentation to editing while preserving the editor's distinct signed-amount and system-category behavior. Do not copy creation initialization or account recommendations into editing.

The current checkout is clean on `feature/category-report-redesign`. Use a new `fix/transaction-edit-form` branch for this unrelated fix after the workflow checkpoint.

## Verification

- Project doctor UI: PASS, 22 checks and no warnings.
- `npm test -- TransactionEditForm TransactionCreationFields ExpressionInputNumber` — affected controls and historical payload regressions pass.
- `npm run build` and `npm run lint` — pass.
- `node visual-qa/transaction-edit.mjs` — fixture-backed responsive and behavior checks pass; all app API requests intercepted.
- `npm run visual-qa:verify` — report summary and distinguish unrelated stale baselines from this feature's results.

## Implementation Verification

- Focused editor/shared-field tests: 16 PASS. Creation, recommendation-cache and ledger tests: 35 PASS (51 total).
- Production build/typecheck and lint: PASS.
- Fixture browser QA: 17/17 PASS at 1440/1024/390/360px, including Russian 360px, system transactions, search/calendar/comment/currency overlays, confirmed deletion and failed-update retry. Historical signed amount/date/account/category payloads and focus return are asserted. All app API requests intercepted; no real backend or exchange provider calls.
- Inspected desktop/tablet/mobile/Russian, correction, category-search, calendar, delete confirmation and failure screenshots. No drawer overflow or unreachable footer controls.
- Aggregate visual verifier: FAIL only because 12 untouched canonical summaries exceed 24 hours; new feature summary reports zero failures.
- Browser runtime required documented sandbox escalation. Focus assertions wait for drawer close animation and the expected ledger focus target.

- Independent blind, edge-case and acceptance reviews found no actionable introduced defects.
- Tooling follow-up: use shared workspace paths for temporary review snapshots; sandbox temp paths differ between tool calls.

## Suggested Review Order

- Compare updated fields and retained Save/Delete actions.
  [TransactionEditForm.tsx:145](../../inex/ClientApp/src/pages/Transactions/TransactionEditForm.tsx#L145)

- Preserve historical values and reset local disclosure when switching records.
  [TransactionEditForm.tsx:85](../../inex/ClientApp/src/pages/Transactions/TransactionEditForm.tsx#L85)

- Share amount presentation while keeping signed editing behavior.
  [TransactionCreationFields.tsx:11](../../inex/ClientApp/src/pages/Transactions/TransactionCreationFields.tsx#L11)

- Verify signed historical payloads, corrections and error recovery.
  [TransactionEditForm.test.tsx:112](../../inex/ClientApp/src/pages/Transactions/TransactionEditForm.test.tsx#L112)

- Reproduce responsive fixture screenshots and update/delete checks.
  [transaction-edit.mjs:100](../../inex/ClientApp/visual-qa/transaction-edit.mjs#L100)

