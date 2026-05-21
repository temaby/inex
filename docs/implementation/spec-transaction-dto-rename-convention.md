---
title: 'Rename Transaction DTOs to naming convention'
type: 'refactor'
created: '2026-05-21'
status: 'done'
baseline_commit: '451541c8d27558f13b726d876d1ec10296bb3882'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Transaction domain DTOs use legacy naming (`TransactionCreateDTO`, `ResponseTransferDTO`, etc.) that doesn't follow the project's purpose-driven convention (`CreateTransactionRequest` / `TransactionResponse`).

**Approach:** Rename all 7 Transaction-domain DTO classes and their files to the new convention, updating every reference across controllers, services, validators, AutoMapper profiles, and the service interface.

## Boundaries & Constraints

**Always:** Keep `TransferFromData` and `TransferToData` as service-internal types — they must not appear in any controller or public interface signature. All build and test passes must be green after the rename. Inheritance chain must be preserved: `UpdateTransactionRequest : CreateTransactionRequest` and `TransactionResponse : UpdateTransactionRequest`.

**Ask First:** Any change to the public API shape (adding/removing fields, changing HTTP contracts).

**Never:** Change property names, validation rules, AutoMapper mappings logic, or HTTP route/response shapes. No changes outside the Transaction domain.

</frozen-after-approval>

## Code Map

- `inex.Services/Models/Records/Transaction/TransactionCreateDTO.cs` -- rename file + class → `CreateTransactionRequest`
- `inex.Services/Models/Records/Transaction/TransactionUpdateDTO.cs` -- rename file + class → `UpdateTransactionRequest`; update base type reference
- `inex.Services/Models/Records/Transaction/TransactionDetailsDTO.cs` -- rename file + class → `TransactionResponse`; update base type reference
- `inex.Services/Models/Records/Transaction/TransferCreateDTO.cs` -- rename file + class → `CreateTransferRequest`
- `inex.Services/Models/Records/Transaction/TransferFromCreateDTO.cs` -- rename file + class → `TransferFromData`
- `inex.Services/Models/Records/Transaction/TransferToCreateDTO.cs` -- rename file + class → `TransferToData`
- `inex.Services/Models/Records/Transaction/ResponseTransferDTO.cs` -- rename file + class → `TransferResponse`
- `inex.Services/Services/Base/ITransactionService.cs` -- update all 5 type references in interface signatures
- `inex.Services/Services/TransactionService.cs` -- update all occurrences (~12 references)
- `inex.Services/Services/ReportService.cs` -- update `TransactionDetailsDTO` → `TransactionResponse` (2 occurrences)
- `inex.Services/Models/ConfigProfiles/TransactionProfile.cs` -- update all 7 type references in `CreateMap` calls
- `inex.Services/Validators/Transaction/TransactionCreateValidator.cs` -- update generic type parameter
- `inex.Services/Validators/Transaction/TransactionUpdateValidator.cs` -- update generic type parameter
- `inex.Services/Validators/Transaction/TransferCreateValidator.cs` -- update generic type parameter
- `inex/Controllers/TransactionsController.cs` -- update all type references (~8 occurrences)

## Tasks & Acceptance

**Execution:**
- [ ] `inex.Services/Models/Records/Transaction/TransactionCreateDTO.cs` -- rename file to `CreateTransactionRequest.cs`; rename class to `CreateTransactionRequest`
- [ ] `inex.Services/Models/Records/Transaction/TransactionUpdateDTO.cs` -- rename file to `UpdateTransactionRequest.cs`; rename class to `UpdateTransactionRequest`; change base type to `CreateTransactionRequest`
- [ ] `inex.Services/Models/Records/Transaction/TransactionDetailsDTO.cs` -- rename file to `TransactionResponse.cs`; rename class to `TransactionResponse`; change base type to `UpdateTransactionRequest`
- [ ] `inex.Services/Models/Records/Transaction/TransferCreateDTO.cs` -- rename file to `CreateTransferRequest.cs`; rename class to `CreateTransferRequest`
- [ ] `inex.Services/Models/Records/Transaction/TransferFromCreateDTO.cs` -- rename file to `TransferFromData.cs`; rename class to `TransferFromData`
- [ ] `inex.Services/Models/Records/Transaction/TransferToCreateDTO.cs` -- rename file to `TransferToData.cs`; rename class to `TransferToData`
- [ ] `inex.Services/Models/Records/Transaction/ResponseTransferDTO.cs` -- rename file to `TransferResponse.cs`; rename class to `TransferResponse`
- [ ] `inex.Services/Services/Base/ITransactionService.cs` -- replace all old type names with new names
- [ ] `inex.Services/Services/TransactionService.cs` -- replace all old type names with new names
- [ ] `inex.Services/Services/ReportService.cs` -- replace `TransactionDetailsDTO` with `TransactionResponse`
- [ ] `inex.Services/Models/ConfigProfiles/TransactionProfile.cs` -- replace all old type names in `CreateMap` calls
- [ ] `inex.Services/Validators/Transaction/TransactionCreateValidator.cs` -- replace `TransactionCreateDTO` with `CreateTransactionRequest`
- [ ] `inex.Services/Validators/Transaction/TransactionUpdateValidator.cs` -- replace `TransactionUpdateDTO` with `UpdateTransactionRequest`
- [ ] `inex.Services/Validators/Transaction/TransferCreateValidator.cs` -- replace `TransferCreateDTO` with `CreateTransferRequest`
- [ ] `inex/Controllers/TransactionsController.cs` -- replace all old type names with new names

**Acceptance Criteria:**
- Given the renamed files and updated references, when `dotnet build` runs, then zero errors or warnings related to missing types
- Given all renames complete, when `dotnet test` runs, then all tests pass
- Given the rename is complete, when `grep -r "TransactionCreateDTO\|TransactionUpdateDTO\|TransactionDetailsDTO\|TransferCreateDTO\|TransferFromCreateDTO\|TransferToCreateDTO\|ResponseTransferDTO" . --include="*.cs"` runs, then zero hits
- Given the Transaction records folder, when `grep -r "DTO" inex.Services/Models/Records/Transaction --include="*.cs"` runs, then zero hits

## Spec Change Log

## Verification

**Commands:**
- `dotnet build` -- expected: Build succeeded, 0 Error(s)
- `dotnet test` -- expected: all tests pass
- `grep -r "TransactionCreateDTO\|TransactionUpdateDTO\|TransactionDetailsDTO\|TransferCreateDTO\|TransferFromCreateDTO\|TransferToCreateDTO\|ResponseTransferDTO" . --include="*.cs"` -- expected: zero hits
- `grep -r "DTO" inex.Services/Models/Records/Transaction --include="*.cs"` -- expected: zero hits
