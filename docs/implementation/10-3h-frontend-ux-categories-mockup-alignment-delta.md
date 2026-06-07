# Story 10.3h: Frontend UX - Categories Mockup Alignment Delta

Status: ready-for-dev

## Story

As an invited account holder,
I want the Categories workspace to align with the audited mockup where production has not intentionally diverged,
so that category management has the same header actions, list composition, row density, drawer behavior, empty states, and mobile hierarchy expected by the Epic 10 visual QA gate.

## Scope

This story covers unresolved Categories mismatches from:

- `docs/ui-audit/categories.md`
- `docs/ui-audit/implementation-roadmap.md`, section 3.3

It is a Categories alignment story after Story 10.3b and Story 10.3e. Do not redo completed spend/budget signal work from 10.3e unless the current implementation regressed.

## Acceptance Criteria

1. Given `/categories` renders in the accepted visual baseline, when the page header is shown, then `Add category` is in the `BasicPage`/`AppShell` page-head action area on desktop and becomes a full-width content button directly under the title on mobile. The toolbar must no longer be the only add-entry surface. Covers audit C06 and roadmap 3.3 item 1.

2. Given the list area renders with categories, filters, or a filter-empty state, when desktop layout is inspected, then Categories uses one continuous list panel containing title/count/status controls, divider or equivalent grouping, view/search controls, table header, rows, and simple filter-empty row. The previous separate toolbar card plus separate list card gap is removed. Covers C07, C08, C09, C15 and roadmap 3.3 items 3, 4, and 10.

3. Given the active/all and tree/by-spend controls render, when desktop or mobile layout is inspected, then the controls include visible localized labels (`Status`, `View` or accepted EN/RU equivalents), use the compact segmented-control size established by shared primitives, and wrap without overlap or bottom-nav occlusion. Covers C08 and C20.

4. Given the Categories search renders, when desktop layout is inspected, then search is on the same filter row as `View`, uses the accepted compact field styling, includes the search icon inside the field, and uses localized placeholder copy equivalent to `Search categories...`. Covers C09.

5. Given row data has `description === name` or a blank-equivalent description, when rows render, then duplicate descriptions are suppressed. Rows preserve real non-duplicate descriptions. Covers C12.

6. Given tree and by-spend rows render, when desktop and mobile states are inspected, then row density, parent/child hierarchy styling, stripe treatment, first selected/expanded left accent, swatches, budget chips, spend/activity cells, and leaf-only by-spend styling match the accepted mockup direction without breaking Story 10.3e spend/budget calculations. Covers C13 and C14.

7. Given no Categories results match an active search/filter, when the list renders, then the filter-empty treatment is a simple table-area message (`No categories match these filters` or localized equivalent) with an accessible clear action only if accepted by the shared empty-state policy. It must not render the large rich `FilterEmpty` block inside the list panel unless documented as an accepted deviation. Covers C15 and roadmap 2.6.

8. Given the Add category drawer is opened, when the form renders, then the field order is `Name`, `Parent category`, `Description`, `Active`; the status uses a checkbox/toggle rather than the current radio-button status group if mockup parity is accepted; the footer shows `Cancel` and `Create` actions aligned with the drawer contract; and create errors remain localized and visible. Covers C16 and C17.

9. Given an existing category row is expanded, when inline edit renders, then the unsupported disabled parent selector is removed or converted to read-only text with owner-visible rationale, and snapshot actions `View transactions` and `Set budget` are either wired to real routes/workflows or intentionally absent. Do not leave inert enabled controls. Covers C18 and C19.

10. Given mobile viewport `390x844` and `360x800`, when `/categories` renders with populated data, no-spend data, filter-empty state, add drawer, and expanded row, then the first viewport exposes header, title, page-head add action, compact hero, and top list controls without page-level horizontal overflow or bottom-nav collision. Covers C20 and Story 10.6 failure criteria.

