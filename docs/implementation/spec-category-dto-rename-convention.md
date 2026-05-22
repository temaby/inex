---
title: 'Rename Category DTOs to Convention'
type: 'refactor'
created: '2026-05-21'
status: 'done'
baseline_commit: 'a7ad80e0a072b0c46482ea5ef1afcc0ba9ed3232'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Category domain DTOs use the legacy `CategoryXxxDTO` naming pattern instead of the project's purpose-driven convention (`CreateCategoryRequest` / `CategoryResponse`), creating inconsistency with the already-migrated Account and infrastructure base types.

**Approach:** Rename the four Category DTO classes and their files to match the convention; update all references across Category and Report layers (service interfaces, implementations, AutoMapper profile, and controllers). No behavioral changes.

## Boundaries & Constraints

**Always:** One-to-one renames only — no property, logic, or inheritance changes. Inheritance chain must be preserved (`UpdateCategoryRequest : CreateCategoryRequest`, `CategoryResponse : UpdateCategoryRequest`, `CategorySummary : CategoryResponse`).

**Ask First:** Any file outside the Category and Report layers that references these types.

**Never:** Behavioral changes; schema/migration changes; adding new members; introducing aliases or compatibility shims for removed names.

</frozen-after-approval>

## Code Map

- `inex.Services/Models/Records/Category/CategoryCreateDTO.cs` -- DTO to rename → `CreateCategoryRequest.cs`
- `inex.Services/Models/Records/Category/CategoryUpdateDTO.cs` -- DTO to rename → `UpdateCategoryRequest.cs`
- `inex.Services/Models/Records/Category/CategoryDetailsDTO.cs` -- DTO to rename → `CategoryResponse.cs`
- `inex.Services/Models/Records/Category/CategoryListDetailsDTO.cs` -- DTO to rename → `CategorySummary.cs`
- `inex.Services/Models/ConfigProfiles/CategoryProfile.cs` -- AutoMapper profile with 4 CreateMap calls referencing all 4 types
- `inex.Services/Services/Base/ICategoryService.cs` -- service interface with 3 DTO refs (CreateCategoryRequest, CategoryResponse ×2)
- `inex.Services/Services/Base/IReportService.cs` -- report service interface with 1 ref (CategorySummary)
- `inex.Services/Services/CategoryService.cs` -- implementation with ~6 refs across GetAsync, Get, CreateAsync, UpdateAsync
- `inex.Services/Services/ReportService.cs` -- implementation with 3 refs including cross-domain GetCategoriesReportData
- `inex/Controllers/CategoriesController.cs` -- controller with ~5 refs across Get, Add, Update actions
- `inex/Controllers/ReportsController.cs` -- controller with 2 refs in GetCategoriesReport action

## Tasks & Acceptance

**Execution:**
- [x] `inex.Services/Models/Records/Category/CategoryCreateDTO.cs` -- rename file to `CreateCategoryRequest.cs`; rename record to `CreateCategoryRequest`
- [x] `inex.Services/Models/Records/Category/CategoryUpdateDTO.cs` -- rename file to `UpdateCategoryRequest.cs`; rename record to `UpdateCategoryRequest`; update base type to `CreateCategoryRequest`
- [x] `inex.Services/Models/Records/Category/CategoryDetailsDTO.cs` -- rename file to `CategoryResponse.cs`; rename record to `CategoryResponse`; update base type to `UpdateCategoryRequest`
- [x] `inex.Services/Models/Records/Category/CategoryListDetailsDTO.cs` -- rename file to `CategorySummary.cs`; rename record to `CategorySummary`; update base type to `CategoryResponse`
- [x] `inex.Services/Models/ConfigProfiles/CategoryProfile.cs` -- replace all 4 old type names with new names in CreateMap calls
- [x] `inex.Services/Services/Base/ICategoryService.cs` -- replace all old type names with new names
- [x] `inex.Services/Services/Base/IReportService.cs` -- replace `CategoryListDetailsDTO` with `CategorySummary`
- [x] `inex.Services/Services/CategoryService.cs` -- replace all old type names with new names
- [x] `inex.Services/Services/ReportService.cs` -- replace all old type names with new names
- [x] `inex/Controllers/CategoriesController.cs` -- replace all old type names with new names
- [x] `inex/Controllers/ReportsController.cs` -- replace all old type names with new names

