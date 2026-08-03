# Story 11.1: Find Transactions Across the Full Selected Period

Status: review

## Story

As an authenticated manual ledger manager,
I want Type and Search filters to return every matching transaction in my selected period,
so that the ledger, counts, and summaries are based on the same complete result set rather than the currently loaded page.

## Acceptance Criteria

1. The authenticated, active-data transaction query applies account, category, tag, reference, date, Type, and Search filters before ordering, counting, aggregation, or pagination. The list metadata and unpaginated summary describe the same scope.
2. `type` supports `all`, `income`, `expense`, and `transfer`: Income and Expense follow the established signed non-system-category semantics; Transfer selects system-category records.
3. `search` is trimmed and case-insensitive, remains provider-translated, and matches comment, account name, category name/path, account currency, tags, and references. Whitespace-only Search is ignored; no list, summary, or account-balance path may materialize transactions for filtering.
4. Both list and summary accept additive `type` and `search` query parameters without changing existing account/category/tag/reference/date parameter semantics, routes, response shapes, or `mode=active` behavior. Do not introduce an Amount API parameter or behavior.
5. Every filter, relation, aggregate, and returned row remains scoped by `UserId`; cross-user records and relations cannot influence list metadata or summaries. Single-record foreign access remains a not-found response.
6. MySQL verification demonstrates Search SQL translation, case behavior, and list/summary plans. With one user holding 50,000 transactions, representative list and summary Search complete in at most one second under documented local conditions. Add an ownership/date/filter-aligned index and migration only when that evidence requires it.

## Tasks / Subtasks

- [x] Establish one canonical backend query pipeline (AC: 1, 5)
  - [x] Start with `UserId` and activity mode, then apply every typed filter; apply deterministic Created/Id ordering last.
  - [x] Reuse this unpaginated `IQueryable` for list pagination, metadata, summary counts, and currency aggregates.
- [x] Extend the typed filter contract and semantics (AC: 2-4)
  - [x] Add camel-case `type` and `search` binding to `TransactionFilterQuery` without changing existing parameter names or array AND semantics.
  - [x] Implement trim/whitespace handling and database-translated case-insensitive Search across the required transaction and relation fields.
  - [x] Preserve the existing controller routes, `mode=active`, response contracts, mapper behavior, and provider-free summary calculation.
- [x] Extend the client API contract only (AC: 3-4)
  - [x] Extend `TransactionFilterParams` and the shared RTK Query parameter builder so list and summary serialize the same normalized Type/Search values.
  - [x] Keep existing `apiClient`, invalidation tags, repeated filters, and inclusive date-time serialization unchanged.
  - [x] Do not move page-local controls, URL state, Amount removal, progressive loading, or UI behavior into this story; they belong to Story 11.2.
- [x] Add regression and provider verification (AC: 1-6)
  - [x] Add integration coverage for complete-scope list metadata/summary, Type/Search semantics, whitespace Search, all Search fields, and cross-user exclusion.
  - [x] Assert generated Search SQL is provider-translated; MySQL MCP confirmed case behavior and a read-only `EXPLAIN` plan.
  - [ ] Run a documented 50,000-record MySQL list-and-summary timing gate. Blocked: the approved read-only database has no user-scoped 50,000-record fixture, and seeding one requires unapproved writes.
  - [x] Add focused RTK Query serialization tests, then run frontend test/lint/build and backend focused verification. The full solution suite was attempted twice but did not complete; its documented runner blocker remains.

## Dev Notes

### Implementation Constraints

- Story 11.1a is complete. It established default-date validation and mutation lookup ownership boundaries; do not reopen its transfer/category scope.
- `TransactionService.GetTransactions(int, ActivityMode, TransactionFilterQuery)` currently orders before applying the activity mode. Refactor it so the base query applies `UserId`, mode, and all filters before ordering. Do not duplicate list and summary predicates.
- `TransactionSummaryResponse` stays unchanged in this story. Story 11.3 owns its date-and-currency bucket/comparison evolution.
- Search must be an EF/MySQL-translated predicate. Do not call `AsEnumerable`, `ToList`, or apply `ToLower()` client-side. Case behavior must be verified against MySQL rather than EF InMemory.
- Existing tag/ref filters search marker text in `Comment`; Search must also cover the current ledger projection fields, including tags/refs. Keep multiple tag/ref filters ANDed as today.
- An index is conditional. Existing MySQL indexes cover `user_fk`, `account_fk`, and `category_fk`; use the 50,000-record plan/timing evidence to decide whether a migration is justified.
- No exchange-rate provider call, time-zone model change, full-text-search infrastructure, account-balance work, schema change by default, or dependency upgrade is authorized.

### Frontend Boundary

