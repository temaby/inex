---
title: 'Rename Account DTOs to naming convention'
type: 'refactor'
created: '2026-05-21'
status: 'in-progress'
baseline_commit: '5ba4632d2c24b1fc1db4e31a041cc82822f79bd2'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Account domain DTOs use the legacy `<Domain><Action>DTO` pattern (e.g. `AccountCreateDTO`), inconsistent with the purpose-driven `<Action><Domain><Request|Response>` convention being adopted across the codebase.

**Approach:** Rename all four Account DTOs — class names and file names — to the new convention. Update every reference across controllers, services, validators, and AutoMapper profiles.

## Boundaries & Constraints

**Always:**
- Rename applies to class names AND file names (must match).
- All compilation errors introduced by the rename must be resolved before the commit.
- The inheritance chain must be preserved: `CreateAccountRequest` → `UpdateAccountRequest` → `AccountResponse` → `AccountSummary`.
- `inex.xml` XML doc references must be updated to match the new names.

**Ask First:** None.

**Never:**
- Do not alter business logic, property names, or AutoMapper mappings beyond the class rename.
- Do not rename DTOs outside the Account domain.
- Do not modify test data or integration test assertions beyond updating type references.

</frozen-after-approval>

## Code Map

- `inex.Services/Models/Records/Account/AccountCreateDTO.cs` -- rename to `CreateAccountRequest.cs`
- `inex.Services/Models/Records/Account/AccountUpdateDTO.cs` -- rename to `UpdateAccountRequest.cs`
- `inex.Services/Models/Records/Account/AccountDetailsDTO.cs` -- rename to `AccountResponse.cs`
- `inex.Services/Models/Records/Account/AccountListDetailsDTO.cs` -- rename to `AccountSummary.cs`
- `inex/Controllers/AccountsController.cs` -- uses all four DTOs as params and return types
- `inex.Services/Services/Base/IAccountService.cs` -- method signatures reference all four
- `inex.Services/Services/AccountService.cs` -- implementations reference all four
- `inex.Services/Models/ConfigProfiles/AccountProfile.cs` -- AutoMapper `CreateMap` uses all four
- `inex.Services/Validators/Account/AccountCreateValidator.cs` -- inherits `AccountCreateDTO`
- `inex.Services/Validators/Account/AccountUpdateValidator.cs` -- inherits `AccountUpdateDTO`
- `inex.Services/Services/ReportService.cs` -- uses `AccountDetailsDTO`
- `inex/inex.xml` -- XML doc references to old class names

## Tasks & Acceptance

**Execution:**
- [ ] `inex.Services/Models/Records/Account/AccountCreateDTO.cs` -- rename class to `CreateAccountRequest`, rename file to `CreateAccountRequest.cs`
- [ ] `inex.Services/Models/Records/Account/AccountUpdateDTO.cs` -- rename class to `UpdateAccountRequest` (base changes to `CreateAccountRequest`), rename file to `UpdateAccountRequest.cs`
- [ ] `inex.Services/Models/Records/Account/AccountDetailsDTO.cs` -- rename class to `AccountResponse` (base changes to `UpdateAccountRequest`), rename file to `AccountResponse.cs`
- [ ] `inex.Services/Models/Records/Account/AccountListDetailsDTO.cs` -- rename class to `AccountSummary` (base changes to `AccountResponse`), rename file to `AccountSummary.cs`
- [ ] `inex.Services/Validators/Account/AccountCreateValidator.cs` -- update base class reference to `CreateAccountRequest`
- [ ] `inex.Services/Validators/Account/AccountUpdateValidator.cs` -- update base class reference to `UpdateAccountRequest`
- [ ] `inex.Services/Models/ConfigProfiles/AccountProfile.cs` -- update all four `CreateMap` type arguments
- [ ] `inex.Services/Services/Base/IAccountService.cs` -- update all method signatures
- [ ] `inex.Services/Services/AccountService.cs` -- update all method signatures and type references
- [ ] `inex/Controllers/AccountsController.cs` -- update all parameter types, return types, and `ProducesResponseType` attributes
- [ ] `inex.Services/Services/ReportService.cs` -- update `AccountDetailsDTO` reference to `AccountResponse`
- [ ] `inex/inex.xml` -- update XML doc class name references

**Acceptance Criteria:**
- Given all renames applied, when `dotnet build` runs, then zero errors and zero warnings about missing types.
- Given all renames applied, when `dotnet test` runs, then all tests pass.
- Given the rename is complete, when `grep -r "AccountCreateDTO\|AccountUpdateDTO\|AccountDetailsDTO\|AccountListDetailsDTO" . --include="*.cs"` runs, then zero hits.
- Given the rename is complete, when `grep -r "DTO" inex.Services/Models/Records/Account --include="*.cs"` runs, then zero hits.

## Verification

**Commands:**
- `dotnet build` -- expected: Build succeeded, 0 Error(s)
- `dotnet test` -- expected: all tests pass
- `grep -r "AccountCreateDTO\|AccountUpdateDTO\|AccountDetailsDTO\|AccountListDetailsDTO" . --include="*.cs"` -- expected: no output
- `grep -r "DTO" inex.Services/Models/Records/Account --include="*.cs"` -- expected: no output
