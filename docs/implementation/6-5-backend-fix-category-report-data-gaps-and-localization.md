# Story 6.5: Backend - Fix Category Report Data Gaps and Localization

Status: ready-for-dev

<!-- Note: Validation is optional. Run bmad-create-story validate before dev-story. -->

## Story

As a user running a category spending report,
I want the report to include transactions for all my categories (including inactive ones),
So that my historical spending data is complete and not silently excluded by category status.

## Acceptance Criteria

1. Given a user has categories that were active when transactions were made but are now inactive, When `GET /api/reports/categories` is called, Then transactions against inactive categories appear in the report output - category active/inactive status must not filter out transactions from history.

2. Given `GetCategoriesReportData` currently filters to ACTIVE categories only, When this story is complete, Then the query includes transactions for all user-owned categories regardless of status; category status may be included in the response for display purposes but must not exclude spending data.

3. Given `BuildReportDataResponse` is used by `GetCategoriesReportData` and leaves `TotalIncome` and `TotalOutcome` at 0, When this story is complete, Then category report entries correctly populate both totals, matching the explicit assignment pattern used in `BudgetReportService`.

4. Given `ReportService.GetCategoriesReportData` contains the hardcoded Russian string `"Расходы по категориям"`, When this story is complete, Then the report title is either removed from the API response (rendered on the frontend via i18n) or returned as a translation key - no hardcoded language strings in services.

5. Given the story is complete, When `dotnet test` runs, Then existing report tests pass; new tests cover: inactive-category transactions included, `TotalIncome`/`TotalOutcome` correctly populated, no hardcoded string in service output.

## Tasks / Subtasks

- [ ] Fix category inclusion for category report history. (AC: 1, 2)
  - [ ] In `ReportService.GetCategoriesReportData`, load user categories with `ActivityMode.ALL`, not `ActivityMode.ACTIVE`.
  - [ ] Keep system categories excluded from category report output unless existing product behavior explicitly requires showing system transfer categories.
  - [ ] Ensure inactive user-owned categories with historical transactions can appear in `Data` when their converted value is non-zero.
  - [ ] Preserve the existing report date filter behavior from `ReportMetadata.Start` and `ReportMetadata.End`.

- [ ] Populate report totals in the category report response. (AC: 3)
  - [ ] Compute `TotalIncome` from positive non-system transaction amounts converted into the requested report currency.
  - [ ] Compute `TotalOutcome` from negative non-system transaction amounts converted into the requested report currency, using absolute values to match `BudgetReportService`.
  - [ ] Return `ReportMetadata.TotalIncome` and `ReportMetadata.TotalOutcome` explicitly instead of relying on `BuildReportDataResponse` defaults.
  - [ ] Keep category row `Value` behavior focused on per-category spending/income as the current report expects; if preserving negative spending signs is necessary for frontend compatibility, document it in completion notes.

- [ ] Remove hardcoded service-language output. (AC: 4)
  - [ ] Replace the hardcoded `"Расходы по категориям"` service title with one of these scoped options:
    - remove report title/name from the category report metadata only if API compatibility is intentionally updated and all consumers are adjusted in the same story, or
    - set `ReportMetadata.Name` to a stable translation key such as `reports.categoryReport`.
  - [ ] Do not add frontend redesign work for displaying the title. Existing frontend i18n keys already include `reports.categoryReport` in EN/RU locale files.
  - [ ] Search the backend for the old hardcoded Russian string and verify it is gone from service output.

- [ ] Add focused backend tests. (AC: 1, 3, 4, 5)
  - [ ] Add service-level tests for `ReportService.GetCategoriesReportData` in `inex.Services.Tests` if a suitable fixture/pattern exists; otherwise add API integration coverage in `inex.Tests` through `GET /api/reports/category`.
  - [ ] Test that a transaction tied to an inactive, user-owned category appears in the category report output.
  - [ ] Test that transactions for another user's categories are not included.
  - [ ] Test that `TotalIncome` and `TotalOutcome` are populated from converted transaction amounts and follow the `BudgetReportService` positive/absolute-negative pattern.
  - [ ] Test that service/API output no longer contains the hardcoded Russian title string.
  - [ ] Keep tests independent from dashboard UI, Reports hub redesign, and Epic 10 visual behavior.

- [ ] Verify backend scope. (AC: 5)
  - [ ] Run the focused report/category test scope while iterating.
  - [ ] Run `dotnet build inex.sln`.
  - [ ] Run relevant `dotnet test` scope; full `dotnet test inex.sln` is preferred if practical.

