# Story 4.3: Frontend — Active Filter Indicator on Transaction List

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user viewing the transaction list,
I want a visual indicator when filters are active,
So that I don't forget I'm looking at a filtered subset of my transactions.

## Acceptance Criteria

1. **Given** no filters are applied to the transaction list **When** the list renders **Then** no filter indicator is shown.

2. **Given** one or more filters are active (account, category, date range, tag, or ref) **When** the list renders **Then** a visible indicator appears (e.g. a badge on the filter button, or a dismissible chip row) showing that results are filtered.

3. **Given** the filter indicator is visible **When** the user clears all filters **Then** the indicator disappears and the full unfiltered list reloads.

4. **Given** the indicator renders **When** `npm run build` and `npm run lint` complete **Then** both pass with no new errors; all indicator text is in `en/translation.json` and `ru/translation.json`.

## Tasks / Subtasks

- [x] Audit and verify the existing `isFilterActive` computation in `Transactions.tsx`. (AC: 1, 2)
  - [x] Confirm that `filterState.range.length > 0` correctly distinguishes the no-filter state (`range: []`, length 0) from an active date filter (`range: [start, end]`, length 2). The current check passes for `[0, 0]` (unix epoch pair) which can arise when other filters are active but no date range is set — verify this is not a user-visible false positive.
  - [x] If the `[0, 0]` case causes a spurious badge when ONLY range is `[0, 0]` and all other filters are empty, tighten the range check to `filterState.range.length === 2 && filterState.range[0] > 0` (consistent with the guard already used in `transactions-actions.ts`).
  - [x] Confirm the computed `isFilterActive` covers all five filter dimensions: `accountIds`, `categoryIds`, `tags`, `refs`, `range`.

- [x] Verify the `Badge.dot` indicator renders correctly on both desktop and mobile. (AC: 2)
  - [x] **Desktop**: The filter tab in `Transactions.tsx` already wraps its label with `<Badge dot={isFilterActive} offset={[6, 0]}>{t("transactions.filter")}</Badge>`. Confirm this renders a blue dot when any filter is active and no dot when all clear.
  - [x] **Mobile**: The filter button in `Transactions.tsx` is already wrapped in `<Badge key="filterBadge" dot={isFilterActive}>`. Confirm the dot appears on the mobile filter button when any filter is active.
  - [x] Confirm `Badge` is already imported from `antd` in `Transactions.tsx` — no new import needed.

- [x] Add an accessible label to the active filter indicator. (AC: 4 — i18n)
  - [x] Add new i18n key `transactions.filtersActive` to `inex/ClientApp/public/locales/en/translation.json` with value `"Filters active"`.
  - [x] Add the same key to `inex/ClientApp/public/locales/ru/translation.json` with value `"Фильтры применены"`.
  - [x] In `Transactions.tsx`, add `title={isFilterActive ? t("transactions.filtersActive") : undefined}` to the `<Badge>` wrappers so screen readers and mouse-hover users see the label. Apply to both the mobile button badge and the desktop tab badge.

- [x] Verify the "clear all filters" path removes the indicator and reloads the list. (AC: 3)
  - [x] Confirm `resetFilter` action in `transactions-slice.ts` resets state to `defaultFilter` (all arrays empty, `range: []`), setting `isFilterActive` back to `false`.
  - [x] Confirm the "Reset" button in `TransactionFilterForm.tsx` calls `resetFilterHandler`, which navigates to `?filter=` (empty query param), which triggers the `useEffect` to dispatch `transactionsActions.resetFilter()`.
  - [x] Confirm `TransactionList.tsx`'s `useEffect` has `filter` in its dependency array, so clearing the Redux filter causes `fetchTransactions` to re-dispatch with no filter — the unfiltered list reloads.
  - [x] Manual test: apply account + tag filter → badge shows → click Reset → badge disappears → list shows all transactions.

- [x] Run build and lint verification. (AC: 4)
  - [x] From `inex/ClientApp/`: run `npm run build` — must complete with no new errors.
  - [x] From `inex/ClientApp/`: run `npm run lint` — must complete with no new warnings or errors introduced by this story.

- [x] Review Follow-ups (AI)
  - [x] [AI-Review][Low] Treat date ranges starting at Unix epoch as active when the end boundary is present, matching `fetchTransactions` range filtering behavior.

## Dev Notes

### Current State — Implementation Already Exists

The core badge indicator is **already implemented** in `inex/ClientApp/src/pages/Transactions.tsx`. This story's scope is to verify, harden, and close the two identified gaps (range false-positive guard and accessible label / i18n key). No new components or Redux actions need to be created.

### Filter State Shape (Redux)

Source: `inex/ClientApp/src/store/transactions/transactions-slice.ts`

```typescript
const defaultFilter = {
    accountIds: [] as number[],    // empty = no account filter
    categoryIds: [] as number[],   // empty = no category filter
    tags: [] as string[],          // empty = no tag filter
    refs: [] as string[],          // empty = no ref filter
    tagsAndRefs: "",               // raw form input; parsed into tags/refs above; NOT checked in isFilterActive
    range: [] as number[],         // empty = no date filter; [unixStart, unixEnd] when active
};
```

