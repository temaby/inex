# Story 7.4b: Frontend — RTK Query Migration For Accounts And Categories

Status: review

## Story

As a frontend developer,
I want accounts and categories migrated to RTK Query after the transactions pattern is proven,
so that shared cache and invalidation conventions are reused instead of reinvented per domain.

## Acceptance Criteria

1. **Given** Story 7.4a has established the RTK Query API pattern (`axiosBaseQuery` + store middleware setup + `transactions-api.ts`)  
   **When** accounts and categories are migrated  
   **Then** each domain has an RTK Query API slice defined in `store/accounts/accounts-api.ts` and `store/categories/categories-api.ts`, replacing their manual `*-actions.ts` thunks

2. **Given** account create, update (including status change via `isEnabled`), and delete mutations complete  
   **When** any mutation succeeds  
   **Then** the accounts list cache invalidates and refetches without requiring a `setLastUpdate()` dispatch

3. **Given** category create, update (including status change via `isEnabled`), and delete mutations complete  
   **When** any mutation succeeds  
   **Then** the categories list cache invalidates and refetches without requiring a `setLastUpdate()` dispatch

4. **Given** `CategoryCreateForm` reads `state.categories.items` from Redux for its parent dropdown, and `Budgets.tsx` dispatches `fetchCategories("ALL")` for its category selector  
   **When** categories are migrated  
   **Then** both `CategoryCreateForm` and `Budgets.tsx` source categories via `useGetCategoriesQuery` instead of `useAppSelector`/dispatch

5. **Given** `App.tsx` dispatches `fetchAccounts("ALL")` and `fetchCategories("ALL")` on session restore  
   **When** the migration is complete  
   **Then** those dispatches are removed; components self-manage via RTK Query hooks

6. **Given** the story is complete  
   **When** `npm test` and `npm run build` run  
   **Then** both pass with account and category RTK Query endpoint coverage for success and API failure states

## Tasks / Subtasks

### Prerequisite: Verify 7.4a foundation

- [x] Confirm `axiosBaseQuery` exists at `src/store/axiosBaseQuery.ts` (created in 7.4a). (AC: 1)
  - [x] If missing, STOP — 7.4b cannot proceed until 7.4a is complete.
- [x] Confirm `src/store/transactions/transactions-api.ts` exists (created in 7.4a) and is wired in `store/index.ts`. (AC: 1)
  - [x] If missing, STOP — do not invent a parallel RTK Query pattern in this story.
- [x] Confirm `store/index.ts` has `getDefaultMiddleware().concat(transactionsApi.middleware)` or equivalent from 7.4a. (AC: 1)
- [x] Note the exact RTK version from `node_modules/@reduxjs/toolkit/package.json` — follow whatever import/middleware pattern 7.4a established.
- [x] Confirm Story 7.3 test infrastructure exists before implementing AC6 (`package.json` has `test` script; Vitest + RTL deps are installed). (AC: 6)
  - [x] If missing, mark AC6 blocked by Story 7.3 and proceed with implementation work that does not depend on tests.

### Accounts API slice

- [x] Create `src/store/accounts/accounts-api.ts`. (AC: 1, 2)
  - [x] Import `createApi` from `@reduxjs/toolkit/query/react` and `axiosBaseQuery` from `../axiosBaseQuery`.
  - [x] Define local response interfaces before `createApi` because the current frontend `AccountDetails` model does not include every field this API returns/uses:
    ```typescript
    interface ListResponse<T> {
      data: T[];
    }

    export interface AccountResponse {
      id: number;
      key: string;
      name: string;
      description: string | null;
      isEnabled: boolean;
      currencyId: number;
      currency: string;
    }

    export interface AccountSummary extends AccountResponse {
      value: number;
      thisMonthNet: number;
    }
    ```
  - [x] Set `reducerPath: 'accountsApi'` and `tagTypes: ['Account']`.
  - [x] Implement `getAccounts` query:
    - Arg: `mode: string` (call sites always pass `"ALL"`)
    - URL: `/accounts?mode=${mode}` (GET)
    - Return type: `AccountResponse[]`.
    - Add `transformResponse: (response: ListResponse<AccountResponse>) => response.data ?? []` so hook call sites receive an array, not the backend wrapper.
    - `providesTags: (result) => result ? [...result.map(({ id }) => ({ type: 'Account' as const, id })), { type: 'Account', id: 'LIST' }] : [{ type: 'Account', id: 'LIST' }]`
    - Note: backend returns `{ data: [...] }`; `axiosBaseQuery` returns that object as `data`, so each list endpoint must unwrap it before exposing hook data.
  - [x] Implement `getAccountsSummary` query for the existing `/accounts/details` endpoint:
    - Arg: `ids: number[]`
    - URL: `/accounts/details?mode=active&${ids.map((id, i) => `ids[${i}]=${id}`).join("&")}` (GET)
    - Return type: `AccountSummary[]`.
    - Add `transformResponse: (response: ListResponse<AccountSummary>) => response.data ?? []`.
    - `providesTags: (result) => result ? [...result.map(({ id }) => ({ type: 'Account' as const, id })), { type: 'Account', id: 'SUMMARY' }] : [{ type: 'Account', id: 'SUMMARY' }]`
  - [x] Implement `createAccount` mutation:
    - Body: `{ key: string; name: string; description: string; currencyId: number; isEnabled: boolean }`
    - Method: `POST /accounts`
    - `invalidatesTags: [{ type: 'Account', id: 'LIST' }]`
  - [x] Implement `updateAccount` mutation (handles both field edits and `isEnabled` status toggle — there is no separate toggle endpoint):
    - Arg: `{ id: number; key: string; name: string; description: string; currencyId: number; isEnabled: boolean }`
    - Method: `PUT /accounts/${id}`
    - `invalidatesTags: (result, error, { id }) => [{ type: 'Account' as const, id }, { type: 'Account', id: 'LIST' }]`
  - [x] Implement `deleteAccount` mutation:
    - Arg: `id: number`
    - Method: `DELETE /accounts/${id}`
    - `invalidatesTags: (result, error, id) => [{ type: 'Account' as const, id }, { type: 'Account', id: 'LIST' }]`
  - [x] Export `useGetAccountsQuery`, `useGetAccountsSummaryQuery`, `useCreateAccountMutation`, `useUpdateAccountMutation`, `useDeleteAccountMutation`.

