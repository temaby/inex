---
title: "InEx Design Update Plan"
status: proposed
created: 2026-05-26
source:
  - docs/design
  - docs/design/docs/design-implementation-guide.md
  - inex/ClientApp/src
---

# InEx Design Update Plan

## Review Summary

The `docs/design` folder now defines a coherent target UI for InEx: a quiet finance operations tool with a custom shell, tokenized visual language, dense ledger-style screens, mobile bottom navigation, drawer-based create/edit flows, accessible empty states, and report drill-down patterns.

The production React app is still built mostly from Ant Design layout, menu, table, drawer, and form primitives. It already has the right product areas and data flows, but the current UI does not yet implement the design system, shell behavior, numeric treatment, responsive page contracts, or visual QA expectations captured by the mockups.

## Current Gap Assessment

| Area | Target from `docs/design` | Current app state | Update needed |
| --- | --- | --- | --- |
| App shell | Sticky desktop top nav, mobile bottom nav, brand mark, user pill, consistent page header | `BasicPage` uses Ant Design `Header`, desktop menu, mobile hamburger drawer, footer | Replace shell and route chrome with design-system shell |
| Tokens | CSS custom properties for brand, money semantics, spacing, radius, elevation, numerics | Mostly Ant Design defaults plus inline styles | Add token stylesheet and map Ant Design theme where still used |
| Navigation IA | Transactions, Accounts, Categories, Budgets, Reports, Profile; mobile bottom nav | Same primary areas, but `/` redirects to Transactions; dashboard not yet a landing route | Introduce dashboard/home route when Epic 4/9 work starts |
| Transactions | KPI strip, dense ledger, filter chips, advanced filter drawer, grouped day headers | Side summary/filter panel plus table/list components | Rebuild as ledger-first operational page |
| Accounts | Net-worth hero, currency grouping, grouped rows, compact inline edit | Basic Ant Design table with expandable edit form | Rebuild around currency groups and balance scan targets |
| Categories | Hierarchical category management with parent/child row treatment and spend signal | Ant Design management surface | Rebuild hierarchy view and spend-ranked mode |
| Budgets | Month switcher, burn-rate hero, budget rows, copy-month action | Ant Design management surface | Rebuild planning workspace and month controls |
| Reports | Hub cards, drill-down report routes, export/share/print actions, chart accessibility | Nested report routes already exist, visual hub is basic | Rebuild hub and drill-down chrome before adding advanced reports |
| Profile | Two-column settings layout, mobile horizontal settings tabs | Existing settings page; design guide flags mobile overflow risk | Rebuild settings layout and explicitly fix mobile overflow |
| Auth | Separate auth layout, validation/error/loading states, password-manager-friendly forms | Existing login/register pages | Align auth visuals and production form states |
| Accessibility | Keyboard tabs, focus trap, icon labels, color-independent money signage, chart summaries | Partial through Ant Design defaults | Add explicit accessibility requirements to shared primitives |
| Visual QA | Browser screenshots at 1440/1024/390/360 and important UI states | No visual regression baseline | Add manual screenshot checklist first, automated coverage later |

## Design Update Principles

- Preserve backend API contracts unless a story explicitly changes the contract.
- Migrate shared shell and primitives before rebuilding feature pages.
- Keep Ant Design where it still provides accessible form controls, date pickers, tables, or overlays, but wrap it behind InEx-specific primitives where the design needs stable behavior.
- Make money movement semantics first-class: tabular numerics, signed/color/icon display preference, right alignment on desktop, no color-only dependency.
- Treat mobile layouts as first-order deliverables; every converted page must pass 390px and 360px checks before the story is complete.
- Keep all visible frontend text in EN/RU locale files.

## Proposed Implementation Sequence

1. Establish the design-system foundation: tokens, primitive wrappers, `Money`, `Progress`, `EmptyState`, `IconButton`, `Drawer`, segmented controls, and shell navigation.
2. Convert Transactions first because it validates ledger density, filters, drawers, mobile bottom nav, and amount formatting in the highest-use workflow.
3. Convert Accounts, Categories, and Budgets as one management-surface wave, reusing the same toolbar, row, grouping, drawer, and empty-state patterns.
4. Convert Reports and Dashboard together so analytics IA does not split across two conflicting navigation models.
5. Convert Profile and Auth, including mobile settings overflow fixes and production form validation states.
6. Add visual QA coverage and document the screenshot matrix in the implementation guide.

## Risks And Decisions

| Risk | Decision |
| --- | --- |
| A full visual rebuild can collide with frontend modernization work | Schedule the shell/primitives before RTK Query, but keep data-fetching architecture unchanged during visual stories |
| Route lazy-loading may touch the same route tree as shell migration | Let Epic 6 own chunking; Epic 9 should keep lazy-loading acceptance as compatibility, not duplicate bundling work |
| Ant Design default styles can fight custom tokens | Use Ant Design theme tokens only where components remain; custom page layout should use InEx CSS variables |
| Browser-global mockup files are not production code | Treat `docs/design/*.jsx` as visual references and copy behavior deliberately into typed React modules |
| Visual regressions are easy to miss on finance tables | Require screenshots for converted pages at desktop and mobile breakpoints before each design story is accepted |

## Acceptance Gate For The Design Track

The design update track is complete when:

- `docs/design/docs/design-implementation-guide.md` is implemented as production React guidance, not only mockup documentation.
- The production app shell, tokens, core primitives, and all top-level routes match the documented visual and responsive contracts.
- Mobile navigation uses the bottom nav pattern and pages have no horizontal overflow at 390px or 360px.
- Transactions, Accounts, Categories, Budgets, Reports, Profile, Login, and Register have empty/loading/error states consistent with the new design system.
- Every converted route passes `npm run build`, `npm run lint`, and documented visual checks.
