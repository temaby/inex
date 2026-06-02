# Story 7.4c: Frontend — RTK Query Migration For Budgets And Reports

Status: review

## Story

As a frontend developer,
I want budgets and reports migrated to RTK Query after simpler domains,
So that period-based cache keys and report invalidation are handled deliberately and correctly.

## Acceptance Criteria

**AC1 — Budget cache keys include period:**
**Given** budgets use month/year and copy-from-month workflows
**When** budgets are migrated
**Then** budget list cache keys include the relevant `{ year, month }` period — different periods never share cache entries

**AC2 — CopyBudgets mutation invalidates source-sensitive and target period views where needed:**
**Given** the `copyBudgets` mutation copies budget templates from one period to another
**When** `copyBudgets` completes
**Then** the RTK Query cache for the **target** period's `BudgetsList` tag is invalidated, and source period views are also invalidated when the UI depends on source-sensitive freshness; the current budget list view refreshes without a manual `lastUpdate` trigger

**AC3 — Budget CRUD mutations invalidate the current period:**
**Given** create, update, or delete budget operations complete for a given `{ year, month }` period
**When** any mutation completes
**Then** the cache entry for that period's `BudgetsList` tag is invalidated and the list refetches automatically

**AC4 — Budget report cache keys are typed and period+currency scoped:**
**Given** the budget comparison report fetches data for a specific `{ year, month, currency }` combination
**When** the budget report RTK Query endpoint is defined
**Then** the cache key is built from a typed `BudgetReportParams` object — never a concatenated string; different periods and currencies have independent cache entries

**AC5 — Category report cache key is typed and date-range scoped:**
**Given** the category spending report fetches data for a specific month interval
**When** the category report RTK Query endpoint is defined
**Then** the cache key is built from a typed `CategoryReportParams` object containing `startDate: string` and `endDate: string` in `YYYY-MM-DD` format — the endpoint continues to use the existing backend DSL format internally, but the cache key is always the typed params (never a raw DSL string or unix timestamp)

**AC6 — Monthly history report cache key is typed and year+currency scoped:**
**Given** the history report fetches data for a specific `{ year, currency }` combination
**When** the history report RTK Query endpoint is defined
**Then** the cache key is built from a typed `HistoryReportParams` object; different years and currencies have independent cache entries

**AC7 — Old thunks retained until RTK Query is verified:**
**Given** existing `budgets-actions.ts`, `budgetReport-actions.ts`, and `report-actions.ts` thunks are used in production pages
**When** migrating to RTK Query
**Then** the old thunk files are NOT deleted until the RTK Query replacement is wire-complete and both `npm test` and `npm run build` pass; a comment marks each old file as superseded

**AC8 — Tests cover budget period cache key, report cache keys, success and error states:**
**Given** the story is complete
**When** `npm test` runs (requires Story 7.3 Vitest setup)
**Then** the test suite includes:

- budget list endpoint: two different `{ year, month }` calls produce independent cache entries
- `copyBudgets` mutation: both target and source period tags are invalidated (`BudgetsList:${targetYear}-${targetMonth}` and `BudgetsList:${sourceYear}-${sourceMonth}`)
- budget report endpoint: `{ year, month, currency }` key test
- category report endpoint: `{ startDate, endDate }` typed key test
- history report endpoint: `{ year, currency }` typed key test
- success response caches data; API error surfaces as `.error` on the hook — no unhandled rejections

**AC9 — Build and lint pass with no regressions:**
**Given** the migration is complete
**When** `npm run build` and `npm run lint` run from `inex/ClientApp/`
**Then** both pass with no new errors, no new `any` usages in the migrated files, and no regressions on any existing route

## Tasks / Subtasks

- [x] **Prerequisite checks (must pass before coding)** (AC7, AC8)
  - [x] Verify Story 7.4a foundation exists in code: `inex/ClientApp/src/store/axiosBaseQuery.ts` and at least one `*-api.ts` slice pattern to mirror. If missing, stop and complete 7.4a first.
  - [x] Verify Story 7.3 test infrastructure exists (`package.json` has `test` script and Vitest deps). If missing, stop and complete 7.3 before claiming AC8/Task 10 or final story completion; do not mark 7.4c done with cache-key tests skipped.
  - [x] Verify whether Story 7.4b is already merged. If yes, use `useGetCategoriesQuery("ALL")` and `useGetAccountsQuery("ALL")` in budgets flows instead of deleted legacy slices; if no, keep existing category/account sourcing behavior temporarily and do not remove those legacy selectors in this story.

