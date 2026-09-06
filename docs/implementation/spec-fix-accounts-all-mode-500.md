---
title: 'Restore accounts list access after the favourite-field migration'
type: 'bugfix'
created: '2026-09-06'
status: 'in-progress'
baseline_commit: '0504d3efb1f8e01fa7392731edfc22df9edd85c5'
context:
  - 'AGENTS.md'
  - 'docs/project-context.md'
  - 'docs/implementation/spec-gh-352-account-overview-pinning.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `GET /api/accounts?mode=ALL` returns a generic 500 because production lacks the migration that adds the required account field. The field must be named `is_favourite` in the database and `isFavourite` in the API/frontend contract.

**Approach:** Update the still-unapplied migration and every account contract consumer to use the favourite field, redeploy the application so production startup applies it, and verify the list endpoint against MySQL.

## Boundaries & Constraints

**Always:** Preserve account ownership scoping and the migration default of `true` for existing accounts. Because production has not applied this migration, change its added column to `is_favourite` without adding a second production migration. Inspect the database using read-only MySQL access before mutation. Verify the endpoint against MySQL, not EF InMemory alone.

**Ask First:** Any database mutation beyond applying the identified pending migration; changing when application startup applies migrations; modifying deployment/CI behavior; or changing account fields, routes, mode parsing, or response shapes.

**Never:** Do not weaken ownership predicates, drop/recreate tables, modify account data manually, retain the old visibility field in the API contract, run external exchange-rate providers, or interpret `mode=ALL` as an invalid request.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Pending favourite migration | Authenticated `GET /api/accounts?mode=ALL`; `account` lacks `is_favourite` | Migration is identified as pending; after it is applied, request returns 200 and account responses include `isFavourite` | Migration failure stops the change; no manual schema/data workaround |
| Current schema | Authenticated `GET /api/accounts?mode=ALL`; migration already recorded and column exists | Request returns 200, so investigate the correlated server exception before making any change | Preserve the trace ID and report the different root cause |
| Mode casing | `mode=ALL`, `mode=all`, or omitted | All select the all-accounts path as before | No validation/contract change |

</frozen-after-approval>

## Code Map

- `inex/Controllers/AccountsController.cs` -- parses `mode` case-insensitively and forwards the current user ID.
- `inex.Services/Services/AccountService.cs` -- scopes account queries and materializes the account mapping.
- `inex.Data/Models/Account.cs` and `inex.Services/Models/Mappers/AccountMapper.cs` -- define and serialize the `IsFavourite`/`isFavourite` property.
- `inex.Data/Migrations/20260906163000_AddAccountTransactionsOverviewVisibility.cs` -- adds `is_favourite` as a non-null MySQL column with a safe default.
- `inex/Program.cs` and `inex/Extensions/DatabaseExtensions.cs` -- currently apply migrations only in Production.
- `inex.Tests/Accounts/AccountsControllerTests.cs` -- existing InMemory endpoint coverage; insufficient to prove live MySQL schema compatibility.

## Tasks & Acceptance

**Execution:**
- [x] Inspect `__EFMigrationsHistory` and the `account` schema through the read-only MySQL connection -- production history confirms the migration is absent.
- [x] Rename the un-applied account field in the entity, migration, API contract, frontend consumers, translations, fixtures, and focused tests -- deliver `is_favourite` / `isFavourite` consistently.
- [ ] Redeploy the application containing the revised pending migration -- allow Production startup to apply it exactly once.
- [ ] Verify the authenticated accounts list against MySQL -- prove `mode=ALL` returns 200 and the serialized `isFavourite` field is available.
- [ ] If the migration is already present, use the trace/server log to identify the actual exception and revise this spec before touching application code.

**Acceptance Criteria:**
- Given production has no record of this migration, when the revised migration is applied on redeployment, then every existing account receives `is_favourite = true` and the accounts list returns HTTP 200.
- Given a current database, when an authenticated user requests `/api/accounts?mode=ALL`, then only that user's accounts are returned and each account contains `isFavourite`.
- Given `mode=all`, `mode=ALL`, or no mode, when the user requests the list, then the all-accounts behavior remains unchanged.

## Verification

**Commands:**
- `dotnet ef database update --project inex.Data --startup-project inex` -- expected: only the pending visibility migration is applied.
- authenticated `GET /api/accounts?mode=ALL` against the MySQL-backed application -- expected: HTTP 200 and JSON account data including `isVisibleInTransactions`.
- `dotnet test inex.sln` -- expected: existing backend regression suite passes after schema alignment.