## Dev Notes

### Source Requirements

- Epic 6 is dashboard and spending-insights work, but Story 6.5 is a separate backend report correctness story for BUG-005, BUG-006, and BUG-007. It must remain independently testable from dashboard UI work. [Source: `docs/planning/epics.md`, Epic 6 Story 6.5]
- PRD `IR-REPORT-001` requires category spending reports to include transactions for all user-owned categories, avoid silently excluding inactive categories, and populate `TotalIncome` and `TotalOutcome`. [Source: `docs/planning/prds/prd-inex-2026-05-20/prd.md`]
- PRD `IR-REPORT-002` requires hardcoded report title text in `ReportService` to be removed or localized so services do not emit user-visible hardcoded language strings. [Source: `docs/planning/prds/prd-inex-2026-05-20/prd.md`]
- The sprint change proposal explicitly says Epic 6 can stay in place only if report data integrity fixes remain explicit and independently testable. [Source: `docs/planning/sprint-change-proposal-2026-05-26.md`]
- The implementation readiness report calls out the same boundary: preserve Story 6.5 as a separate story with service/API tests and localization verification. [Source: `docs/planning/implementation-readiness-report-2026-05-26.md`]

### Dependencies

- Depends on the existing reports API path: `GET /api/reports/category` in `ReportsController`. The user's requested URL in the epic says `/api/reports/categories`; the current route constant is `category`, so implement against the existing route unless a separate contract-change story changes it.
- Depends on current service/repository ownership predicates being preserved. All report aggregation must remain scoped to `userId`.
- Depends on existing exchange-rate conversion behavior through `IExchangeRateService.Get(userId, start, end, currency, ct)`. This story does not change exchange-rate provider selection or add net-worth logic.
- Story 6.4 historical net worth depends on Epic 5 rates work, but Story 6.5 is independent from Story 6.4 and should not add net-worth endpoints, dashboard cards, or charts.

### Current State Analysis

`inex.Services/Services/ReportService.cs`

- `GetCategoriesReportData` reads start/end from the reports filter DSL, loads exchange rates, accounts, active categories, and all transactions in the date range.
- It currently calls `_categoryService.Get(userId, ActivityMode.ACTIVE)`, filters out system categories, and builds `categoryIds` from that active-only set. This is the source of the inactive-category data gap.
- It currently builds metadata with `BuildReportDataResponse(..., "Расходы по категориям", ...)`. The literal title is hardcoded service-language output and must be removed or replaced with a translation key.
- It sums `categoryValues` only when `categoryIds.Contains(transaction.CategoryId)`, so transactions tied to inactive categories are omitted even though `_transactionService.Get(userId, ActivityMode.ALL, filters)` returns them.
- It returns `Data` rows with `Value != 0`, but leaves `Metadata.TotalIncome` and `Metadata.TotalOutcome` at their default `0`.

`inex.Services/Services/Base/Service.cs`

- `BuildReportDataResponse` only sets `Name`, `Currency`, `Start`, and `End`. It does not accept totals. This helper is not enough for Story 6.5 unless callers override metadata after calculating totals.
- Avoid broad helper changes unless needed. A local explicit `PagedResponse<CategorySummary, ReportMetadata>` construction in `ReportService` is likely lower risk and mirrors `BudgetReportService`.

`inex.Services/Services/BudgetReportService.cs`

- `GetBudgetComparison` shows the desired totals pattern:
  - positive converted transaction amounts increment `totalIncome`,
  - negative converted transaction amounts increment `totalOutcome` using `Math.Abs(amountInTargetCurrency)`,
  - system transactions are excluded from totals.
- It also uses `ActivityMode.ALL` for transactions and categories when the report must reason over historical data.

`inex/Controllers/ReportsController.cs`

- Category report route is currently `GET api/reports/category`.
- It parses the legacy report filter DSL with `FilterHelper.ParseFilter(filter, ReportMetadata.FieldsList)` and passes the parsed filters to `IReportService.GetCategoriesReportData`.
- Do not convert this endpoint to typed query params in this story; report typed query migration is Epic 7.4c scope.

`inex.Services/Models/Records/Data/ReportMetadata.cs`

- `ReportMetadata` currently includes `Name`, `Currency`, `Start`, `End`, `TotalIncome`, and `TotalOutcome`.
- `Name` is part of the existing API shape. If choosing the translation-key option, keep the shape stable and set `Name = "reports.categoryReport"`.

### Implementation Guidance

