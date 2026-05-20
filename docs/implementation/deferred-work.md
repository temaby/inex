# Deferred Work

Items surfaced during review but out of scope for the originating story. Each entry records the source story and the finding for focused follow-up.

---

## From: DTO Infrastructure Base Type Renames (Commit #1)

- **`ResponseTransferDTO` not yet renamed** — Follows the same old `Response*DTO` pattern. Planned for PR #6 (Transactions domain) per the DTO migration plan in `docs/brainstorming/brainstorming-session-2026-05-20-1.md`.

- **Frontend TypeScript `ReportMetadataDTO` interface not renamed** — `inex/ClientApp/src/model/Report/BudgetReport.ts` and `inex/ClientApp/src/store/budgetReport/budgetReport-slice.ts` still use `ReportMetadataDTO`. No runtime impact (JSON shapes unchanged), but naming convention drift. Address when the Report domain is migrated.

- **`BuildReportDataResponse` leaves `TotalIncome`/`TotalOutcome` at 0 for category report** — `ReportService.GetCategoriesReportData` uses `BuildReportDataResponse`, which only sets `Name`, `Currency`, `Start`, `End`. The two totals are never populated. `BudgetReportService` correctly sets them directly. Pre-existing bug; investigate during Report domain PR (#7).

- **`public` visibility on abstract `Service` base helpers** — `BuildPaginatedDataResponse` and `BuildReportDataResponse` in `inex.Services/Services/Base/Service.cs` are `public` but should be `protected`. Pre-existing design smell.

- **Local variable naming still uses `DTO` suffix** — Variables like `resultsDTO`, `resultDTO` throughout controllers and services. Pre-existing; the convention targets type names, not local variables. Can be cleaned up per-domain as part of future domain PRs.

- **`PagedResponse<T,TMeta>.Metadata` uses `default!` null suppressor** — `inex.Services/Models/Records/Data/PagedResponse.cs` — pre-existing. Any caller that `new`s `PagedResponse` without setting `Metadata` gets a null dereference at runtime. No guard at construction site.
