---
title: 'Simplify monthly PDF income and expense sections'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_commit: '57541e2'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — delivery authorization includes implementation, PR creation, and merge">

## Intent

**Problem:** The monthly PDF repeats each category distribution in a detail table, consuming space without adding information. The prior concise report also lost its top-expense list, and both distribution charts use the same blue styling.

**Approach:** Keep the category distribution as the sole category breakdown in Income and Expenses, restore a separate top-10-expenses table, and use direction-specific chart colors.

## Boundaries & Constraints

**Always:** Preserve the user-scoped monthly transaction selection, category hierarchy, sub-10 `Other` aggregation, report-currency conversion, transfer exclusion, totals, PDF route, and page layout conventions. Order top expenses by converted absolute expense amount and show no more than ten.

**Ask First:** Changing the top-ten limit, report route or response contract, category aggregation threshold, conversion behavior, or adding dependencies.

**Never:** Reintroduce per-transaction rows into Income or Expenses, alter database schema, call an external currency provider during tests, or modify unrelated report views.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Many expenses | More than ten converted negative monthly transactions | `Largest expenses` contains the ten greatest absolute amounts, descending; equal amounts use date then transaction ID | N/A |
| Fewer than ten expenses | One to nine eligible expenses | The section lists every eligible expense | N/A |
| No expenses | No eligible negative monthly transactions | The section states there are no expenses | N/A |

</frozen-after-approval>

## Code Map

- `inex.Services/Services/ReportService.cs` -- assembles user-scoped, converted monthly report data and top expense entries.
- `inex.Services/Models/Records/Report/MonthlyFinancialReport.cs` -- internal PDF report shape for the restored top-expense section.
- `inex.Services/Reports/MonthlyFinancialReportDocument.cs` -- QuestPDF layout, category bars, and transaction table.
- `inex.Services.Tests/Services/ReportServiceTests.cs` -- unit coverage for PDF report data selection and ordering.

## Tasks & Acceptance

**Execution:**
- [x] `inex.Services/Models/Records/Report/MonthlyFinancialReport.cs` -- add the report-only top-expense transaction shape and collection.
- [x] `inex.Services/Services/ReportService.cs` -- retain details only for the separately rendered ten largest converted expenses.
- [x] `inex.Services/Reports/MonthlyFinancialReportDocument.cs` -- remove duplicate category tables, restore the top-expense section, and apply green/red bar palettes by direction.
- [x] `inex.Services.Tests/Services/ReportServiceTests.cs` -- cover the top-ten cap, descending converted amounts, excluded transfers, tie handling, and report contract boundary.

**Acceptance Criteria:**
- Given category distributions for income and expenses, when the monthly PDF is generated, then neither section renders a second category table.
- Given income distribution rows, when their chart bars render, then their fill and track use the green palette; expense rows use the red palette.
- Given more than ten eligible monthly expenses, when the report is assembled, then exactly ten highest converted amounts are exposed in descending order.
- Given a generated PDF, when it is visually inspected, then the largest-expenses table is present and no transaction list appears inside Income or Expenses.

## Verification

**Commands:**
- `dotnet test inex.Services.Tests/ --filter FullyQualifiedName~ReportServiceTests` -- expected: all report-service tests pass.
- `dotnet test inex.sln --no-restore` -- expected: solution test suite passes.
- `dotnet build inex.sln --no-restore` -- expected: solution builds without errors.
- Render a representative generated PDF to PNG -- expected: green income bars, red expense bars, a top-10 table, and no duplicate category tables.

## Suggested Review Order

**Top-expense data selection**

- Sort converted expenses deterministically and exclude system transfer transactions.
  [`ReportService.cs:450`](../../inex.Services/Services/ReportService.cs#L450)

- Keep the PDF-only transaction details out of the category summary contract.
  [`MonthlyFinancialReport.cs:16`](../../inex.Services/Models/Records/Report/MonthlyFinancialReport.cs#L16)

**PDF presentation**

- Apply directional palettes without rendering duplicate category tables.
  [`MonthlyFinancialReportDocument.cs:100`](../../inex.Services/Reports/MonthlyFinancialReportDocument.cs#L100)

- Render the separate largest-expenses table with positive display amounts.
  [`MonthlyFinancialReportDocument.cs:153`](../../inex.Services/Reports/MonthlyFinancialReportDocument.cs#L153)

**Regression coverage**

- Covers conversion, transfer exclusion, top-ten cap, and tied boundary ordering.
  [`ReportServiceTests.cs:179`](../../inex.Services.Tests/Services/ReportServiceTests.cs#L179)
