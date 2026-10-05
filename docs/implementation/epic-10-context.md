# Epic 10 Context: Frontend Design System Rebuild

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Deliver the production React interface through the established InEx visual system: a calm finance-first shell, tokenized primitives, dense and scannable operational pages, accessible controls and charts, and responsive behavior verified at desktop and mobile widths. The epic preserves existing domain behavior, authenticated API boundaries, routing, Redux/RTK Query ownership, i18n, and Ant Design/Recharts dependencies while replacing inconsistent page chrome and one-off visual patterns. Story 10.4a is the real-user correction that turns Dashboard into one shared current-status overview rather than a collection of budget and historical-report widgets.

## Stories

- Story 10.1a: Design tokens and theme bridge
- Story 10.1b: Shared frontend primitives
- Story 10.1c: App shell and navigation
- Story 10.1d: Shell, locale, fixture, and visual-QA policy
- Story 10.1e: Shared mockup-alignment primitives
- Story 10.2: Transactions ledger redesign
- Story 10.2a: Transactions design-gap remediation
- Story 10.2b: Transactions mockup-alignment delta
- Story 10.3a: Accounts management redesign
- Story 10.3b: Categories management redesign
- Story 10.3c: Budgets management redesign
- Story 10.3d: Accounts design-gap remediation
- Story 10.3e: Categories spend and budget signals
- Story 10.3f: Budgets burn-rate and planning detail
- Story 10.3g: Accounts mockup-alignment delta
- Story 10.3h: Categories mockup-alignment delta
- Story 10.3i: Budgets mockup-alignment delta
- Story 10.4: Reports hub, Dashboard landing, and drill-down chrome
- Story 10.4a: Current Status Dashboard
- Story 10.5a: Profile and settings redesign
- Story 10.5b: Login and registration redesign
- Story 10.6: Visual-QA baseline and responsive regression checklist

## Requirements & Constraints

- All user-visible copy is localized through EN/RU i18n resources; English is the visual baseline and Russian is a long-label stress case.
- Financial values use tabular numerics, explicit income/expense/transfer semantics, and a non-color-only signal.
- Dashboard remains distinct from Reports and domain management pages. It presents current status and links to filtered source workspaces rather than owning edit flows.
- Story 10.4a uses one shared Dashboard for all users. Templates, Profile-based Dashboard settings, persisted category-level preferences, and free-form widget customization are deferred.
- The Dashboard account scope is active accounts with `isFavourite !== false`. `isFavourite` remains the API field; user-facing copy describes it as Show in overviews.
- Cross-currency totals are complete or unavailable. Missing conversion data must not produce a silently partial total.
- The Dashboard shows income versus expenses as columns and separate income and expense donuts. Each donut exposes up to eight categories plus Other and supports Parent/Child exploration.
- Budget planning stays in Budgets. Historical net worth stays in Reports and does not appear on the shared Current Status Dashboard.
- Loading, empty, incomplete-rate, error, and linked-account read-only states are release behavior, not optional polish.
- Visual QA covers 1440px, 1024px, 390px, and 360px; page-level horizontal overflow, clipped controls, inaccessible charts, and mobile-navigation occlusion are failures.

## Technical Decisions

- Keep React 18, TypeScript strict mode, Vite, Ant Design 5, Redux Toolkit/RTK Query, Axios through `apiClient`, React Router, i18next, and Recharts. Add no new UI, state, data-fetching, or charting dependency.
- Reuse existing account, account-summary, transaction-summary, category-report, cached-rate, and linked-account query paths for Story 10.4a. Do not add a consolidated backend endpoint in this increment.
- Shared tokens and primitives own color, spacing, typography, money formatting, focus behavior, controls, feedback, drawers, and accessible chart summaries. Page CSS should only compose Dashboard-specific layout.
- Preserve backend-authoritative ownership. Optional linked-user reads must continue through the existing authorized linked-account scope; the frontend must not infer ownership from IDs.
- Charts must have an adjacent textual or tabular summary and native keyboard-operable controls; Recharts SVG sectors cannot be the only interaction surface.
- Use DOM order that matches mobile reading order, responsive containers without fixed chart widths, stable chart height while loading, and reduced-motion-safe behavior.

## UX & Interaction Patterns

- Current Status answers in order: overview-visible account total and list, current-month income versus expenses, expense composition, income composition, and actionable data-quality states.
- Parent mode starts with parent-category aggregates and drills into one parent's children. Child mode starts with ranked child categories and includes parent context in every label.
- Other opens a ranked accessible list instead of becoming a dead-end sector.
- Selecting an account opens Accounts. Selecting a flow column or category opens Transactions with current period, type, category, and relevant account scope preserved where supported.
- Each panel owns loading, empty, unavailable, and error behavior so one failure does not erase otherwise usable content.
- Mobile priority order mirrors the information hierarchy and keeps fixed bottom-navigation clearance.

## Cross-Story Dependencies

- Story 10.4a relies on completed Epic 10 tokens, primitives, shell, page-frame, Reports, Accounts, Categories, and Profile foundations.
- Existing linked-account report work supplies authorized read-only account/category/report scopes that Dashboard must preserve.
- Story 10.6 remains the final Epic 10 visual-QA gate and must include Story 10.4a states.
