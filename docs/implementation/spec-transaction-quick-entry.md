---
title: 'Streamline transaction creation'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_commit: '9af8ef368ddc8c10758bb0b2aed33fd846fffae4'
context:
  - 'docs/project-context.md'
  - 'inex/ClientApp/AGENTS.md'
---

<frozen-after-approval reason="User supplied detailed intent and explicitly authorized autonomous implementation without stopping after planning">

## Intent

**Problem:** Everyday transaction entry gives equal visual weight to infrequent operations and optional fields. Recording an expense should require entering an amount, explicitly choosing a category, and saving when the recommended account is correct.

**Approach:** Keep the drawer and existing financial workflows. Introduce primary type buttons and a More menu, dynamic headings, account–amount–category order, prominent locale-aware amounts, compact dates, expandable comments, and recent category shortcuts with searchable hierarchical selection.

## Boundaries & Constraints

**Always:** Preserve five transaction type values, validation, account recommendations and eligibility, authenticated API infrastructure, independent transfer amounts/currencies, correction direction and required reason, internal-transfer recipient/idempotency behavior, comment markers, EN/RU translations, edit behavior, and mobile accessibility. Default new transactions to Expense and today. Category choice never changes the account. A currency change retains the entered number and announces its new currency.

**Ask First:** Changes to financial semantics, permissions, endpoints, schema, or dependencies beyond the supplied scope.