11. Given shell/navigation, locale, and fixture policy are shared Epic 10 concerns, when this story is implemented, then Categories changes do not unilaterally remove Dashboard, change `/` redirect behavior, force English globally, hardcode April 2026 production data, or remove logout/profile controls. Any such decision must be coordinated through the shared-doc recommendations listed in this story. Covers C01, C02, C03, C04, C10, and C11.

12. Given the story is complete, when `npm run build`, `npm run lint`, and relevant Vitest/visual QA checks run from `inex/ClientApp`, then all pass with no new `any`, no hardcoded visible strings, no source changes outside the accepted impacted files, and visual evidence covers desktop default, by-spend, filter-empty, add drawer, expanded row, mobile 390px, and mobile 360px.

## Tasks / Subtasks

- [ ] Move Add category into the page-head action contract. (AC: 1, 10)
  - [ ] Pass a translated `InExButton` through `BasicPage`/`AppShell` `extra`.
  - [ ] Preserve focus recovery after drawer close, including the empty-state create path from Story 10.3e.
  - [ ] Keep a toolbar add action only if product accepts a duplicate affordance; otherwise remove it from `CategoriesToolbar`.

- [ ] Recompose toolbar and list into one continuous list panel. (AC: 2, 3, 4, 7)
  - [ ] Collapse the current separate `categories-toolbar` and `categories-list` card surfaces into one panel.
  - [ ] Add localized labels for status and view controls.
  - [ ] Place search with view controls in the same filter row.
  - [ ] Keep table headers visible on desktop and preserve mobile stacked row behavior.

- [ ] Align row text, density, and hierarchy styling. (AC: 5, 6)
  - [ ] Suppress duplicate descriptions where `description === name`.
  - [ ] Tighten row heights/padding to the audited compact density without clipping long names, amounts, or RU labels.
  - [ ] Add first selected/expanded parent left accent if accepted by the visual baseline.
  - [ ] Ensure by-spend rows remain leaf-only and do not inherit parent-row styling when rendered at depth 0.

- [ ] Replace filter-empty list presentation. (AC: 7)
  - [ ] Use a simple row/message inside the list panel for no-match filters.
  - [ ] Keep rich first-use empty and full-error states separate from filter-empty state.
  - [ ] Preserve accessible clear-filter behavior if an action remains.

- [ ] Align Add category drawer and create form. (AC: 8)
  - [ ] Reorder fields to `Name`, `Parent category`, `Description`, `Active`.
  - [ ] Replace radio-button status with active checkbox/toggle if the mockup remains authoritative.
  - [ ] Add localized `Cancel` and `Create` footer actions.
  - [ ] Preserve `useCreateCategoryMutation`, parent filtering, generated key fallback, error handling, and form reset behavior.

- [ ] Align expanded row edit details. (AC: 9)
  - [ ] Remove the disabled parent selector or convert it to read-only parent text with localized rationale.
  - [ ] Decide whether `View transactions` and `Set budget` can be wired using existing routes.
  - [ ] If wired, use existing routes and query/filter contracts only; do not add backend endpoints.
  - [ ] If not wired, omit the actions and list the accepted deviation in verification notes.

- [ ] Mobile and responsive pass. (AC: 3, 10, 12)
  - [ ] Verify `390x844` and `360x800` no horizontal overflow.
  - [ ] Verify bottom nav does not cover toolbar, rows, empty-state actions, drawer footer, or inline edit actions.
  - [ ] Verify long translated labels and five-digit amounts do not force page-level overflow.

- [ ] Validation and evidence. (AC: 12)
  - [ ] Run `npm run build` from `inex/ClientApp`.
  - [ ] Run `npm run lint` from `inex/ClientApp`.
  - [ ] Run focused Categories tests if touched helpers/components have existing Vitest coverage.
  - [ ] Capture/update visual QA evidence for desktop default, by-spend, filter-empty, add drawer, expanded row, mobile 390px, and mobile 360px.

## Likely Impacted Source Files

Category-local files likely to change:

- `D:\work\inex\inex\ClientApp\src\pages\Categories.tsx`
- `D:\work\inex\inex\ClientApp\src\pages\Categories\CategoriesToolbar.tsx`
- `D:\work\inex\inex\ClientApp\src\pages\Categories\CategoryRow.tsx`
- `D:\work\inex\inex\ClientApp\src\pages\Categories\CategoryInlineEdit.tsx`
- `D:\work\inex\inex\ClientApp\src\pages\Categories\CategoryCreateForm.tsx`
- `D:\work\inex\inex\ClientApp\src\pages\Categories\categories.css`
- `D:\work\inex\inex\ClientApp\src\pages\Categories\categories.utils.ts`
- `D:\work\inex\inex\ClientApp\public\locales\en\translation.json`
- `D:\work\inex\inex\ClientApp\public\locales\ru\translation.json`

Shared files to change only if the orchestrator accepts shared decisions in the same implementation branch:

- `D:\work\inex\inex\ClientApp\src\layouts\AppShell.tsx`
- `D:\work\inex\inex\ClientApp\src\layouts\AppShell.css`
- `D:\work\inex\inex\ClientApp\src\components\primitives\SegmentedControl.tsx`
- `D:\work\inex\inex\ClientApp\src\components\primitives\Input.tsx`
- `D:\work\inex\inex\ClientApp\src\components\primitives\InExDrawer.tsx`
- `D:\work\inex\inex\ClientApp\src\components\primitives\EmptyState.tsx`

Do not touch backend source, migrations, auth routing, Redux architecture, or unrelated page files for this story.

## Dependencies

- Story 10.1a is done and supplies token CSS plus Ant Design theme bridge.
- Story 10.1b is done and supplies `InExButton`, `Input`, `SegmentedControl`, `InExDrawer`, `EmptyState`, `FilterEmpty`, `Num`, and `lucide-react`.
- Story 10.1e is review/done and supplies the shared mockup-alignment contracts for labeled compact controls, 220px search, continuous list panels, drawer footers, and simple no-match rows.
- Story 10.1c supplies the `AppShell`/`BasicPage` page-head `extra` contract and mobile bottom nav behavior.
- Story 10.3b is done and supplies Categories hierarchy, search, scope, inline edit, add drawer, localized states, and visual QA baseline.
- Story 10.3e is done and supplies Categories current-period spend/budget signals, direct current-period transaction/budget fetches, budget inheritance, conversion-unavailable guardrails, strict date handling, and focus recovery.
- Story 10.6 remains blocked until this and other Epic 10 route deltas are integrated and verified.

## Dev Notes

### Current Implementation State

- `Categories.tsx` currently renders `BasicPage` with title/subtitle but no `extra`; `Add` is opened from `CategoriesToolbar`. It fetches categories through RTK Query, fetches current-period transactions through the existing `/transactions` paged contract with `mode=ALL`, fetches current-month budgets, loads currencies via `apiClient`, computes spend stats, and preserves Add drawer focus recovery.
- `CategoriesHero.tsx` already shows real current-period spend/distribution when stats are available and a no-spend/unavailable treatment otherwise. Do not revert to placeholder-only behavior.
- `CategoriesToolbar.tsx` currently renders its own card with count summary, active/all segmented control, Add button, tree/by-spend segmented control, and search input. This is the main composition delta for C06-C09.
- `CategoryRow.tsx` already renders spend/activity, budget chips, swatches, hierarchy cues, lock/inactive chips, and mobile columns. It still renders duplicate descriptions when the API description equals the name.
- `CategoryInlineEdit.tsx` preserves update/delete API contracts and parent-delete guard. It still shows a disabled parent selector and does not expose `View transactions` / `Set budget`.
- `CategoryCreateForm.tsx` still uses Ant Design `Form`, `Input`, `Select`, `Radio.Group`, and a full-width primary submit button. The audited mockup wants field order and Cancel/Create footer alignment changes.
- `AppShell.tsx` currently includes Dashboard in nav and `/` redirects to `/dashboard` in `App.tsx`. The roadmap treats this as a shared IA decision, not a Categories-only change.