- [x] **Task 1: Create `store/budgets/budgets-api.ts`** (AC1, AC2, AC3, AC7)
  - [x] Import `createApi` from `@reduxjs/toolkit/query/react`; import `axiosBaseQuery` from the shared utility established in Story 7.4a (expected path: `store/axiosBaseQuery.ts`)
  - [x] Define tag type `"BudgetsList"` with `id` pattern `"${year}-${month}"` (e.g. `"2026-5"`)
  - [x] Define typed request/param interfaces:
    - `ListResponse<T>: { data: T[] }`
    - `BudgetListParams: { year: number; month: number }`
    - `BudgetCreateRequest: { key: string; name: string; description: string; value: number; categoryIds: number[]; year: number; month: number }`
    - `BudgetUpdateRequest: BudgetCreateRequest & { id: number }`
    - `CopyBudgetsRequest: { sourceYear: number; sourceMonth: number; targetYear: number; targetMonth: number }`
  - [x] Define `getBudgets` query endpoint:
    - Use the typed arg object `{ year, month }` as the RTK Query argument; build the request as `{ url: "/budgets", params: { year, month } }` if the 7.4a `axiosBaseQuery` supports `params` (preferred), otherwise use `/budgets?year=${year}&month=${month}` only for the HTTP URL.
    - Return type exposed to hooks: `BudgetDetails[]`.
    - Add `transformResponse: (response: ListResponse<BudgetDetails>) => response.data ?? []` because `GET /api/budgets` returns the backend wrapper `{ data: [...] }`.
    - `providesTags`: `[{ type: "BudgetsList", id: "${year}-${month}" }]`
  - [x] Define `createBudget` mutation endpoint:
    - URL: `POST /budgets`
    - `invalidatesTags`: `[{ type: "BudgetsList", id: "${year}-${month}" }]` using request body year/month
  - [x] Define `updateBudget` mutation endpoint:
    - URL: `PUT /budgets/${id}`
    - `invalidatesTags`: `[{ type: "BudgetsList", id: "${year}-${month}" }]` using request body year/month
  - [x] Define `deleteBudget` mutation endpoint:
    - URL: `DELETE /budgets/${id}`
    - `invalidatesTags`: derive the period from the cache (pass year/month in the mutation arg as `{ id, year, month }` or use `onQueryStarted` to get from cache)
    - **Note**: Because delete only receives an `id`, the mutation arg must include `year` and `month` to construct the tag. Define: `deleteBudget` arg type as `{ id: number; year: number; month: number }`.
  - [x] Define `copyBudgets` mutation endpoint:
    - Request: `POST /budgets/copy` with query params `{ sourceYear, sourceMonth, targetYear, targetMonth }` (prefer `params` on `axiosBaseQuery`; avoid hand-concatenating unless 7.4a lacks params support)
    - `invalidatesTags`: invalidate both target and source periods by default for deterministic freshness: `[{ type: "BudgetsList", id: "${targetYear}-${targetMonth}" }, { type: "BudgetsList", id: "${sourceYear}-${sourceMonth}" }]` (target invalidation is mandatory)
  - [x] Export the api slice and its generated hooks (`useGetBudgetsQuery`, `useCreateBudgetMutation`, `useUpdateBudgetMutation`, `useDeleteBudgetMutation`, `useCopyBudgetsMutation`)
  - [x] Add the api reducer and middleware to `store/index.ts` following the pattern from Story 7.4a

- [x] **Task 2: Wire `Budgets.tsx` to RTK Query hooks** (AC1, AC2, AC3)
  - [x] Replace `useAppSelector(state => state.budgets.items)` with `useGetBudgetsQuery({ year, month })` — derive year/month from `selectedMonth` dayjs state (already present)
  - [x] Replace `dispatch(fetchBudgets(...))` calls with RTK Query auto-fetch (the query triggers automatically when params change)
  - [x] Refactor the current combined `useEffect` (budgets + categories) into separate concerns so budget query refreshes are not coupled to category fetch dispatches
  - [x] Replace `dispatch(createBudget(...))` with `createBudget` mutation hook call; call `await createBudget(args).unwrap()` for error propagation (RTK Query mutations use `.unwrap()`, not `unwrapResult`)
  - [x] Replace `dispatch(copyBudgets(...))` with `copyBudgets` mutation hook call; the mutation invalidates target and source periods so no manual `dispatch(budgetsActions.setLastUpdate())` is needed
  - [x] Remove `lastUpdate` dependency from the budgets re-fetch flow (RTK Query handles this via tag invalidation)
  - [x] Keep category sourcing aligned with 7.4b status:
    - If 7.4b is complete: use `useGetCategoriesQuery("ALL")`
    - If 7.4b is not complete: keep existing category thunk flow temporarily and do not block 7.4c completion on category migration
  - [x] Keep account/currency sourcing aligned with 7.4b status:
    - If 7.4b is complete and the accounts slice was removed: use `useGetAccountsQuery("ALL")` to derive the display currency fallback currently read from `state.accounts.items`
    - If 7.4b is not complete: preserve the existing `state.accounts.items` selector for the currency fallback
  - [x] Keep `isLoading`, `isCreating` states mapped from RTK Query hook return values (`.isLoading`, `.isLoading` on mutation)

