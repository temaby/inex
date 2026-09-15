---
title: 'Remove Spending Heatmap report'
type: 'chore'
created: '2026-09-15'
status: 'done'
baseline_commit: '63fe0f6ce9a8e64e55771a7f302d452706528b38'
context:
  - 'docs/project-context.md'
  - 'inex/ClientApp/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Spending Heatmap feature is no longer a supported report, but its UI entry point, client route, API endpoint, model, localized copy, tests, and visual-QA scenarios remain deployed. Retaining this dead surface lets users navigate to unsupported functionality and leaves an unnecessary user-scoped reporting API in the application.

**Approach:** Delete the heatmap feature end to end while preserving all other Reports routes, report contracts, fixtures, and visual-QA coverage. Remove only heatmap-owned artifacts and references; do not redesign the Reports hub or alter unrelated reporting behavior.

## Boundaries & Constraints

**Always:** Preserve user isolation and the contracts of the remaining report endpoints. Keep authenticated routing, shared `apiClient`, i18n, and existing Reports fixture coverage intact. Remove both English and Russian heatmap-only strings, the `/reports/heatmap` route, and `GET /api/reports/spending-heatmap`. Keep generated output out of the change unless it is a tracked source artifact that must be updated.

**Ask First:** Adding a redirect from the retired route, retaining a compatibility endpoint, changing a surviving report's API contract, or deleting any shared Reports test/fixture coverage.