### Implementation Guardrails

- Do not hardcode April 2026 values, English-only strings, category names, account data, or transaction fixtures into production Categories code.
- If visual parity requires April 2026 data, use a documented QA fixture/date-mocking strategy owned by the visual QA baseline or seed data setup.
- Do not add backend endpoints for category reparenting, default category seeding, view-transactions links, or set-budget links in this frontend story.
- Do not change category, transaction, budget, or exchange-rate API contracts.
- Do not fetch transactions outside the existing current-period paged list contract already established in 10.3e.
- Do not show partial or fake spend when exchange-rate conversion is unavailable; preserve 10.3e unavailable behavior.
- Do not create page-local replacements for shared primitives unless the primitive lacks the required variant and the shared primitive update is too broad for this story.
- All new visible copy must be in both EN and RU locale files.
- Touched TypeScript files must add no `any`.
- Preserve system category protection, parent delete guard, active/all filtering, ancestor-preserving search, budget inheritance, focus return after drawer close, and mobile bottom-nav safe spacing.
- Treat page-level horizontal overflow, bottom-nav occlusion, overlap, clipped button text, and long-label overflow as acceptance failures.

## Open Decisions

These decisions should be resolved by the orchestrator before implementation or recorded as accepted deviations during verification:

1. Shell IA: keep current production Dashboard nav/default `/dashboard`, or match the five-item mockup IA without Dashboard. This story should not decide it alone.
2. Branding/account controls: keep current dark-square `I` logo plus separate sign-out icon, or adopt the mockup multicolor loop mark and profile-only control.
3. Locale baseline: visual QA in English mockup copy, user-selected locale, or separate EN/RU baselines.
4. Data baseline: live current-period data, seeded April 2026 fixture data, or documented visual-mock fixtures. Production code must not hardcode fixture data.
5. Filter-empty policy: simple row for filter-empty inside populated lists versus shared rich `FilterEmpty` as an accepted production enhancement.
6. Add drawer controls: fully replace Ant Design form controls with shared primitives, or keep Ant Design controls with adjusted order/footer as an accepted deviation.
7. Expanded-row actions: wire `View transactions` and `Set budget` now if existing routes support them, or omit/defer them to avoid inert controls.
8. Disabled parent selector: remove it for mockup parity, or keep it only if the product wants visible reparenting limitation rationale.

## Verification Checklist

- [ ] `npm run build` passes from `D:\work\inex\inex\ClientApp`.
- [ ] `npm run lint` passes from `D:\work\inex\inex\ClientApp`.
- [ ] Focused Categories Vitest coverage passes if `categories.utils.ts`, transaction source handling, or related tested helpers are touched.
- [ ] No new `any` appears in touched TypeScript files.
- [ ] EN and RU locale files contain every new key and no visible key names render.
- [ ] Desktop 1440px default Categories state: page-head Add placement, compact hero, continuous list panel, labeled controls, search placement, row density, and count summary pass.
- [ ] Desktop 1440px By-spend state: leaf-only spend order, row styling, spend/activity cells, and budget chips pass.
- [ ] Desktop filter-empty state: simple list-area no-match treatment passes.
- [ ] Add drawer state: field order, active control, Cancel/Create footer, drawer width/header/close behavior, create error behavior, and focus return pass.
- [ ] Expanded-row state: edit fields, snapshot metrics, parent limitation treatment, and any transaction/budget actions pass.
- [ ] Mobile 390px and 360px: no horizontal overflow, no bottom-nav occlusion, page-head Add visible before hero/list controls, drawer footer reachable.
- [ ] Long RU labels and five-digit amounts do not overflow controls, rows, or mobile bottom nav.

## Recommended Shared-Doc Edits For Orchestrator

