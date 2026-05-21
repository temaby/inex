---
title: 'Rename Report DTOs to Convention'
type: 'refactor'
created: '2026-05-21'
status: 'done'
route: 'one-shot'
---

# Rename Report DTOs to Convention

## Intent

**Problem:** `BudgetComparisonDTO` and `MonthlyHistoryDTO` in the Report domain use the old `*DTO` suffix pattern inconsistent with the project's `*Request`/`*Response` naming convention being applied across all domains.

**Approach:** Rename both record types and their files, update all 6 reference sites in services, interfaces, and controllers.

## Suggested Review Order

- [`../../inex.Services/Models/Records/Report/BudgetComparisonResponse.cs`](../../inex.Services/Models/Records/Report/BudgetComparisonResponse.cs) — renamed record (was `BudgetComparisonDTO`)
- [`../../inex.Services/Models/Records/Report/MonthlyHistoryResponse.cs`](../../inex.Services/Models/Records/Report/MonthlyHistoryResponse.cs) — renamed record (was `MonthlyHistoryDTO`)
- [`../../inex.Services/Services/Base/IBudgetReportService.cs`](../../inex.Services/Services/Base/IBudgetReportService.cs) — interface updated
- [`../../inex.Services/Services/Base/IReportService.cs`](../../inex.Services/Services/Base/IReportService.cs) — interface updated
- [`../../inex.Services/Services/BudgetReportService.cs`](../../inex.Services/Services/BudgetReportService.cs) — 3 usages updated
- [`../../inex.Services/Services/ReportService.cs`](../../inex.Services/Services/ReportService.cs) — 3 usages updated
- [`../../inex/Controllers/ReportBudgetController.cs`](../../inex/Controllers/ReportBudgetController.cs) — ProducesResponseType updated
- [`../../inex/Controllers/ReportsController.cs`](../../inex/Controllers/ReportsController.cs) — ProducesResponseType updated
- [`deferred-work.md`](deferred-work.md) — frontend `BudgetComparisonDTO` gap deferred
