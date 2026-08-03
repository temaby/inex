# Story 7.4a: Frontend — RTK Query Pattern For Transactions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a frontend developer,
I want the transactions domain to establish the RTK Query migration pattern,
So that cache keys, loading states, and authenticated API behavior are proven before all domains move.

## Acceptance Criteria

1. **Given** the typed query params API contract from Epic 4 (FR-FE-006 / Story 4.2) **When** the transactions RTK Query endpoint is defined **Then** the cache key is built from a typed `TransactionFilterParams` argument object — not a concatenated string.

2. **Given** the existing transactions Redux state **When** the migration is complete **Then** transactions loading states, error states, and data are sourced from RTK Query hooks in `TransactionList.tsx` — the manual transaction thunks (`fetchTransactions`) are removed only after the RTK Query replacement is verified working.

3. **Given** the `apiClient` Axios instance (owns auth header injection and singleton-promise refresh retry) **When** RTK Query is configured **Then** it uses a shared `axiosBaseQuery` that wraps the existing `apiClient` — bearer token injection and refresh-retry behavior are preserved without duplication.

4. **Given** the story is complete **When** `npm test` runs (infrastructure introduced by Story 7.3) **Then** transactions RTK Query endpoint tests cover: (a) successful list fetch caches the result, (b) cache invalidation on mutation triggers a refetch, (c) API error propagates to the hook's `isError` state.

5. **Given** mutations (create transaction, create transfer, update transaction, delete transaction) **When** any mutation completes successfully **Then** the transactions list is automatically re-fetched via RTK Query cache invalidation — the manual `lastUpdate` trigger is removed from `TransactionList.tsx` (while `TransactionSummary.tsx` keeps `lastUpdate` temporarily until Story 7.4b).

6. **Given** `npm run build` and `npm run lint` **When** run after the story is complete **Then** both pass with no new errors or warnings.

## Tasks / Subtasks

### 1. Install / verify RTK Query availability (AC: 3)

- [x] Confirm `@reduxjs/toolkit` resolves to ≥1.9.x by running `npm list @reduxjs/toolkit` from `inex/ClientApp/`.
  - RTK Query ships inside `@reduxjs/toolkit` since v1.6. The `package.json` constraint `^1.7.1` will resolve to 1.9.7 (latest 1.x). Do **not** upgrade to v2.x — that requires `react-redux` v8 which is out of scope.
  - The current `package-lock.json` already resolves `@reduxjs/toolkit` to 1.9.7. If `npm list` confirms 1.9.7, do not change `package.json` or `package-lock.json`.
  - If the resolved version is below 1.9.0, bump the constraint to `^1.9.7` and run `npm install`.
- [x] No new runtime npm packages required — `@reduxjs/toolkit` already contains RTK Query.

### 2. Create shared `axiosBaseQuery` adapter (AC: 3)

- [x] Create `inex/ClientApp/src/store/axiosBaseQuery.ts`.
- [x] Implement the base query wrapping `apiClient` from `../utils/apiClient`:

  ```typescript
  import type { BaseQueryFn } from "@reduxjs/toolkit/query";
  import type { AxiosRequestConfig, AxiosError } from "axios";
  import apiClient from "../utils/apiClient";

  export interface AxiosBaseQueryArgs {
    url: string;
    method?: AxiosRequestConfig["method"];
    data?: AxiosRequestConfig["data"];
    params?: AxiosRequestConfig["params"];
  }

  export interface AxiosBaseQueryError {
    status?: number;
    data: unknown;
  }

  const axiosBaseQuery: BaseQueryFn<
    AxiosBaseQueryArgs,
    unknown,
    AxiosBaseQueryError
  > = async ({ url, method = "get", data, params }) => {
    try {
      const result = await apiClient({ url, method, data, params });
      return { data: result.data };
    } catch (axiosError) {
      const err = axiosError as AxiosError;
      return {
        error: {
          status: err.response?.status,
          data: err.response?.data ?? err.message,
        },
      };
    }
  };

  export default axiosBaseQuery;
  ```

- [x] The base query must NOT duplicate bearer token injection or refresh logic — those are handled by `apiClient`'s interceptors.

- [x] Keep the error type explicit (`AxiosBaseQueryError`) rather than `unknown` so endpoint tests and hook consumers can safely assert `error.status` under TypeScript strict mode.

### 3. Create `TransactionFilterParams` type (AC: 1)

