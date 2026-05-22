---
title: 'DTO Infrastructure Base Type Renames (Commit #1)'
type: 'refactor'
created: '2026-05-20'
status: 'done'
baseline_commit: 'eb3e4f435f58d15079c6496fecdb0b8d87cf842e'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Six infrastructure base DTO files in `inex.Services/Models/Records/Base/` and `Data/` have names that don't follow the project's purpose-driven naming convention (`CreateXxxRequest` / `XxxResponse` / bare metadata). Three have mismatched class vs. file names; three need class renames plus file renames.

**Approach:** Rename the three classes (`NamedDTO → NamedResponse`, `PaginationMetadataDTO → PaginationMetadata`, `ReportMetadataDTO → ReportMetadata`) and update all references, then rename all six files to match their class names. No backward-compatibility shims.

## Boundaries & Constraints

**Always:**
- Hard cut — no `[Obsolete]` aliases, no transition shims
- All references to renamed classes updated atomically in this commit
- `dotnet build` and `dotnet test` must pass before commit
- Grep verifications must return zero hits before commit

**Ask First:**
- If any compile error reveals a reference site not covered by the task list

**Never:**
- Touch any class outside the six files in scope
- Alter any property names (would change JSON API contract)
- Rename any file whose class name isn't changing (other files stay as-is)

</frozen-after-approval>

## Code Map

- `inex.Services/Models/Records/Base/NamedDTO.cs` -- class `NamedDTO` → `NamedResponse`; file → `NamedResponse.cs`
- `inex.Services/Models/Records/Data/PaginationMetadataDTO.cs` -- class `PaginationMetadataDTO` → `PaginationMetadata`; file → `PaginationMetadata.cs`
- `inex.Services/Models/Records/Data/ReportMetadataDTO.cs` -- class `ReportMetadataDTO` → `ReportMetadata`; file → `ReportMetadata.cs`
- `inex.Services/Models/Records/Base/ResponseCreateDTO.cs` -- file rename only → `CreatedResponse.cs` (class already `CreatedResponse`)
- `inex.Services/Models/Records/Data/ResponseDataDTO.cs` -- file rename only → `ListResponse.cs` (class already `ListResponse<T>`)
- `inex.Services/Models/Records/Data/ResponseDataExDTO.cs` -- file rename only → `PagedResponse.cs` (class already `PagedResponse<T,TMeta>`)
- `inex/Controllers/CurrenciesController.cs` -- uses `NamedDTO` (2 hits)
- `inex.Services/Models/ConfigProfiles/CurrencyProfile.cs` -- uses `NamedDTO` (1 hit)
- `inex.Services/Services/Base/ICurrencyService.cs` -- uses `NamedDTO` (1 hit)
- `inex.Services/Services/CurrencyService.cs` -- uses `NamedDTO` (2 hits)
- `inex.Services/Services/Base/ITransactionService.cs` -- uses `PaginationMetadataDTO` (1 hit)
- `inex.Services/Services/Base/Service.cs` -- uses `PaginationMetadataDTO` (3 hits), `ReportMetadataDTO` (4 hits)
- `inex/Controllers/TransactionsController.cs` -- uses `PaginationMetadataDTO` (1 hit)
- `inex.Services/Services/TransactionService.cs` -- uses `PaginationMetadataDTO` (1 hit)
- `inex/Controllers/ReportBudgetController.cs` -- uses `ReportMetadataDTO` (1 hit)
- `inex/Controllers/ReportsController.cs` -- uses `ReportMetadataDTO` (3 hits, including `ReportMetadataDTO.FieldsList` and `nameof(ReportMetadataDTO.Start/End)`)
- `inex.Services/Services/Base/IBudgetReportService.cs` -- uses `ReportMetadataDTO` (1 hit)
- `inex.Services/Services/Base/IReportService.cs` -- uses `ReportMetadataDTO` (1 hit)
- `inex.Services/Services/BudgetReportService.cs` -- uses `ReportMetadataDTO` (3 hits)
- `inex.Services/Services/ReportService.cs` -- uses `ReportMetadataDTO` (4 hits, including `nameof(ReportMetadataDTO.Start/End)`)