**Never:** Change backend contracts, conversion rules, ledger design, or database data; call exchange providers from QA; introduce dependencies; automatically choose a category; rewrite completed story records.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Ordinary entry | Recommended eligible account; Expense/Income | Account before empty amount before category; explicit category choice; existing signed payload | Existing field/API feedback |
| Type change | Primary button or More option | Exactly one active control; dynamic heading; incompatible state reset | Clear obsolete validation |
| Currency change | Entered amount, different-currency account | Number retained; suffix and subtle feedback update immediately | No conversion or confirmation |
| Categories | Previous 30 days, eligible leaf categories | Up to three ranked by frequency then latest use; search retains hierarchy context | Hide on no history, failed/incomplete bounded history |
| Date/comment | Today or historical date; optional comment | Compact localized date opens picker; comment expands without losing text | Date remains required; correction reason visible and required |
| Transfers | Two accounts or internal single-account direction | Preserve independent amounts and existing payloads | Existing validation and retry behavior |
| Editing | Existing transaction | Existing editor and historical values preserved | Existing validation unchanged |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx` — reducer, defaults and five mutation payloads.
- `inex/ClientApp/src/pages/Transactions/TransactionCreate*Form.tsx` — creation-only financial fields.
- `inex/ClientApp/src/pages/Transactions.tsx` — drawer heading and mode callback.
- `inex/ClientApp/src/components/Dropdown.tsx` — shared bounded hierarchical Menu; preserve editing/budget consumers.
- `inex/ClientApp/src/components/ExpressionInputNumber.tsx` — existing arithmetic input shared with editor; creation enhancements must be opt-in.
- `inex/ClientApp/src/store/transactions/transactions-api.ts` — existing date-bounded paginated history query.
- `inex/ClientApp/visual-qa/transactions.mjs` — fixture interception and browser harness.

## Tasks & Acceptance

**Execution:**
- [x] `TransactionCreate.tsx`, `Transactions.tsx`, locale files — type controls, dynamic headings, preserve validation and payloads.
- [x] `TransactionCreate*Form.tsx`, creation field helpers and stylesheet — account/amount/category order, currency feedback, compact date and comments.
- [x] Creation category helper and tests — bounded recent history, eligible ranking, hierarchical search and explicit shortcut selection.
- [x] Creation and existing editor tests — cover mode changes, validation, amount clearing/precision/currency, dates/comments, shortcuts, saved payloads and edit regression.
- [x] `visual-qa/transaction-quick-entry.mjs`, feature evidence and QA checklist — fixture desktop/mobile EN/RU screenshots and behavioral checks before review.
- [x] Run focused/full frontend tests, build, lint, fixture QA and summary verification; independently review resulting diff and fix confirmed defects.

**Acceptance Criteria:**
- Given a new ordinary expense, when amount and category are entered, then saving uses the existing recommended account and API payload.
- Given any of five types, when selected, then heading, active control, fields and save action reflect its semantics.
- Given nested categories or a shortcut, when selected by keyboard or pointer, then the same eligible ID is submitted and account remains unchanged.
- Given a 360/390/1024/1440px viewport in English or Russian, when entering a transaction, then controls remain readable, reachable and within the drawer.
- Given a failed save, when the user retries, then entered data remains intact and in-flight submission is guarded.

## Design Notes

The supplied intent supersedes the earlier Account–Category–Amount creation order in the Transactions UX specification. Keep correction reason visible because it is mandatory. Keep the independent edit form unchanged. Optional Save and add another is deferred unless it fits the current close-on-success callback without expanding scope.

Recent history must use an existing authenticated endpoint and bounded data. If complete frequency ranking cannot be obtained within that bound, hide shortcuts rather than present an inaccurate ranking. Standard selection remains available.

## Verification

- Project doctor UI: PASS, 21 checks, no warnings.
- Focused transaction, picker, amount and recommendation tests; full `npm test`.
- `npm run build`, `npm run lint`.
- Feature fixture browser QA at 1440/1024/390/360 and Russian 360; inspect images and record fixture data mode.
- `npm run visual-qa:verify`; distinguish stale unrelated baselines from feature failures.

## Spec Change Log


## Implementation Verification

- Implemented P1/P2 and type-specific save labels. Preserved existing five mutation payloads, account recommendation flow and editor. Both regular-transfer account lookups are confirmed owner-scoped in the existing backend; no backend changes were needed.
- Recent category shortcuts rank enabled ordinary leaves by frequency, latest use and stable ID across today plus the previous 29 local dates. One bounded 500-row history request is made per opening; incomplete/error results hide suggestions. Per-store pending-request coordination prevents aborted-query reuse across remounts and user changes.
- Creation-only amount behavior retains arithmetic and comma entry, uses two-decimal payload precision, starts empty, clears stale numeric values for invalid drafts, and preserves drafts during incremental typing. Currency changes retain the number and announce the currency. Shared editor behavior remains unchanged.
- Correction reasons remain mandatory and visible. Date selection preserves historical dates, restores focus on Escape/selection, and respects deliberate outside focus moves. More-menu focus uses cancellable scheduling.
- Full frontend verification: 50 files / 430 tests PASS; build/typecheck and lint PASS. Existing warnings concern Vite CJS/chunk size, Ant Design addon deprecation, and Router future flags.
- Feature fixture QA: 20/20 PASS at 1440/1024/390/360px and Russian 360px. Shared picker fixture QA: 17/17 PASS, including editing, budget multiple selection, long lists, nested categories, scrolling, Escape/Tab and focus return. Screenshots/contact sheet inspected; no horizontal overflow, clipped controls or unhandled API requests. All API requests were intercepted; no real backend or exchange provider calls.
- Aggregate visual summary verifier: FAIL because all ten canonical page baselines exceed 24 hours. The new feature summary and refreshed shared-picker summary report zero failures.
- Three independent review roles completed. Confirmed draft-expression, date-focus and rapid-remount issues were fixed and regression-tested; final follow-up review found no blocking defects.
- Optional Save and add another omitted because success currently closes the drawer. Scope stays focused on the required P1/P2 experience.
- Tooling retrospective: `transaction-quick-entry-retrospective.md`. Added independent picker-state filtering and centered physical fixture clicks to avoid action-footer occlusion; refreshed legacy creation-type QA selectors.

## Suggested Review Order

- Review the type controls, retained validation and mutation boundaries.
  [TransactionCreate.tsx:135](../../inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx#L135)

- Inspect creation-only amount, date and comment interactions.
  [TransactionCreationFields.tsx:10](../../inex/ClientApp/src/pages/Transactions/TransactionCreationFields.tsx#L10)

- Check draft synchronization and two-decimal payload behavior.
  [ExpressionInputNumber.tsx:60](../../inex/ClientApp/src/components/ExpressionInputNumber.tsx#L60)

- Verify complete, owner-local bounded history and pending-request cleanup.
  [useRecentCategories.ts:17](../../inex/ClientApp/src/pages/Transactions/useRecentCategories.ts#L17)

- Follow eligible category ranking and hierarchical search.
  [recent-categories.ts:13](../../inex/ClientApp/src/pages/Transactions/recent-categories.ts#L13)

- Check fixture coverage and save-payload verification.
  [transaction-quick-entry.mjs:9](../../inex/ClientApp/visual-qa/transaction-quick-entry.mjs#L9)
