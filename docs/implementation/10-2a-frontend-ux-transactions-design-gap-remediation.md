# Story 10.2a: Frontend UX - Transactions Design Gap Remediation

Status: review

## Story

As an invited account holder,
I want the Transactions ledger scope, row meaning, and filter controls to match the design contract,
so that transaction review is self-explanatory without hidden context or color-only cues.

## Acceptance Criteria

1. Given an active Transactions period, when `/transactions` renders, then KPI values, supporting copy, visible currency context, ledger period badge, toolbar visible/total count, segmented-control counts, and pagination summary use one explicit localized scope contract.
2. Given grouped transaction rows render, when a date is today, yesterday, or an older localized date, then the day header uses the correct friendly localized label and keeps item counts plus day totals visible.
3. Given a transaction category has parent context or the row account currency differs from the base display currency, when the row renders, then metadata shows `Parent > Child` where applicable, transfers remain neutral, non-base rows show a muted approximate base-currency subline when rate data is available, and income/expense values include explicit signs or a reachable signage preference.
4. Given the advanced filter drawer is opened, when filters render, then there is one intentional filter entry point, the drawer contains Date range, Account, Category, Tags/refs, and Amount equivalent in one typed form, URL/filter-chip compatibility is preserved, and touched TypeScript files add no new `any`.
5. Given the story is complete, when `npm run build`, `npm run lint`, and visual QA run from `inex/ClientApp`, then all pass and screenshots cover populated, filter-active, filter drawer open, long category paths, long amounts, and mobile ledger rows without horizontal overflow or bottom-nav occlusion.

## Tasks / Subtasks

- [x] Resolve and document the Transactions scope contract. (AC: 1)
  - [x] Decide whether KPI/count scope is active period or visible server result; do not leave copy implying both.
  - [x] Add visible period and currency context to KPI and ledger toolbar surfaces.
  - [x] Add type counts to the segmented control and period-aware pagination copy.
- [x] Finish row semantics and money fidelity. (AC: 2, 3)
  - [x] Add localized friendly day labels for Today and Yesterday while preserving older localized dates.
  - [x] Render parent category paths for category transactions and neutral transfer metadata for transfers.
  - [x] Add base-currency equivalent sublines where rate data exists.
  - [x] Ensure default visible amount treatment is not color-only unless a reachable signage preference exists.
- [x] Clean up the advanced filter drawer contract. (AC: 4)
  - [x] Keep one intentional filter entry point with consistent localized label.
  - [x] Move amount min/max fields inside the typed filter form.
  - [x] Remove `any` from touched filter form props/types.
  - [x] Preserve URL query and active-chip behavior from Story 10.2.
- [x] Validate build, lint, i18n, and visual QA. (AC: 5)
  - [x] Update EN/RU locale files for new visible labels.
  - [x] Run `npm run build`.
  - [x] Run `npm run lint`.
  - [x] Capture required screenshots and record no-overflow evidence.

### Review Findings

- [x] [Review][Patch] Base-currency totals and amount-equivalent filters must not include rows without same-base currency or matching exchange-rate data while the UI labels the totals as base-currency scoped. Resolved by making base conversion nullable and excluding unconvertible rows from base totals and equivalent amount filtering unless same-base or rate data exists.
- [x] [Review][Patch] Keep shared planning/status updates scoped to Story 10.2a. Resolved by narrowing Epic 10, sprint status, and Story 10.6 dependency changes to the Transactions gap remediation and leaving adjacent 10.3 gap artifacts unstaged.

## Dev Notes

### Source Gap Review

- Primary source: `docs/implementation/10-2-transactions-design-implementation-gap-review.md`.
- Story 10.2 remains the base redesign story; this follow-up remediates accepted residuals from that gap review.
- BudgetGlance from the design review is explicitly out of scope until product confirms it belongs on Transactions.

### Expected Files