The `tagsAndRefs` string is a transient local form field used by `TransactionFilterForm` to hold the combined `#tag @ref` input before parsing. It is stored in Redux but must NOT be checked in `isFilterActive` — `tags` and `refs` arrays are the authoritative parsed values.

**Active-filter detection logic** currently in `Transactions.tsx`:
```typescript
const isFilterActive =
    filterState.accountIds.length > 0 ||
    filterState.categoryIds.length > 0 ||
    filterState.tags.length > 0 ||
    filterState.refs.length > 0 ||
    filterState.range.length > 0;   // ← see Range False-Positive note below
```

### Range False-Positive Note

In `TransactionFilterForm.tsx`, when the URL contains non-date filters (e.g. `?filter=accountIds:1;`) the `useEffect` initializes `range` as `[0, 0]` (default `let range: [number, number] = [0, 0]`) and dispatches this to Redux even though no date filter was selected. This makes `filterState.range.length === 2` (truthy for `length > 0`).

**Is this a user-visible bug?** No — the badge is already `true` from `accountIds.length > 0`. However, the implicit invariant (range is `[0, 0]` only when other filters are active) is fragile and undocumented.

**Recommended fix**: tighten the range check to match what `transactions-actions.ts` already does:
```typescript
const isFilterActive =
    filterState.accountIds.length > 0 ||
    filterState.categoryIds.length > 0 ||
    filterState.tags.length > 0 ||
    filterState.refs.length > 0 ||
    (filterState.range.length === 2 && filterState.range[0] > 0);
```
This is consistent with the guard `filter.range[0] > 0` already in `fetchTransactions` (line 22 of `transactions-actions.ts`).

### Existing Badge Implementation

Source: `inex/ClientApp/src/pages/Transactions.tsx`

```tsx
// Mobile filter button (line ~58)
<Badge key="filterBadge" dot={isFilterActive}>
    <Button key="filterButton" icon={<FilterOutlined />} ... />
</Badge>

// Desktop filter tab label (line ~114)
{
    key: "filter",
    label: <Badge dot={isFilterActive} offset={[6, 0]}>{t("transactions.filter")}</Badge>,
    ...
}
```

`Badge` is already imported from `antd` in `Transactions.tsx` (line 4). No new Ant Design imports needed.

**Why Badge.dot over chip row?** The dismissible chip row is explicitly part of FR-UX-003 (Epic 10, Story 10.3 Transactions ledger redesign). For this story, `Badge.dot` is the correct scoped choice — minimal, non-intrusive, already in place.

### "Clear All Filters" Flow

The clear mechanism routes through URL navigation, not a direct Redux dispatch:

1. User clicks "Reset" button in `TransactionFilterForm.tsx`
2. `resetFilterHandler` calls `navigate('?filter=', { replace: true })`
3. URL change triggers `useEffect` in `TransactionFilterForm` (depends on `filter` prop from URL)
4. The condition `!queryFilter.accountIds && ... && !queryFilter.tags && !queryFilter.refs` is true for empty filter
5. `dispatch(transactionsActions.resetFilter())` sets Redux state back to `defaultFilter`
6. `isFilterActive` in `Transactions.tsx` re-evaluates to `false` → badge disappears
7. `filter` change in Redux triggers `useEffect` in `TransactionList.tsx` → `fetchTransactions` re-fires with empty filter → unfiltered list loads

The `resetFilter` Redux action already exists. No new action needed.

### Dependency on Story 4.2

Story 4.2 replaces the custom DSL (`AccountId:1;Tags:groceries;`) with typed `URLSearchParams` (`?accountId=1&tag=groceries`). This changes:
- How `transactions-actions.ts` builds the API query string (no longer string concatenation)
- Potentially the URL format that `TransactionFilterForm.tsx` reads from `location.search`

**What Story 4.3 is immune to:** The badge in `Transactions.tsx` reads from **Redux state** (`filterState.accountIds`, etc.), not from the URL. As long as the Redux filter state shape keeps the same field names and types after Story 4.2, the badge logic is unaffected.

**What could break:** If Story 4.2 renames Redux fields (e.g., `range` → `{ startDate, endDate }`), the `isFilterActive` computation must update to match. Story 4.3 should be implemented **before Story 4.2** ships to avoid a rebase conflict, or the story 4.3 PR must be rebased on top of 4.2 and the check updated accordingly.

**Interface boundary commitment from 4.2**: The expected post-4.2 filter fields remain `{ accountIds, categoryIds, tags, refs, range }` — typed params only affect the API call layer in `transactions-actions.ts`, not the Redux state shape. Verify this when 4.2 is in review.

### i18n Changes

**New keys to add:**

`inex/ClientApp/public/locales/en/translation.json` — inside the `"transactions"` object:
```json
"filtersActive": "Filters active"
```

`inex/ClientApp/public/locales/ru/translation.json` — inside the `"transactions"` object:
```json
"filtersActive": "Фильтры применены"
```