### Categories API slice

- [x] Create `src/store/categories/categories-api.ts`. (AC: 1, 3, 4)
  - [x] Import `createApi` from `@reduxjs/toolkit/query/react` and `axiosBaseQuery` as above.
  - [x] Define local response interfaces before `createApi`:
    ```typescript
    interface ListResponse<T> {
      data: T[];
    }

    export interface CategoryResponse {
      id: number;
      key: string;
      name: string;
      description: string | null;
      parentId?: number | null;
      isEnabled: boolean;
      isSystem: boolean;
      systemCode: string | null;
      children?: CategoryResponse[];
    }
    ```
  - [x] Set `reducerPath: 'categoriesApi'` and `tagTypes: ['Category']`.
  - [x] Implement `getCategories` query:
    - Arg: `mode: string`
    - URL: `/categories?mode=${mode}` (GET)
    - Return type: `CategoryResponse[]`.
    - Add `transformResponse: (response: ListResponse<CategoryResponse>) => response.data ?? []`.
    - Same array-based `providesTags` pattern as accounts but with `'Category'` type.
  - [x] Implement `createCategory` mutation:
    - Body: `{ key: string; name: string; description: string; isEnabled: boolean; parentId: number | null }`
    - Method: `POST /categories`
    - `invalidatesTags: [{ type: 'Category', id: 'LIST' }]`
  - [x] Implement `updateCategory` mutation (handles field edits and `isEnabled` status toggle; `key` is included only to satisfy the current backend validator and is not user-editable here):
    - Arg: `{ id: number; key: string; name: string; description: string; isEnabled: boolean }`
    - Method: `PUT /categories/${id}`
    - `invalidatesTags: (result, error, { id }) => [{ type: 'Category' as const, id }, { type: 'Category', id: 'LIST' }]`
  - [x] Implement `deleteCategory` mutation:
    - Arg: `id: number`
    - Method: `DELETE /categories/${id}`
    - `invalidatesTags: (result, error, id) => [{ type: 'Category' as const, id }, { type: 'Category', id: 'LIST' }]`
  - [x] Export `useGetCategoriesQuery`, `useCreateCategoryMutation`, `useUpdateCategoryMutation`, `useDeleteCategoryMutation`.

### Wire API slices into store

- [x] Update `src/store/index.ts`. (AC: 1)
  - [x] Add `[accountsApi.reducerPath]: accountsApi.reducer` and `[categoriesApi.reducerPath]: categoriesApi.reducer` to the reducer map.
  - [x] Chain `.concat(accountsApi.middleware, categoriesApi.middleware)` onto the existing middleware chain from 7.4a.
  - [x] **Keep** `accounts: accountsSlice.reducer` and `categories: categoriesSlice.reducer` until all consumers are confirmed migrated and the old slices are safe to remove.

### Migrate Accounts.tsx

- [x] Replace the thunk-based fetch with RTK Query hook. (AC: 2, 5)
  - [x] Replace `import { fetchAccounts } from "../store/accounts/accounts-actions"` with `import { AccountResponse, useGetAccountsQuery } from "../store/accounts/accounts-api"`.
  - [x] Remove `useAppSelector(state => state.accounts.items)` and `useAppSelector(state => state.accounts.lastUpdate)`.
  - [x] Add `const { data: accounts = [], isLoading } = useGetAccountsQuery("ALL");`.
  - [x] Remove the `useEffect` that dispatched `fetchAccounts("ALL")` on `accountsLastUpdate`.
  - [x] Preserve the `showOnlyEnabled` filter: `const filteredAccounts = showOnlyEnabled ? accounts.filter((a: AccountResponse) => a.isEnabled) : accounts;`.
  - [x] Change the table type and edit form record type from the incomplete `AccountDetails` model to `AccountResponse`.
  - [x] Add `loading={isLoading}` prop to the `<Table>`.

### Migrate AccountCreateForm.tsx

- [x] Replace `createAccount` thunk with mutation hook. (AC: 2)
  - [x] Replace `import { createAccount } from "../../store/accounts/accounts-actions"` with `import { useCreateAccountMutation } from "../../store/accounts/accounts-api"`.
  - [x] Remove `useAppSelector(state => state.accounts.isCreating)`.
  - [x] Add `const [createAccount, { isLoading: isCreating }] = useCreateAccountMutation();`.
  - [x] In `onFinish`, call `await createAccount({ key, name, description, currencyId, isEnabled }).unwrap()` — no manual dispatch needed.
  - [x] **Keep** the direct `apiClient.get("/currencies")` call — currencies are not in scope for this story.

