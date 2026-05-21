# Deferred Work

Items surfaced during review but out of scope for the originating story. Each entry records the source story and the finding for focused follow-up.

---

## From: DTO Infrastructure Base Type Renames (Commit #1)

- **`ResponseTransferDTO` not yet renamed** — Follows the same old `Response*DTO` pattern. Planned for PR #6 (Transactions domain) per the DTO migration plan in `docs/brainstorming/brainstorming-session-2026-05-20-1.md`.

- **Frontend TypeScript `ReportMetadataDTO` interface not renamed** — `inex/ClientApp/src/model/Report/BudgetReport.ts` and `inex/ClientApp/src/store/budgetReport/budgetReport-slice.ts` still use `ReportMetadataDTO`. No runtime impact (JSON shapes unchanged), but naming convention drift. Address when the Report domain is migrated.

- **`BuildReportDataResponse` leaves `TotalIncome`/`TotalOutcome` at 0 for category report** — `ReportService.GetCategoriesReportData` uses `BuildReportDataResponse`, which only sets `Name`, `Currency`, `Start`, `End`. The two totals are never populated. `BudgetReportService` correctly sets them directly. Pre-existing bug; investigate during Report domain PR (#7).

- **`public` visibility on abstract `Service` base helpers** — `BuildPaginatedDataResponse` and `BuildReportDataResponse` in `inex.Services/Services/Base/Service.cs` are `public` but should be `protected`. Pre-existing design smell.

- **Local variable naming still uses `DTO` suffix** — Variables like `resultsDTO`, `resultDTO` throughout controllers and services. Pre-existing; the convention targets type names, not local variables. Can be cleaned up per-domain as part of future domain PRs.

---

## From: Account DTO Renames (Commit #3)

- **Response types inherit from request types** — `AccountResponse : UpdateAccountRequest : CreateAccountRequest`. This means response DTOs structurally carry input-intent semantics. Pre-existing hierarchy (identical chain to old AccountDetailsDTO). Address holistically when evaluating Ref-Map (AutoMapper → Mapperly), which may necessitate a proper request/response split.

- **Value/ThisMonthNet not in AutoMapper profile for AccountSummary** — These fields are set via manual `with` expressions in `AccountService.GetDetails` after AutoMapper runs, not through the profile. The profile silently produces zero-valued decimals without the manual enrichment step. Pre-existing design pattern — document or consolidate during Report/Account domain cleanup.

- **Validator class names not updated to match new convention** — `AccountCreateValidator` and `AccountUpdateValidator` still use the old `Account<Action>Validator` pattern. Out of scope for this rename (spec only required updating base class type references). Follow up in a separate validator naming pass.

- **No contract-level test assertions on DTO shapes** — Tests exercise behavior but no test asserts DTO property presence or serialized shape by type name. A rename that silently dropped a property would pass all 92 tests. Consider adding contract tests when implementing B8 or FE7 (Vitest+RTL).

- **`AccountProfile` omits `Key` in `UpdateAccountRequest → Account` map** — The create map includes `Key`; the update map does not. Update requests cannot change an account's key via AutoMapper. Possibly intentional business logic, but undocumented. Investigate during Account domain cleanup.

- **Frontend `updateAccount` thunk omits `key` field** — `inex/ClientApp/src/store/accounts/accounts-actions.ts` sends `{ id, name, description, currencyId, isEnabled }` without `key`. `AccountUpdateValidator` requires `key` (inherited from `AccountCreateValidator`). Every real frontend update call will receive a 422 `key.required`. Pre-existing bug; fix in a frontend Account patch.

- **Swagger schema component names changed** — `AccountResponse`, `CreateAccountRequest`, etc. replace old DTO names in generated OpenAPI schema. Any generated API clients must be regenerated.

- **`PagedResponse<T,TMeta>.Metadata` uses `default!` null suppressor** — `inex.Services/Models/Records/Data/PagedResponse.cs` — pre-existing. Any caller that `new`s `PagedResponse` without setting `Metadata` gets a null dereference at runtime. No guard at construction site.
