# Story 11.1a: Harden Transaction Mutation Boundaries

Status: in-progress

## Story

As an authenticated manual ledger manager,
I want transaction mutations and related resource lookups to reject invalid dates and foreign resources consistently,
so that selected-period work cannot weaken financial data integrity or user isolation.

## Acceptance Criteria

1. A create, update, or transfer request that omits `created` or supplies `default(DateTime)` returns the established validation Problem Details response with the stable error key `created.required`. A valid user-entered local calendar date is preserved without time-zone conversion.
2. Every transaction mutation lookup of a transaction, account, category, transfer source account, or transfer destination account is scoped by the current authenticated user. Foreign resources follow the existing not-found path.
3. Service and integration coverage proves the date rules and all cross-user mutation boundaries. Tests do not call an external exchange-rate provider.

## Tasks / Subtasks

- [x] Add date validation to transaction mutations (AC: 1)
  - [x] Add `Created != default(DateTime)` to `TransactionCreateValidator` with `created.required`; preserve `TransactionUpdateValidator` inheritance.
  - [x] Add the same `Created` rule and error key to `TransferCreateValidator`.
  - [x] Do not convert the request date in validators, mappers, or services.
- [x] Add regression coverage (AC: 1, 3)
  - [x] Assert omitted and explicit default dates are rejected for create, update, and transfer with 422 `application/problem+json`, `/errors/validation-failed`, and `created.required`.
  - [x] Add a successful date-only round trip at a DST-boundary calendar date and assert the exact returned `DateTime` is unchanged.
- [x] Verify current mutation ownership boundaries (AC: 2, 3)
  - [x] Retain the existing `Id && UserId` service predicates and existing integration coverage for foreign transactions, accounts, categories, and transfer source/destination accounts.
  - [x] Do not alter generic repository ID-only helpers or widen the story into transfer-category provisioning.
- [ ] Run verification and document results (AC: 1-3)
  - [ ] Run focused integration and service tests, then solution build and full tests when feasible.
  - [ ] Use a MySQL-backed read-only validation path before claiming calendar-date storage behavior is provider-verified; record a setup blocker if unavailable.

## Dev Notes

### Current State and Required Change

- `TransactionService` already scopes target reads/updates/deletes with `Id && UserId`, validates create/update account and category ownership, and resolves both transfer accounts with `Id && UserId`.
- `TransactionsControllerTests` already covers every foreign-resource path required by the story. Do not duplicate or weaken those tests.
- `TransactionCreateValidator` and `TransferCreateValidator` currently lack a `Created` rule. `TransactionUpdateValidator` includes `TransactionCreateValidator`, so it inherits the create rule.
- `TransactionMapper` copies `Created` directly into ordinary and transfer entities. Preserve that behavior; this story introduces no UTC/local conversion, schema change, or API-contract rename.
- The MySQL entity mapping uses a timestamp-like column. EF InMemory integration tests cannot prove time-zone storage behavior; use MySQL inspection where available and report a blocker otherwise.

### Test Contract

- Follow existing `ValidationTests` Problem Details assertions and extend them to require `application/problem+json` for this validation path.
- Use valid owned fixture IDs so date validation is the decisive failure.
- Use a no-offset date-only value such as `2026-03-29` for the successful calendar-date check.
- Do not start the app, Docker, or an external rate provider for verification.

### Project Structure Notes

- Validators: `inex.Services/Validators/Transaction/`.
- HTTP regression coverage: `inex.Tests/Validation/ValidationTests.cs` and/or `inex.Tests/Transactions/TransactionsControllerTests.cs`.
- Retain user ownership enforcement in the service layer; do not change generic repositories.

### References

- [Source: docs/planning/epics.md - Story 11.1a]
- [Source: docs/planning/transactions-architecture.md - First Implementation Priority]
- [Source: docs/project-context.md - Security, Testing, and Database Verification]
- [Source: inex.Services/Services/TransactionService.cs - mutation ownership predicates]
- [Source: inex.Services/Validators/Transaction/TransactionCreateValidator.cs]
- [Source: inex.Services/Validators/Transaction/TransactionUpdateValidator.cs]
- [Source: inex.Services/Validators/Transaction/TransferCreateValidator.cs]
- [Source: inex.Tests/Transactions/TransactionsControllerTests.cs - ownership regressions]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-08-03: Created from Epic 11 after reviewing transaction service, validators, integration coverage, project context, and recent transaction RTK Query work.
- 2026-08-03: MySQL MCP read-only inspection confirmed MySQL 8.0.45, `SYSTEM` session/global time zones, and `transaction.created` as `timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`.
- 2026-08-03: Provider-backed write/read date round-trip remains blocked: database access is restricted to read-only SQL and this story must not mutate shared data without explicit approval. EF InMemory coverage proves the API/mapping path only; do not claim MySQL calendar-date persistence is verified.

### Completion Notes List

- Added `created.required` validation for create, update (through the included create validator), and transfer requests; default-bound `DateTime` values can no longer reach persistence.
- Added validator unit tests plus API regression coverage for omitted/default dates, RFC 7807 validation media type and error codes, and an owned-fixture DST-boundary date round trip.
- Confirmed the existing service-level user predicates and cross-user integration tests already cover transaction, account, category, and both transfer-account boundaries.
- Review passes fixed fixture ownership and strengthened the calendar-date assertion. MySQL calendar-date round-trip verification remains blocked by read-only database access, so the story stays in progress.

### File List

- docs/implementation/11-1a-harden-transaction-mutation-boundaries.md
- docs/implementation/sprint-status.yaml
- inex.Services/Validators/Transaction/TransactionCreateValidator.cs
- inex.Services/Validators/Transaction/TransferCreateValidator.cs
- inex.Services.Tests/Validators/TransactionDateValidationTests.cs
- inex.Tests/Transactions/TransactionsControllerTests.cs
- inex.Tests/Validation/ValidationTests.cs

## Change Log

- 2026-08-03: Created implementation context from Epic 11; status set to ready-for-dev.
- 2026-08-03: Added date validation and regression coverage; status remains in-progress pending MySQL write/read calendar-date verification.