- `inex/ClientApp/src/pages/Transactions.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx`
- `inex/ClientApp/src/pages/Transactions/transaction-filter-url.ts`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`

### Guardrails

- Do not change backend controllers, services, repositories, or DTO contracts.
- Do not migrate Transactions data loading to RTK Query in this story; that remains Epic 7 ownership.
- Do not change transaction filter API semantics beyond the existing typed query contract.
- Keep shared primitive changes narrowly scoped. If signage behavior changes globally, verify impacted Accounts, Budgets, Reports, and Dashboard money rendering.

## References

- `docs/planning/epics.md`
- `docs/implementation/10-2-frontend-ux-transactions-ledger-redesign.md`
- `docs/implementation/10-2-transactions-design-implementation-gap-review.md`
- `docs/design/Transactions.jsx`
- `docs/design/docs/design-implementation-guide.md`
- `docs/implementation/visual-qa/10-2/`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-05: Story created from BMad design-gap review and dedicated subagent synthesis.
- 2026-06-05: BMad dev-story workflow loaded 10.2a story context and set story/sprint status to in-progress before coding.
- 2026-06-05: Added focused Vitest coverage for friendly day labels, category paths, type counts, period labels, and nullable base-currency conversion.
- 2026-06-05: `npm test -- transaction-ledger-utils.test.ts` from `inex/ClientApp` passed.
- 2026-06-05: `npm test` from `inex/ClientApp` passed.
- 2026-06-05: `npm run build` from `inex/ClientApp` passed.
- 2026-06-05: `npm run lint` from `inex/ClientApp` passed.
- 2026-06-05: `rg -n "\bany\b"` across touched TypeScript files found no new `any` usage.
- 2026-06-05: Targeted visual QA captured screenshots under `docs/implementation/visual-qa/10-2a/` and recorded no horizontal overflow or bottom-nav occlusion at 390px and 360px.
- 2026-06-05: BMad code review found one base-currency fidelity issue; patched conversion/totals/filter behavior and reran targeted/full tests, build, lint, and visual QA.
- 2026-06-05: BMad review rerun found one scope-hygiene issue in shared planning docs; narrowed those docs to 10.2a and 10.6 blocking only.

### Completion Notes List

- Implemented one explicit Transactions scope contract across KPI subtitles, base currency context, ledger period badge, toolbar visible/total count, segmented type counts, and pagination copy.
- Added localized Today/Yesterday day labels while preserving older localized dates.
- Added parent category path metadata, neutral transfer metadata, and approximate base-currency sublines where exchange-rate data exists.
- Added explicit signed amount rendering for ledger/day-total values through a narrow `Num` signage override.
- Consolidated advanced filtering into one typed drawer form with date range, account, category, tags/refs, and amount-equivalent controls while preserving URL/filter-chip compatibility.
- Added `transaction-ledger-utils` helpers and focused tests for the introduced ledger formatting, scope, and conversion behavior.
- Made base-currency conversion nullable so base totals and amount-equivalent filters do not silently mix native amounts when rate data is unavailable.
- No backend, API, DTO, service, repository, or store contract changes were made.

### File List

- docs/implementation/10-2-transactions-design-implementation-gap-review.md
- docs/implementation/10-2a-frontend-ux-transactions-design-gap-remediation.md
- docs/implementation/10-6-frontend-ux-visual-qa-baseline-and-responsive-regression-checklist.md
- docs/implementation/sprint-status.yaml
- docs/planning/epics.md
- docs/implementation/visual-qa/10-2a/desktop-populated.png
- docs/implementation/visual-qa/10-2a/drawer-open.png
- docs/implementation/visual-qa/10-2a/filter-active.png
- docs/implementation/visual-qa/10-2a/long-amounts.png
- docs/implementation/visual-qa/10-2a/long-category-path.png
- docs/implementation/visual-qa/10-2a/mobile-ledger-360.png
- docs/implementation/visual-qa/10-2a/mobile-ledger-390.png
- docs/implementation/visual-qa/10-2a/qa-summary.json
- inex/ClientApp/public/locales/en/translation.json
- inex/ClientApp/public/locales/ru/translation.json
- inex/ClientApp/src/components/primitives/Num.tsx
- inex/ClientApp/src/pages/Transactions.tsx
- inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx
- inex/ClientApp/src/pages/Transactions/TransactionList.tsx
- inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.test.ts
- inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts
- inex/ClientApp/src/pages/Transactions/transactions-ledger.css

### Change Log

- 2026-06-05: Created ready-for-dev follow-up story.
- 2026-06-05: Started implementation; status set to in-progress.
- 2026-06-05: Implemented Transactions design gap remediation, fixed BMad review finding, completed build/lint/test/visual QA gates, and moved story to review.
