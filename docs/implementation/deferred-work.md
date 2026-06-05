# Deferred Work

Items surfaced during review but out of scope for the originating story. Each entry records the source story and the finding for focused follow-up.

---

## From: Story 1.1 Object-Level Authorization

- **Transfer creation still loads source and destination accounts by ID only** - `TransactionService.CreateAsync(CreateTransferRequest, userId)` uses `AccountRepository.Get(true).First(i => i.Id == itemDTO.AccountFromId)` and the same pattern for `AccountToId`. Story 1.1 covered single-entity read/update/delete endpoints only; transfer creation needs a follow-up ownership predicate on both accounts before creating paired transactions.

---

## Deferred from: code review of 1-1-enforce-object-level-authorization-in-service-methods.md (2026-05-26)

- **Transfer creation loads source and destination accounts by ID only** - `TransactionService.CreateAsync(CreateTransferRequest, userId)` loads `AccountFromId` and `AccountToId` without `UserId` predicates. This was pre-existing and explicitly called out by the story as adjacent follow-up work.

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

---

## From: ExchangeRate DTO Rename (Commit #8)

- **Naming collision: two `ExchangeRateResponse` types in the same assembly** — `inex.Services.Models.Records.ExchangeRate.ExchangeRateResponse` (the DTO) and `inex.Services.Infrastructure.ExternalClients.ExchangeRate.ExchangeRateResponse` (the external API model) share the same short name. Currently resolved in `ExchangeRateService.cs` via using aliases (`ExchangeRateResponse` = DTO, `ExchangeApiResponse` = external). Any future file needing both namespaces at once must add the same aliases. Consider renaming the external client type to `ExchangeRateApiResponse` or `FrankfurterRateResponse` to eliminate the permanent collision.

- **AutoMapper profile uses `MemberList.None`** — `ExchangeProfile.cs` `CreateMap<ExchangeRate, ExchangeRateResponse>(MemberList.None)` will not warn if `ExchangeRateResponse` gains a new property with no mapping. Consider `MemberList.Destination` for safety. Pre-existing.

- **`Date` mapped from `Created` in `ExchangeProfile`** — `ExchangeRate.Created` is a write timestamp; `ExchangeRateResponse.Date` is used as the business effective date. If `Created` carries time components, the key `(CurrencyTo, Date.Date)` in `rateMap` applies `.Date` truncation at the callsite — pre-existing, but fragile. Investigate when consolidating exchange rate handling.

---

## From: Report DTO Renames (Commit #7)

- **Frontend TypeScript `BudgetComparisonDTO` interface not renamed** — `inex/ClientApp/src/model/Report/BudgetReport.ts`, `inex/ClientApp/src/store/budgetReport/budgetReport-slice.ts`, and `inex/ClientApp/src/pages/Reports/ReportBudgetSpending.tsx` still use `BudgetComparisonDTO`. No runtime impact (JSON shapes unchanged). `MonthlyHistoryDTO` has no frontend equivalent — that side is already clean.

---

## From: Category DTO Renames (Commit #4)

- **Response types inherit from request types (Category)** — `CategoryResponse : UpdateCategoryRequest : CreateCategoryRequest`. Identical structural issue to Account domain (see above). Address holistically with Ref-Map migration.

- **Redundant explicit `ForMember` calls in `CategoryProfile` for `CategoryResponse → CategorySummary` map** — All 7 properties remapped explicitly despite being available via inheritance. Pre-existing from the old `CategoryDetailsDTO → CategoryListDetailsDTO` map. Consolidate or simplify during AutoMapper → Mapperly migration (Ref-Map).

- **Hardcoded Russian string `"Расходы по категориям"` in `ReportService.GetCategoriesReportData`** — Report title bypasses i18n. Pre-existing; address during Report domain i18n pass.

- **`GetCategoriesReportData` silent data gap for inactive categories** — Transactions against inactive categories are summed in `categoryValues` but filtered categories (ACTIVE only) means those amounts never appear in output. Pre-existing behavioral issue; investigate during Report domain PR (#7).

- **Validators not listed in spec Code Map** — `CategoryCreateValidator` and `CategoryUpdateValidator` were missed in the initial spec but caught during implementation. Add validators to the Code Map checklist for future domain rename specs.

---

## Deferred from: code review of 10-4-frontend-ux-reports-hub-dashboard-landing-and-drill-down-chrome.md (2026-06-05)

- **Monthly history report still uses USD as the report currency** - `inex/ClientApp/src/pages/Reports/ReportMonthlyHistory.tsx` had pre-existing hardcoded USD query/formatting behavior before Story 10.4. Address in report-domain currency behavior work rather than this chrome-only story.

---

## Deferred from: code review of 10-3f-frontend-ux-budgets-burn-rate-and-planning-detail.md (2026-06-05)

- **Budget/report mixed-currency conversion needs a backend/product contract** - `inex/ClientApp/src/pages/Budgets.tsx` now uses the accepted budget report `currency=USD` request and report metadata display instead of deriving currency from `accounts[0]`. The frontend cannot safely convert `BudgetDetails.value` for mixed-currency budgets because the budget model has no per-budget currency field or user-base currency contract. Define that contract before changing comparisons.