**Never:** Do not replace the heatmap with another report, add dependencies, redesign Reports, change database schema, or modify other backend report calculations.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Reports hub | Authenticated user opens `/reports` | No Spending Heatmap card, title, or navigation target is present; existing reports remain available. | N/A |
| Retired client route | User navigates directly to `/reports/heatmap` | React Router has no heatmap page route, so the route is handled by the existing unmatched-route behavior. | Existing route fallback handles it. |
| Retired API route | Client requests `GET /api/reports/spending-heatmap` | Controller exposes no action or route constant, and the report service exposes no heatmap method or contract. | Framework returns its normal unmatched-endpoint response. |
| Remaining report QA | Reports fixture suite runs | Category, budget, and history scenarios keep their fixtures, API handling, and assertions without heatmap-specific fields. | Existing QA failure reporting remains unchanged. |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/App.tsx` -- lazy import and nested Reports route to remove.
- `inex/ClientApp/src/pages/Reports.tsx` and `inex/ClientApp/src/pages/Reports/ReportList.tsx` -- heatmap title mapping and hub card to remove.
- `inex/ClientApp/src/pages/Reports/ReportSpendingHeatmap.tsx`, `inex/ClientApp/src/components/SpendingHeatmap.tsx`, `inex/ClientApp/src/components/SpendingHeatmap.css`, `inex/ClientApp/src/model/Report/SpendingHeatmap.ts`, and `inex/ClientApp/src/pages/Reports/ReportSpendingHeatmap.test.ts` -- feature-only client code to delete.
- `inex/ClientApp/public/locales/en/translation.json` and `inex/ClientApp/public/locales/ru/translation.json` -- heatmap-only localisation entries to remove.
- `inex/Controllers/ReportsController.cs`, `inex.Services/Services/Base/IReportService.cs`, `inex.Services/Services/ReportService.cs`, and `inex.Services/Models/Records/Report/SpendingHeatmapDayResponse.cs` -- endpoint, service operation, implementation, and response contract to remove.
- `inex.Services.Tests/Services/ReportServiceTests.cs` and `inex.Tests/Reports/ReportsControllerTests.cs` -- heatmap-only backend coverage to remove.
- `inex/ClientApp/visual-qa/reports.mjs`, `inex/ClientApp/visual-qa/verify-summaries.mjs`, `inex/ClientApp/src/test/fixtures/reportsVisualFixture.ts`, and `docs/implementation/visual-qa/reports/qa-summary.json` -- heatmap-only fixture data, scenarios, assertions, and captured evidence to remove while keeping shared Reports QA.

## Tasks & Acceptance

**Execution:**
- [x] Client routes and hub files -- remove the lazy page, nested route, title mapping, and Reports card -- prevents navigation to the retired feature.
- [x] Heatmap-only client files and locale entries -- delete the page, component, stylesheet, model, unit test, and matching EN/RU strings -- removes all client feature code and copy.
- [x] Report controller/service/contract -- remove the endpoint route/action, service interface member and implementation, and response record -- eliminates the retired API surface without touching remaining reports.
- [x] Backend tests -- delete endpoint and service test cases that only assert removed behavior -- prevents obsolete contract coverage.
- [x] Reports visual QA -- remove heatmap fixtures, mocked API path, scenarios, assertions, screenshot references, and stale evidence entries -- keeps the suite aligned with supported reports.
- [x] Reference sweep -- confirm no production heatmap symbols or retired API route remain -- catches dangling imports or dead integration points.

**Acceptance Criteria:**
- Given the supported Reports hub, when it loads, then it contains no Spending Heatmap card, title mapping, or link and the remaining report entries still render.
- Given a direct navigation to `/reports/heatmap`, when the client routes resolve, then no heatmap page is rendered.
- Given a request to `GET /api/reports/spending-heatmap`, when endpoint routing runs, then no heatmap endpoint is exposed.
- Given the source tree and visual-QA scenarios, when searched for production heatmap symbols and the retired API route, then no stale feature references remain outside intentional historical documentation.
- Given the remaining frontend and backend code, when the targeted build and test commands run, then they succeed without removed-feature imports or obsolete assertions.

## Spec Change Log

## Design Notes

This is a subtraction-only change. Removing each end of the feature together is required because retaining a route, API, type, fixture, or translation after its consumer disappears leaves a dead supported-looking surface. Historical planning and completed-story records are not production references and remain untouched.

## Verification

**Commands:**
- `dotnet test inex.Services.Tests/ --no-restore` -- expected: service tests compile and pass after removal.
- `dotnet test inex.Tests/ --no-restore` -- expected: API integration tests compile and pass after removing the endpoint coverage.
- `npm run build` from `inex/ClientApp` -- expected: TypeScript and Vite build without heatmap imports.
- `npm run lint` from `inex/ClientApp` -- expected: frontend lint completes successfully.
- `npm run visual-qa:verify` from `inex/ClientApp` -- expected: retained Reports QA evidence has no removed heatmap requirements.
- `rg -n -i --glob '!docs/**' --glob '!inex/ClientApp/build/**' 'spending heatmap|spending-heatmap|SpendingHeatmap' inex inex.Services inex.Services.Tests inex.Tests` -- expected: no production or test references remain.

## Suggested Review Order

**Report surface removal**

- Remove the authenticated HTTP entry point completely.
  [`ReportsController.cs:21`](../../inex/Controllers/ReportsController.cs#L21)

- Remove the service contract and aggregation implementation together.
  [`IReportService.cs:10`](../../inex.Services/Services/Base/IReportService.cs#L10)

- Delete the heatmap-specific response contract.
  [`SpendingHeatmapDayResponse.cs`](../../inex.Services/Models/Records/Report/SpendingHeatmapDayResponse.cs)

**Client and visual-QA cleanup**

- Keep only supported Reports routes and lazy pages.
  [`App.tsx:21`](../../inex/ClientApp/src/App.tsx#L21)

- Limit Reports hub cards to the supported report set.
  [`ReportList.tsx:17`](../../inex/ClientApp/src/pages/Reports/ReportList.tsx#L17)

- Remove heatmap scenarios while retaining shared Reports coverage.
  [`reports.mjs:21`](../../inex/ClientApp/visual-qa/reports.mjs#L21)

**Supporting cleanup**

- Remove obsolete service coverage with the retired operation.
  [`ReportServiceTests.cs:1`](../../inex.Services.Tests/Services/ReportServiceTests.cs#L1)

- Keep saved Reports evidence aligned with supported scenarios.
  [`qa-summary.json:1`](visual-qa/reports/qa-summary.json#L1)