- [x] **Check whether Story 4.2 has been implemented first.** Story 4.2 defines `TransactionFilter` in `transactions-slice.ts` and rewrites `fetchTransactions` to use `URLSearchParams`.
  - If Story 4.2 is done: import and re-export the `TransactionFilter` type as `TransactionFilterParams` from `transactions-api.ts`, or simply import `TransactionFilter` directly.
  - If Story 4.2 is NOT done yet: stop 7.4a implementation and complete 4.2 first. 7.4a must not ship against the legacy `filter=Key:Value;` transaction API.
- [x] Shape (matches Story 4.2's `TransactionFilter` and backend `TransactionFilterQuery`):
  ```typescript
  export interface TransactionFilterParams {
    accountIds: number[];
    categoryIds: number[];
    tags: string[];
    refs: string[];
    range: number[]; // [unixStart, unixEnd] — kept for Ant Design RangePicker
  }
  ```
- [x] If Story 7.1 has created `TransactionFilterState` with a `tagsAndRefs` UI helper field, do **not** use that full shape as the RTK Query cache argument. The cache/query argument must use the Story 4.2 API shape only: `accountIds`, `categoryIds`, `tags`, `refs`, and `range`.

### 4. Create transactions RTK Query API slice (AC: 1, 2, 3, 5)

- [x] Create `inex/ClientApp/src/store/transactions/transactions-api.ts`.
- [x] Reuse existing model types when available:
  - If Story 7.1 has created `model/Transaction/TransactionResponse.ts`, import it and use it for list rows instead of creating a duplicate `TransactionItem` interface.
  - If those model files do not exist yet, define the temporary local `TransactionItem` interface below and reconcile it with Story 7.1 when both stories are merged.
- [x] Define the API slice using `createApi` and `axiosBaseQuery`:

  ```typescript
  import { createApi } from "@reduxjs/toolkit/query/react";
  import axiosBaseQuery from "../axiosBaseQuery";
  import dayjs from "dayjs";

  export interface GetTransactionsArgs {
    pageSize: number;
    page: number;
    filter: TransactionFilterParams;
  }

  // Mirror the backend PagedResponse<TransactionResponse, PaginationMetadata> shape
  export interface TransactionsPagedResult {
    data: TransactionItem[];
    metadata: { totalItems: number };
  }

  export interface TransactionItem {
    id: number;
    accountId: number;
    categoryId: number;
    amount: number;
    comment: string | null;
    created: string;
    tags: string[];
    refs: string[];
    accountCurrency: string; // used by TransactionList.tsx for currency display
  }

  export interface CreateTransactionArgs {
    accountId: number;
    categoryId: number;
    amount: number;
    comment: string;
    created: string; // "YYYY-MM-DD"
  }

  export interface CreateTransferArgs {
    accountFromId: number;
    accountToId: number;
    amountFrom: number;
    amountTo: number;
    comment: string;
    created: string; // "YYYY-MM-DD"
  }

  export interface UpdateTransactionArgs {
    id: number;
    accountId: number;
    categoryId: number;
    amount: number;
    comment: string;
    created: string; // "YYYY-MM-DD"
  }

  function buildTransactionParams(
    pageSize: number,
    page: number,
    filter: TransactionFilterParams,
  ): URLSearchParams {
    const params = new URLSearchParams();
    params.set("mode", "active");
    params.set("pageSize", String(pageSize));
    params.set("page", String(page));
    filter.accountIds.forEach((id) => params.append("accountId", String(id)));
    filter.categoryIds.forEach((id) => params.append("categoryId", String(id)));
    filter.tags.forEach((tag) => params.append("tag", tag));
    filter.refs.forEach((ref) => params.append("ref", ref));
    if (filter.range.length === 2 && filter.range[0] > 0)
      params.set("startDate", dayjs.unix(filter.range[0]).format("YYYY-MM-DD"));
    if (filter.range.length === 2 && filter.range[1] > 0)
      params.set("endDate", dayjs.unix(filter.range[1]).format("YYYY-MM-DD"));
    return params;
  }

  export const transactionsApi = createApi({
    reducerPath: "transactionsApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ["Transaction"],
    endpoints: (builder) => ({
      getTransactions: builder.query<
        TransactionsPagedResult,
        GetTransactionsArgs
      >({
        query: ({ pageSize, page, filter }) => ({
          url: `/transactions?${buildTransactionParams(pageSize, page, filter).toString()}`,
        }),
        providesTags: [{ type: "Transaction", id: "LIST" }],
      }),
      createTransaction: builder.mutation<void, CreateTransactionArgs>({
        query: (body) => ({ url: "/transactions", method: "post", data: body }),
        invalidatesTags: [{ type: "Transaction", id: "LIST" }],
      }),
      createTransfer: builder.mutation<void, CreateTransferArgs>({
        query: (body) => ({
          url: "/transactions/transfer",
          method: "post",
          data: body,
        }),
        invalidatesTags: [{ type: "Transaction", id: "LIST" }],
      }),
      updateTransaction: builder.mutation<void, UpdateTransactionArgs>({
        query: ({ id, ...body }) => ({
          url: `/transactions/${id}`,
          method: "put",
          data: { id, ...body },
        }),
        invalidatesTags: [{ type: "Transaction", id: "LIST" }],
      }),
      deleteTransaction: builder.mutation<void, number>({
        query: (id) => ({ url: `/transactions/${id}`, method: "delete" }),
        invalidatesTags: [{ type: "Transaction", id: "LIST" }],
      }),
    }),
  });

  export const {
    useGetTransactionsQuery,
    useCreateTransactionMutation,
    useCreateTransferMutation,
    useUpdateTransactionMutation,
    useDeleteTransactionMutation,
  } = transactionsApi;
  ```

### 5. Register the API slice in the Redux store (AC: 3)

- [x] Edit `inex/ClientApp/src/store/index.ts`:
  - Import `transactionsApi` from `./transactions/transactions-api`.
  - Add `[transactionsApi.reducerPath]: transactionsApi.reducer` to the `reducer` map.
  - Add `.concat(transactionsApi.middleware)` to the middleware chain:
    ```typescript
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(transactionsApi.middleware),
    ```
  - Keep all existing slice reducers (`auth`, `accounts`, `categories`, `transactions`, `rates`, `report`, `budgets`, `budgetReport`) — RTK Query adds a new key, does not replace any existing one.

### 6. Migrate `TransactionList.tsx` to RTK Query hooks (AC: 2, 5)

- [x] Replace the `useAppSelector` calls for `items`, `total`, `isLoading`, and `error` with:
  ```typescript
  const { data, isLoading, isError } = useGetTransactionsQuery({
    pageSize,
    page: currentPage,
    filter,
  });
  ```
- [x] Replace `dispatch(fetchTransactions(...))` in `useEffect` with the `skip` option or simply by passing updated args to the query hook (RTK Query auto-fetches on arg change).
- [x] Remove the `transactionsLastUpdate` / `useAppSelector(state => state.transactions.lastUpdate)` selector and the `useEffect` dependency on it — mutations invalidate the cache automatically.
- [x] Derive `transactions = data?.data ?? []` and `total = data?.metadata.totalItems ?? 0` from the hook result.
- [x] Keep `const filter = useAppSelector(state => state.transactions.filter)` — the filter state remains in `transactions-slice.ts` (it is UI/form state, not server cache state).

### 7. Migrate mutation call sites (AC: 5)

- [x] **CRITICAL SCOPE NOTE**: Dispatch calls live in exactly **two** files only — `TransactionCreate.tsx` (dispatches `createTransaction` and `createTransfer`) and `TransactionEditForm.tsx` (dispatches `updateTransaction` and `removeTransaction`). The three `TransactionCreate*Form.tsx` sub-components (`TransactionCreateExpenseForm.tsx`, `TransactionCreateIncomeForm.tsx`, `TransactionCreateTransferForm.tsx`) are pure form UI that receive callbacks via props — they contain no dispatch calls and must NOT be modified.
- [x] **`TransactionCreate.tsx`**: Replace `dispatch(createTransaction(...))` / `dispatch(createTransfer(...))` with RTK Query mutation hooks:
  ```typescript
  const [createTransactionMutation, { isLoading: isCreating }] =
    useCreateTransactionMutation();
  const [createTransferMutation, { isLoading: isCreatingTransfer }] =
    useCreateTransferMutation();
  // Remove: const isCreating = useAppSelector(state => state.transactions.isCreating);
  // call: await createTransactionMutation({ accountId, categoryId, amount, comment, created }).unwrap();
  ```
- [x] **`TransactionEditForm.tsx`**: Replace `dispatch(updateTransaction(...))` / `dispatch(removeTransaction(...))` with RTK Query mutation hooks:
  ```typescript
  const [updateTransactionMutation, { isLoading: isUpdating }] =
    useUpdateTransactionMutation();
  const [deleteTransactionMutation, { isLoading: isDeleting }] =
    useDeleteTransactionMutation();
  // Remove: const isDeleting = useAppSelector(state => state.transactions.isDeleting);
  // Remove: const isUpdating = useAppSelector(state => state.transactions.isUpdating);
  ```
- [x] **`TransactionSummary.tsx` re-fetch trigger**: `TransactionSummary.tsx` uses `state.transactions.lastUpdate` as a `useEffect` dependency to trigger `fetchTransactionsSummaryForAccounts`. Since `lastUpdate` is being kept (see Task 8), mutations in `TransactionCreate.tsx` and `TransactionEditForm.tsx` must dispatch `transactionsActions.setLastUpdate()` after a successful `.unwrap()` call so the summary panel refreshes:
  ```typescript
  await createTransactionMutation({ ... }).unwrap();
  dispatch(transactionsActions.setLastUpdate()); // triggers TransactionSummary re-fetch
  ```
- [x] Use `.unwrap()` on every mutation call so thrown errors can be caught in a surrounding `try/catch`. On success, RTK Query automatically invalidates `{ type: "Transaction", id: "LIST" }` for the list view; `setLastUpdate()` additionally triggers the summary panel.
- [x] Do not reset the create form, close the create drawer/modal via `props.onSubmit()`, or leave edit mode until the awaited `.unwrap()` call succeeds. On mutation failure, keep the current UI open and let the caught error path preserve or surface the failure instead of pretending the save/delete completed.

### 8. Clean up `transactions-slice.ts` and `transactions-actions.ts` (AC: 2)

- [x] After verifying that TransactionList and all mutation components work via RTK Query hooks:
  - Remove from `transactions-slice.ts` initialState: `items`, `total`, `isLoading`, `isCreating`, `isDeleting`, `isUpdating`.
  - Remove corresponding reducers: `setTransactions`, `setTotal`, `setIsLoading`, `setIsCreating`, `setIsDeleting`, `setIsUpdating`.
  - **KEEP `lastUpdate` and `setLastUpdate`** — `TransactionSummary.tsx` reads `state.transactions.lastUpdate` as a `useEffect` dependency to trigger `fetchTransactionsSummaryForAccounts` refetches after mutations. Until the accounts summary is migrated to RTK Query in Story 7.4b, `lastUpdate` must remain as a manual re-fetch trigger. The mutation hooks in `TransactionCreate.tsx` and `TransactionEditForm.tsx` dispatch `setLastUpdate()` on success (see Task 7).
  - Keep `filter`, `setFilter`, `resetFilter` — these are UI state, not server cache.
  - Keep `summaryItems` and `setTransactionsSummaryForAccounts` — `fetchTransactionsSummaryForAccounts` calls `/accounts/details` and belongs to the accounts domain migration in Story 7.4b; do **not** touch it here.
- [x] In `transactions-actions.ts`:
  - Remove `fetchTransactions`, `createTransaction`, `createTransfer`, `updateTransaction`, `removeTransaction`.
  - Keep `fetchTransactionsSummaryForAccounts` — it is out of scope for 7.4a.

- [x] Keep `error` and `setError` in `transactions-slice.ts` while `fetchTransactionsSummaryForAccounts` remains in `transactions-actions.ts`; that legacy thunk currently dispatches `transactionsActions.setError(...)` in its `catch` path. `TransactionList.tsx` must not use this field for list errors after the RTK Query migration.
- [x] After cleanup, run a targeted search for stale references to removed thunks and slice fields:
  `fetchTransactions`, `createTransaction`, `createTransfer`, `updateTransaction`, `removeTransaction`, `setTransactions`, `setTotal`, `setIsLoading`, `setIsCreating`, `setIsDeleting`, `setIsUpdating`.

### 9. Write RTK Query endpoint tests (AC: 4)

- [x] Create `inex/ClientApp/src/store/transactions/__tests__/transactions-api.test.ts` (uses Vitest infrastructure from Story 7.3).
- [x] Test 1 — `getTransactions: successful fetch caches result`:
  - Mock `apiClient` to return a fixture `TransactionsPagedResult`.
  - Dispatch `getTransactions({ pageSize: 25, page: 1, filter: emptyFilter })`.
  - Assert `data.data` equals `fixture.data`; assert the RTK Query cache contains the result.
- [x] Test 2 — `cache invalidation on mutation triggers refetch`:
  - After a successful `createTransaction` mutation, assert that the `getTransactions` query is invalidated (check that RTK Query re-triggers the query — use `waitFor` from `@testing-library/react`).
- [x] Test 3 — `API error propagates to isError state`:
  - Mock `apiClient` to throw a 500 Axios error.
  - Dispatch `getTransactions(...)`.
  - Assert `isError === true` and `error.status === 500`; this depends on `axiosBaseQuery` using the explicit `AxiosBaseQueryError` type from Task 2.

### 10. Build and lint gate (AC: 6)

- [x] Run `npm run build` from `inex/ClientApp/` — must pass.
- [x] Run `npm run lint` from `inex/ClientApp/` — must pass with no new warnings.
- [x] Run `npm test` from `inex/ClientApp/` — all tests must pass.

---

## Dev Notes

### Dependency: Story 4.2 Must Come First

Story 7.4a depends on Epic 4 Story 4.2 (`4-2-backend-frontend-typed-transaction-filter-query-parameters`) being **done** before this story merges to main. This is mandatory because:

- RTK Query cache keys for `getTransactions` are built from `TransactionFilterParams` — each unique combination of `{pageSize, page, filter}` becomes a separate cache entry.
- If 7.4a is built against the legacy string-DSL format (`Key:Value;`), the cache key design must be reworked entirely when Epic 4 ships.
- Story 4.2 defines the `TransactionFilter` TypeScript interface in `transactions-slice.ts` and rewrites `fetchTransactions` to use `URLSearchParams` toward the backend endpoint that accepts typed query params.

**No workaround for 4.2**: if Story 4.2 is not complete, treat 7.4a as blocked. Do not implement transactions RTK Query against the legacy DSL API.

**No workaround for 7.3 sign-off**: Story 7.3 (Vitest + RTL) must be complete before AC-4 can be accepted. Do not mark 7.4a done until the RTK Query tests are implemented and passing.

Story 7.1 (typed models) should ideally complete before this story so `TransactionItem` and response shapes are already typed in `model/Transaction/`. However, the story-level risk is low: `TransactionItem` can be defined inline in `transactions-api.ts` and reconciled when 7.1 merges.

### Current Transactions Slice State (Before This Story)

`inex/ClientApp/src/store/transactions/transactions-slice.ts`:

```typescript
initialState: {
  items: [] as any[],          // ← server data, owned by RTK Query after this story
  total: 0,                    // ← server data, owned by RTK Query after this story
  isLoading: false,            // ← server state, owned by RTK Query after this story
  isCreating: false,           // ← server state, owned by RTK Query after this story
  isDeleting: false,           // ← server state, owned by RTK Query after this story
  isUpdating: false,           // ← server state, owned by RTK Query after this story
  summaryItems: [] as any[],   // ← KEEP — accounts domain, migrated in 7.4b
  lastUpdate: Date(),          // ← KEEP — TransactionSummary.tsx useEffect dependency; migrated in 7.4b
  filter: defaultFilter,       // ← KEEP — UI/form state, not server cache
  error: null as string | null,// ← server state, owned by RTK Query after this story
}
```

After this story, the following remain in the slice: `filter`, `lastUpdate`, `summaryItems`, `setFilter`, `resetFilter`, `setLastUpdate`, `setTransactionsSummaryForAccounts`, and `transactionsDefaultFilter`. The `lastUpdate`/`setLastUpdate` pair stays because `TransactionSummary.tsx` uses it as a manual re-fetch trigger for account summaries — this is removed in Story 7.4b.

Correction for 7.4a cleanup: keep `error` and `setError` in the slice until Story 7.4b because the retained `fetchTransactionsSummaryForAccounts` thunk still dispatches `transactionsActions.setError(...)` on failure. Do not use that field for `TransactionList.tsx` list errors after this story; list errors come from RTK Query.

### Current `transactions-actions.ts` (Before This Story)

Five thunks to remove:

- `fetchTransactions(pageSize, page, filter)` — replaced by `useGetTransactionsQuery`
- `createTransaction(accountId, categoryId, amount, comment, date)` — replaced by `useCreateTransactionMutation`
- `createTransfer(accountFromId, accountToId, amountFrom, amountTo, comment, date)` — replaced by `useCreateTransferMutation`
- `updateTransaction(id, accountId, categoryId, amount, comment, date)` — replaced by `useUpdateTransactionMutation`
- `removeTransaction(id)` — replaced by `useDeleteTransactionMutation`

One thunk to **keep**:

- `fetchTransactionsSummaryForAccounts(ids)` — calls `/accounts/details`, belongs to accounts domain; migrated in 7.4b

### `apiClient.ts` Auth & Refresh Behavior

`inex/ClientApp/src/utils/apiClient.ts` is the shared Axios instance. It:

1. Sets `baseURL: "/api"` — all paths are relative (so `url: "/transactions"` resolves to `GET /api/transactions`).
2. Request interceptor reads `store.getState().auth.accessToken` and injects `Authorization: Bearer <token>`.
3. Response interceptor on 401: runs a **singleton refresh promise** (`refreshPromise`) that calls `POST /api/auth/refresh` via a plain `axios` (not `apiClient`) to avoid recursion, then retries the original request with the new token. On refresh failure, dispatches `clearAuth()`.

`axiosBaseQuery` **must not** reimplement any of this. It simply calls `apiClient(config)` and lets the interceptors run. This means RTK Query automatically gets token injection, silent refresh-retry, and redirect-on-session-expiry behavior for free.

### `axiosBaseQuery` — Correct Import Path

The file lives at `inex/ClientApp/src/store/axiosBaseQuery.ts`. The import path from `transactions-api.ts` is `../axiosBaseQuery` (one level up from the `transactions/` subdirectory).

`store/index.ts` imports `transactionsApi` from `./transactions/transactions-api`; it does not import `axiosBaseQuery` directly.

### RTK Query `createApi` Import

Use the React-specific entrypoint to get auto-generated hooks:

```typescript
import { createApi } from "@reduxjs/toolkit/query/react";
```

This is available in `@reduxjs/toolkit` ≥1.6.0.

### Store Registration — Exact Pattern

In `inex/ClientApp/src/store/index.ts` (currently does not use `middleware` override):

```typescript
import { transactionsApi } from "./transactions/transactions-api";

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    accounts: accountsSlice.reducer,
    categories: categoriesSlice.reducer,
    transactions: transactionsSlice.reducer, // keeps filter + summaryItems
    rates: ratesSlice.reducer,
    report: reportSlice.reducer,
    budgets: budgetsSlice.reducer,
    budgetReport: budgetReportSlice.reducer,
    [transactionsApi.reducerPath]: transactionsApi.reducer, // NEW
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(transactionsApi.middleware), // NEW
});
```

**Do not remove any existing reducers.** The existing `transactions` slice key still owns `filter` and `summaryItems`. The new `transactionsApi` key is additive.

### Cache Tag Strategy

- `tagTypes: ["Transaction"]`
- `getTransactions` provides `[{ type: "Transaction", id: "LIST" }]` — any successful create/update/delete will invalidate this tag and trigger an automatic refetch.
- Rationale for using `"LIST"` ID: transactions are paginated — there is no global single-entity cache warranting per-ID tags at this stage. All mutations invalidate the full list. More granular tag strategies can be added in later iterations.

### `lastUpdate` Migration

Currently `TransactionList.tsx` uses:

```typescript
const transactionsLastUpdate = useAppSelector(state => state.transactions.lastUpdate);
// ...
useEffect(() => {
    dispatch(fetchTransactions(pageSize, currentPage, filter));
}, [..., transactionsLastUpdate]);
```

After this story:

- Remove the `transactionsLastUpdate` selector and its `useEffect` dependency.
- RTK Query hooks refetch automatically when their args change (filter, page, pageSize) or when a mutation invalidates the `"Transaction" / "LIST"` tag.
- The thunk-based `dispatch(setLastUpdate())` calls are removed with the old thunks, but equivalent `setLastUpdate()` dispatches must be triggered from successful RTK Query mutation handlers so `TransactionSummary.tsx` continues to refresh until Story 7.4b.

### `TransactionList.tsx` — Migration Pattern

Current pattern (to remove):

```typescript
const transactions = useAppSelector((state) => state.transactions.items);
const total = useAppSelector((state) => state.transactions.total);
const isLoading = useAppSelector((state) => state.transactions.isLoading);
// + useEffect dispatch
```

New pattern (RTK Query):

```typescript
import { useGetTransactionsQuery } from "../../store/transactions/transactions-api";

const filter = useAppSelector((state) => state.transactions.filter); // still from slice

const { data, isLoading, isError } = useGetTransactionsQuery(
  { pageSize, page: currentPage, filter },
  { skip: accounts.length === 0 || categories.length === 0 },
);

const transactions = data?.data ?? [];
const total = data?.metadata.totalItems ?? 0;
```

The `skip` option replaces the `if (accounts.length === 0 ...) return;` guard in the current `useEffect`.

### Mutation Hook Usage Pattern in Form Components

Current pattern in `TransactionCreate.tsx`:

```typescript
dispatch(createTransaction(accountId, categoryId, amount, comment, date));
// then dispatch(transactionsActions.setIsCreating({ isCreating: false }));
```

New pattern:

```typescript
const [createTransaction, { isLoading: isCreating }] =
  useCreateTransactionMutation();

const handleSubmit = async () => {
  await createTransaction({
    accountId,
    categoryId,
    amount,
    comment,
    created: date.format("YYYY-MM-DD"),
  }).unwrap(); // throws on error — catch in surrounding try/catch
};
```

Use `.unwrap()` so that thrown errors can be caught and displayed. On success, RTK Query invalidates the list automatically.

### RTK Query Version Note

`@reduxjs/toolkit ^1.7.1` resolves to 1.9.x (latest stable 1.x). RTK Query is complete in 1.9.x and the `createApi` + `@reduxjs/toolkit/query/react` import is available. **Do not upgrade to 2.x** — RTK 2.x requires `react-redux` v8 (currently `^7.2.6`), which is out of scope.

### Test Harness Notes

Tests require the RTK Store to be set up with the API middleware. Create a `renderWithStore` test helper (or reuse one from Story 7.3) that creates a test store including `transactionsApi.reducer` and `transactionsApi.middleware`.

Mock `apiClient` using `vi.mock("../../../utils/apiClient")` in Vitest:

```typescript
import { vi, type MockedFunction } from "vitest";
import apiClient from "../../../utils/apiClient";

vi.mock("../../../utils/apiClient");
const mockApiClient = apiClient as MockedFunction<typeof apiClient>;
// or use the helper: const mockApiClient = vi.mocked(apiClient);
```

Vitest's `vi.mock` replaces the module for the test file scope. Return fixture data from the mocked implementation.

### Files to Create

| File                                                                       | Purpose                                               |
| -------------------------------------------------------------------------- | ----------------------------------------------------- |
| `inex/ClientApp/src/store/axiosBaseQuery.ts`                               | Shared RTK Query base query wrapping `apiClient`      |
| `inex/ClientApp/src/store/transactions/transactions-api.ts`                | Transactions RTK Query API slice with all 5 endpoints |
| `inex/ClientApp/src/store/transactions/__tests__/transactions-api.test.ts` | 3 required tests                                      |

### Files to Modify

| File                                                            | Change                                                                                                                                                                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inex/ClientApp/src/store/index.ts`                             | Add `transactionsApi.reducer` and middleware                                                                                                                                                                    |
| `inex/ClientApp/src/store/transactions/transactions-slice.ts`   | Remove server-state fields; keep `filter`, `summaryItems`                                                                                                                                                       |
| `inex/ClientApp/src/store/transactions/transactions-actions.ts` | Remove 5 migrated thunks; keep `fetchTransactionsSummaryForAccounts`                                                                                                                                            |
| `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`     | Use `useGetTransactionsQuery`; remove manual thunk dispatch                                                                                                                                                     |
| `inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx`   | Replace `createTransaction`/`createTransfer` thunk dispatches with RTK Query mutation hooks; replace `isCreating` selector with mutation's `isLoading`; dispatch `setLastUpdate()` after success                |
| `inex/ClientApp/src/pages/Transactions/TransactionEditForm.tsx` | Replace `updateTransaction`/`removeTransaction` thunk dispatches with RTK Query mutation hooks; replace `isDeleting`/`isUpdating` selectors with mutation `isLoading`; dispatch `setLastUpdate()` after success |

> **Note**: `TransactionCreateExpenseForm.tsx`, `TransactionCreateIncomeForm.tsx`, `TransactionCreateTransferForm.tsx` are pure form components with prop-callback APIs — they contain no dispatch logic and require **no changes** in this story.

### Do NOT Touch

- `inex/ClientApp/src/utils/apiClient.ts` — do not modify; wrap only via `axiosBaseQuery`
- `fetchTransactionsSummaryForAccounts` thunk — accounts domain, migrated in Story 7.4b
- Any Redux slice outside `transactions/` — 7.4a is scoped to transactions only
- `TransactionFilterForm.tsx` — filter UI state dispatches `setFilter` to the slice; this is unaffected
- `handleTagClick` / `handleRefClick` in `TransactionList.tsx` — these call `navigate()` with the old DSL URL format (`?filter=tags:x;`). Fixing this URL format is Epic 4 / Story 4.3 work. **Do not change these navigation calls in 7.4a** even though they reference the old filter DSL.

### Project Structure Notes

- New files follow existing naming conventions: `kebab-case.ts` for store files.
- `transactions-api.ts` lives alongside `transactions-slice.ts` and `transactions-actions.ts` in `store/transactions/`.
- Tests live in `store/transactions/__tests__/` (Vitest convention introduced by Story 7.3).
- `axiosBaseQuery.ts` lives at `store/` root — it is domain-agnostic and will be reused by 7.4b and 7.4c.

### References

- [Source: docs/planning/epics.md — Story 7.4a, Epic 7]
- [Source: docs/planning/epics.md — Epic 4 dependency note (line 241)]
- [Source: docs/implementation/4-2-backend-frontend-typed-transaction-filter-query-parameters.md — TransactionFilter interface, URLSearchParams pattern]
- [Source: inex/ClientApp/src/store/transactions/transactions-actions.ts — all 6 current thunks]
- [Source: inex/ClientApp/src/store/transactions/transactions-slice.ts — current state shape]
- [Source: inex/ClientApp/src/utils/apiClient.ts — auth interceptors, singleton refresh promise]
- [Source: inex/ClientApp/src/store/index.ts — configureStore, existing reducer map]
- [Source: inex/ClientApp/package.json — @reduxjs/toolkit ^1.7.1, react-redux ^7.2.6]
- [Source: inex/ClientApp/src/pages/Transactions/TransactionList.tsx — lastUpdate pattern, useEffect dispatch]

---

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-02: `npm list @reduxjs/toolkit` confirmed `@reduxjs/toolkit@1.9.7`.
- 2026-06-02: `npm test` passed: 3 test files, 10 tests.
- 2026-06-02: `npm run lint` passed.
- 2026-06-02: `npm run build` first failed with filesystem `EPERM` while cleaning `build/assets`; rerun with approved filesystem access passed.
- 2026-06-02: Targeted stale-reference search found no removed transaction thunk/slice-field references in the transactions migration scope.
- 2026-06-02: Final BMad code review found transaction mutation dependent-cache invalidation and list error-state gaps; fixed and reran `npm test`, `npm run lint`, `npm run build`, and stale-reference audit successfully.

### Completion Notes List

- Added shared `axiosBaseQuery` around the existing authenticated `apiClient`; empty Axios response bodies are normalized to `null` so void mutations do not violate RTK Query base query result shape.
- Added `transactionsApi` with typed `TransactionFilterParams`, list query, create transaction, create transfer, update transaction, and delete transaction endpoints.
- Registered the transactions API reducer and middleware in the Redux store while retaining the existing `transactions` slice for filter and retained mutation error state.
- Migrated `TransactionList.tsx` to source list data, total, loading state, and query error state from `useGetTransactionsQuery`; removed manual `fetchTransactions` and list `lastUpdate` dependency, and stripped the UI-only `tagsAndRefs` helper from RTK Query args.
- Migrated `TransactionCreate.tsx` and `TransactionEditForm.tsx` to RTK Query mutation hooks with `.unwrap()`. Successful transaction mutations now invalidate transaction list, account summary, budget report, category report, and history report caches from the RTK API layer.
- Removed migrated transaction thunks and server-list/loading mutation state from `transactions-slice.ts`/`transactions-actions.ts`; the later accounts/categories RTK migration removed the temporary summary thunk and `lastUpdate` bridge retained during the initial 7.4a worker pass.
- Added RTK Query endpoint tests covering successful list cache population, mutation invalidation refetch, and API error propagation to query error state.

### File List

- inex/ClientApp/src/store/axiosBaseQuery.ts
- inex/ClientApp/src/store/transactions/transactions-api.ts
- inex/ClientApp/src/store/transactions/__tests__/transactions-api.test.ts
- inex/ClientApp/src/store/index.ts
- inex/ClientApp/src/store/transactions/transactions-slice.ts
- inex/ClientApp/src/store/transactions/transactions-actions.ts
- inex/ClientApp/src/pages/Transactions/TransactionList.tsx
- inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx
- inex/ClientApp/src/pages/Transactions/TransactionEditForm.tsx
- docs/implementation/7-4a-frontend-rtk-query-transactions.md

### Change Log

- 2026-06-02: Implemented frontend transactions RTK Query migration pattern and endpoint tests; story moved to review.
- 2026-06-02: Integrated final review fixes for transaction query error UI and dependent RTK cache invalidation.
