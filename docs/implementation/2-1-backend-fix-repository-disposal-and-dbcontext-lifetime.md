# Story 2.1: Backend — Fix Repository Disposal and DbContext Lifetime

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want data access abstractions to manage DbContext lifetime correctly,
So that services do not manually dispose a DI-managed context and introduce stale-state or connection-pool bugs.

## Acceptance Criteria

1. **Given** `inex.Data/Repositories/Base/Repository.cs` currently implements `IDisposable` and disposes the `DbContext` **When** this story is complete **Then** `Repository` no longer implements `IDisposable`; the `DbContext` lifetime is managed entirely by the DI container.

2. **Given** `inex.Data/Repositories/InExUnitOfWork.cs` disposes multiple repositories sharing the same context **When** this story is complete **Then** `InExUnitOfWork.Dispose` no longer chains repository disposals; it only disposes resources it directly owns.

3. **Given** `inex.Services/Services/Base/Service.cs` calls `Dispose` on the unit of work **When** this story is complete **Then** that call is removed; services do not manually manage DbContext lifetime.

4. **Given** the existing 95+ tests **When** `dotnet test` runs after the change **Then** all tests pass; no new connection or context errors appear.

## Tasks / Subtasks

- [x] Remove `IDisposable` from the repository interface and base class. (AC: 1)
  - [x] In `inex.Data/Repositories/Base/IRepository.cs`, remove `: IDisposable` from the interface declaration.
  - [x] In `inex.Data/Repositories/Base/Repository.cs`, remove the entire `Dispose()` method (lines 69–72: signature, opening brace, `Db?.Dispose();`, closing brace). The `#endregion Public Interface` stays — the region is not empty after this removal; it still contains the four query methods.
- [x] Simplify `InExUnitOfWork` disposal — stop cascading to repositories. (AC: 2)
  - [x] In `inex.Data/Repositories/InExUnitOfWork.cs`, remove all nine `_*Repository?.Dispose()` calls from the `Dispose(bool disposing)` override.
  - [x] Remove the inner `if (disposing) { }` wrapper — after removing the nine calls the block is empty and should be deleted entirely.
  - [x] Remove the outer `if (!_disposed)` guard and the `_disposed = true` assignment.
  - [x] Remove the `private bool _disposed = false;` field (line 67) — after the guard and assignments are gone it is unreferenced and will produce a compiler warning.
  - [x] Keep the `override void Dispose(bool disposing)` signature with an empty body so the abstract method in `UnitOfWork` is still satisfied, unless the team chooses to further simplify `UnitOfWork` base (leave that as a deferred follow-up; do not touch `UnitOfWork.cs` in this story).
- [x] Remove the unit-of-work disposal call from the service base. (AC: 3)
  - [x] In `inex.Services/Services/Base/Service.cs`, remove `DbInEx?.Dispose();` from the `Dispose()` method body. The method may remain as an empty implementation — do not remove `IDisposable` from `Service` or `IInExService` in this story (that is a separate cleanup tracked under IR-CODE-001).
- [x] Verify the build and all tests. (AC: 4)
  - [x] Run `dotnet build inex.sln` from the repo root; fix any remaining compile errors (e.g., any code outside the three targeted files that calls `.Dispose()` on an `IRepository<T>` reference).
  - [x] Run `dotnet test inex.sln` from the repo root; all 95+ existing tests must pass.

## Dev Notes

### Current State Analysis

Each file and what must change (or be preserved):

#### `inex.Data/Repositories/Base/IRepository.cs`
- **Current:** `public interface IRepository<T> : IDisposable` — the interface inherits `IDisposable`, making every repository a disposable type.
- **Must change:** Remove `: IDisposable`. After this change `IEditableRepository<T>` (which extends `IRepository<T>`) also loses `IDisposable` transitively.
- **Must preserve:** All five method signatures (`Get`, `GetAsync`, two `Get` overloads, `GetWithIncludePaths`).

#### `inex.Data/Repositories/Base/Repository.cs`
- **Current:** Contains a `public virtual void Dispose()` method at line 69 that calls `Db?.Dispose()`. `Db` is the `DbContext` passed in via constructor. This is the root cause: disposing the `DbContext` here invalidates the same context used by every other repository in the same request scope.
- **Must change:** Delete the entire `Dispose()` method. No other changes to this file.
- **Must preserve:** Constructor, `Db` property, `Get(int id)`, `GetAsync`, `Get(bool, ...)`, `GetWithIncludePaths`.