### Migrate AccountEditForm.tsx

- [x] Replace `updateAccount` and `deleteAccount` thunks. (AC: 2)
  - [x] Replace import with `import { useUpdateAccountMutation, useDeleteAccountMutation } from "../../store/accounts/accounts-api"`.
  - [x] Remove `useAppSelector(state => state.accounts.isUpdating)`.
  - [x] Add `const [updateAccount, { isLoading: isUpdating }] = useUpdateAccountMutation();` and `const [deleteAccount] = useDeleteAccountMutation();`.
  - [x] In `updateHandler`, call `updateAccount({ id: +props.record.id, key: props.record.key, name: state.name, description: state.description, currencyId: state.currencyId, isEnabled: state.isEnabled }).unwrap()`.
  - [x] In `deleteHandler`, call `deleteAccount(+props.record.id).unwrap()`.
  - [x] **Keep** the direct `apiClient.get("/currencies")` call.

### Migrate Categories.tsx

- [x] Replace the thunk-based fetch with RTK Query hook. (AC: 3, 5)
  - [x] Replace `import { fetchCategories } from '../store/categories/categories-actions'` with `import { useGetCategoriesQuery } from '../store/categories/categories-api'`.
  - [x] Remove `useAppSelector(state => state.categories.items)` and `useAppSelector(state => state.categories.lastUpdate)`.
  - [x] Add `const { data: categories = [], isLoading } = useGetCategoriesQuery("ALL");`.
  - [x] Remove the `useEffect` that dispatched `fetchCategories("ALL")` on `categoriesLastUpdate`.
  - [x] Add `loading={isLoading}` to the `<Table>`.

### Migrate CategoryCreateForm.tsx

- [x] Replace thunk and Redux selector with mutation hook and query hook. (AC: 3, 4)
  - [x] Replace `import { createCategory } from "../../store/categories/categories-actions"` with `import { useCreateCategoryMutation, useGetCategoriesQuery } from "../../store/categories/categories-api"`.
  - [x] Remove `useAppSelector(state => state.categories.isCreating)` and `useAppSelector(state => state.categories.items)`.
  - [x] Add `const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();`.
  - [x] Add `const { data: allCategories = [] } = useGetCategoriesQuery("ALL");` — replaces the `state.categories.items` selector for the parent dropdown. RTK Query caches the result so this does NOT cause a duplicate network call if `Categories.tsx` is already mounted.
  - [x] In `onFinish`, call `await createCategory({ key, name, description, isEnabled, parentId: values.parentId ?? null }).unwrap()`.

### Migrate CategoryEditForm.tsx

- [x] Replace `updateCategory` and `deleteCategory` thunks. (AC: 3)
  - [x] Replace import with `import { useUpdateCategoryMutation, useDeleteCategoryMutation } from "../../store/categories/categories-api"`.
  - [x] Remove `useAppSelector(state => state.categories.isUpdating)`.
  - [x] Add `const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();` and `const [deleteCategory] = useDeleteCategoryMutation();`.
  - [x] In `updateCategoryHandler`, call `updateCategory({ id: +props.record.id, key: props.record.key, name: state.name, description: state.description, isEnabled: state.isEnabled }).unwrap()`.
  - [x] In `deleteCategoryHandler`, call `deleteCategory(+props.record.id).unwrap()`.

### Migrate Budgets.tsx (categories consumer)

- [x] Replace `fetchCategories` in `Budgets.tsx` with RTK Query. (AC: 3, 4, 5)
  - [x] Replace `import { fetchCategories } from "../store/categories/categories-actions"` with `import { useGetCategoriesQuery } from "../store/categories/categories-api"`.
  - [x] Remove the `dispatch(fetchCategories("ALL"))` + `categoriesLastUpdate` pattern.
  - [x] Add `const { data: categories = [] } = useGetCategoriesQuery("ALL");` for the category selector in the budgets form.
  - [x] Replace any remaining `state.categories.items` selectors within the file.
- [x] Replace the category selector in `Budgets/BudgetEditForm.tsx` with RTK Query before removing the category slice. (AC: 3, 4, 5)
  - [x] Import `useGetCategoriesQuery` from `../../store/categories/categories-api`.
  - [x] Remove `useAppSelector(state => state.categories?.items || [])`.
  - [x] Add `const { data: allCategories = [] } = useGetCategoriesQuery("ALL");`.
  - [x] Keep budget-specific Redux selectors and budget mutations unchanged; budget data ownership moves in Story 7.4c.

### Migrate shared consumers outside Accounts/Categories pages

- [x] Migrate `Transactions.tsx` to RTK Query for account/category source data. (AC: 4, 5)
  - [x] Replace `useAppSelector(state => state.accounts.items)` with `useGetAccountsQuery("ALL")`.
  - [x] Replace `useAppSelector(state => state.categories.items)` with `useGetCategoriesQuery("ALL")`.
  - [x] Keep `state.transactions.filter` selector (belongs to transactions UI state, not this migration).