**Acceptance Criteria:**
- Given the rename is complete, when running `grep -r "CategoryCreateDTO\|CategoryUpdateDTO\|CategoryDetailsDTO\|CategoryListDetailsDTO" . --include="*.cs"`, then zero matches are returned
- Given the rename is complete, when running `grep -r "DTO" inex.Services/Models/Records/Category --include="*.cs"`, then zero matches are returned
- Given the solution is built, when running `dotnet build`, then the build exits with code 0 and no errors
- Given the solution is built, when running `dotnet test`, then all tests pass

## Spec Change Log

## Verification

**Commands:**
- `dotnet build` -- expected: exit 0, zero errors
- `dotnet test` -- expected: all tests pass
- `grep -r "CategoryCreateDTO\|CategoryUpdateDTO\|CategoryDetailsDTO\|CategoryListDetailsDTO" . --include="*.cs"` -- expected: zero output
- `grep -r "DTO" inex.Services/Models/Records/Category --include="*.cs"` -- expected: zero output

## Suggested Review Order

**New type definitions**

- Base request record — establishes all Category fields
  [`CreateCategoryRequest.cs:3`](../../inex.Services/Models/Records/Category/CreateCategoryRequest.cs#L3)

- Inherits base; adds `Id` for update scenarios
  [`UpdateCategoryRequest.cs:3`](../../inex.Services/Models/Records/Category/UpdateCategoryRequest.cs#L3)

- Thin response alias; inherits all fields from update chain
  [`CategoryResponse.cs:3`](../../inex.Services/Models/Records/Category/CategoryResponse.cs#L3)

- Report projection; adds `decimal Value` to base response
  [`CategorySummary.cs:3`](../../inex.Services/Models/Records/Category/CategorySummary.cs#L3)

**Service contracts**

- Category service interface — 4 signatures updated, no behavioral change
  [`ICategoryService.cs:11`](../../inex.Services/Services/Base/ICategoryService.cs#L11)

- Report service interface — cross-domain boundary; `CategorySummary` now explicit
  [`IReportService.cs:12`](../../inex.Services/Services/Base/IReportService.cs#L12)

**AutoMapper profile**

- All 4 CreateMap calls renamed; `MemberList.None` unchanged
  [`CategoryProfile.cs:11`](../../inex.Services/Models/ConfigProfiles/CategoryProfile.cs#L11)

**Implementations**

- Category service — GetAsync, Get, CreateAsync, UpdateAsync all updated
  [`CategoryService.cs:30`](../../inex.Services/Services/CategoryService.cs#L30)

- Report service — cross-domain: `CategoryResponse` + `CategorySummary` generics updated
  [`ReportService.cs:101`](../../inex.Services/Services/ReportService.cs#L101)

**Validation & controllers**

- FluentValidation generic type updated on create validator
  [`CategoryCreateValidator.cs:6`](../../inex.Services/Validators/Category/CategoryCreateValidator.cs#L6)

- FluentValidation generic type updated on update validator
  [`CategoryUpdateValidator.cs:6`](../../inex.Services/Validators/Category/CategoryUpdateValidator.cs#L6)

- Controller request/response types updated; [ProducesResponseType] attrs updated
  [`CategoriesController.cs:52`](../../inex/Controllers/CategoriesController.cs#L52)

- Report controller — `CategorySummary` in ProducesResponseType and local var
  [`ReportsController.cs:45`](../../inex/Controllers/ReportsController.cs#L45)