- [x] **Task 3: Wire `BudgetEditForm.tsx` to RTK Query mutations** (AC3)
  - [x] Replace `dispatch(updateBudget(...))` with `updateBudget` mutation hook; use `await updateBudget(args).unwrap()` for error propagation; `year`/`month` are on `state` from local reducer
  - [x] Replace `dispatch(deleteBudget(id))` with `deleteBudget` mutation hook; call `await deleteBudget({ id: state.id, year: state.year, month: state.month }).unwrap()` — the year/month are needed so the mutation can construct the invalidation tag
- [x] **Task 4: Create `store/budgetReport/budgetReport-api.ts`** (AC4)
  - [x] Define tag type `"BudgetReport"` with id `"${year}-${month}-${currency}"`
  - [x] Define typed param interface: `BudgetReportParams: { year: number; month: number; currency: string }`
  - [x] Define `getBudgetReport` query endpoint:
    - URL: `/reports/budget/comparison?year=${year}&month=${month}&currency=${currency}`
    - `providesTags`: `[{ type: "BudgetReport", id: "${year}-${month}-${currency}" }]`
  - [x] Return type: `{ data: BudgetComparisonDTO[]; metadata: ReportMetadataDTO }` from `model/Report/BudgetReport.ts`
  - [x] Export hooks: `useGetBudgetReportQuery`

- [x] **Task 5: Wire `ReportBudgetSpending.tsx` to RTK Query** (AC4)
  - [x] Replace `dispatch(fetchBudgetReport(...))` + `useAppSelector(state => state.budgetReport)` with `useGetBudgetReportQuery({ year, month, currency })`
  - [x] Drive `localDate` state (already present) as the source for `year`/`month` params — no change to UI behavior
  - [x] Map `isLoading`, `error`, `items`, `metadata` from hook return value

- [x] **Task 6: Create `store/report/report-api.ts`** (AC5, AC6)
  - [x] Define tag types: `"CategoryReport"`, `"HistoryReport"`
  - [x] Define typed param interfaces:
    - `CategoryReportParams: { startDate: string; endDate: string }` — `YYYY-MM-DD` strings matching the typed params API from Epic 4 Story 4-2
    - `HistoryReportParams: { year: number; currency: string }`
  - [x] Define `getCategoryReport` query endpoint:
    - RTK Query argument/cache key must be `CategoryReportParams` (`{ startDate, endDate }`) only. The legacy DSL string is request formatting, not the cache argument; the tag id is also not the RTK Query cache key.
    - URL: `/reports/category?filter=Start:${startDate};End:${endDate};` — uses the **existing backend DSL format** (Epic 4 Story 4-2 only changes the transactions API, not reports)
    - `providesTags: [{ type: "CategoryReport", id: "${startDate}_${endDate}" }]` for targeted invalidation if a later story adds it; this tag id is not the RTK Query cache key.
    - Return type: `{ data: ReportCategoryDetails[]; metadata: { name: string; currency: string } }` using `ReportCategoryDetails` from `model/Report/ReportCategoryDetails.ts`
  - [x] Define `getHistoryReport` query endpoint:
    - URL: `/reports/history/${year}?currency=${currency}`
    - `providesTags`: `[{ type: "HistoryReport", id: "${year}-${currency}" }]`
    - Return type: `{ data: HistoryReportItem[] }` where `HistoryReportItem` is a local interface in `report-api.ts` with at minimum `{ month: number; monthName: string; income: number; expense: number; savings: number }` (matches `ReportMonthlyHistory.tsx` usage)
  - [x] Export hooks: `useGetCategoryReportQuery`, `useGetHistoryReportQuery`