#### `inex.Data/Repositories/InExUnitOfWork.cs`
- **Current:** `Dispose(bool disposing)` override (lines 33–51) checks `_disposed`, disposes all nine repository fields (`_currencyRepository`, `_userRepository`, `_categoryRepository`, `_budgetRepository`, `_accountRepository`, `_tagRepository`, `_transactionRepository`, `_exchangeRateRepository`, `_budgetCategoryRepository`), then sets `_disposed = true`. The `_disposed = false` private field is at line 67.
- **Must change:** Remove all nine `_*Repository?.Dispose()` calls, the `if (!_disposed)` guard, and the `_disposed = true` assignment. Remove the `private bool _disposed = false;` field. Replace the method body with an empty body (`{ }`).
- **Must preserve:** Constructor, all nine repository property accessors, the `SaveAsync` path (inherited from `UnitOfWork`). The `override void Dispose(bool disposing)` signature must stay to satisfy the `abstract` contract in `UnitOfWork`.
- **Do not touch:** `inex.Data/Repositories/Base/UnitOfWork.cs` — this file holds the base `Dispose()` / `Dispose(bool)` template-method pattern. Removing `IDisposable` from `UnitOfWork` or `IUnitOfWork` is follow-up work not covered by this story.

#### `inex.Services/Services/Base/Service.cs`
- **Current:** `public void Dispose()` at line 62 calls `DbInEx?.Dispose()`. Since `IInExUnitOfWork` is scoped and all services that consume it are also scoped, the DI container already manages the UoW lifetime. Calling `Dispose()` manually here terminates the UoW (and transitively the DbContext) early for anything sharing the same scope.
- **Must change:** Remove `DbInEx?.Dispose();` from the `Dispose()` method body. The method body becomes empty (`{ }`). Do NOT remove the `IDisposable` implementation from `Service` or the `Dispose()` method signature — `IInExService : IDisposable` is referenced elsewhere and that cleanup is deferred.
- **Must preserve:** Constructor, `DbInEx` property, all three `Build*Response` helpers, `c_batchSize` constant.

### DI Lifetime — Why Manual Disposal Is Wrong

DI registrations (from `inex.Data/Extensions/WalletDataExtensions.cs`):
```csharp
services.AddScoped<IInExUnitOfWork, InExUnitOfWork>();
services.AddDbContext<InExDbContext>(options => { ... }, ServiceLifetime.Scoped);
```

Both `InExDbContext` and `InExUnitOfWork` are **Scoped** — one instance per HTTP request. The DI container creates them, injects them, and calls `Dispose()` on each at the end of the scope. Calling `Dispose()` manually (through the service → UoW → repository → DbContext chain) terminates the `DbContext` before the request scope ends. Any subsequent use of the same context within that request throws `ObjectDisposedException` or produces silently stale behavior.

The fix: repositories and services must never call `Dispose()` on a context they did not `new`. The DI container is the sole owner.

### Files to Modify

| File | Change |
|------|--------|
| `inex.Data/Repositories/Base/IRepository.cs` | Remove `: IDisposable` |
| `inex.Data/Repositories/Base/Repository.cs` | Remove `Dispose()` method |
| `inex.Data/Repositories/InExUnitOfWork.cs` | Empty the `Dispose(bool disposing)` body; remove `_disposed` field |
| `inex.Services/Services/Base/Service.cs` | Remove `DbInEx?.Dispose()` from `Dispose()` |

**Files explicitly NOT to touch in this story:**
- `inex.Data/Repositories/Base/UnitOfWork.cs`
- `inex.Data/Repositories/Base/IUnitOfWork.cs` — `IUnitOfWork : IDisposable` stays; only `IRepository` loses `IDisposable`
- `inex.Data/Repositories/Base/IInExUnitOfWork.cs`
- `inex.Data/Repositories/Base/IEditableRepository.cs` — extends `IRepository<T>`, which already loses `IDisposable` transitively; no changes needed in this file
- `inex.Data/Repositories/Base/EditableRepository.cs` — extends `Repository<T>`; does not override `Dispose()`; no changes needed
- Any specialized repository (`BudgetRepository.cs`, `TransactionRepository.cs`, etc.) — none override `Dispose()`; confirmed by grep; no changes needed
- `inex.Services/Services/Base/IInExService.cs`
- Any controller, validator, mapper, or test file

