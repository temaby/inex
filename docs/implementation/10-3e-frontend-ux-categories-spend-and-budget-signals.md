# Story 10.3e: Frontend UX - Categories Spend And Budget Signals

Status: review

## Story

As an invited account holder,
I want Categories to show real spend, activity, and budget signals instead of placeholders,
so that category structure can be managed with current financial context.

## Acceptance Criteria

1. Given categories and current-month transaction data are available through the existing transaction list contract, when `/categories` renders, then the page computes current-month category stats with parent roll-up, transaction counts, last-active dates, total spend, top parent, top-five distribution, and Other without adding or changing backend/API contracts.
2. Given current-month spend exists, when the Categories hero and rows render, then the hero shows total expense spend, most-spent parent, and distribution, while rows show transaction count, last-active date, spend amount, and localized month sublabel.
3. Given transaction data is unavailable, incomplete, or a category has no current-month activity, when Categories renders, then the UI shows the graceful no-spend or dash treatment without fake values, crashes, or stale partial-cache totals.
4. Given By-spend mode is selected, when leaf categories render, then non-system leaves are sorted by current-month spend descending with stable secondary ordering, and zero-spend leaves trail populated rows.
5. Given a category is linked to a budget or the row is expanded, when the row and inline snapshot render, then linked categories show the `Budgeted` chip, parent/group labeling does not impersonate budget state, and the snapshot shows real month spend, transaction count, budget status, and category ID where data exists.
6. Given the user has no categories, when `/categories` opens, then the page renders the accepted shared empty-state composition without misleading spend panels or list chrome, and any default-categories action is implemented through a real contract or removed with owner-visible rationale.
7. Given the story is complete, when `npm run build`, `npm run lint`, and visual QA run from `inex/ClientApp`, then all pass and screenshots cover populated spend, by-spend sorted order, expanded snapshot metrics, empty first-use, filter-empty, 390px, and 360px states.

## Tasks / Subtasks

- [x] Add current-month category stats from existing transaction data contracts. (AC: 1, 2, 3)
  - [x] Read complete cached transaction data where available and fetch the current month through the existing paged transaction list contract when direct navigation has no complete cache.
  - [x] Roll child spend up to parents.
  - [x] Compute transaction count, last active date, total spend, most-spent parent, top-five distribution, and Other.
  - [x] Preserve graceful no-data behavior when transaction data is unavailable.
- [x] Wire real stats into category surfaces. (AC: 2, 4, 5)
  - [x] Update `CategoriesHero` to show spend and distribution when data exists.
  - [x] Update `CategoryRow` activity and spend cells.
  - [x] Sort By-spend mode by computed spend with stable tie-breakers.
  - [x] Update inline snapshot metrics.
- [x] Add budget linkage without impersonating parent state. (AC: 5)
  - [x] Source budget linkage from available budget state/cache.
  - [x] Render `Budgeted` only for linked categories.
  - [x] Remove or restyle the current parent chip if it conflicts with budget state.
- [x] Correct first-use empty behavior. (AC: 6)
  - [x] Avoid hero, toolbar, and list chrome for true first-use empty state.
  - [x] Implement `Load default categories` only if a real seeding contract exists.
  - [x] If no real contract exists, update copy or documentation so no dead action is shown.
- [x] Validate build, lint, i18n, and visual QA. (AC: 7)
  - [x] Add EN/RU keys for new labels and fallback states.
  - [x] Run `npm run build`.
  - [x] Run `npm run lint`.
  - [x] Capture required visual QA screenshots.

### Review Findings

