# Story 1.1: Enforce Object-Level Authorization in Service Methods

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want API operations to only access entities I own,
so that another user cannot read, modify, or delete my financial data by guessing entity IDs.

## Acceptance Criteria

1. Given authenticated user A and separate authenticated user B each have accounts, categories, budgets, and transactions, when user A calls `GET /api/accounts/{id}`, `PUT /api/accounts/{id}`, or `DELETE /api/accounts/{id}` using an account ID owned by user B, then the API returns `404 Not Found`, not the entity and not `403`.
2. Given the same cross-user scenario for categories, budgets, and transactions, when user A calls any single-entity read, update, or delete endpoint on user B's data, then each endpoint returns `404 Not Found` consistently.
3. Given a valid single-entity operation by the owning user, when user A accesses their own account, category, budget, or transaction by ID, then the operation succeeds with the same response shape, route, validation behavior, and side effects as before this change.
4. Given the fix is implemented in `AccountService`, `CategoryService`, `BudgetService`, and `TransactionService`, when each service method performs a single-entity lookup or mutation, then the query includes both `Id == id` and `UserId == userId`; ID-only lookup or delete is not acceptable.
5. Given the integration test suite, when the story is complete, then `inex.Tests` contains cross-user read, update, and delete denial tests for each of the four affected domains, and all existing tests continue to pass.

## Tasks / Subtasks

- [x] Update service and interface contracts so current user ID reaches every single-entity read and delete path. (AC: 1, 2, 4)
  - [x] Add `userId` to `GetAsync` signatures in `IAccountService`, `ICategoryService`, `IBudgetService`, `ITransactionService`, and their implementations.
  - [x] Add ownership-aware delete signatures for these four domain services; do not continue using the base `IInExService.DeleteAsync(id, ct)` path for user-owned deletes because it has no `userId`.
  - [x] Update `AccountsController`, `CategoriesController`, `BudgetsController`, and `TransactionsController` to pass `CurrentUserId` for single read, single delete, and bulk delete routes.
- [x] Replace ID-only reads with ownership-constrained queries. (AC: 1, 2, 3, 4)
  - [x] `AccountService.GetAsync` and `UpdateAsync`: load by `Id` and `UserId`; preserve `Currency` inclusion where response mapping needs it.
  - [x] `CategoryService.GetAsync` and `UpdateAsync`: load by `Id` and `UserId`; preserve existing system-category behavior for owned system categories.
  - [x] `BudgetService.GetAsync` and `UpdateAsync`: load by `Id` and `UserId` with `BudgetCategories` included; preserve category assignment and uniqueness behavior.
  - [x] `TransactionService.GetAsync` and `UpdateAsync`: load by `Id` and `UserId` with `TransactionTagDetails.Tag` included; preserve tag/ref processing.
- [x] Replace ID-only deletes with ownership-constrained deletes. (AC: 1, 2, 3, 4)
  - [x] Single-item delete must return `404 Not Found` for missing or non-owned IDs; do not treat a zero-row ownership-filtered delete as success.
  - [x] Account delete: delete only rows where `ids.Contains(i.Id) && i.UserId == userId`; for single-item delete, throw `ResourceNotFoundException` when no owned row is found or no row is affected.
  - [x] Category delete: check `IsSystem` only among categories owned by the current user, return not found for non-owned IDs, and preserve `system-category-delete` for owned system categories.
  - [x] Budget delete: load only owned budgets with `BudgetCategories`, throw not found for a missing/non-owned single ID, delete their join rows, then delete owned budgets.
  - [x] Transaction delete: use a predicate containing both `ids.Contains(i.Id)` and `i.UserId == userId`; for single-item delete, throw `ResourceNotFoundException` when no owned row is found or no row is affected.
  - [x] Bulk delete routes must pass `CurrentUserId` and delete only rows owned by that user; this story does not require bulk routes to fail when the request contains a mix of owned and non-owned IDs unless an existing domain rule already does so.
- [x] Preserve error and API contracts. (AC: 1, 2, 3)
  - [x] Cross-user access must use the same `ResourceNotFoundException` path as missing resources so `GlobalExceptionsHandler` emits RFC 7807 `application/problem+json` with HTTP 404.
  - [x] Do not add new routes, change JSON property names, return `403`, expose ownership information, or trust client-supplied ownership fields.
