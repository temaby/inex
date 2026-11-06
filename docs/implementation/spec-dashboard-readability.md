---
title: Improve Visual Dashboard readability
type: bugfix
created: '2026-11-06'
status: done
route: one-shot
---

# Improve Visual Dashboard readability

## Intent

**Problem:** Small body text, amounts and chart labels make the dashboard difficult to read on some screens. The balance distribution caption and account picker add unnecessary controls.

**Approach:** Increase page-local primary body text to 16px and secondary text/amounts to at least 14px using existing typography tokens. Increase the income chart space and inner radius, and stack its mobile layout to fit larger text. Preserve the compact desktop layout at 1440x800 through legend placement and spacing. Display the main Money in accounts total to zero decimal places while preserving conversion precision and individual account balances. Remove the account dropdown and Positive balances currency caption; retain segment selection, tooltips, favorite accounts and keyboard focus restoration.

## Suggested Review Order

- Raise dashboard body text with existing tokens and preserve title hierarchy.
  [visual-dashboard.css:31](../../inex/ClientApp/src/pages/Dashboard/visual-dashboard.css#L31)
- Round only the main balance display through the existing numeric primitive.
  [VisualDashboard.tsx:308](../../inex/ClientApp/src/pages/Dashboard/VisualDashboard.tsx#L308)
- Remove redundant controls and restore keyboard focus to the selected segment.
  [VisualAccountDistribution.tsx:47](../../inex/ClientApp/src/pages/Dashboard/VisualAccountDistribution.tsx#L47)
- Give larger income labels enough room inside the donut hole.
  [IncomeDistribution.tsx:109](../../inex/ClientApp/src/pages/Dashboard/IncomeDistribution.tsx#L109)
- Verify whole-unit rounding, readable text and keyboard selection across responsive fixtures.
  [visual-dashboard.mjs:13](../../inex/ClientApp/visual-qa/visual-dashboard.mjs#L13)
- Keep account selection and focus regressions covered after removing the dropdown.
  [Dashboard.test.tsx:1012](../../inex/ClientApp/src/pages/Dashboard.test.tsx#L1012)