- `transactions-api.ts` is the only intended frontend implementation surface. Its query args are part of RTK Query cache keys, so normalized Type/Search values must be passed to both list and summary builders.
- Existing `Transactions.tsx` and `TransactionList.tsx` still apply page-local Type/Search/Amount logic. Replacing that state, URL serialization, chips, filter-drawer controls, and Amount behavior is explicitly Story 11.2 work; do not mix it into this PR.
- This contract-only frontend change adds no user-visible strings or visual change, so visual QA is not required for this story.

### Testing Requirements

- Backend: extend `inex.Tests/Transactions/TransactionsControllerTests.cs` using its authenticated, isolated fixture helpers. Cover multi-page scope before count/summary, all four Type modes, trimmed/whitespace Search, every required Search field, and cross-user exclusion.
- SQL translation: update the existing MySQL-provider `ToQueryString()` regression to assert Search uses SQL expressions/joins and does not throw translation errors. This test proves generation, not MySQL execution or performance.
- Frontend: extend `inex/ClientApp/src/store/transactions/__tests__/transactions-api.test.ts` to prove list and summary serialize normalized Type/Search identically and omit blank Search.
- Run `dotnet test inex.Services.Tests/`, focused integration tests, `dotnet build inex.sln`, and `dotnet test inex.sln`; run the closest reliable subset and record a blocker if full verification is infeasible. Run frontend targeted Vitest, `npm run lint`, and `npm run build` from `inex/ClientApp`.
- MySQL: only read-only inspection is authorized. Never seed, modify, or remove shared records. A 50,000-transaction performance check requiring writes is blocked unless the dataset already exists or explicit approval is granted.

### Project Structure Notes

- Query contract: `inex.Services/Models/Records/Transaction/TransactionFilterQuery.cs`.
- Query composition and summary reuse: `inex.Services/Services/TransactionService.cs`; service interface remains under `inex.Services/Services/Base/`.
- HTTP binding: `inex/Controllers/TransactionsController.cs`.
- Client serialization/cache: `inex/ClientApp/src/store/transactions/transactions-api.ts`.
- Keep backend contracts as records and all authenticated client calls on the existing shared API client.

### References

- [Source: docs/planning/epics.md - Story 11.1]
- [Source: docs/planning/transactions-architecture.md - Data Architecture, API & Communication Patterns, and Verification]
- [Source: docs/planning/prds/prd-inex-2026-08-03/prd.md - Transactions requirements]
- [Source: docs/implementation/11-1a-harden-transaction-mutation-boundaries.md - prerequisite learnings]
- [Source: docs/project-context.md - critical implementation and MySQL verification rules]
- [Source: inex.Services/Services/TransactionService.cs - current query and summary pipeline]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-08-03: Created from the approved Epic 11 specification after examining the prior mutation-boundary story, transaction architecture, current query pipeline, RTK Query API contract, tests, and MySQL indexes.
- 2026-08-03: MySQL read-only inspection found only single-column transaction indexes (`user_fk`, `account_fk`, `category_fk`). No migration is warranted until the required query-plan and timing evidence demonstrates need.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented the ownership- and activity-scoped typed query pipeline; Type/Search now apply before ordering, pagination, list metadata, and summary aggregation.
- Added Type/Search query binding, database-translated case-insensitive relation search, normalized RTK Query serialization/cache keys, and integration/frontend regression coverage.
- MySQL read-only inspection verified case matching and the Search-shaped `EXPLAIN` plan. The 50,000-record timing gate remains blocked by the read-only database policy and absent fixture.
- Three review passes found and resolved cache-key normalization, tag/reference test-independence, and test-helper ownership concerns. The single-level category parent path follows the existing category-creation UI constraint.
- Focused transaction integration tests, services tests, solution build, frontend Vitest, lint, and production build pass. The full `dotnet test inex.sln --no-build` run hung without output and was stopped; an immediate focused retry required `--disable-build-servers` and passed.

### File List

- docs/implementation/11-1-find-transactions-across-the-full-selected-period.md
- docs/implementation/11-1a-harden-transaction-mutation-boundaries.md
- docs/implementation/sprint-status.yaml
- inex.Services/Models/Records/Transaction/TransactionFilterQuery.cs
- inex.Services/Services/TransactionService.cs
- inex/Controllers/TransactionsController.cs
- inex.Tests/Transactions/TransactionsControllerTests.cs
- inex/ClientApp/src/store/transactions/transactions-api.ts
- inex/ClientApp/src/store/transactions/__tests__/transactions-api.test.ts

## Change Log

- 2026-08-03: Created comprehensive implementation context; status set to ready-for-dev.
- 2026-08-03: Delivery started on the Story 11.1 branch.
- 2026-08-03: Implemented, verified, and reviewed; status set to review pending the documented MySQL 50,000-record gate and full-suite runner blocker.