- [x] [Review][Patch] Use only complete, unfiltered, period-covering cached transaction pages for category spend stats; otherwise show unavailable state. [`inex/ClientApp/src/pages/Categories.tsx`]
- [x] [Review][Patch] Do not fall back to stale legacy budgets after an explicitly loaded empty current-month budget query. [`inex/ClientApp/src/pages/Categories.tsx`]
- [x] [Review][Patch] Mark spend stats unavailable instead of undercounting when exchange-rate conversion is missing or invalid. [`inex/ClientApp/src/pages/Categories/categories.utils.ts`]
- [x] [Review][Patch] Refresh the current-month period for long-lived tabs crossing month boundaries. [`inex/ClientApp/src/pages/Categories.tsx`]
- [x] [Review][Patch] Bump the locale resource version so newly added category locale keys are not hidden by cached translation JSON. [`inex/ClientApp/src/i18n.ts`]
- [x] [Post-Merge Review][Patch] Inherit parent budget links to descendant leaf categories without overriding direct child budgets. [`inex/ClientApp/src/pages/Categories/categories.utils.ts`]
- [x] [Post-Merge Review][Patch] Fetch current-period transactions through the existing paged list contract so direct navigation does not permanently show spend unavailable, while retaining complete-cache fallback and unavailable treatment on fetch failure. [`inex/ClientApp/src/pages/Categories.tsx`]
- [x] [Post-Merge Review][Patch] Match category exchange rates by both base and target currency to avoid using rates from another base. [`inex/ClientApp/src/pages/Categories/categories.utils.ts`]
- [x] [Post-Merge Review][Patch] Reset all category spend stats when any conversion is missing so unavailable mode cannot leave partial spend ordering behind. [`inex/ClientApp/src/pages/Categories/categories.utils.ts`]
- [x] [Post-Merge Review][Patch] Require cached transaction ranges to cover the full final day before using them as complete current-month cache. [`inex/ClientApp/src/pages/Categories.tsx`]
- [x] [Post-Merge Review][Patch] Fetch current-month budgets through the existing budget list contract so direct navigation can show Budgeted chips and snapshots without relying on another route's cache. [`inex/ClientApp/src/pages/Categories.tsx`]
- [x] [Post-Merge Review][Patch] Send current-period direct transaction fetches and shared transaction filters with full-day datetimes so final-day transactions are included. [`inex/ClientApp/src/pages/Categories.tsx`, `inex/ClientApp/src/store/transactions/transactions-api.ts`]
- [x] [Post-Merge Review][Patch] Resolve category spend base currency only from profile/rate data and show unavailable spend instead of inventing USD when resolution fails. [`inex/ClientApp/src/pages/Categories.tsx`, `inex/ClientApp/src/pages/Categories/categories.utils.ts`]
- [x] [Post-Merge Review][Patch] Return focus to the Add Category trigger after the create drawer closes. [`inex/ClientApp/src/pages/Categories.tsx`, `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx`]

## Dev Notes

### Source Gap Review

- Primary source: `docs/implementation/10-3b-categories-design-implementation-gap-review.md`.
- Story 10.3b remains the base redesign story; this follow-up remediates accepted residuals from that review.
- Reparenting remains unsupported unless a separate backend/API story is created.
- `View transactions` and `Set budget` should stay disabled, removed, or explicitly deferred unless their target workflows are wired.

### Expected Files

