---
title: 'Rename ExchangeRate DTOs to naming convention'
type: 'refactor'
created: '2026-05-21'
status: 'done'
baseline_commit: '3150b1b329cc63fc83a1a0153bbaa21099bd32a9'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The ExchangeRate domain has one DTO (`ExchangeRateDTO`) that uses the legacy suffix-based naming style, not the project's purpose-driven convention (`ExchangeRateResponse`).

**Approach:** Rename the single DTO class and its file to the new convention, updating every reference across the controller, services, AutoMapper profile, and the service interface.

## Boundaries & Constraints

**Always:** All build and test passes must be green after the rename. No changes to property names, mapping logic, or HTTP response shape.

**Ask First:** Any change to the public API shape (adding/removing fields, changing HTTP contracts).

**Never:** Change validation rules, AutoMapper mapping logic, or HTTP route/response shapes. No changes outside the ExchangeRate domain.

</frozen-after-approval>

## Code Map

- `inex.Services/Models/Records/ExchangeRate/ExchangeRateDTO.cs` -- rename file + class → `ExchangeRateResponse`
- `inex.Services/Models/ConfigProfiles/ExchangeProfile.cs` -- update `CreateMap` type argument
- `inex.Services/Services/Base/IExchangeRateService.cs` -- update return types on both `Get` overloads
- `inex.Services/Services/ExchangeRateService.cs` -- update return types + local variable (~4 occurrences)
- `inex.Services/Services/ReportService.cs` -- update Dictionary type + variable (~4 occurrences)
- `inex.Services/Services/BudgetReportService.cs` -- update Dictionary type (1 occurrence)
- `inex/Controllers/ExchangeRateController.cs` -- update `ProducesResponseType` attribute + variable type (~2 occurrences)

## Tasks & Acceptance

**Execution:**
- [x] `inex.Services/Models/Records/ExchangeRate/ExchangeRateDTO.cs` -- rename file to `ExchangeRateResponse.cs`; rename class to `ExchangeRateResponse`
- [x] `inex.Services/Models/ConfigProfiles/ExchangeProfile.cs` -- replace `ExchangeRateDTO` with `ExchangeRateResponse`
- [x] `inex.Services/Services/Base/IExchangeRateService.cs` -- replace `ExchangeRateDTO` with `ExchangeRateResponse` on both `Get` overloads
- [x] `inex.Services/Services/ExchangeRateService.cs` -- replace all occurrences of `ExchangeRateDTO` with `ExchangeRateResponse`
- [x] `inex.Services/Services/ReportService.cs` -- replace all occurrences of `ExchangeRateDTO` with `ExchangeRateResponse`
- [x] `inex.Services/Services/BudgetReportService.cs` -- replace `ExchangeRateDTO` with `ExchangeRateResponse`
- [x] `inex/Controllers/ExchangeRateController.cs` -- replace all occurrences of `ExchangeRateDTO` with `ExchangeRateResponse`

**Acceptance Criteria:**
- Given the renamed file and updated references, when `dotnet build` runs, then zero errors or warnings related to missing types
- Given all renames complete, when `dotnet test` runs, then all tests pass
- Given the rename is complete, when `grep -r "ExchangeRateDTO" . --include="*.cs"` runs, then zero hits
- Given the ExchangeRate records folder, when `grep -r "DTO" inex.Services/Models/Records/ExchangeRate --include="*.cs"` runs, then zero hits

## Spec Change Log

## Suggested Review Order

**Renamed type**

- New record definition replacing `ExchangeRateDTO` — shape identical, name changed.
  [`ExchangeRateResponse.cs:3`](../../inex.Services/Models/Records/ExchangeRate/ExchangeRateResponse.cs#L3)

**Naming collision resolution (key decision)**

- Aliases disambiguate two `ExchangeRateResponse` types in one file; load-bearing pair.
  [`ExchangeRateService.cs:7`](../../inex.Services/Services/ExchangeRateService.cs#L7)

- Public return types use the DTO alias; private helpers use the external API alias.
  [`ExchangeRateService.cs:44`](../../inex.Services/Services/ExchangeRateService.cs#L44)

**Interface & AutoMapper**

- Interface contract updated; both `Get` overloads return `ListResponse<ExchangeRateResponse>`.
  [`IExchangeRateService.cs:10`](../../inex.Services/Services/Base/IExchangeRateService.cs#L10)

- AutoMapper `CreateMap` target type updated; mapping logic unchanged.
  [`ExchangeProfile.cs:11`](../../inex.Services/Models/ConfigProfiles/ExchangeProfile.cs#L11)

**Consumers**

- Swagger attribute and local variable updated in controller.
  [`ExchangeRateController.cs:44`](../../inex/Controllers/ExchangeRateController.cs#L44)

- `rateMap` dictionary type updated in report service (2 call sites).
  [`ReportService.cs:50`](../../inex.Services/Services/ReportService.cs#L50)

- `rateMap` dictionary type updated in budget report service.
  [`BudgetReportService.cs:70`](../../inex.Services/Services/BudgetReportService.cs#L70)

## Verification

**Commands:**
- `dotnet build` -- expected: Build succeeded, 0 Error(s)
- `dotnet test` -- expected: all tests pass
- `grep -r "ExchangeRateDTO" . --include="*.cs"` -- expected: zero hits
- `grep -r "DTO" inex.Services/Models/Records/ExchangeRate --include="*.cs"` -- expected: zero hits