- [x] **Task 7: Wire `ReportCategory.tsx` to RTK Query** (AC5)
  - [x] Compute typed params from `currentDate` (already derived from URL `interval` param): `startDate = currentDate.startOf("month").format("YYYY-MM-DD")` and `endDate = currentDate.endOf("month").format("YYYY-MM-DD")`
  - [x] Replace `dispatch(fetchReport("category", filter))` (second `useEffect` on `[filter]`) with `useGetCategoryReportQuery({ startDate, endDate })` — RTK Query auto-fetches when params change
  - [x] Replace `useAppSelector(state => state.report.items)` and `useAppSelector(state => state.report.currency)` with data from the RTK Query hook
  - [x] Keep category source aligned with 7.4b status: if 7.4b is complete, use `useGetCategoriesQuery("ALL")` for active categories; if not, keep `useAppSelector(state => state.categories.items)` until 7.4b migrates it
  - [x] Skip the call when `currentDate` is not valid: `useGetCategoryReportQuery({ startDate, endDate }, { skip: !currentDate.isValid() })`
  - [x] **KEEP the first `useEffect` on `[currentDate]`** that dispatches `reportActions.setFilter({ filter: { range: [...unix timestamps...] } })` — the navigation links in the row `onClick` handlers still read `filter.range[0]` and `filter.range[1]` to construct the transaction navigation URL (`navigate(../../transactions?filter=...)`). Do NOT remove this dispatch.
  - [x] **KEEP the cleanup** `return () => dispatch(reportActions.setFilter({ filter: { range: [] } }))` — clears state on unmount
  - [x] Remove ONLY the second `useEffect` on `[filter]` that called `dispatch(fetchReport("category", filter))` and `setExpandedRows([])`; the `setExpandedRows([])` call can be moved to a param-change effect if needed

- [x] **Task 8: Wire `ReportMonthlyHistory.tsx` to RTK Query** (AC6)
  - [x] Replace `dispatch(fetchHistory(year))` + `useAppSelector(state => state.report.history)` with `useGetHistoryReportQuery({ year, currency: "USD" })`
  - [x] `year` is already local state driven by year picker
  - [x] Remove the `useEffect([dispatch, year])` pattern; RTK Query fetches automatically on param change

- [x] **Task 9: Mark old action files as superseded** (AC7)
  - [x] Add comment to top of `budgets-actions.ts`: `// SUPERSEDED by store/budgets/budgets-api.ts (Story 7.4c) — retained until RTK Query wiring is verified`
  - [x] Add comment to top of `budgetReport-actions.ts`: `// SUPERSEDED by store/budgetReport/budgetReport-api.ts (Story 7.4c) — retained until RTK Query wiring is verified`
  - [x] Add comment to top of `report-actions.ts`: `// SUPERSEDED by store/report/report-api.ts (Story 7.4c) — retained until RTK Query wiring is verified`
  - [x] Do NOT delete slice files (`*-slice.ts`) — `report-slice.ts` still holds `filter` state used for transaction navigation; `budgets-slice.ts` and `budgetReport-slice.ts` may be retained or their non-RTK state merged

- [x] **Task 10: Write tests** (AC8)
  - [x] Requires Story 7.3 Vitest setup to be complete; if `npm test` is unavailable, the story is blocked, not complete
  - [x] Create `store/budgets/__tests__/budgets-api.test.ts`:
    - Test: two distinct `{ year, month }` fetches store independent RTK Query cache entries by selecting each endpoint with its original typed args (do not treat tag id strings as the cache key)
    - Test: `copyBudgets` call invalidates both tags `BudgetsList:2026-5` (target) and `BudgetsList:2026-4` (source)
    - Test: `createBudget` invalidates the corresponding period's list tag
    - Test: error response surfaces as `.error` on `useGetBudgetsQuery` — not thrown
  - [x] Create `store/budgetReport/__tests__/budgetReport-api.test.ts`:
    - Test: `{ year: 2026, month: 5, currency: "USD" }` and `{ year: 2026, month: 5, currency: "EUR" }` produce independent cache entries via typed endpoint args
  - [x] Create `store/report/__tests__/report-api.test.ts`:
    - Test: category report cache selection uses typed `{ startDate: "2026-05-01", endDate: "2026-05-31" }` args, while the outbound request uses the legacy `filter=Start:...;End:...;` DSL
    - Test: `{ year: 2025, currency: "USD" }` and `{ year: 2026, currency: "USD" }` produce independent history cache entries via typed endpoint args

- [x] **Task 11: Final build and lint verification** (AC9)
  - [x] Run `npm run build` from `inex/ClientApp/` — must pass with zero errors
  - [x] Run `npm run lint` — must pass with no new `any` usages in migrated files
  - [x] Run `npm test` — all tests pass

## Dev Notes

### Dependencies

**This story has a hard dependency on Story 7.4a** (RTK Query Pattern for Transactions). Story 7.4a establishes:

- The `axiosBaseQuery` utility (wrapping the existing `apiClient` with auth headers + 401 refresh-retry behavior) — this story imports it
- The `createApi` + tag invalidation pattern used as the template for all domain API slices
- How RTK Query middleware is wired into `store/index.ts`
- File naming convention: `store/{domain}/{domain}-api.ts`

**Story 7.4b** (Accounts & Categories) should ideally be complete before this story, but is not a hard blocker — the budgets and reports domains are independent of accounts/categories RTK Query state. The dependency is soft (shared pattern knowledge only).

