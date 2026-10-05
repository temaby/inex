# Sprint Change Proposal: Prioritize a Single Current Status Dashboard

Date: 2026-09-30

Mode: Batch

Status: Approved with simplified scope on 2026-09-30

## 1. Issue Summary

Story 10.4 delivered the Dashboard landing route, but representative second-user feedback shows that the current page still spreads the useful picture across Dashboard, Accounts, Reports, Categories, and Budgets. The current Dashboard emphasizes numeric cards, budget status, top spending rows, and historical net worth instead of answering the immediate question: "What is the current financial position?"

The approved correction is deliberately narrow: build one shared Dashboard for every user. Do not add Dashboard templates, profile preferences, preference migrations, free-form widgets, or alternative Dashboard layouts in this increment.

The single Dashboard must show:

- active accounts marked for operational overviews and their native balances;
- a complete total for those accounts in the user's base currency, or an explicit unavailable state;
- current-month income and expenses as directly comparable columns;
- a separate expense-category donut;
- a separate income-category donut;
- Parent and Child category starting views, with parent drill-down;
- no Dashboard budget widgets.

Existing linked-account read-only viewing must continue to work through the established authorization scope.

## 2. Impact Analysis

### Epic and story impact

- Keep Epic 6 and completed Story 10.4 unchanged as historical records.
- Add one additive high-priority story to the already active Epic 10: **Story 10.4a — Current Status Dashboard**.
- Prioritize Story 10.4a before unstarted Stories 11.2 through 12.5.
- Do not create a new epic for this increment.

### Story 10.4a scope

1. Reuse the existing account, account-summary, transaction-summary, category-report, and cached exchange-rate APIs.
2. Replace the current four numeric cards with one income-versus-expense column chart.
3. Add the overview-visible account list and complete-or-unavailable converted total.
4. Add separate income and expense category donuts.
5. Support Parent and Child starting views in page-local state. Parent mode drills into one parent's children; Child mode starts with ranked children and shows parent context.
6. Show up to eight explicit categories plus Other.
7. Remove budget remaining, budget-derived top-category content, and historical net worth from this Dashboard.
8. Preserve linked-account read-only mode, EN/RU localization, accessible chart summaries, keyboard operation, loading/error/empty states, and responsive behavior.
9. Rename the account-facing Favourite label to Show in overviews without changing the existing `isFavourite` contract.

### Explicitly deferred

- Dashboard templates.
- Profile-based Dashboard settings.
- Persisting Parent/Child selection on the server.
- Cash Flow and Wealth Overview alternative layouts.
- Free-form widget ordering or visibility settings.
- A new consolidated Dashboard backend endpoint.

### Artifact impact

- `docs/planning/epics.md`: add Story 10.4a and place it before deferred roadmap work.
- `docs/implementation/sprint-status.yaml`: add Story 10.4a as the active implementation priority.
- `docs/implementation/10-4a-frontend-ux-current-status-dashboard.md`: create one implementation-ready story.
- `docs/planning/ux-design-specification.md`: retain the Current Status design, but mark templates and Profile settings as deferred.
- No PRD, architecture, database, or backend contract change is required for this increment.

### Technical impact

- Frontend only: Dashboard component/CSS, typed view helpers, shared or local accessible summaries, account label copy, EN/RU translations, tests, and visual fixtures.
- Existing RTK Query/API-client paths remain authoritative.
- Existing `isFavourite` is the overview-visibility flag.
- Cached-rate conversion follows complete-or-unavailable behavior; no partial total is presented as complete.
- No new dependency is required; Recharts and existing InEx/Ant Design primitives cover the UI.

## 3. Recommended Approach

Recommended path: **Direct Adjustment inside Epic 10 through one Story 10.4a**.

This is the smallest coherent vertical slice. It gives both users the same useful Dashboard, avoids preference and migration work, and reuses contracts already exercised by Transactions, Accounts, and Reports.

Effort estimate: medium.

Risk level: low-medium. The main risks are multi-currency completeness, category hierarchy aggregation, linked-account scope, and small-screen chart layout. Existing account-summary, cached-rate, report, and linked-scope patterns reduce those risks.

Priority: implement now before starting new work on Stories 11.2–12.5.

## 4. Detailed Change Proposals

### Epic 10

OLD:

> Story 10.4 completes the Dashboard landing and report chrome; subsequent Epic 10 work proceeds to settings/auth and final QA.

NEW:

> Add Story 10.4a as a high-priority additive correction after real-user review. It replaces the Dashboard content with one shared Current Status composition while preserving the shell, Reports hub, linked-account view, and completed Story 10.4 history.

### Dashboard experience

OLD:

> Four numeric KPI cards, budget remaining, top-five budget rows, and historical net worth share the landing page.

NEW:

> One Current Status Dashboard shows overview-visible account balances and total, income-versus-expense columns, separate expense and income category donuts, and Parent/Child category exploration. Budget widgets and historical net worth are absent from the Dashboard.

## 5. Implementation Handoff

Change scope classification: **Minor-to-moderate frontend adjustment**.

Implementation owner: Developer.

Success criteria:

- `/dashboard` renders the same Current Status composition for every authenticated user.
- Only active accounts with `isFavourite !== false` appear in the account list and total.
- A multi-currency account total is either complete or visibly unavailable with missing-currency evidence.
- Income and expenses are rendered as columns rather than standalone numeric cards.
- Separate income and expense donuts show up to eight categories plus Other.
- Parent mode drills into children; Child mode starts with child categories and displays parent context.
- Budget-derived content and historical net worth are removed from Dashboard.
- Linked-account viewing remains read-only and ownership-safe.
- EN/RU strings, component tests, build, lint, and fixture-backed visual QA at 1440px, 1024px, 390px, and 360px pass.

## 6. Checklist Result

- Trigger and evidence: complete.
- Epic impact: complete; one additive Story 10.4a, no new epic.
- PRD and architecture impact: none for this frontend-only increment.
- UX impact: Current Status retained; templates and settings deferred.
- Path evaluation: Direct Adjustment is viable; rollback and backend expansion are unnecessary.
- Approval: approved by the user with the explicit instruction to keep one shared Dashboard and avoid additional complexity.