### Testing Requirements

- **Run:** `dotnet test inex.sln` from repo root after all four file changes are applied.
- **Pass bar:** 95+ existing tests must pass with no new failures.
- **No new tests required:** This story makes no observable behavioral changes — there is no new logic branch to cover. The fix removes harmful calls; correctness is validated by the existing integration test suite continuing to pass (the integration tests use a real `InExDbContext` under scoped DI, so if disposal were still cascading they would fail).
- **Watch for:** Any compile error from code outside the four target files that calls `.Dispose()` on an `IRepository<T>` reference (unlikely, but confirm via `dotnet build` first).

### Common Pitfalls

1. **Removing `IDisposable` from `UnitOfWork` or `IUnitOfWork`** — do not do this. Scope is limited to IRepository and the cascade from UoW to repos. The UoW and service layers may still legitimately implement IDisposable (even if empty) for DI container compatibility.
2. **Removing `Dispose()` from `Service`** — do not remove the method. `IInExService : IDisposable` is the registered interface; removing or hiding `Dispose()` causes a compile error or breaks the DI dispose chain. Empty the body only.
3. **Touching `UnitOfWork.cs`** — the `abstract void Dispose(bool disposing)` in `UnitOfWork.cs` must remain. The override in `InExUnitOfWork` must keep its signature and become an empty body.
4. **Forgetting the `_disposed` field removal** — after the guard and assignments are removed, the `private bool _disposed = false;` field in `InExUnitOfWork` becomes unused. Remove it to avoid a compiler warning.
5. **No new external libraries** — this story introduces zero new NuGet dependencies.

### Architecture Constraints

- No new NuGet packages.
- No new files; only modifications to the four listed files.
- No changes to API contracts, routes, DTOs, or test fixtures.
- No changes to EF migrations.

### References

- FR-ARCH-001 → Epic 2, Story 2.1 [Source: docs/planning/epics.md#Story-2.1]
- DI registration proof: `services.AddScoped<IInExUnitOfWork, InExUnitOfWork>()` [Source: inex.Data/Extensions/WalletDataExtensions.cs#L12]
- Root disposal call: `Db?.Dispose()` [Source: inex.Data/Repositories/Base/Repository.cs#L71]
- Cascade in UoW: `_*Repository?.Dispose()` calls [Source: inex.Data/Repositories/InExUnitOfWork.cs#L39-L47]
- Service trigger: `DbInEx?.Dispose()` [Source: inex.Services/Services/Base/Service.cs#L64]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-31: `rg "Repository\??\.Dispose|: IDisposable|DbInEx\?\.Dispose|Db\?\.Dispose|_disposed" inex.Data inex.Services` confirmed no remaining repository disposal cascade or repository `IDisposable`; remaining `IDisposable` usages are expected service/unit-of-work interfaces/classes outside story scope.
- 2026-05-31: `dotnet build inex.sln` passed with 27 existing warnings and 0 errors.
- 2026-05-31: `dotnet test inex.sln` passed: 122 total tests, 0 failed, 0 skipped.

### Completion Notes List

- Removed `IDisposable` inheritance from `IRepository<T>` and removed the base repository `Dispose()` method that disposed the shared EF `DbContext`.
- Simplified `InExUnitOfWork.Dispose(bool disposing)` to an empty override and removed the unused `_disposed` field, preserving the `UnitOfWork` abstract contract without cascading repository disposal.
- Removed manual `DbInEx?.Dispose()` from the service base while preserving the `Service.Dispose()` method required by existing service contracts.
- No new tests were added because the story explicitly required validation through the existing build and integration test suite.

### File List

- docs/implementation/2-1-backend-fix-repository-disposal-and-dbcontext-lifetime.md
- docs/implementation/sprint-status.yaml
- inex.Data/Repositories/Base/IRepository.cs
- inex.Data/Repositories/Base/Repository.cs
- inex.Data/Repositories/InExUnitOfWork.cs
- inex.Services/Services/Base/Service.cs

### Change Log

- 2026-05-31: Completed repository disposal and DbContext lifetime fix; story moved to review.