- [x] Migrate `Transactions/TransactionSummary.tsx` from the retained accounts summary thunk to RTK Query. (AC: 2, 5)
  - [x] Replace `fetchTransactionsSummaryForAccounts(accountIds)` with `useGetAccountsSummaryQuery(accountIds, { skip: accountIds.length === 0 })`.
  - [x] Remove `useAppSelector(state => state.transactions.summaryItems)` from this component; derive `accountsDetails` from the query result: `const accountsDetails = data ?? []`.
  - [x] Remove `useAppSelector(state => state.transactions.lastUpdate)` from this component; account mutations now invalidate `Account` tags and refetch summary data through RTK Query.
  - [x] After this migration, remove `summaryItems`, `setTransactionsSummaryForAccounts`, `lastUpdate`, and `setLastUpdate` from `transactions-slice.ts` only if transaction mutation success paths invalidate `Account/SUMMARY` through `accountsApi.util.invalidateTags`.
  - [x] Delete `fetchTransactionsSummaryForAccounts` from `transactions-actions.ts` only after a stale-reference search confirms no imports remain.
- [x] Update the Story 7.4a transaction mutation success handlers if `TransactionSummary.tsx` is migrated off `lastUpdate`. (AC: 2, 5)
  - [x] In `TransactionCreate.tsx` and `TransactionEditForm.tsx`, replace the retained `transactionsActions.setLastUpdate()` summary refresh trigger with `dispatch(accountsApi.util.invalidateTags([{ type: "Account", id: "SUMMARY" }]))` after successful `.unwrap()` calls.
  - [x] Keep this invalidation limited to the summary tag; transaction mutations do not need to invalidate the account/category list tags.
- [x] Migrate `ReportCategory.tsx` category source to RTK Query. (AC: 4, 5)
  - [x] Replace `useAppSelector(state => state.categories.items)` with `useGetCategoriesQuery("ALL")`.
  - [x] Keep report-specific Redux state (`state.report.*`) unchanged in this story.

### Migrate App.tsx bootstrap

- [x] Remove global `fetchAccounts` and `fetchCategories` dispatches from `App.tsx`. (AC: 5)
  - [x] Remove `import { fetchAccounts } from './store/accounts/accounts-actions'`.
  - [x] Remove `import { fetchCategories } from './store/categories/categories-actions'`.
  - [x] Remove the `useEffect(() => { if (!accessToken) return; dispatch(fetchAccounts("ALL")); }, [accessToken])` block (currently around line 64).
  - [x] Remove the `useEffect(() => { if (!accessToken) return; dispatch(fetchCategories("ALL")); }, [accessToken])` block (currently around line 69).
  - [x] Components now fetch on mount via RTK Query (`Accounts.tsx`, `Categories.tsx`, `Budgets.tsx`, `Budgets/BudgetEditForm.tsx`, `Transactions.tsx`, `Transactions/TransactionSummary.tsx`, `ReportCategory.tsx`).
  - [x] If there is visible stale-data flash during testing, add `store.dispatch(accountsApi.endpoints.getAccounts.initiate('ALL'))` and `store.dispatch(categoriesApi.endpoints.getCategories.initiate('ALL'))` inside the auth-restore effect as prefetches — but try the simple removal first.

### Remove legacy files (only after all consumers verified)

- [x] After `npm run build` passes with zero TypeScript errors (confirming no remaining `state.accounts.*` or `state.categories.*` selectors or thunk imports): (AC: 1)
  - [x] Delete `src/store/accounts/accounts-actions.ts`.
  - [x] Remove `accountsSlice.reducer` from `store/index.ts` and delete `src/store/accounts/accounts-slice.ts`.
  - [x] Delete `src/store/categories/categories-actions.ts`.
  - [x] Remove `categoriesSlice.reducer` from `store/index.ts` and delete `src/store/categories/categories-slice.ts`.
  - [x] Confirm there are no remaining account/category selector dependencies in non-domain pages (`Transactions.tsx`, `Transactions/TransactionSummary.tsx`, `Budgets.tsx`, `Budgets/BudgetEditForm.tsx`, `ReportCategory.tsx`) before deleting legacy slices.
  - [x] Run a stale-reference search for `state.accounts`, `state.categories`, `fetchAccounts`, `fetchCategories`, `accountsActions`, and `categoriesActions`.
  - [x] Run a stale-reference search for the 7.4a retained account-summary thunk/slice fields: `fetchTransactionsSummaryForAccounts`, `summaryItems`, `setTransactionsSummaryForAccounts`, `state.transactions.lastUpdate`, and `setLastUpdate`.
  - [x] **Do NOT delete** until TypeScript confirms zero references — the compiler enforces this automatically.

### Tests

- [x] Write Vitest tests for `accounts-api.ts` following patterns from Story 7.4a. (AC: 6)
  - [x] `getAccounts` success: mock the backend wrapper `{ data: AccountResponse[] }`, assert the endpoint exposes `AccountResponse[]` after `transformResponse`, and assert `Account/LIST` tag provided.
  - [x] `getAccountsSummary` success: mock `{ data: AccountSummary[] }`, assert the endpoint exposes `AccountSummary[]`, and assert `Account/SUMMARY` plus per-account tags are provided.
  - [x] `createAccount` success: assert `Account/LIST` tag invalidated.
  - [x] `updateAccount` success: assert `Account/{id}` and `Account/LIST` tags invalidated.
  - [x] `deleteAccount` success: assert `Account/{id}` and `Account/LIST` tags invalidated.
  - [x] `getAccounts` error: mock API failure, assert error state returned (no crash, error shape matches 7.4a pattern).