- [x] Add integration regression coverage in `inex.Tests`. (AC: 1, 2, 3, 5)
  - [x] Extend `inex.Tests/Accounts/AccountsControllerTests.cs` and `inex.Tests/Categories/CategoriesControllerTests.cs` with cross-user GET, PUT, and DELETE denial tests.
  - [x] Add matching test files under new `inex.Tests/Budgets` and `inex.Tests/Transactions` folders if they do not already exist.
  - [x] Create entities through authenticated clients so tests exercise the real auth, controller, service, mapper, and exception-handler pipeline.
  - [x] For cross-user denial responses, assert `HttpStatusCode.NotFound`, RFC 7807 `application/problem+json`, and no body content that reveals another user's ownership.
  - [x] Assert owner operations still return the existing successful responses.
- [x] Run verification. (AC: 5)
  - [x] Run targeted `rg` searches for remaining unsafe patterns in affected services.
  - [x] Run `dotnet test inex.sln` from the repo root; if a narrower test run is used while iterating, finish with the solution-level test command or document the blocker.

### Review Findings

- [x] [Review][Patch] Transaction write paths accept cross-user account/category IDs [inex.Services/Services/TransactionService.cs:53]
- [x] [Review][Patch] Budget write paths accept cross-user category IDs [inex.Services/Services/BudgetService.cs:57]
- [x] [Review][Defer] Transfer creation loads source and destination accounts by ID only [inex.Services/Services/TransactionService.cs:75] - deferred, pre-existing

## Dev Notes

### Current State

- `AccountService.GetAsync`, `CategoryService.GetAsync`, `BudgetService.GetAsync`, and `TransactionService.GetAsync` currently call repository `GetAsync(id, ct)`, which resolves by primary key only. [Source: inex.Services/Services/AccountService.cs; inex.Services/Services/CategoryService.cs; inex.Services/Services/BudgetService.cs; inex.Services/Services/TransactionService.cs]
- `UpdateAsync` in all four services receives `userId` but still loads the target entity by ID alone before mutating it. This is the core cross-user update vulnerability. [Source: same service files]
- `DeleteAsync(IEnumerable<int> ids)` in `AccountService`, `CategoryService`, `BudgetService`, and `TransactionService` deletes by IDs only. The inherited `DeleteAsync(int id, ct)` delegates to that ID-only bulk method and has no current-user parameter. [Source: inex.Services/Services/Base/InExService.cs]
- List endpoints already filter by `UserId`; preserve those filters and do not redesign list behavior. [Source: service `Get(...)` methods]
- Controllers already inherit `ApiControllerBase` and pass `CurrentUserId` to list/create/update paths, but single read/delete paths still call service methods without `CurrentUserId`. [Source: inex/Controllers/AccountsController.cs; inex/Controllers/CategoriesController.cs; inex/Controllers/BudgetsController.cs; inex/Controllers/TransactionsController.cs]

### Required Implementation Pattern

Use ownership predicates before returning or mutating user-owned data:

```csharp
var account = await DbInEx.AccountRepository
    .Get(false, i => i.Id == id && i.UserId == userId, i => i.Currency)
    .SingleOrDefaultAsync(ct)
    ?? throw new ResourceNotFoundException($"Account {id} was not found.", "Account", id);
```

For set-based deletes, keep the ownership predicate in the delete query:

```csharp
var affectedRows = await DbInEx.TransactionRepository.ExecuteDeleteAsync(
    i => ids.Contains(i.Id) && i.UserId == userId,
    ct);

if (isSingleDelete && affectedRows == 0)
{
    throw new ResourceNotFoundException($"Transaction {id} was not found.", "Transaction", id);
}
```