**Epic 4 Story 4-2** (`4-2-backend-frontend-typed-transaction-filter-query-parameters`) changes the **transactions** API only — it does NOT change the reports API. The category report endpoint continues to use the existing backend DSL format (`?filter=Start:YYYY-MM-DD;End:YYYY-MM-DD;`) and can be migrated to RTK Query independently of Epic 4. The RTK Query endpoint for category reports uses typed `{ startDate, endDate }` as the cache key but formats them into the DSL for the actual HTTP request. No dependency on Epic 4 Story 4-2 for Tasks 6 and 7.

**Story 7.3** (Vitest + React Testing Library) is required for Task 10 and AC8. If 7.3 is not complete, 7.4c is blocked from final completion; do not mark it done with Task 10 skipped.

### Validation Snapshot (May 31, 2026)

Fresh workspace checks show the RTK Query foundation and frontend test runner are not present yet:

- `inex/ClientApp/src/store/axiosBaseQuery.ts` is absent.
- `inex/ClientApp/src/store/transactions/transactions-api.ts` is absent.
- `inex/ClientApp/src/store/accounts/accounts-api.ts` and `src/store/categories/categories-api.ts` are absent.
- `inex/ClientApp/package.json` has no `test` script or Vitest/RTL dependencies.

Implication: this story is structurally ready, but implementation must stop at the prerequisite gate until Story 7.4a and Story 7.3 are completed. If Story 7.4b is still absent when 7.4c starts, preserve existing account/category selectors temporarily as described in Tasks 2 and 7.

### Current State: Budgets Domain

**`store/budgets/budgets-actions.ts`** — all five thunks to be superseded:

```
fetchBudgets(year?, month?)       → GET /api/budgets?year=X&month=Y
copyBudgets(srcY, srcM, tgtY, tgtM) → POST /api/budgets/copy?sourceYear=...
createBudget(key,name,desc,val,catIds,year,month) → POST /api/budgets
updateBudget(id,key,name,desc,val,catIds,year,month) → PUT /api/budgets/{id}
deleteBudget(id)                  → DELETE /api/budgets/{id}
```

**`store/budgets/budgets-slice.ts`** state shape:

```typescript
{
  items: BudgetDetails[];    // replaced by RTK Query cache
  isLoading: boolean;        // replaced by hook .isLoading
  isCreating: boolean;       // replaced by mutation .isLoading
  isUpdating: boolean;       // replaced by mutation .isLoading
  lastUpdate: number;        // REMOVE — RTK Query tag invalidation replaces this trigger
  error: null | string;      // replaced by hook .error
}
```

**`Budgets.tsx` re-fetch pattern (current):** `useEffect` depends on `[dispatch, lastUpdate, selectedMonth]`. The `lastUpdate` changes whenever a mutation dispatches `budgetsActions.setLastUpdate()`, which causes a re-fetch. RTK Query replaces this with tag invalidation — `invalidatesTags` on each mutation automatically refetches active queries subscribed to those tags.

**`Budgets.tsx` account/category dependencies (current):** the page reads `state.accounts.items` to derive a display currency fallback and `state.categories.items` for selectors. If Story 7.4b has removed the account/category slices, this story must replace both with the 7.4b RTK Query hooks; if 7.4b is not merged, keep the existing selectors temporarily instead of inventing account/category API slices here.

**`BudgetDetails` model** (`model/Budget/BudgetDetails.ts`):

```typescript
interface BudgetDetails extends ItemDetails {
  value: number;
  categoryIds: number[];
  year: number;
  month: number;
}
// ItemDetails: { id: number; key: string; name: string; description: string; }
```

### Cache Key Design: Budgets

RTK Query cache keys come from the endpoint name plus the original typed argument object (`getBudgets({ year, month })`). The `providesTags` `id` strings below are invalidation identifiers, not the cache key itself. Tests should assert both: independent cache entries via typed endpoint args, and targeted invalidation via tag ids.

Tag type: `"BudgetsList"`, tag id: `"${year}-${month}"` (e.g. `"2026-5"` — no zero-padding needed, must be consistent).

**Why `id` in the tag matters**: RTK Query uses the `id` field to do targeted invalidation. Without `id`, invalidating `"BudgetsList"` would bust ALL cached budget months at once. With `id`, only the specific period is re-fetched.

