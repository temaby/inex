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
| Navigation IA | Transactions, Accounts, Categories, Budgets, Reports, Profile; mobile bottom nav | Same primary areas, but `/` redirects to Transactions; dashboard not yet a landing route | Introduce dashboard/home route in Epic 10 Story 10.4 |
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
- Treat mobile layouts as first-order deliverables; every converted page must pass 390px checks, with 360px required for Categories, Budgets, and any story that explicitly names 360px coverage.
- Keep all visible frontend text in EN/RU locale files.

## Proposed Implementation Sequence

1. Story 10.1a establishes design tokens and the Ant Design theme bridge.
2. Story 10.1b establishes shared primitives and owns the `lucide-react` dependency.
3. Story 10.1c replaces the authenticated app shell and navigation after 10.1a and 10.1b are complete.
4. Story 10.2 converts Transactions first because it validates ledger density, filters, drawers, mobile bottom nav, and amount formatting in the highest-use workflow.
5. Stories 10.3a, 10.3b, and 10.3c convert Accounts, Categories, and Budgets as a management-surface wave after the 10.1 foundation stories are complete. They may run in parallel only when locale-file and shared-primitive conflicts are actively coordinated.
6. Story 10.4 converts Reports and Dashboard together so analytics IA does not split across two conflicting navigation models.
7. Stories 10.5a and 10.5b convert Profile/Settings and Auth after 10.4. They may run in parallel only when `App.tsx` route, auth-shell, and locale-file ownership is coordinated.
8. Story 10.6 is the final visual QA gate and starts only after Stories 10.1a through 10.5b are done.

## Shared Ownership Hotspots

| Hotspot | Primary owner | Coordination rule |
| --- | --- | --- |
| `inex/ClientApp/src/App.tsx` | 10.1a for `ConfigProvider` theme, 10.1b for `SignageProvider`, 10.1c for shell preservation, 10.4 for `/dashboard`, 10.5b for auth layout routing | Rebase before editing; preserve existing `ConfigProvider` locale/theme, provider wrapping, `ProtectedRoute`, public auth routes, and nested reports routes |
| `inex/ClientApp/public/locales/en/translation.json` and `ru/translation.json` | Every page/story adding visible copy | Keep keys namespaced by route/domain; update both EN and RU in the same story; verify sibling-story keys survive merges |
| `inex/ClientApp/package.json` and `package-lock.json` | 10.1b only for `lucide-react` unless a later story explicitly justifies another dependency | Do not reinstall or relocate dependency ownership in page stories; package changes require build/lint verification |
| `inex/ClientApp/src/components/primitives/*` | 10.1b | Page stories consume primitives; shared primitive changes after 10.1b must be additive or explicitly coordinated with all converted routes |
| Routes and redirects | 10.1c preserves existing protected/public boundaries; 10.4 owns `/dashboard`; 10.5b owns auth layout grouping | Do not change route protection or default redirects outside the owning story |

## Risks And Decisions

| Risk | Decision |
| --- | --- |
| A full visual rebuild can collide with frontend modernization work | Schedule the shell/primitives before RTK Query, but keep data-fetching architecture unchanged during visual stories |
| Route lazy-loading may touch the same route tree as shell migration | Let Epic 7 own chunking; Epic 10 should keep lazy-loading acceptance as compatibility, not duplicate bundling work |
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