EF Core `ExecuteDeleteAsync` executes directly in the database and does not require `SaveChanges`; use it only where existing behavior does not require loaded navigation cleanup. Microsoft documents `ExecuteDelete`/`ExecuteDeleteAsync` as set-based operations that bypass change tracking and `SaveChanges`. [Source: Microsoft Learn, ExecuteUpdate and ExecuteDelete - EF Core, https://learn.microsoft.com/en-us/ef/core/saving/execute-insert-update-delete]

For loaded deletes that need domain checks or navigation cleanup, load owned rows first and treat a missing owned row as not found for single-item delete:

```csharp
var budgets = DbInEx.BudgetRepository
    .Get(false, i => ids.Contains(i.Id) && i.UserId == userId, i => i.BudgetCategories)
    .ToList();

if (isSingleDelete && budgets.Count == 0)
{
    throw new ResourceNotFoundException($"Budget {id} was not found.", "Budget", id);
}

foreach (var budget in budgets)
{
    DbInEx.BudgetCategoryRepository.Delete(budget.BudgetCategories);
}

DbInEx.BudgetRepository.Delete(budgets);
await DbInEx.SaveAsync(ct);
```

### Domain-Specific Guardrails

- Accounts: preserve currency response mapping. If `AccountResponse` needs `Currency`, include it in the ownership-constrained read just as list reads include currency.
- Categories: current delete behavior blocks deletion of owned system categories with `DomainRuleException("system-category-delete", ...)`. Non-owned IDs must not reach this branch; they should behave as not found.
- Budgets: `BudgetRepository.GetAsync` currently includes `BudgetCategories`; keep that include in ownership-safe reads/updates/deletes because update/delete logic depends on the join collection.
- Transactions: `TransactionRepository.GetAsync` currently includes `TransactionTagDetails` and nested `Tag`; keep those includes for updates because `ProcessTagsRefs` compares existing tag/ref maps.
- Adjacent risk: `TransactionService.CreateAsync(CreateTransferRequest, userId)` currently loads source and destination accounts by ID only. This story's ACs target single-entity read/update/delete endpoints; do not hide this transfer-create risk if encountered. Record it as follow-up unless the implementation scope is explicitly expanded.

### Error Handling

- Cross-user access must be indistinguishable from a missing entity. Throw `ResourceNotFoundException` with the existing resource type/id pattern.
- Single-item delete is part of the cross-user surface. If an ownership-filtered delete finds no owned row or affects zero rows, throw `ResourceNotFoundException` instead of returning `Ok()`.
- `GlobalExceptionsHandler` maps domain exceptions to RFC 7807 ProblemDetails and writes `application/problem+json`; keep this path. [Source: inex/Exceptions/GlobalExceptionsHandler.cs; inex.Services/Exceptions/DomainExceptions.cs]
- ASP.NET Core 8 supports centralized API error handling with ProblemDetails through its exception handling pipeline; this project already has a custom `IExceptionHandler`, so extend existing mappings only if necessary. [Source: Microsoft Learn, Handle errors in ASP.NET Core APIs, https://learn.microsoft.com/en-us/aspnet/core/web-api/handle-errors?view=aspnetcore-8.0]

### Testing Requirements

- Add cross-user integration tests in `inex.Tests`, not only service tests, because the acceptance criteria are API status-code behaviors.
- Use `InExWebApplicationFactory.CreateAuthenticatedClientAsync` to create two authenticated clients in the same factory-backed test database.
- Create user B's entity with user B's client, then call user A's GET/PUT/DELETE endpoint with that ID and assert `HttpStatusCode.NotFound`.
- For denial tests, also assert the ProblemDetails content type and verify the response does not distinguish "exists but owned by another user" from "does not exist."
- For PUT denial tests, send otherwise valid request bodies so the failure proves ownership enforcement, not validation.
- Existing domain tests show request-body shapes and helper patterns for accounts and categories. Reuse those patterns; add budgets/transactions equivalents rather than inventing a new test harness.
- In-memory EF tests do not prove MySQL-specific behavior, but this story is predicate/authorization logic and should still be covered through the integration pipeline. No schema change or migration is expected.

### Project Structure Notes

- Service changes belong in:
  - `inex.Services/Services/AccountService.cs`
  - `inex.Services/Services/CategoryService.cs`
  - `inex.Services/Services/BudgetService.cs`
  - `inex.Services/Services/TransactionService.cs`
  - matching interfaces under `inex.Services/Services/Base`
- Controller changes, if required, belong only in:
  - `inex/Controllers/AccountsController.cs`
  - `inex/Controllers/CategoriesController.cs`
  - `inex/Controllers/BudgetsController.cs`
  - `inex/Controllers/TransactionsController.cs`
- Data repository changes are optional. Prefer service-level predicates with existing `Get(isReadOnly, predicate, includes)` unless a small helper clearly reduces duplication without changing the repository architecture.
- Tests belong in existing or parallel domain folders under `inex.Tests`; do not add new top-level test architecture.

### Project Context Reference

- Backend targets .NET 8 and EF Core 8; do not upgrade framework or packages for this story. [Source: docs/project-context.md]
- Keep controllers thin; ownership enforcement belongs at the service/data-access boundary, with controllers passing `CurrentUserId`. [Source: docs/project-context.md; docs/planning/architecture.md]
- For user-owned resources, cross-user access should return `404 Not Found` unless a feature intentionally exposes resource existence. [Source: docs/project-context.md]
- Do not expose EF entities directly; keep existing response mappers and JSON shapes. [Source: docs/project-context.md]
- Run backend verification from repo root with `dotnet test inex.sln`. [Source: docs/project-context.md]

### References

- `docs/planning/epics.md` - Epic 1 and Story 1.1 acceptance criteria.
- `docs/planning/architecture.md` - ownership enforcement, error semantics, file mapping, and anti-patterns.
- `docs/planning/prds/prd-inex-2026-05-20/prd.md` - FR-SEC-001, BUG-001, and hotfix note if non-owner production users are active.
- `docs/project-context.md` - project-wide implementation, testing, and security rules.
- `inex.Services/Services/*Service.cs` - current affected service behavior.
- `inex/Controllers/*Controller.cs` - current `CurrentUserId` pass-through gaps.
- `inex.Tests/Infrastructure/InExWebApplicationFactory.cs` - authenticated integration client setup.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-26: Started implementation; loaded story, project context, and sprint status.
- 2026-05-26: Added failing cross-user API tests for accounts, categories, budgets, and transactions; confirmed targeted failures before implementation.
- 2026-05-26: Implemented ownership-aware service reads, updates, and deletes; updated controllers to pass `CurrentUserId`.
- 2026-05-26: Ran targeted unsafe-pattern searches and `dotnet test inex.sln` successfully.
- 2026-05-28: Added follow-up cleanup to make the base delete contract ownership-aware and remove duplicated delete declarations from domain service interfaces.

### Completion Notes List

- Story context generated from BMAD create-story workflow.
- No previous story intelligence applies; this is the first story in Epic 1.
- Git history analysis was not available in the sandbox because Git rejected the repository as a dubious ownership path.
- Single-entity read, update, and delete paths now use `Id` plus `UserId` predicates in the four affected domain services.
- User-owned delete routes now call ownership-aware service overloads; the inherited no-user delete path is guarded for these services.
- Base delete service contract now requires `userId`, so user-owned services cannot accidentally route through a no-user delete path.
- Added API regression tests that create data through authenticated clients and assert cross-user `404` ProblemDetails responses.
- Recorded the out-of-scope transfer-create account ownership risk in deferred work.

### File List

- docs/implementation/1-1-enforce-object-level-authorization-in-service-methods.md
- docs/implementation/deferred-work.md
- docs/implementation/sprint-status.yaml
- inex.Data/Repositories/Base/IRepository.cs
- inex.Data/Repositories/Base/Repository.cs
- inex.Services/Services/AccountService.cs
- inex.Services/Services/CategoryService.cs
- inex.Services/Services/BudgetService.cs
- inex.Services/Services/TransactionService.cs
- inex.Services/Services/Base/IInExService.cs
- inex.Services/Services/Base/InExService.cs
- inex.Services/Services/Base/IAccountService.cs
- inex.Services/Services/Base/ICategoryService.cs
- inex.Services/Services/Base/IBudgetService.cs
- inex.Services/Services/Base/ITransactionService.cs
- inex/Controllers/AccountsController.cs
- inex/Controllers/CategoriesController.cs
- inex/Controllers/BudgetsController.cs
- inex/Controllers/TransactionsController.cs
- inex.Tests/Accounts/AccountsControllerTests.cs
- inex.Tests/Categories/CategoriesControllerTests.cs
- inex.Tests/Budgets/BudgetsControllerTests.cs
- inex.Tests/Transactions/TransactionsControllerTests.cs
- inex.Tests/Infrastructure/InExWebApplicationFactory.cs
- inex.Tests/Infrastructure/ProblemDetailsAssertions.cs

### Change Log

- 2026-05-26: Enforced object-level authorization for single-entity account, category, budget, and transaction read/update/delete paths.
- 2026-05-26: Added cross-user API regression coverage and completed solution-level verification.
- 2026-05-28: Follow-up commit tightened the shared delete interface so delete operations require the current user id at the base service boundary.