```typescript
// providesTags on getBudgets({ year, month }):
[{ type: "BudgetsList", id: `${year}-${month}` }][
  // invalidatesTags on createBudget({ ..., year, month }):
  { type: "BudgetsList", id: `${year}-${month}` }
][
  // invalidatesTags on deleteBudget({ id, year, month }):
  { type: "BudgetsList", id: `${year}-${month}` }
][
  // invalidatesTags on copyBudgets({ sourceYear, sourceMonth, targetYear, targetMonth }):
  ({ type: "BudgetsList", id: `${targetYear}-${targetMonth}` },
  { type: "BudgetsList", id: `${sourceYear}-${sourceMonth}` })
];
// NOTE: invalidate both periods to keep copy source and target views deterministic.
```

### Cache Key Design: Budget Report

RTK Query cache keys come from `useGetBudgetReportQuery({ year, month, currency })`. The `BudgetReport` tag id is an invalidation identifier only.

Tag type: `"BudgetReport"`, tag id: `"${year}-${month}-${currency}"`.

The `ReportBudgetSpending.tsx` page already drives year/month from `localDate` state and derives `currency` from `state.report.currency`. In RTK Query, pass all three as typed params:

```typescript
interface BudgetReportParams {
  year: number;
  month: number;
  currency: string;
}
// providesTags: [{ type: "BudgetReport", id: `${year}-${month}-${currency}` }]
```

No mutations touch report data — budget report is read-only. No `invalidatesTags` needed.

### Cache Key Design: Category Report

RTK Query cache keys come from `useGetCategoryReportQuery({ startDate, endDate })`. The backend DSL string (`Start:...;End:...;`) is only the HTTP query parameter value, and `CategoryReport` tag ids are invalidation identifiers only.

The backend category report endpoint uses its own DSL format (`?filter=Start:YYYY-MM-DD;End:YYYY-MM-DD;`) — this is NOT changed by Epic 4 Story 4-2 (which only covers the transactions endpoint). The RTK Query migration uses typed params as the **cache key** but formats them into the DSL for the HTTP request:

```typescript
interface CategoryReportParams {
  startDate: string; // "YYYY-MM-DD" — dayjs: currentDate.startOf("month").format("YYYY-MM-DD")
  endDate: string; // "YYYY-MM-DD" — dayjs: currentDate.endOf("month").format("YYYY-MM-DD")
}
// providesTags: [{ type: "CategoryReport", id: `${startDate}_${endDate}` }]
// URL built in queryFn or url builder:
//   /reports/category?filter=Start:${startDate};End:${endDate};
```

**Cache key uses typed YYYY-MM-DD strings — not unix timestamps or raw DSL.** The old `filter.range` unix timestamps are not deterministic across renders and would produce spurious cache misses.

### Cache Key Design: History Report

RTK Query cache keys come from `useGetHistoryReportQuery({ year, currency })`. The `HistoryReport` tag id is an invalidation identifier only.

```typescript
interface HistoryReportParams {
  year: number;
  currency: string;
}
// providesTags: [{ type: "HistoryReport", id: `${year}-${currency}` }]
// URL: /reports/history/${year}?currency=${currency}
```

Note: `ReportMonthlyHistory.tsx` currently hardcodes `currency: "USD"` in the dispatch call (the `fetchHistory(year)` default). The RTK Query call should pass `currency: "USD"` explicitly as the default until currency selection is wired.

### Exchange Rates (rates slice)

The `rates` slice (`store/rates/`) fetches `GET /api/exchange/rates/{date}` for display in the Accounts status panel. It is **not coupled** to the report API calls — the report endpoints return already-converted values. The rates slice does not need RTK Query migration in this story.

### RTK Query Middleware and Reducer Registration

When adding each API slice to `store/index.ts`, follow the pattern from Story 7.4a:

```typescript
// In configureStore reducer:
[budgetsApi.reducerPath]: budgetsApi.reducer,
[budgetReportApi.reducerPath]: budgetReportApi.reducer,
[reportApi.reducerPath]: reportApi.reducer,

// In middleware:
.concat(budgetsApi.middleware, budgetReportApi.middleware, reportApi.middleware)
```

`reducerPath` is set when calling `createApi({ reducerPath: "budgetsApi", ... })` — use `"budgetsApi"`, `"budgetReportApi"`, `"reportApi"` as paths. The old slice reducers (`budgets: budgetsSlice.reducer`, etc.) stay in the store during the transition — do not remove them until all consumers are migrated.

### Two Separate Report Slices

Be aware that **budgets and reports currently use two separate slices**:

1. `store/report/` — handles category report + history report (shared slice, both actions in `report-actions.ts`)
2. `store/budgetReport/` — handles budget comparison report (separate slice)

In RTK Query the migration follows the same split:

1. `store/report/report-api.ts` — `getCategoryReport`, `getHistoryReport`
2. `store/budgetReport/budgetReport-api.ts` — `getBudgetReport`

Do NOT merge them into a single API slice unless there's a cross-domain invalidation need — there is none.

### Model Awareness