**Existing relevant keys** (no changes needed):
- `transactions.filter` = "Filter" / "Фильтр" — used on the tab label and drawer title
- `transactions.resetFilter` = "Reset" / "Сбросить" — used on the Reset button in the filter form

### Files to Modify

| File | Change |
|------|--------|
| `inex/ClientApp/src/pages/Transactions.tsx` | Tighten `isFilterActive` range check; add `title` prop to `<Badge>` for accessibility |
| `inex/ClientApp/public/locales/en/translation.json` | Add `transactions.filtersActive` key |
| `inex/ClientApp/public/locales/ru/translation.json` | Add `transactions.filtersActive` key |

### Files to Create

None. All changes are confined to existing files.

### Preserved Behaviors

- The filter form itself (accounts, categories, date range, tags/refs inputs) must not change.
- The `fetchTransactions` call and its filter serialization in `transactions-actions.ts` must not change in this story (Story 4.2 owns that).
- The `resetFilter` Redux action signature must not change.
- The `Badge.dot` approach on both mobile and desktop must be preserved (chip row is Epic 10 scope).
- All 95+ existing tests must continue to pass (this story touches only frontend; backend is not modified).

### Build Commands

From `inex/ClientApp/`:
```bash
npm run build   # tsc --noEmit && vite build — must complete with 0 errors
npm run lint    # eslint — must complete with 0 new warnings or errors
```

### No Backend Changes

This story is **frontend-only**. No C# files, no migrations, no backend service changes. Any API changes belong to Story 4.1 (DB-side filtering) or Story 4.2 (typed query params).

### Project Structure Notes

- i18n files live in `inex/ClientApp/public/locales/{en,ru}/translation.json` — loaded at runtime via `i18next-http-backend` (`loadPath: "/locales/{{lng}}/translation.json"`)
- Redux hooks: always use `useAppSelector` / `useAppDispatch` from `store/hooks.ts`, not raw `useSelector` / `useDispatch`
- `Badge`, `Button`, `Drawer`, `Grid`, `Layout`, `Tabs` are already imported in `Transactions.tsx` — no new Ant Design imports

### References

- Filter state shape: [inex/ClientApp/src/store/transactions/transactions-slice.ts](../inex/ClientApp/src/store/transactions/transactions-slice.ts)
- Badge implementation: [inex/ClientApp/src/pages/Transactions.tsx](../inex/ClientApp/src/pages/Transactions.tsx)
- Filter form + reset handler: [inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx](../inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx)
- List fetch trigger: [inex/ClientApp/src/pages/Transactions/TransactionList.tsx](../inex/ClientApp/src/pages/Transactions/TransactionList.tsx)
- Filter API call (range guard reference): [inex/ClientApp/src/store/transactions/transactions-actions.ts](../inex/ClientApp/src/store/transactions/transactions-actions.ts)
- EN translation: [inex/ClientApp/public/locales/en/translation.json](../inex/ClientApp/public/locales/en/translation.json)
- RU translation: [inex/ClientApp/public/locales/ru/translation.json](../inex/ClientApp/public/locales/ru/translation.json)
- Epic 4 requirements: [docs/planning/epics.md](epics.md) — Epic 4, Story 4.3

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-31: Loaded story, sprint status, and project context from disk.
- 2026-05-31: Verified current filter state shape, reset flow, fetch dependency, and typed filter URL helper against repository state.
- 2026-05-31: Ran `npm run build` from `inex/ClientApp` successfully.
- 2026-05-31: Ran `npm run lint` from `inex/ClientApp` successfully.
- 2026-05-31: Addressed review follow-up for Unix epoch start date range active filter detection.
- 2026-05-31: Re-ran `npm run build` and `npm run lint` from `inex/ClientApp` successfully after review follow-up.

### Completion Notes List

- Hardened the transaction filter active check so `[0, 0]` alone does not make the badge active; date range is active when it has two entries and either boundary is a positive timestamp.
- Added localized active-filter title text to the desktop filter tab badge and mobile filter button badge.
- Added `transactions.filtersActive` to English and Russian locale files.
- Verified the clear-filter path through `resetFilter`, `TransactionFilterForm`, and `TransactionList` dependencies against current disk state.
- Resolved review finding [Low]: date ranges with `start:1970-01-01` and a positive end date now show the active filter indicator consistently with transaction fetch filtering.

### File List

- docs/implementation/4-3-frontend-active-filter-indicator-on-transaction-list.md
- docs/implementation/sprint-status.yaml
- inex/ClientApp/public/locales/en/translation.json
- inex/ClientApp/public/locales/ru/translation.json
- inex/ClientApp/src/pages/Transactions.tsx

### Change Log

- 2026-05-31: Implemented active filter indicator hardening, accessible/i18n title text, and completed frontend build/lint validation.
- 2026-05-31: Addressed code review finding - 1 item resolved: Unix epoch start date range now counts active when the end boundary is active.
- 2026-06-03: Marked story done after merged Epic 4 PR #132.