- [x] Write Vitest tests for `categories-api.ts` following same patterns. (AC: 6)
  - [x] `getCategories` success: mock the backend wrapper `{ data: CategoryResponse[] }`, assert the endpoint exposes `CategoryResponse[]` after `transformResponse`, and assert `Category/LIST` tag provided.
  - [x] `createCategory` success: assert `Category/LIST` tag invalidated.
  - [x] `updateCategory` success: assert payload includes the record's existing `key`; assert `Category/{id}` and `Category/LIST` tags invalidated.
  - [x] `deleteCategory` success: assert `Category/{id}` and `Category/LIST` tags invalidated.
  - [x] `getCategories` error: assert error state returned.

### Build and lint

- [x] `npm run build` from `inex/ClientApp/` — zero TypeScript errors, no new chunk-size warnings. (AC: 6)
- [x] `npm run lint` from `inex/ClientApp/` — no new lint errors; no `any` introduced. (AC: 6)
- [x] `npm test` — all tests pass including new RTK Query endpoint tests. (AC: 6)

## Dev Notes

### Validation Snapshot (May 30, 2026)

Codebase checks in this repository currently show:

- `src/store/axiosBaseQuery.ts` is **absent**.
- `src/store/transactions/transactions-api.ts` is **absent**.
- `vite.config.ts` has no Vitest `test` block and `package.json` has no `test` script/deps.

Implication: Story 7.4b remains `ready-for-dev`, but execution must enforce the prerequisite STOP checks above. Starting 7.4b without 7.4a (and without 7.3 for AC6) will produce broken imports and unverifiable testing ACs.

### Hard Dependency on Story 7.4a — DO NOT START Without It

Story 7.4b builds directly on Story 7.4a's foundation and must treat these as required preconditions:

| 7.4a Deliverable                             | Required By 7.4b                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/store/axiosBaseQuery.ts`                | Both `createApi` calls import it                                               |
| `src/store/transactions/transactions-api.ts` | Confirms 7.4a pattern exists and should be extended, not reinvented            |
| `store/index.ts` middleware chain            | 7.4b chains `.concat(accountsApi.middleware, categoriesApi.middleware)` on top |
| RTK Query import paths confirmed             | 7.4b reuses the same pattern without re-deriving it                            |
| Test patterns for RTK Query endpoints        | 7.4b copies the same mock/assertion structure                                  |

If 7.4a is incomplete, creating `accounts-api.ts`/`categories-api.ts` in isolation means imports are unresolved and auth behavior is undefined.

### Existing Accounts Slice — Complete Inventory

**`src/store/accounts/accounts-actions.ts`**

- `fetchAccounts(mode: string)` → `GET /api/accounts?mode=${mode}`
- `createAccount(key, name, description, currencyId, isEnabled)` → `POST /api/accounts`
- `updateAccount(id, key, name, description, currencyId, isEnabled)` → `PUT /api/accounts/${id}`
- `deleteAccount(id)` → `DELETE /api/accounts/${id}`

**`src/store/accounts/accounts-slice.ts`**

- State: `{ items: AccountDetails[]; isLoading: boolean; isCreating: boolean; isUpdating: boolean; lastUpdate: string; error: string | null }`
- The `lastUpdate` field is the trigger: mutations dispatch `setLastUpdate()`, consumers `useEffect([lastUpdate])` and re-dispatch `fetchAccounts`

**Status toggle**: There is **no dedicated toggle endpoint or thunk** for account status. `isEnabled` is a field on the standard `updateAccount` payload. The `AccountEditForm` uses a `Radio.Group` for `isEnabled` inside the same form as name/currency. RTK migration must NOT create a separate status-toggle mutation — one `updateAccount` mutation covers everything.

### Existing Categories Slice — Complete Inventory

**`src/store/categories/categories-actions.ts`**

- `fetchCategories(mode: string)` → `GET /api/categories?mode=${mode}`
- `createCategory(key, name, description, isEnabled, parentId?)` → `POST /api/categories`
- `updateCategory(id, name, description, isEnabled)` → `PUT /api/categories/${id}`
  - Current frontend thunk omits `key`, but the current backend `UpdateCategoryRequest : CreateCategoryRequest` and `CategoryUpdateValidator` include `CategoryCreateValidator`, which requires `key`. The RTK Query `updateCategory` mutation must include the existing immutable key from `props.record.key` in its request body: `{ id, key, name, description, isEnabled }`.
  - Do not add a category-key input to the edit form. `CategoryMapper.ApplyTo` does not update `Key`; this story passes the existing key only to satisfy validation.
- `deleteCategory(id)` → `DELETE /api/categories/${id}`

**`src/store/categories/categories-slice.ts`**

- Identical `lastUpdate` trigger pattern as accounts.

**Status toggle**: Same as accounts — `isEnabled` is part of `updateCategory`. The `CategoryEditForm` uses `Radio.Group` for `isEnabled` inline with name/description. One `updateCategory` mutation covers everything including status changes.

### `mode` Query Argument

Both `getAccounts` and `getCategories` accept a `mode: string` argument corresponding to the `?mode=` backend query parameter. All current call sites pass `"ALL"`. This becomes the RTK Query cache key discriminator:

```
cache key for getAccounts("ALL"):
  { reducerPath: 'accountsApi', endpointName: 'getAccounts', originalArgs: 'ALL' }