- Prefer changing `ReportService.GetCategoriesReportData` to load categories with `ActivityMode.ALL`, then exclude only `IsSystem` categories from report rows and totals.
- Keep conversion behavior aligned with current report services:
  - resolve account currency from loaded accounts,
  - use exact date rate when available and non-zero,
  - if no rate exists, current category report behavior uses the transaction amount unchanged. Preserve or deliberately align with `BudgetReportService` fallback behavior, then cover with tests.
- Be explicit about sign handling:
  - totals use income positive, outcome absolute-negative,
  - category row values should preserve the existing report's expectations unless tests and frontend behavior prove a safer normalization is needed.
- Avoid changing serialized property names, response wrappers, routes, or frontend model names unless necessary for AC4. A translation key in `Metadata.Name` is the safest compatibility option.
- Preserve cancellation-token flow through the report and exchange-rate calls.

### Epic 6 / Epic 10 Guardrails

- This story is backend report correctness and localization cleanup only.
- Do not build or modify dashboard routes, month summary cards, heatmaps, historical net-worth charts, report hub chrome, drill-down chrome, visual design, mobile navigation, shared primitives, responsive visual QA baselines, or chart accessibility summaries.
- Do not create Epic 10 stories or modify existing Epic 10 story files.
- Do not add frontend design-system scope. Epic 10 owns final dashboard/report visual design, Reports hub and drill-down chrome, shell/navigation behavior, mobile navigation, shared primitives, responsive visual QA, and chart accessibility polish.
- This story may mention frontend i18n only to preserve the backend contract around translation keys; it must not redesign the Reports UI.

### Files Likely to Change

- `inex.Services/Services/ReportService.cs` - fix category inclusion, totals, and report metadata title behavior.
- `inex.Services.Tests/...` - add focused `ReportService` tests if a practical service-test pattern exists.
- `inex.Tests/Reports/...` or similar - add API integration coverage if service-level testing is impractical.

Files to avoid unless an implementation blocker requires them:

- `inex/ClientApp/**` - no frontend implementation is required for this backend story.
- `docs/implementation/10-*.md` - Epic 10 story files are out of scope.
- `inex.Services/Services/Base/Service.cs` - avoid broad helper changes unless they reduce risk and are covered by tests.
- `inex/Controllers/ReportsController.cs` - avoid route/filter-contract changes.

### Testing Requirements

- Add regression coverage for the three defects:
  - inactive category transactions included,
  - totals populated,
  - hardcoded Russian service string absent.
- Include an ownership regression: another user's inactive category/transaction must not appear in the current user's category report.
- Use existing backend test patterns:
  - `inex.Services.Tests` for service logic with mocked dependencies where available,
  - `inex.Tests` with `InExWebApplicationFactory` for authenticated API behavior.
- Required final backend checks:
  - `dotnet build inex.sln`
  - relevant `dotnet test` scope, preferably `dotnet test inex.sln` if practical.

### References

- `docs/planning/epics.md` - Epic 6 Story 6.5 source of record.
- `docs/planning/prds/prd-inex-2026-05-20/prd.md` - `IR-REPORT-001`, `IR-REPORT-002`, BUG-005, BUG-006, BUG-007.
- `docs/planning/sprint-change-proposal-2026-05-26.md` - Epic 6 report integrity guardrail.
- `docs/planning/implementation-readiness-report-2026-05-26.md` - Story 6.5 separate-testability recommendation.
- `docs/planning/design-update-plan.md` and `docs/planning/ux-design.md` - Epic 10 design scope boundaries; not implementation input for this backend story.
- `docs/planning/architecture.md` - backend service/repository, API, test, and Epic 10 boundary guidance.
- `docs/project-context.md` - durable backend testing, ownership, API compatibility, and report calculation rules.
- `inex.Services/Services/ReportService.cs` - current category report implementation.
- `inex.Services/Services/BudgetReportService.cs` - explicit totals pattern to mirror.
- `inex.Services/Services/Base/Service.cs` - current report metadata helper.
- `inex/Controllers/ReportsController.cs` - current category report route and filter parsing.
- `inex.Services/Models/Records/Data/ReportMetadata.cs` - metadata fields used by report responses.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

- Story context created via bmad-create-story workflow for key `6-5-backend-fix-category-report-data-gaps-and-localization`.
- Story status set to `ready-for-dev`.
- Story intentionally remains independent from dashboard UI and Epic 10 visual/report hub work.
- Sprint status was not updated because this orchestration run was constrained to create exactly one story file.

### File List

- docs/implementation/6-5-backend-fix-category-report-data-gaps-and-localization.md