The `model/Report/` directory contains both `BudgetReport.ts` (with `BudgetComparisonDTO` and `ReportMetadataDTO`) and `BudgetComparison.ts` (with a different `BudgetComparisonItem` interface). Use `BudgetReport.ts` shapes for the `budgetReport-api.ts` return type since `ReportBudgetSpending.tsx` and `budgetReport-slice.ts` already reference those types.

**Note on Story 8.3b**: A later story (`8-3b-frontend-report-model-naming-cleanup`) will rename `BudgetComparisonDTO` → `BudgetComparison` and `ReportMetadataDTO` → `ReportMetadata`. Do NOT pre-rename them in this story — that work belongs to 8.3b.

### axiosBaseQuery (Expected from Story 7.4a)

Story 7.4a establishes a shared `axiosBaseQuery` that wraps `apiClient`. Expected path: `store/axiosBaseQuery.ts`. This story imports it without modification:

```typescript
// store/budgets/budgets-api.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "../axiosBaseQuery"; // established by Story 7.4a
```

If Story 7.4a is done but `axiosBaseQuery` is at a different path, locate it via the `transactions-api.ts` import and use the same path.

### RTK Query Middleware in store/index.ts

Story 7.4a adds the RTK Query middleware to `store/index.ts`:

```typescript
middleware: (getDefaultMiddleware) =>
  getDefaultMiddleware().concat(transactionsApi.middleware, ...),
```

This story adds `budgetsApi.middleware`, `budgetReportApi.middleware`, `reportApi.middleware` to that chain.

### Project Structure Notes

- New files: `store/budgets/budgets-api.ts`, `store/budgetReport/budgetReport-api.ts`, `store/report/report-api.ts`
- New test files: `store/budgets/__tests__/budgets-api.test.ts`, `store/budgetReport/__tests__/budgetReport-api.test.ts`, `store/report/__tests__/report-api.test.ts`
- Modified files: `store/index.ts` (add reducers + middleware), `pages/Budgets.tsx`, `pages/Budgets/BudgetEditForm.tsx`, `pages/Reports/ReportBudgetSpending.tsx`, `pages/Reports/ReportCategory.tsx`, `pages/Reports/ReportMonthlyHistory.tsx`
- Annotated (not deleted): `store/budgets/budgets-actions.ts`, `store/budgetReport/budgetReport-actions.ts`, `store/report/report-actions.ts`
- `@reduxjs/toolkit ^1.7.1` includes RTK Query — no new npm dependency required

### Current Git Status

Do not rely on hardcoded branch/commit snapshots in this story file. Validate prerequisites against the current workspace state at implementation time:

- confirm 7.4a RTK Query base pattern exists (`axiosBaseQuery` + at least one working API slice)
- confirm 7.3 Vitest infrastructure exists before running Task 10 tests
- confirm whether 7.4b has already migrated categories, then choose the budgets category data path accordingly

### References