```

Never hard-code `mode` inside the endpoint URL string — keep it as a parameter so the cache correctly separates hypothetical future calls with different mode values.

### Backend Response Wrappers and Frontend Types

`GET /api/accounts?mode={mode}`, `GET /api/accounts/details?...`, and `GET /api/categories?mode={mode}` return the backend list wrapper shape `{ data: [...] }`. The RTK Query hooks used by pages/forms must expose arrays directly (`AccountResponse[]`, `AccountSummary[]`, `CategoryResponse[]`) via `transformResponse`; otherwise instructions such as `const { data: accounts = [] } = useGetAccountsQuery("ALL")` will bind `accounts` to the wrapper object and filters/tables will fail.

Do not type account list data as the existing `AccountDetails` class. It currently declares only `currency` beyond the base fields and does not declare `isEnabled` or `currencyId`, both of which are used by this migration. Export `AccountResponse` from `accounts-api.ts` and use it for accounts page/table/form record typing. `CategoryResponse` can mirror `CategoryDetails` closely, but define it explicitly in `categories-api.ts` so the API slice owns its contract shape.

### Cache Tag Strategy (Full Detail)

**Accounts tag design:**

```typescript
tagTypes: ['Account']

// LIST query: provides both LIST sentinel and per-item tags
getAccounts.providesTags: (result) =>
  result
    ? [
        ...result.map(({ id }) => ({ type: 'Account' as const, id })),
        { type: 'Account', id: 'LIST' },
      ]
    : [{ type: 'Account', id: 'LIST' }]

// Create: only LIST needs invalidation (new item has no id yet)
createAccount.invalidatesTags: [{ type: 'Account', id: 'LIST' }]

// Update: invalidate the specific item AND LIST (in case name/currency affects grouping)
updateAccount.invalidatesTags: (result, error, { id }) => [
  { type: 'Account' as const, id },
  { type: 'Account', id: 'LIST' },
]