- `inex/ClientApp/src/pages/Categories.tsx`
- `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx`
- `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx`
- `inex/ClientApp/src/pages/Categories/CategoryRow.tsx`
- `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx`
- `inex/ClientApp/src/pages/Categories/categories.utils.ts`
- `inex/ClientApp/src/pages/Categories/categories.css`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`

### Guardrails

- Do not add backend endpoints or change category or transaction API contracts.
- Use the existing paged transaction list contract for current-period spend when the cache is incomplete, and degrade gracefully if that request fails.
- Keep budget linkage read-only in this story; do not add budget mutation behavior from Categories.
- Preserve search ancestor visibility, active/all scope, system category protection, and mobile indentation from Story 10.3b.

## References

- `docs/planning/epics.md`
- `docs/implementation/10-3b-frontend-ux-categories-management-redesign.md`
- `docs/implementation/10-3b-categories-design-implementation-gap-review.md`
- `docs/design/Categories.jsx`
- `docs/design/EmptyState.jsx`
- `docs/design/docs/design-implementation-guide.md`
- `docs/implementation/visual-qa/10-3b/`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex with BMad dev-story Worker B (Categories) and integrated BMad code-review layers.

### Debug Log References

- 2026-06-05: Story created from BMad design-gap review and dedicated subagent synthesis.
- 2026-06-05: `npm run build` passed from `inex/ClientApp` after Windows sandbox `spawn EPERM` rerun with escalation.
- 2026-06-05: `npm run lint` passed from `inex/ClientApp`.
- 2026-06-05: `npm run test` passed from `inex/ClientApp` with 12 files and 50 tests.
- 2026-06-05: Targeted visual QA refreshed in `docs/implementation/visual-qa/10-3e/qa-summary.json`; no horizontal overflow in populated spend, by-spend, expanded snapshot, first-use empty, filter-empty, 390px, and 360px states.
- 2026-06-05: BMad integrated code review completed; actionable Categories findings fixed.
- 2026-06-05: Post-merge BMad review found parent-category budgets were not visible on by-spend leaf rows; inheritance was added and covered by focused Vitest.
- 2026-06-05: Second post-merge BMad review found direct navigation left spend permanently unavailable without complete transaction cache; Categories now loads the current period through the existing transaction contract, and route smoke confirmed visible spend with no overflow.
- 2026-06-05: Third post-merge BMad review found conversion-miss unavailable mode could retain partial spend, date-only cache ranges were too permissive, and budget chips depended on prior budget-route cache; fixes were applied with focused Vitest coverage.
- 2026-06-05: Round-3 route smoke confirmed direct `/categories` navigation fetches current budgets and transactions, shows Food spend `400.00 PLN`, and has no horizontal overflow; evidence recorded in `docs/implementation/visual-qa/10-3e/qa-summary.json`.
- 2026-06-05: Fourth post-merge BMad review found final-day direct-fetch transactions were excluded, missing base-currency resolution could imply USD, and Add Category drawer close did not restore trigger focus; fixes were applied with focused Vitest and route smoke.

### Completion Notes List

- Added current-period category spend stats with parent roll-up, transaction counts, last-active dates, total spend, most-spent parent, distribution, complete-cache fallback, and unavailable fallback.
- Wired real spend/activity/budget signals into hero, rows, by-spend mode, and inline snapshot through existing transaction/budget contracts without adding backend endpoints.
- Removed dead inline actions and kept budget linkage read-only through cached/current budget data.
- Corrected first-use empty to skip spend/list chrome and remove default-seeding UI without a backend contract.
- Added EN/RU locale copy and visual QA evidence for required desktop/mobile states.
- Follow-up fixed parent budget inheritance for descendant leaves in by-spend rows and inline snapshots.
- Second follow-up fixed direct-navigation spend loading and stricter exchange-rate matching.
- Third follow-up resets spend stats on conversion miss, requires complete cached period ranges, and fetches current-month budgets through the existing contract.
- Categories QA summary now includes round-3 direct-navigation spend and budget-chip smoke evidence.
- Fourth follow-up serializes transaction filter ranges with full-day datetimes, removes the final category spend USD fallback path, and restores Add Category trigger focus after drawer close.
- Categories QA summary now includes round-4 smoke evidence for final-day spend inclusion, missing-base unavailable state, and Add trigger focus return.

### File List

- `inex/ClientApp/src/pages/Categories.tsx`
- `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx`
- `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx`
- `inex/ClientApp/src/pages/Categories/CategoryRow.tsx`
- `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx`
- `inex/ClientApp/src/pages/Categories/categories.css`
- `inex/ClientApp/src/pages/Categories/categories.utils.ts`
- `inex/ClientApp/src/pages/Categories/categories.utils.test.ts`
- `inex/ClientApp/src/store/transactions/transactions-api.ts`
- `inex/ClientApp/src/store/transactions/__tests__/transactions-api.test.ts`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`
- `inex/ClientApp/src/i18n.ts`
- `docs/implementation/visual-qa/10-3e/`

### Change Log

- 2026-06-05: Created ready-for-dev follow-up story.
- 2026-06-05: Implemented Categories spend and budget signals, review fixes, tests, locale updates, and refreshed visual QA evidence.
- 2026-06-05: Applied post-merge parent-budget inheritance fix and focused utility test coverage.
- 2026-06-05: Applied second post-merge Categories transaction loading and exchange-rate base matching fixes with focused utility test coverage and route smoke.
- 2026-06-05: Applied third post-merge Categories conversion-miss reset, cache-range strictness, and current-budget fetch fixes with focused utility test coverage.
- 2026-06-05: Added round-3 Categories direct-navigation route-smoke evidence.
- 2026-06-05: Applied fourth post-merge Categories full-day transaction filter, base-currency fallback, and Add drawer focus-return fixes with focused tests and route smoke.
