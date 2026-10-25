---
title: Simplify visual dashboard wording
type: improvement
created: '2026-10-25'
status: done
---

## Scope and implementation groups

The attached wording task is the active specification. Copy-only changes follow the separately validated account-report scope correction (commit 3c230a5). They do not modify API queries, calculations, hierarchy selection, charts, card layout, colors or Classic Dashboard strings.

- W1, VisualDashboard/IncomeDistribution: neutral card headings, remove repetitive subtitles, retain account selection and currency/date/count context.
- W2, VisualDashboard/IncomeDistribution: Main categories/Subcategories and consistent Categories return buttons, with Back to categories accessible names. Keep the group label available to screen readers and show a selected category's name on explicit drill-down.
- W3, visual-dashboard-copy/locales: current/past/future month wording, short positive/negative/equal/no-activity text, clear empty account and period states, and rates wording without cache terminology.

## Wording decisions

- Keep Dashboard / Дашборд as the page title to match navigation; remove the page eyebrow only in visual mode.
- Keep Favorite accounts / Избранные счета below the money heading because reports cover all active accounts while wallet balances cover favorites.
- Preserve account count, rate date and reporting currency. Native account balances retain their original-currency hint and currency codes; the aggregate has an explicit accessible total-balance label.
- Hide automatic income-root context; use Monthly income for that initial total. Explicit drill-down shows the category name and Total, with unchanged back/Escape/focus behavior. Apply the same presentation rule to expenses.
- Use a concise Categories button with Back to categories as its accessible name in both flows. Main/Subcategories retain existing keys and navigation behavior.
- Current month: How the month is going / Как идёт месяц; past month: How the month went / Как прошёл месяц; future fallback: Monthly income and expenses / Доходы и расходы за месяц. The dashboard currently selects the current month only; past/future copy is verified by period-helper tests without introducing a period selector.
- Update only dashboard.visual locale keys and bump the translation resource version so existing production browser caches refresh. Shared and classic translation objects remain identical to the preceding commit.

## Before and after

| Before | After |
| --- | --- |
| Мои расходы + Куда уходят мои деньги | Куда уходят деньги |
| Мои деньги + На выбранных кошельках | Деньги на счетах + Избранные счета |
| Как прошёл месяц + Доходы и расходы рядом | Как идёт месяц for the current month |
| Доходы превысили расходы на {{amount}} | Доходов больше на {{amount}} |
| Доходы и расходы сравнялись | Доходы и расходы равны |
| Родительские / Дочерние | Основные / Подкатегории |
| Назад к родительским категориям | Категории; accessible: Назад к категориям |
| Внутри категории «Доход» on automatic entry | No default subtitle; explicit drill-down retains the category name |
| Where it came from | Where the money came from |
| Income exceeded spending by {{amount}} | Income is higher by {{amount}} |

## Validation

Project doctor passes all 21 UI checks. Focused component/preference/copy tests pass, including localized interpolation, positive/negative/equal/empty results, fractional rounding inherited from existing tests, category context and current/past/future titles. The copy-specific test uses the installed i18next 26 initAsync option. Final validation: all 310 frontend tests across 41 files pass; production build/typecheck, lint and git diff --check pass. Visual Dashboard passes all 42 fixture states and Classic Dashboard passes all 17 states. Desktop Russian and mobile negative-result screenshots were visually inspected. The canonical visual-summary verifier reports only seven unrelated stale page summaries; both dashboard summaries pass. Existing Vite CJS/chunk-size advisories and non-blocking Windows temporary-profile cleanup warnings remain.

Browser evidence uses isolated synthetic API fixtures and cached rates; no real backend or rate provider is called. Screenshots remain under docs/implementation/visual-qa/visual-dashboard/. Preserve classic source/shared financial modules and shared locale values when reviewing this copy-only commit.