## Tasks & Acceptance

**Execution:**
- [ ] `inex.Services/Models/Records/Base/NamedDTO.cs` -- rename class `NamedDTO` → `NamedResponse`; rename file to `NamedResponse.cs`
- [ ] `inex/Controllers/CurrenciesController.cs` -- replace all `NamedDTO` → `NamedResponse`
- [ ] `inex.Services/Models/ConfigProfiles/CurrencyProfile.cs` -- replace `NamedDTO` → `NamedResponse`
- [ ] `inex.Services/Services/Base/ICurrencyService.cs` -- replace `NamedDTO` → `NamedResponse`
- [ ] `inex.Services/Services/CurrencyService.cs` -- replace all `NamedDTO` → `NamedResponse`
- [ ] `inex.Services/Models/Records/Data/PaginationMetadataDTO.cs` -- rename class `PaginationMetadataDTO` → `PaginationMetadata`; rename file to `PaginationMetadata.cs`
- [ ] `inex.Services/Services/Base/Service.cs` -- replace all `PaginationMetadataDTO` → `PaginationMetadata`
- [ ] `inex/Controllers/TransactionsController.cs` -- replace `PaginationMetadataDTO` → `PaginationMetadata`
- [ ] `inex.Services/Services/Base/ITransactionService.cs` -- replace `PaginationMetadataDTO` → `PaginationMetadata`
- [ ] `inex.Services/Services/TransactionService.cs` -- replace `PaginationMetadataDTO` → `PaginationMetadata`
- [ ] `inex.Services/Models/Records/Data/ReportMetadataDTO.cs` -- rename class `ReportMetadataDTO` → `ReportMetadata`; rename file to `ReportMetadata.cs`
- [ ] `inex.Services/Services/Base/Service.cs` -- replace all `ReportMetadataDTO` → `ReportMetadata`
- [ ] `inex/Controllers/ReportBudgetController.cs` -- replace `ReportMetadataDTO` → `ReportMetadata`
- [ ] `inex/Controllers/ReportsController.cs` -- replace all `ReportMetadataDTO` → `ReportMetadata` (including `FieldsList` access and `nameof` calls)
- [ ] `inex.Services/Services/Base/IBudgetReportService.cs` -- replace `ReportMetadataDTO` → `ReportMetadata`
- [ ] `inex.Services/Services/Base/IReportService.cs` -- replace `ReportMetadataDTO` → `ReportMetadata`
- [ ] `inex.Services/Services/BudgetReportService.cs` -- replace all `ReportMetadataDTO` → `ReportMetadata`
- [ ] `inex.Services/Services/ReportService.cs` -- replace all `ReportMetadataDTO` → `ReportMetadata`
- [ ] `inex.Services/Models/Records/Base/ResponseCreateDTO.cs` -- rename file to `CreatedResponse.cs` (no code changes; class is already `CreatedResponse`)
- [ ] `inex.Services/Models/Records/Data/ResponseDataDTO.cs` -- rename file to `ListResponse.cs` (no code changes; class is already `ListResponse<T>`)
- [ ] `inex.Services/Models/Records/Data/ResponseDataExDTO.cs` -- rename file to `PagedResponse.cs` (no code changes; class is already `PagedResponse<T,TMeta>`)

**Acceptance Criteria:**
- Given the build runs after all renames, when `dotnet build` is executed, then it exits with code 0 with no errors or warnings about missing types
- Given all class renames are applied, when `grep -r "NamedDTO\|PaginationMetadataDTO\|ReportMetadataDTO" . --include="*.cs"` is run, then it returns zero hits
- Given all file renames are applied, when `grep -r "DTO" inex.Services/Models/Records/Base inex.Services/Models/Records/Data --include="*.cs"` is run, then it returns zero hits
- Given the build passes, when `dotnet test` is executed, then all tests pass

## Spec Change Log

## Verification

