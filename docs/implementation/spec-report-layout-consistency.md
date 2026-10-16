---
title: 'Align report summaries and compact the reports list'
type: 'bugfix'
created: '2026-10-16'
status: 'done'
route: 'one-shot'
---

# Align report summaries and compact the reports list

## Intent

**Problem:** Report pages repeat their data in a visible bottom text summary. Their upper summary styles leak label formatting into nested money values, and the reports list uses unnecessarily tall cards.

**Approach:** Keep bottom summaries available to screen readers without occupying visible space, scoped to report pages. Match Transactions with muted 11px labels, 30px tabular money values, smaller currency suffixes, white card surfaces, shared borders and shadows, and stacked mobile cards. Convert report launch cards into compact horizontal layouts with a wrapping mobile arrangement. Preserve report calculations, data loading, routes, filters, and linked-account scope.

Validation: production build, lint, and all three existing report tests passed. All 36 fixture visual states passed, including English at 1440/1024/390/360px and Russian at 360px. Independent review found and verified the correction of narrow budget card tracks; no remaining actionable findings. The default global visual summary verifier fails only on eight unrelated stale page summaries; the reports summary is current and passes. A diagnostic run allowing existing summaries up to 1000 hours old passes all nine folders. No screenshots from unrelated pages were refreshed.

Suggested tooling follow-up: extend the project doctor's UI probe to exercise an esbuild bundle, since the Vite version probe passed while the production build still required sandbox process-launch permission.

## Suggested Review Order

1. [Report styles](../../inex/ClientApp/src/pages/Reports/reports.css) — label isolation, summary typography, compact launch cards, and screen-reader text alternatives.
2. [Category report](../../inex/ClientApp/src/pages/Reports/ReportCategory.tsx), [budget report](../../inex/ClientApp/src/pages/Reports/ReportBudgetSpending.tsx), [history report](../../inex/ClientApp/src/pages/Reports/ReportMonthlyHistory.tsx) — smaller currency suffixes in summary cards.
3. [Existing category test](../../inex/ClientApp/src/pages/Reports/ReportCategory.test.tsx) — accessible money assertions survive split currency markup.
4. [Visual QA harness](../../inex/ClientApp/visual-qa/reports.mjs) and [evidence](visual-qa/reports/qa-summary.json) — fixture coverage at 1440, 1024, 390, and 360px plus Russian labels at 360px; no real backend/provider calls.