// Delete: invalidate the specific item AND LIST
deleteAccount.invalidatesTags: (result, error, id) => [
  { type: 'Account' as const, id },
  { type: 'Account', id: 'LIST' },
]
```

**Categories tag design**: Identical pattern with `'Category'` type.

### Cross-Domain Invalidation

Accounts and categories are independent list domains. Neither set of account/category CRUD mutations should invalidate the other's list cache:

- `createAccount` does NOT invalidate `Category` tags.
- `deleteCategory` does NOT invalidate `Account` tags.

One exception is required for the account summary endpoint used by `TransactionSummary.tsx`: transaction create/update/delete changes the server-computed account balances returned by `/accounts/details`. If this story migrates `TransactionSummary.tsx` to `useGetAccountsSummaryQuery`, the 7.4a transaction mutation success handlers must invalidate `{ type: "Account", id: "SUMMARY" }` via `accountsApi.util.invalidateTags(...)` after successful `.unwrap()` calls. Do not invalidate the account list for ordinary transaction mutations; list membership and account names do not change.

### Status Toggle is Standard Update — Not a Special Mutation

Both `AccountEditForm` and `CategoryEditForm` use a `Radio.Group` for `isEnabled` within the same edit form as name/description. The backend `PUT /accounts/{id}` and `PUT /categories/{id}` both accept the full payload including `isEnabled`. There is no `PATCH /accounts/{id}/toggle` or similar endpoint. RTK Query's `updateAccount` mutation already handles status changes because `isEnabled` is in the payload. Do not create a separate `toggleAccountStatus` mutation — it would be redundant and would drift from the backend contract.

### `CategoryCreateForm` — Critical Cross-Component State Migration

`CategoryCreateForm.tsx` currently reads from Redux store for the parent category dropdown:

```typescript
// BEFORE (Redux selector):
const allCategories = useAppSelector((state) => state.categories.items);
```

After migration:

```typescript
// AFTER (RTK Query):
const { data: allCategories = [] } = useGetCategoriesQuery("ALL");
```

RTK Query deduplicates requests by cache key. If `Categories.tsx` is already mounted and has fetched `getCategories("ALL")`, the `CategoryCreateForm` query hits the cache and does not issue a second network call. This is the intended behavior.

### All `fetchCategories("ALL")` Call Sites

Three files currently dispatch `fetchCategories("ALL")` and must all be migrated:

| File                       | Line | Usage                                       |
| -------------------------- | ---- | ------------------------------------------- |
| `src/App.tsx`              | ~69  | Global bootstrap on session restore         |
| `src/pages/Categories.tsx` | ~33  | Re-fetches on `categoriesLastUpdate` change |
| `src/pages/Budgets.tsx`    | ~86  | Category selector in budget edit form       |

### Additional category/account selector consumers that must be migrated before App bootstrap removal

- `src/pages/Transactions.tsx` reads `state.accounts.items` and `state.categories.items` for drawer/filter inputs.
- `src/pages/Reports/ReportCategory.tsx` reads `state.categories.items` to build active category report rows.

If these are not moved to RTK Query hooks, removing global bootstrap dispatches in `App.tsx` leaves those views with empty account/category data after refresh.

Failing to migrate any one of them means the old `categories-slice.ts` cannot be safely removed and the story is incomplete.

### All `fetchAccounts("ALL")` Call Sites

Two files:

| File                     | Line | Usage                                     |
| ------------------------ | ---- | ----------------------------------------- |
| `src/App.tsx`            | ~64  | Global bootstrap on session restore       |
| `src/pages/Accounts.tsx` | ~30  | Re-fetches on `accountsLastUpdate` change |

### `App.tsx` Bootstrap Approach

The current `App.tsx` eagerly loads accounts and categories in `useEffect` blocks that fire when `accessToken` becomes non-null. After migration, these dispatches are removed. RTK Query will fetch on first component mount. This is sufficient because:

- The Accounts page loads `Accounts.tsx` which calls `useGetAccountsQuery` on mount.
- The Categories page loads `Categories.tsx` which calls `useGetCategoriesQuery` on mount.
- `CategoryCreateForm` (which also needs categories) is rendered inside a drawer, only when the user opens it — RTK Query will fetch if not cached.
- `Budgets.tsx` calls `useGetCategoriesQuery` on mount.

**If a visible loading state flash occurs** during testing (e.g., a transaction create form opens before the user has visited the Accounts page and shows empty account dropdown briefly), add `store.dispatch(accountsApi.endpoints.getAccounts.initiate('ALL'))` inside the `accessToken` effect as a prefetch. Implement the simple removal first.

### Legacy Slice Cleanup Gate

TypeScript is the safety net: as long as any component references `state.accounts.items`, `state.accounts.isCreating`, `state.categories.lastUpdate`, etc., removing the corresponding slice from the store will cause a compilation error. Use `npm run build` as the verification gate — zero errors means all consumers have been migrated and the slice can be removed.

### RTK Query Version Compatibility

`package.json` has `"@reduxjs/toolkit": "^1.7.1"`. RTK Query is bundled with RTK since 1.6.0. Story 7.4a may have upgraded to RTK 2.x (requires `react-redux` 8+) — check the installed version:

```
node_modules/@reduxjs/toolkit/package.json  →  "version"
```

**RTK 1.x** (if 7.4a stayed on 1.x):

```typescript
// store/index.ts
const store = configureStore({
  reducer: { ... },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(transactionsApi.middleware, accountsApi.middleware, categoriesApi.middleware),
});
```

**RTK 2.x** (if 7.4a upgraded):
Same syntax — the `getDefaultMiddleware()` callback pattern is identical in 2.x.

Do not deviate from whatever pattern 7.4a established.

### No Backend Changes Required

This is a purely frontend story. The existing backend endpoints are unchanged:

- `GET /api/accounts?mode={mode}` — already handles `"ALL"` mode
- `POST /api/accounts`, `PUT /api/accounts/{id}`, `DELETE /api/accounts/{id}` — unchanged
- `GET /api/categories?mode={mode}` — already handles `"ALL"` mode
- `POST /api/categories`, `PUT /api/categories/{id}`, `DELETE /api/categories/{id}` — unchanged

### Project Structure Notes

- New files created: `src/store/accounts/accounts-api.ts`, `src/store/categories/categories-api.ts`
- Modified files: `src/store/index.ts`, `src/App.tsx`, account/category pages and forms, `src/pages/Budgets.tsx`, `src/pages/Budgets/BudgetEditForm.tsx`, `src/pages/Transactions.tsx`, `src/pages/Transactions/TransactionSummary.tsx`, `src/pages/Transactions/TransactionCreate.tsx`, `src/pages/Transactions/TransactionEditForm.tsx`, and `src/pages/Reports/ReportCategory.tsx`
- Deleted files (end of story): `accounts-actions.ts`, `accounts-slice.ts`, `categories-actions.ts`, `categories-slice.ts`
- File naming convention `{domain}-api.ts` follows the pattern established by Story 7.4a (`transactions-api.ts`)
- API files sit inside existing domain folders; test files may add `__tests__/` folders under `src/store/accounts/` and `src/store/categories/` if that is the pattern established by Story 7.4a.

### Testing Standards

Vitest is introduced in Story 7.3. Story 7.4a established the RTK Query test pattern. Adopt it exactly for accounts and categories. Key principles:

- Mock `axiosBaseQuery` at the module level to return controlled data
- Create a test store with `configureStore` including the API reducers and middleware
- Assert cache state via `store.getState()[accountsApi.reducerPath]`
- Use `setupListeners(store.dispatch)` if testing re-fetch-on-focus/reconnect behavior (optional for this story)
- Test both happy path and API failure (mock returning `{ error: { status: 500, data: { ... } } }`)

### References

- [Source: docs/planning/epics.md#Story 7.4b] — Acceptance criteria and Epic 7 context
- [Source: inex/ClientApp/src/store/accounts/accounts-actions.ts] — Current accounts thunks (full CRUD inventory)
- [Source: inex/ClientApp/src/store/accounts/accounts-slice.ts] — Current accounts Redux slice and lastUpdate trigger
- [Source: inex/ClientApp/src/store/categories/categories-actions.ts] — Current categories thunks (note: updateCategory omits `key`)
- [Source: inex/ClientApp/src/store/categories/categories-slice.ts] — Current categories Redux slice
- [Source: inex/ClientApp/src/store/index.ts] — Store config — must receive new API reducers and middleware
- [Source: inex/ClientApp/src/utils/apiClient.ts] — Axios instance with JWT attach + refresh retry — axiosBaseQuery wraps this
- [Source: inex/ClientApp/src/App.tsx#lines 60-75] — Bootstrap fetch dispatches to be removed
- [Source: inex/ClientApp/src/pages/Accounts.tsx] — Primary accounts consumer (lastUpdate pattern)
- [Source: inex/ClientApp/src/pages/Accounts/AccountCreateForm.tsx] — Create form; keeps apiClient for currencies
- [Source: inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx] — Edit form; keeps apiClient for currencies
- [Source: inex/ClientApp/src/pages/Categories.tsx] — Primary categories consumer
- [Source: inex/ClientApp/src/pages/Categories/CategoryCreateForm.tsx] — Critical: reads state.categories.items for parent dropdown
- [Source: inex/ClientApp/src/pages/Categories/CategoryEditForm.tsx] — Edit/delete form
- [Source: inex/ClientApp/src/pages/Budgets.tsx#line 86] — Third fetchCategories call site
- [Source: inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx] — Reads `state.categories.items` for edit category selector
- [Source: inex/ClientApp/src/pages/Transactions.tsx] — Reads `state.accounts.items` and `state.categories.items` for transaction UI
- [Source: inex/ClientApp/src/pages/Transactions/TransactionSummary.tsx] — Uses retained `/accounts/details` thunk and `state.transactions.summaryItems`
- [Source: inex/ClientApp/src/pages/Reports/ReportCategory.tsx] — Reads `state.categories.items` for report data projection
- [Source: inex.Services/Validators/Category/CategoryUpdateValidator.cs] — Includes `CategoryCreateValidator`; `key` remains required for update payload validation
- [Source: inex.Services/Models/Mappers/CategoryMapper.cs] — `ApplyTo` updates name/description/isEnabled only; category key is passed for validation, not edited
- [Source: inex/ClientApp/package.json] — `@reduxjs/toolkit ^1.7.1`, `react-redux ^7.2.6`
- [Source: docs/project-context.md] — TypeScript strict no-any, apiClient rule, Redux slice patterns

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5

### Debug Log References

- 2026-06-02: Verified 7.4a foundation (`axiosBaseQuery.ts`, `transactions-api.ts`, store middleware) and Story 7.3 frontend test infrastructure. Installed RTK version is 1.9.7.
- 2026-06-02: Initial non-escalated `npm run build` passed TypeScript but failed Vite output cleanup with `EPERM`; escalated reruns completed successfully.
- 2026-06-02: Stale-reference searches for account/category Redux selectors/thunks and retained transaction summary thunk/slice fields returned no matches after cleanup.
- 2026-06-02: Final integration centralized account summary invalidation in `transactionsApi`; transaction form components no longer dispatch account cache invalidation directly.

### Completion Notes List

- Implemented `accountsApi` and `categoriesApi` RTK Query slices with list-wrapper transforms, list/item/summary tags, CRUD mutations, and generated hooks.
- Migrated account/category pages, forms, budget category consumers, transaction account/category consumers, transaction account summary, and category report consumers from legacy Redux account/category state to RTK Query hooks.
- Removed `App.tsx` account/category bootstrap dispatches; account/category data now loads from component-owned RTK Query hooks.
- Replaced legacy transaction summary refresh triggers with RTK Query account summary invalidation; final integration moved that invalidation from transaction form components into `transactionsApi` mutation lifecycle handlers.
- Removed legacy account/category actions and slices, obsolete category slice test, and obsolete transaction summary thunk/slice fields after TypeScript build gate passed.
- Added Vitest endpoint tests for account/category success transforms, mutation invalidation/refetch behavior, update payload key coverage, and API error state.

### File List

- inex/ClientApp/src/App.tsx
- inex/ClientApp/src/pages/Accounts.tsx
- inex/ClientApp/src/pages/Accounts/AccountCreateForm.tsx
- inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx
- inex/ClientApp/src/pages/Budgets.tsx
- inex/ClientApp/src/pages/Budgets/BudgetEditForm.tsx
- inex/ClientApp/src/pages/Categories.tsx
- inex/ClientApp/src/pages/Categories/CategoryCreateForm.tsx
- inex/ClientApp/src/pages/Categories/CategoryEditForm.tsx
- inex/ClientApp/src/pages/Reports/ReportCategory.tsx
- inex/ClientApp/src/pages/Transactions.tsx
- inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx
- inex/ClientApp/src/pages/Transactions/TransactionEditForm.tsx
- inex/ClientApp/src/pages/Transactions/TransactionList.tsx
- inex/ClientApp/src/pages/Transactions/TransactionSummary.tsx
- inex/ClientApp/src/store/accounts/__tests__/accounts-api.test.ts
- inex/ClientApp/src/store/accounts/accounts-actions.ts (deleted)
- inex/ClientApp/src/store/accounts/accounts-api.ts
- inex/ClientApp/src/store/accounts/accounts-slice.ts (deleted)
- inex/ClientApp/src/store/categories/__tests__/categories-api.test.ts
- inex/ClientApp/src/store/categories/categories-actions.ts (deleted)
- inex/ClientApp/src/store/categories/categories-api.ts
- inex/ClientApp/src/store/categories/categories-slice.test.ts (deleted)
- inex/ClientApp/src/store/categories/categories-slice.ts (deleted)
- inex/ClientApp/src/store/hooks.ts
- inex/ClientApp/src/store/index.ts
- inex/ClientApp/src/store/transactions/transactions-actions.ts (deleted)
- inex/ClientApp/src/store/transactions/transactions-slice.ts
- docs/implementation/7-4b-frontend-rtk-query-accounts-categories.md
- docs/implementation/sprint-status.yaml

### Change Log

- 2026-06-02: Migrated accounts/categories frontend data ownership to RTK Query, removed legacy slices/actions, added endpoint tests, and marked story ready for review.
- 2026-06-02: Integrated final review cleanup by centralizing transaction-driven account summary invalidation in the RTK API layer.