**Commands:**
- `dotnet build` -- expected: exit 0, no compile errors
- `dotnet test` -- expected: all tests pass
- `grep -r "NamedDTO\|PaginationMetadataDTO\|ReportMetadataDTO" . --include="*.cs"` -- expected: zero hits
- `grep -r "DTO" inex.Services/Models/Records/Base inex.Services/Models/Records/Data --include="*.cs"` -- expected: zero hits

## Suggested Review Order

**Renamed type definitions — the source of truth**

- Hard-cut rename: `NamedDTO` → `NamedResponse`; all four properties preserved
  [`NamedResponse.cs:3`](../../inex.Services/Models/Records/Base/NamedResponse.cs#L3)

- Hard-cut rename: `PaginationMetadataDTO` → `PaginationMetadata`; computed properties unchanged
  [`PaginationMetadata.cs:5`](../../inex.Services/Models/Records/Data/PaginationMetadata.cs#L5)

- Hard-cut rename: `ReportMetadataDTO` → `ReportMetadata`; `FieldsList` and all properties intact
  [`ReportMetadata.cs:5`](../../inex.Services/Models/Records/Data/ReportMetadata.cs#L5)

**Base service — generic builders updated**

- `BuildPaginatedDataResponse` signature and body updated; type is the contract between Service and callers
  [`Service.cs:31`](../../inex.Services/Services/Base/Service.cs#L31)

- `BuildReportDataResponse` updated; note `TotalIncome`/`TotalOutcome` left at 0 (pre-existing, deferred)
  [`Service.cs:48`](../../inex.Services/Services/Base/Service.cs#L48)

**Interfaces — the public contracts**

- `ICurrencyService.Get()` return type updated
  [`ICurrencyService.cs:8`](../../inex.Services/Services/Base/ICurrencyService.cs#L8)

- `ITransactionService.Get()` paginated overload updated
  [`ITransactionService.cs:14`](../../inex.Services/Services/Base/ITransactionService.cs#L14)

- `IBudgetReportService.GetBudgetComparison()` return type updated
  [`IBudgetReportService.cs:10`](../../inex.Services/Services/Base/IBudgetReportService.cs#L10)

- `IReportService.GetCategoriesReportData()` return type updated
  [`IReportService.cs:12`](../../inex.Services/Services/Base/IReportService.cs#L12)

**AutoMapper profile — mapping source updated**

- `CreateMap<Currency, NamedResponse>` — only change needed; property names unchanged
  [`CurrencyProfile.cs:11`](../../inex.Services/Models/ConfigProfiles/CurrencyProfile.cs#L11)

**Controllers — Swagger attributes and local variable types**

- `CurrenciesController` — `ProducesResponseType` and return type updated
  [`CurrenciesController.cs:23`](../../inex/Controllers/CurrenciesController.cs#L23)

- `TransactionsController` — local variable type updated for paginated list action
  [`TransactionsController.cs:75`](../../inex/Controllers/TransactionsController.cs#L75)

- `ReportsController` — `FieldsList` access and local variable type updated
  [`ReportsController.cs:45`](../../inex/Controllers/ReportsController.cs#L45)

- `ReportBudgetController` — `ProducesResponseType` updated
  [`ReportBudgetController.cs:40`](../../inex/Controllers/ReportBudgetController.cs#L40)

**File-only renames — no code changes inside**

- `CreatedResponse.cs` (was `ResponseCreateDTO.cs`) — class was already `CreatedResponse`
  [`CreatedResponse.cs:3`](../../inex.Services/Models/Records/Base/CreatedResponse.cs#L3)

- `ListResponse.cs` (was `ResponseDataDTO.cs`) — class was already `ListResponse<T>`
  [`ListResponse.cs:5`](../../inex.Services/Models/Records/Data/ListResponse.cs#L5)

- `PagedResponse.cs` (was `ResponseDataExDTO.cs`) — class was already `PagedResponse<T,TMeta>`
  [`PagedResponse.cs:3`](../../inex.Services/Models/Records/Data/PagedResponse.cs#L3)