- Integrated by orchestrator in this planning pass:
  - `docs/planning/epics.md`: added Story 10.3h and recorded that it must complete before Story 10.6.
  - `docs/implementation/sprint-status.yaml`: added `10-3h-frontend-ux-categories-mockup-alignment-delta: ready-for-dev`; kept `epic-10` in progress and `10-6` blocked.
  - `docs/implementation/10-6-frontend-ux-visual-qa-baseline-and-responsive-regression-checklist.md`: added 10.3h as a prerequisite.
  - `docs/implementation/10-5a-frontend-ux-profile-and-settings-redesign.md` and `docs/implementation/10-5b-frontend-ux-login-and-registration-redesign.md`: added shell/route/locale coordination notes.

## References

- `docs/ui-audit/implementation-roadmap.md` (section 3.3 Categories, plus shared sections 1.1-1.5 and 2.1-2.6)
- `docs/ui-audit/categories.md` (C01-C20, implementation flow, impact map, verification checklist)
- `D:\work\inex\docs\implementation\10-3b-frontend-ux-categories-management-redesign.md`
- `D:\work\inex\docs\implementation\10-3b-categories-design-implementation-gap-review.md`
- `D:\work\inex\docs\implementation\10-3e-frontend-ux-categories-spend-and-budget-signals.md`
- `D:\work\inex\docs\implementation\10-1a-frontend-ux-design-tokens-and-theme-bridge.md`
- `D:\work\inex\docs\implementation\10-1b-frontend-ux-shared-primitives.md`
- `D:\work\inex\docs\implementation\10-1e-shared-mockup-alignment-primitives-contract.md`
- `D:\work\inex\docs\implementation\10-1c-frontend-ux-app-shell-and-navigation.md`
- `D:\work\inex\docs\implementation\10-6-frontend-ux-visual-qa-baseline-and-responsive-regression-checklist.md`
- `D:\work\inex\docs\implementation\sprint-status.yaml`
- `D:\work\inex\docs\planning\epics.md`
- `D:\work\inex\docs\planning\architecture.md`
- `D:\work\inex\docs\planning\ux-design.md`
- `D:\work\inex\docs\project-context.md`
- `D:\work\inex\inex\ClientApp\src\pages\Categories.tsx`
- `D:\work\inex\inex\ClientApp\src\pages\Categories\CategoriesHero.tsx`
- `D:\work\inex\inex\ClientApp\src\pages\Categories\CategoriesToolbar.tsx`
- `D:\work\inex\inex\ClientApp\src\pages\Categories\CategoryRow.tsx`
- `D:\work\inex\inex\ClientApp\src\pages\Categories\CategoryInlineEdit.tsx`
- `D:\work\inex\inex\ClientApp\src\pages\Categories\CategoryCreateForm.tsx`
- `D:\work\inex\inex\ClientApp\src\pages\Categories\categories.css`
- `D:\work\inex\inex\ClientApp\src\pages\Categories\categories.utils.ts`
- `D:\work\inex\inex\ClientApp\src\store\categories\categories-api.ts`
- `D:\work\inex\inex\ClientApp\src\layouts\AppShell.tsx`
- `D:\work\inex\inex\ClientApp\src\layouts\AppShell.css`
- `D:\work\inex\inex\ClientApp\src\App.tsx`

## Checklist Validation Notes

- Story status is `ready-for-dev`.
- Story gives a concrete user story, acceptance criteria, tasks/subtasks, dev notes, likely impacted files, dependencies, guardrails, verification checklist, open decisions, and references.
- Prior story history is preserved because no existing story file or old Dev Agent Record was edited.
- The story explicitly prevents common dev-agent mistakes: hardcoding mockup fixtures, redoing 10.3e spend work, changing backend contracts, adding unowned dependencies, leaving inert controls, and silently changing shared shell/locale policy.
- Sprint status and epics updates were integrated by the orchestrator after story creation.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- `docs/implementation/10-3h-frontend-ux-categories-mockup-alignment-delta.md`

### Change Log

- 2026-06-07: Created ready-for-dev Categories mockup alignment delta story from roadmap section 3.3 and Categories audit C01-C20.
