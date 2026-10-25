---
title: Personal dashboard labels and distinct expense colors
type: bugfix
created: '2026-10-25'
status: done
route: one-shot
---

# Personal dashboard labels and distinct expense colors

## Intent

**Problem:** Collective dashboard wording does not fit a personal overview, and green expense segments conflict with the income comparison's green meaning.

**Approach:** Use “Мои расходы”, “Мои деньги” and personal supporting text, with equivalent English labels. Give expense chart segments and their legend a matching coral/amber/rose/lavender/blue palette without green or teal. Preserve account colors, financial calculations and classic dashboard appearance.

## Validation

Project doctor passed all 21 UI checks. The 26 Dashboard tests, build/typecheck and lint passed. All 22 visual dashboard fixture states passed. Desktop and Russian mobile screenshots were inspected; independent review found no introduced issues. Updated fixture evidence is in `visual-qa/visual-dashboard/`.

The QA Settings reload repeatedly stalled in the CDP `Page.reload` command. Replaced it with a full navigation to the current URL, retaining the persistence assertion, and added a preference-saved progress marker. The complete harness then passed; this small reliability fix also passed independent review.

## Suggested Review Order

- Compare expense chart/legend colors and the separately preserved account palette.
  [VisualDashboard.tsx:15](../../inex/ClientApp/src/pages/Dashboard/VisualDashboard.tsx#L15)
- Review personal headings in both locales.
  [ru/translation.json:258](../../inex/ClientApp/public/locales/ru/translation.json#L258)
  [en/translation.json:256](../../inex/ClientApp/public/locales/en/translation.json#L256)