- Current budgets actions: [inex/ClientApp/src/store/budgets/budgets-actions.ts](inex/ClientApp/src/store/budgets/budgets-actions.ts)
- Current budgets slice: [inex/ClientApp/src/store/budgets/budgets-slice.ts](inex/ClientApp/src/store/budgets/budgets-slice.ts)
- Budget model: [inex/ClientApp/src/model/Budget/BudgetDetails.ts](inex/ClientApp/src/model/Budget/BudgetDetails.ts)
- Current budgetReport actions: [inex/ClientApp/src/store/budgetReport/budgetReport-actions.ts](inex/ClientApp/src/store/budgetReport/budgetReport-actions.ts)
- Current budgetReport slice: [inex/ClientApp/src/store/budgetReport/budgetReport-slice.ts](inex/ClientApp/src/store/budgetReport/budgetReport-slice.ts)
- BudgetReport model types: [inex/ClientApp/src/model/Report/BudgetReport.ts](inex/ClientApp/src/model/Report/BudgetReport.ts)
- Current report actions: [inex/ClientApp/src/store/report/report-actions.ts](inex/ClientApp/src/store/report/report-actions.ts)
- Current report slice: [inex/ClientApp/src/store/report/report-slice.ts](inex/ClientApp/src/store/report/report-slice.ts)
- Budgets page: [inex/ClientApp/src/pages/Budgets.tsx](inex/ClientApp/src/pages/Budgets.tsx)
- BudgetEditForm: [inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx](inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx)
- ReportBudgetSpending page: [inex/ClientApp/src/pages/Reports/ReportBudgetSpending.tsx](inex/ClientApp/src/pages/Reports/ReportBudgetSpending.tsx)
- ReportCategory page: [inex/ClientApp/src/pages/Reports/ReportCategory.tsx](inex/ClientApp/src/pages/Reports/ReportCategory.tsx)
- ReportMonthlyHistory page: [inex/ClientApp/src/pages/Reports/ReportMonthlyHistory.tsx](inex/ClientApp/src/pages/Reports/ReportMonthlyHistory.tsx)
- apiClient (auth+retry): [inex/ClientApp/src/utils/apiClient.ts](inex/ClientApp/src/utils/apiClient.ts)
- Store root: [inex/ClientApp/src/store/index.ts](inex/ClientApp/src/store/index.ts)
- Epic 7 stories: [docs/planning/epics.md](docs/planning/epics.md#Story-7.4c)
- Epic 4 typed params story: [docs/implementation/4-2-backend-frontend-typed-transaction-filter-query-parameters.md](docs/implementation/4-2-backend-frontend-typed-transaction-filter-query-parameters.md)
- Story 7.2 (established format reference): [docs/implementation/7-2-frontend-code-splitting.md](docs/implementation/7-2-frontend-code-splitting.md)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm test` from `inex/ClientApp/`: passed, 7 test files and 24 tests.
- `npm run build` from `inex/ClientApp/`: first sandboxed run failed with `EPERM` while Vite tried to unlink an existing `build/assets` file; rerun with build-output write approval passed.
- `npm run lint` from `inex/ClientApp/`: passed.
- Stale reference search: migrated pages no longer call budget/report thunks; `App.tsx` budget bootstrap dispatch was removed during integration; old thunk exports remain intentionally retained.
- 2026-06-02: Final BMad code review found budget/report dependent-cache invalidation, budget report error-state, report currency bridge, and persisted period gaps; fixed and reran `npm test`, `npm run lint`, `npm run build`, and stale-reference audit successfully.

### Completion Notes List

- Added RTK Query API slices for budgets, budget comparison reports, category reports, and monthly history reports using typed query arguments for cache identity and scoped tags for invalidation.
- Wired `Budgets.tsx`, `BudgetEditForm.tsx`, `ReportBudgetSpending.tsx`, `ReportCategory.tsx`, and `ReportMonthlyHistory.tsx` to the new hooks while preserving the category report filter state used for transaction navigation.
- Registered `budgetsApi`, `budgetReportApi`, and `reportApi` reducers and middleware in the existing store alongside the uncommitted transactions/accounts/categories API slices.
- Marked old budget/report thunk files as superseded without deleting them.
- Removed the global `fetchBudgets()` bootstrap dispatch from `App.tsx`; budget data is now sourced by subscribed RTK Query views.
- Added Vitest coverage for budget period cache independence, budget mutation invalidation, report typed cache keys, legacy category report DSL request formatting, and query error state handling.
- Budget mutations now invalidate budget comparison report caches, and transaction mutations invalidate budget/category/history report caches through RTK Query lifecycle handlers.
- `ReportBudgetSpending.tsx` now preserves the selected month through the retained `budgetReport` period state and surfaces RTK query error state.
- `ReportCategory.tsx` writes the fetched report currency into the retained report slice so downstream budget report queries use the current report currency.

### File List

- `inex/ClientApp/src/store/budgets/budgets-api.ts`
- `inex/ClientApp/src/store/budgets/__tests__/budgets-api.test.ts`
- `inex/ClientApp/src/store/budgetReport/budgetReport-api.ts`
- `inex/ClientApp/src/store/budgetReport/__tests__/budgetReport-api.test.ts`
- `inex/ClientApp/src/store/report/report-api.ts`
- `inex/ClientApp/src/store/report/__tests__/report-api.test.ts`
- `inex/ClientApp/src/store/index.ts`
- `inex/ClientApp/src/App.tsx`
- `inex/ClientApp/src/pages/Budgets.tsx`
- `inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx`
- `inex/ClientApp/src/pages/Reports/ReportBudgetSpending.tsx`
- `inex/ClientApp/src/pages/Reports/ReportCategory.tsx`
- `inex/ClientApp/src/pages/Reports/ReportMonthlyHistory.tsx`
- `inex/ClientApp/src/store/transactions/transactions-api.ts`
- `inex/ClientApp/src/store/budgets/budgets-actions.ts`
- `inex/ClientApp/src/store/budgetReport/budgetReport-actions.ts`
- `inex/ClientApp/src/store/report/report-actions.ts`
- `docs/implementation/7-4c-frontend-rtk-query-budgets-reports.md`

### Change Log

- 2026-06-02: Migrated budgets and reports to RTK Query, added cache/invalidation tests, removed stale budget bootstrap fetch, marked old thunks superseded, and moved story to review.
- 2026-06-02: Integrated final review fixes for budget/report cache invalidation, budget report error UI, report currency propagation, persisted budget report period, and expanded report API error tests.
