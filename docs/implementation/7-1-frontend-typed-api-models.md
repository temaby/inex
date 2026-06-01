# Story 7.1: Frontend — Typed API Models, Eliminate `any` in Core Flows

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a frontend developer,
I want API response shapes and Redux payloads typed explicitly,
So that TypeScript catches contract drift and wiring mistakes before runtime.

## Acceptance Criteria

1. **Given** the transaction list, transaction slice, and transaction actions currently use `any` extensively **When** this story is complete **Then** `transactions-slice.ts`, `transactions-actions.ts`, and `TransactionList.tsx` use explicit types for all API payloads, state shapes, and component props.

2. **Given** the shared API model types **When** created **Then** they live under `inex/ClientApp/src/model/` following the existing domain folder structure and mirror the backend `*Response` / `*Request` naming convention.

3. **Given** `Dropdown.tsx` and `AutoComplete.tsx` currently use `any` for option props **When** this story is complete **Then** both components are typed with explicit option interfaces.

4. **Given** the change is applied **When** `npm run build` and `npm run lint` complete **Then** both pass; no new `any` usages are introduced in touched files.

5. **Given** future new files in cleaned areas **When** `@typescript-eslint/no-explicit-any` is enabled for those paths **Then** the lint rule is configured (warn or error) for at minimum `store/transactions/` and `components/` directories.

## Tasks / Subtasks

### Task 1 — Create new model files (AC: 1, 2)

- [ ] Create `inex/ClientApp/src/model/Transaction/TransactionResponse.ts` mirroring the backend `TransactionResponse` record. (AC: 1, 2)
  - [ ] Define and export `interface TransactionResponse` with fields: `id: number`, `accountId: number`, `categoryId: number`, `created: string`, `amount: number`, `comment: string | null`, `tags: string[]`, `refs: string[]`, `accountCurrency: string`.
  - [ ] Use an `interface`, not a class — follow the pattern already used by `CategoryDetails`, `BudgetDetails`, etc.

- [ ] Create `inex/ClientApp/src/model/Transaction/TransactionFilterState.ts`. (AC: 1)
  - [ ] Define and export `interface TransactionFilterState` with fields: `accountIds: number[]`, `categoryIds: number[]`, `tags: string[]`, `refs: string[]`, `tagsAndRefs: string`, `range: number[]`.
  - [ ] This interface captures the shape already in `defaultFilter` in `transactions-slice.ts`; exporting it lets actions and other consumers reference it by name instead of using `any`.

- [ ] Create `inex/ClientApp/src/model/Account/AccountSummary.ts` mirroring the backend `AccountSummary` record. (AC: 1, 2)
  - [ ] Define and export `interface AccountSummary` with fields: `id: number`, `key: string`, `name: string`, `description: string | null`, `isEnabled: boolean`, `currencyId: number`, `currency: string`, `value: number`, `thisMonthNet: number`.
  - [ ] This is the shape returned by `GET /api/accounts/details` and stored in `transactions.summaryItems`.

### Task 2 — Type `transactions-slice.ts` (AC: 1)

- [ ] Import `PayloadAction` from `@reduxjs/toolkit`, `TransactionResponse` from `../../model/Transaction/TransactionResponse`, `TransactionFilterState` from `../../model/Transaction/TransactionFilterState`, and `AccountSummary` from `../../model/Account/AccountSummary`. (AC: 1)

- [ ] Change `items: [] as any[]` to `items: [] as TransactionResponse[]` in `initialState`. (AC: 1)

- [ ] Change `summaryItems: [] as any[]` to `summaryItems: [] as AccountSummary[]` in `initialState`. (AC: 1)

- [ ] Add explicit `PayloadAction<T>` types to reducer action parameters where `T` can be inferred, for every reducer that receives a payload. Examples: (AC: 1)
  - `setTransactions(state, action: PayloadAction<{ items: TransactionResponse[] }>)`
  - `setTotal(state, action: PayloadAction<{ total: number }>)`
  - `setIsLoading(state, action: PayloadAction<{ isLoading: boolean }>)`
  - `setIsCreating(state, action: PayloadAction<{ isCreating: boolean }>)`
  - `setIsDeleting(state, action: PayloadAction<{ isDeleting: boolean }>)`
  - `setIsUpdating(state, action: PayloadAction<{ isUpdating: boolean }>)`
  - `setTransactionsSummaryForAccounts(state, action: PayloadAction<{ items: AccountSummary[] }>)`
  - `setFilter(state, action: PayloadAction<{ filter: TransactionFilterState }>)`
  - `setError(state, action: PayloadAction<{ error: string | null }>)`
  - Reducers with no payload (`setLastUpdate`, `resetFilter`) require no change.

- [ ] Export `TransactionFilterState` re-export or simply rely on the model import — no re-export needed from the slice file, callers import from model directly. (AC: 1)

### Task 3 — Type `transactions-actions.ts` (AC: 1)

- [ ] Import `TransactionFilterState` from `../../model/Transaction/TransactionFilterState`. (AC: 1)

- [ ] Replace `filter: any` with `filter: TransactionFilterState` in the `fetchTransactions` function signature. (AC: 1)

- [ ] In `fetchTransactions`, type-assert the Axios response from the transactions list endpoint: `const { data } = await apiClient.get<{ data: TransactionResponse[]; metadata: { totalItems: number } }>(...)`. (AC: 1)
  - Import `TransactionResponse` from `../../model/Transaction/TransactionResponse`.
  - Axios supports `apiClient.get<T>(url)` to type the response `data` field.
  - Keep the existing query contract unchanged in this story: `mode`, `pageSize`, `pageNumber`, and `filter` string DSL. Do **not** switch to typed query params or `URLSearchParams` here (that is covered by Story 4.2 / Story 7.4a).

- [ ] In `fetchTransactionsSummaryForAccounts`, type the Axios response: `const { data } = await apiClient.get<{ data: AccountSummary[] }>(...)`. (AC: 1)
  - Import `AccountSummary` from `../../model/Account/AccountSummary`.

### Task 4 — Type `TransactionList.tsx` (AC: 1)

- [ ] Define `TransactionListProps` interface at the top of the file (or co-located just above the component). (AC: 1)
  - Fields: `accounts: AccountDetails[]`, `categories: CategoryDetails[]`.
  - **Add import for `AccountDetails`** — it is NOT currently imported: `import { AccountDetails } from '../../model/Account/AccountDetails'`.
  - `CategoryDetails` is already imported from `../../model/Category/CategoryDetails` — no change needed for that one.
  - Replace `(props: any)` with `(props: TransactionListProps)`.

- [ ] Define `TransactionDateHeader` interface locally at the top of the file. (AC: 1)

  ```typescript
  interface TransactionDateHeader {
    _isDateHeader: true;
    _date: string;
    id: string;
  }
  type TransactionRow = TransactionResponse | TransactionDateHeader;
  const isDateHeader = (record: TransactionRow): record is TransactionDateHeader =>
      "_isDateHeader" in record;
  ```

  - Import `TransactionResponse` from `../../model/Transaction/TransactionResponse`.

  > **⚠️ Critical: discriminated union type guard.** With `strict: true`, TypeScript does NOT allow direct property access on `record._isDateHeader` when `_isDateHeader` is absent from `TransactionResponse`. **Every occurrence of `if (record._isDateHeader)` in the file must be replaced with `if (isDateHeader(record))` or the equivalent `'_isDateHeader' in record` guard** — including in `dataSource.map`, the desktop column `render` functions, `onRow`, `rowExpandable`, and `renderDateHeader`. Using the direct property form will produce a TypeScript error: _"Property '\_isDateHeader' does not exist on type 'TransactionResponse'"_.

- [ ] Replace `const [mobileEditRecord, setMobileEditRecord] = useState<any>(null)` with `useState<TransactionResponse | null>(null)`. (AC: 1)

- [ ] Replace `const result: any[] = []` in the `dataSource` useMemo with `const result: TransactionRow[] = []`. (AC: 1)

- [ ] Change the columns definition to `TableColumnsType<TransactionRow>`. (AC: 1)
  - Replace `const columns: TableColumnsType<any>` with `const columns: TableColumnsType<TransactionRow>`.

- [ ] Replace `record: any` in all `render` lambdas and helper functions with typed alternatives. (AC: 1)
  - Column `render` functions: `render: (value, record: any)` → `render: (value, record: TransactionRow)`.
  - `renderDateHeader(record: any)` → `renderDateHeader(record: TransactionDateHeader)`. Called only after `'_isDateHeader' in record` narrowing, so the precise type can be used.

- [ ] Correct helper signatures that read transaction-only fields. (AC: 1)
  - `getAmountDisplay` must accept `TransactionResponse`, not `TransactionRow`; it reads `accountId` and `amount`, which date-header rows do not have.
  - `renderNotes` must accept `TransactionResponse`, not `TransactionRow`; it reads `tags`, `refs`, and `comment`, which date-header rows do not have.
  - Call these helpers only after `isDateHeader(record)` has narrowed the row to `TransactionResponse`.
  - Change `rowExpandHandler(expanded: boolean, record: any)` to `rowExpandHandler(expanded: boolean, record: TransactionRow)`. If the row is a date header, clear expanded rows and return; otherwise use `record.id.toString()`.
  - For render placeholder values, use `unknown` instead of `any` (for example, `render: (_value: unknown, record: TransactionRow) => ...`).

- [ ] Replace `(a: any)` in `.find((a: any) => ...)` calls with `(a: AccountDetails)`. (AC: 1)
  - Two occurrences: in `getAmountDisplay` (`props.accounts.find((a: any) => a.id === record.accountId)`) and in the mobile card render lambda (`props.accounts.find((a: any) => a.id === record.accountId)`).
  - `AccountDetails` import is already added above — no second import needed.

- [ ] Replace inline `any` casts for tags/refs in `renderNotes`: `record.tags?.map((tag: any)` → `record.tags?.map((tag: string)` and `record.refs?.map((ref: any)` → `record.refs?.map((ref: string)`. (AC: 1)

- [ ] Replace the `rowKey` prop cast: `rowKey={(record: any) => record.id.toString()}` → `rowKey={(record: TransactionRow) => record.id.toString()}`. (AC: 1)

- [ ] Replace `expandedRowRender` and fix the narrowing for `TransactionEditForm`. (AC: 1)

  ```typescript
  const expandedRowRender = (record: TransactionRow) => {
    if (isDateHeader(record)) return null;
    return <TransactionEditForm record={record} accounts={props.accounts} categories={props.categories} />;
  };
  ```

  `TransactionEditForm.record` expects a real transaction row, not a synthetic date header. The type guard narrows `record` to `TransactionResponse` inside the else branch, making the JSX prop assignment type-safe.

- [ ] Fix `rowExpandable` and `onRow` callbacks. (AC: 1)
  - Use the local `isDateHeader(record)` guard for both callbacks.
  - `rowExpandable: (record) => !record._isDateHeader` → `rowExpandable: (record) => !isDateHeader(record)`
  - `onRow={(record) => ({ style: record._isDateHeader ? ... })}` → `onRow={(record) => ({ style: isDateHeader(record) ? ... })}`

### Task 5 — Type `Dropdown.tsx` (AC: 3)

- [ ] Define and use `DropdownItem` and `DropdownProps` interfaces above the component. (AC: 3)

  ```typescript
  import type { MenuProps } from 'antd';

  interface DropdownItem {
    id: number | string;
    name: string;
    children?: DropdownItem[];
  }

  interface DropdownProps {
    id: string;
    items: DropdownItem[];
    selection?: DropdownItem[];
    placeholder?: string;
    multiple?: boolean;
    onChange?: NonNullable<MenuProps["onSelect"]>;
  }
  ```

  - Replace `(props: any)` with `(props: DropdownProps)`.
  - Type the menu structure as `const menuItems: MenuProps["items"] = [...]`.
  - Do not narrow `onChange` to only `{ key: string }`. Existing category handlers read `item.keyPath`; `MenuProps["onSelect"]` preserves the Ant Design event shape for both `onSelect` and `onDeselect`.
  - Replace `(item: any)` with `(item: DropdownItem)` and `(sub: any)` with `(sub: DropdownItem)`.
  - Replace `props.selection.map((item: any) => ...)` with `(item: DropdownItem) => ...`.

### Task 6 — Type `AutoComplete.tsx` (TagsComplete) (AC: 3)

- [ ] Define and use `TagsCompleteProps` interface above the component. (AC: 3)

  ```typescript
  interface TagsCompleteProps {
    tags: string[];
    refs: string[];
  }
  ```

  - Replace `(props: any)` with `(props: TagsCompleteProps)`.

- [ ] Fix the `useState` type: change `const [options, setOptions] = useState([])` to `useState<string[]>([])`. (AC: 3)
  - The current `useState([])` infers `never[]`, causing `setOptions` to reject any values.

- [ ] Replace `let searchOptions: any = []` with `let searchOptions: string[] = []`. (AC: 3)

### Task 7 — Install ESLint plugin and configure `no-explicit-any` rule (AC: 4, 5)

- [ ] Install `@typescript-eslint/eslint-plugin` matching the existing parser major version (currently `^5.8.0`). (AC: 5)
  - From `inex/ClientApp/`: `npm install --save-dev @typescript-eslint/eslint-plugin@^5.8.0`
  - The parser `@typescript-eslint/parser@^5.8.0` is already installed; both packages must share the same major version.
  - Commit both `package.json` and `package-lock.json`; `npm install` updates the lockfile and `npm ci` will fail if the manifest and lockfile drift.

- [ ] Add an `overrides` block in `inex/ClientApp/.eslintrc.json` targeting the two cleaned directories. (AC: 5)

  ```json
  "overrides": [
    {
      "files": [
        "src/store/transactions/**/*.ts",
        "src/store/transactions/**/*.tsx",
        "src/components/**/*.ts",
        "src/components/**/*.tsx"
      ],
      "rules": {
        "@typescript-eslint/no-explicit-any": "warn"
      }
    }
  ]
  ```

  - Level `"warn"` (not `"error"`) for now to avoid blocking the build while the rest of the codebase is not yet clean. Upgrade to `"error"` in a future story.

### Task 8 — Build and lint verification (AC: 4)

- [ ] From `inex/ClientApp/`: run `npm run build` — must complete with zero errors. (AC: 4)
  - The build script is `tsc --noEmit && vite build`. TypeScript strict mode is enabled (`"strict": true` in tsconfig.json), so type errors produce build failures.

- [ ] From `inex/ClientApp/`: run `npm run lint` — must complete with zero new errors or warnings beyond what existed before this story. (AC: 4, 5)
  - The lint script is `eslint ./src/**/*.ts ./src/**/*.tsx`.
  - Because the cleaned files will now have `no-explicit-any` active, any remaining `any` in those files will surface as warnings. All instances introduced above must be resolved before closing this story.

## Dev Notes

### Current State — Why These Files Have `any`

**`transactions-slice.ts`** (source: `inex/ClientApp/src/store/transactions/transactions-slice.ts`)

- `items: [] as any[]` — stores the API transaction list; no frontend model for the response shape exists yet.
- `summaryItems: [] as any[]` — stores account balance summaries; same issue.
- Reducer action parameters (`state, action`) are untyped — RTK doesn't enforce payload shape without explicit `PayloadAction<T>`.

**`transactions-actions.ts`** (source: `inex/ClientApp/src/store/transactions/transactions-actions.ts`)

- `filter: any` on `fetchTransactions` — the caller (TransactionList) passes the Redux filter state; no exported type exists for it.
- Axios `data` responses are untyped — `apiClient.get()` without a type argument returns `AxiosResponse<any>`.

**`TransactionList.tsx`** (source: `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`)

- `props: any` — receives `accounts` and `categories` from the parent `Transactions.tsx` but no props interface defined.
- `mobileEditRecord: any` — set on row click; no transaction type.
- `result: any[]` — mixed array of transactions and synthetic date header rows in `dataSource` useMemo.
- Column `render` lambdas use `record: any` — because `TableColumnsType<any>` is used.
- `.find((a: any) => ...)` and `.find((c: CategoryDetails) => ...)` — inconsistency; accounts aren't typed, categories are.
- Tags/refs items cast as `(tag: any)` and `(ref: any)` even though they are `string[]`.

**`Dropdown.tsx`** (source: `inex/ClientApp/src/components/Dropdown.tsx`)

- `props: any`, `item: any`, `sub: any` — entire component is structurally correct but fully untyped.

**`AutoComplete.tsx`** (TagsComplete component) (source: `inex/ClientApp/src/components/AutoComplete.tsx`)

- `props: any` — receives `tags: string[]` and `refs: string[]` but no interface.
- `useState([])` — infers `never[]`; `setOptions` cannot accept string values without type annotation.
- `let searchOptions: any = []` — should be `string[]`.

### The `model/` Folder — Current State

The `model/` directory already exists at `inex/ClientApp/src/model/` with these sub-folders:

| Folder               | Existing files                                                            |
| -------------------- | ------------------------------------------------------------------------- |
| `model/Account/`     | `AccountDetails.ts` (class extending `ItemDetails`)                       |
| `model/Base/`        | `ItemDetails.ts` (class: `id`, `key`, `name`, `description`)              |
| `model/Budget/`      | `BudgetDetails.ts` (interface), `BudgetEditState.ts` (class)              |
| `model/Category/`    | `CategoryDetails.ts` (interface + helpers), `CategoryEditState.ts`        |
| `model/Rate/`        | `DailyRateDetails.ts`, `RateDetails.ts`                                   |
| `model/Report/`      | `BudgetComparison.ts`, `BudgetReport.ts`, `ReportCategoryDetails.ts`      |
| `model/Transaction/` | `TransactionEditState.ts`, `TransactionSetState.ts`, `TransactionType.ts` |

**Naming convention in use:**

- Files with "State" suffix: local UI/form state (not API models)
- Files ending in "Details": frontend-specific display models (mix of class and interface)
- New API-mirror models introduced by this story: use `*Response` / `*Request` suffix, matching the backend convention exactly.

**Do NOT rename or restructure existing files** in `model/` — that is out of scope for this story. Only add the three new files.

### Backend `*Response` / `*Request` Naming — Reference

The backend types being mirrored live in `inex.Services/Models/Records/`:

| Backend record           | File                                 | Fields relevant to frontend                                                                                                                 |
| ------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `TransactionResponse`    | `Transaction/TransactionResponse.cs` | `id`, `accountId`, `categoryId`, `created` (DateTime→string), `amount`, `comment?`, `tags` (string[]), `refs` (string[]), `accountCurrency` |
| `AccountSummary`         | `Account/AccountSummary.cs`          | Extends `AccountResponse` extends `UpdateAccountRequest` extends `CreateAccountRequest`; adds `value`, `thisMonthNet`                       |
| `AccountResponse`        | `Account/AccountResponse.cs`         | Adds `currency` to `UpdateAccountRequest`                                                                                                   |
| `UpdateAccountRequest`   | `Account/UpdateAccountRequest.cs`    | Adds `id` to `CreateAccountRequest`                                                                                                         |
| `CreateAccountRequest`   | `Account/CreateAccountRequest.cs`    | `currencyId`, `key`, `name`, `description?`, `isEnabled`                                                                                    |
| `PaginationMetadata`     | `Data/PaginationMetadata.cs`         | `totalItems`, `perPage`, `currentPage`                                                                                                      |
| `PagedResponse<T,TMeta>` | `Data/PagedResponse.cs`              | `data: T[]`, `metadata: TMeta`                                                                                                              |

**Wire format**: `GET /api/transactions` returns:

```json
{
  "data": [
    {
      "id": 123,
      "accountId": 1,
      "categoryId": 5,
      "created": "2026-05-01T00:00:00",
      "amount": -42.5,
      "comment": "#groceries @refA buying things",
      "tags": ["groceries"],
      "refs": ["refA"],
      "accountCurrency": "USD"
    }
  ],
  "metadata": {
    "totalItems": 150,
    "perPage": 25,
    "currentPage": 1
  }
}
```

`created` is treated as `string` on the frontend because the backend sends JSON datetime text (`DateTime`), which may be date-only or full ISO datetime depending on serializer settings.

**Wire format**: `GET /api/accounts/details?mode=active&ids[0]=1` returns:

```json
{
  "data": [
    {
      "id": 1,
      "key": "acc-1",
      "name": "Checking",
      "description": null,
      "isEnabled": true,
      "currencyId": 1,
      "currency": "USD",
      "value": 1234.56,
      "thisMonthNet": -200.0
    }
  ]
}
```

### ESLint Configuration — Current State and Required Change

**Current** `inex/ClientApp/.eslintrc.json`:

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 6,
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"]
}
```

**Missing**: `@typescript-eslint/eslint-plugin` is NOT in `package.json` devDependencies (only `@typescript-eslint/parser` is present). The `plugins: ["@typescript-eslint"]` line without the actual plugin package installed does not currently produce rule violations; it's effectively a no-op. Installing the plugin and adding the `overrides` block is required for AC 5.

**After this story**, `inex/ClientApp/.eslintrc.json` must be:

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 6,
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "overrides": [
    {
      "files": [
        "src/store/transactions/**/*.ts",
        "src/store/transactions/**/*.tsx",
        "src/components/**/*.ts",
        "src/components/**/*.tsx"
      ],
      "rules": {
        "@typescript-eslint/no-explicit-any": "warn"
      }
    }
  ]
}
```

### TypeScript Conventions in This Codebase

- `tsconfig.json` has `"strict": true` — `noImplicitAny`, `strictNullChecks`, etc. are all active. The compiler would already reject implicit `any` in most positions but allows explicit `any` casts.
- Existing model files use **both** classes (`AccountDetails extends ItemDetails`) and interfaces (`CategoryDetails`, `BudgetDetails`). New files for this story should use **interfaces** — lighter weight, no runtime overhead, matches the trend in recent model additions.
- Use `interface` over `type` for object shapes (follows existing pattern).
- `PayloadAction<T>` is from `@reduxjs/toolkit` — already a dependency, no new install needed.
- Axios generic typing: `apiClient.get<ResponseType>(url)` types `response.data` as `ResponseType`. The `apiClient` is a standard Axios instance in `inex/ClientApp/src/utils/apiClient.ts`.

### `accounts-slice.ts` — Comparison: Already Typed Correctly

The `accounts` slice at `inex/ClientApp/src/store/accounts/accounts-slice.ts` is a pattern example:

```typescript
items: [] as AccountDetails[],
```

It uses `AccountDetails` from `model/Account/AccountDetails.ts`. The `transactions` slice should reach the same state after this story.

### Scope Boundary — What Is NOT in This Story

- **`TransactionSummary.tsx`** — uses `props: any` and `item: any` in its accumulation functions. It is deliberately excluded from this story's scope. The ACs specify `TransactionList.tsx`, not `TransactionSummary.tsx`.
- **Other domain slices** (`accounts-slice.ts`, `categories-slice.ts`, etc.) — already use typed models or have minor `any` not in the targeted paths. Cleaning other slices is not part of this story.
- **`TransactionEditForm.tsx`, `TransactionCreate*.tsx`, `TransactionFilterForm.tsx`** — not in scope. Typing these form components is left for a future story or Epic 10 UX work.
- **RTK Query migration** — belongs to Story 7.4a. Do NOT migrate the slice to RTK Query while implementing this story.
- **`@typescript-eslint/no-explicit-any` as `"error"` globally** — out of scope. Only the two targeted directories are covered, and at `"warn"` level.

### Build Commands

From `inex/ClientApp/` (not from project root):

```bash
npm install --save-dev @typescript-eslint/eslint-plugin@^5.8.0
npm run build     # tsc --noEmit && vite build
npm run lint      # eslint ./src/**/*.ts ./src/**/*.tsx
```

`npm run build` and `npm run lint` are the only acceptance gates. There is no frontend test suite yet (that is Story 7.3). No backend changes are required.

### Project Structure Notes

- All new model files live under `inex/ClientApp/src/model/{Domain}/` — three files to create, all in existing sub-folders.
- ESLint config is at `inex/ClientApp/.eslintrc.json` (not in `src/`).
- `package.json` is at `inex/ClientApp/package.json`.
- `package-lock.json` is at `inex/ClientApp/package-lock.json`; update it with the ESLint plugin install.
- No backend files are touched (no C# changes, no migrations).

### Files To Create

| File                                                             | Purpose                                                   |
| ---------------------------------------------------------------- | --------------------------------------------------------- |
| `inex/ClientApp/src/model/Transaction/TransactionResponse.ts`    | API response model for a single transaction row           |
| `inex/ClientApp/src/model/Transaction/TransactionFilterState.ts` | Redux filter state shape used across slice and actions    |
| `inex/ClientApp/src/model/Account/AccountSummary.ts`             | Account balance summary model (accounts/details endpoint) |

### Files To Modify

| File                                                            | Change                                                                                       |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `inex/ClientApp/src/store/transactions/transactions-slice.ts`   | Type `items`, `summaryItems`, all reducer action params                                      |
| `inex/ClientApp/src/store/transactions/transactions-actions.ts` | Type `filter` param, add generic on Axios calls                                              |
| `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`     | Replace `props: any`, `record: any`, `mobileEditRecord: any`, `(a: any)`, tag/ref item types |
| `inex/ClientApp/src/components/Dropdown.tsx`                    | Replace `props: any`, `item: any`, `sub: any`                                                |
| `inex/ClientApp/src/components/AutoComplete.tsx`                | Replace `props: any`, `searchOptions: any`, fix `useState` type                              |
| `inex/ClientApp/.eslintrc.json`                                 | Add `overrides` block with `no-explicit-any: warn` for targeted paths                        |
| `inex/ClientApp/package.json`                                   | Add `@typescript-eslint/eslint-plugin@^5.8.0` to devDependencies                             |
| `inex/ClientApp/package-lock.json`                              | Lock the added ESLint plugin dependency from `npm install`                                   |

### References

- [Source: docs/planning/epics.md#Story 7.1] — AC definitions and `model/` folder location requirement
- [Source: inex/ClientApp/src/store/transactions/transactions-slice.ts] — current `any[]` state and untyped reducers
- [Source: inex/ClientApp/src/store/transactions/transactions-actions.ts] — `filter: any`, untyped Axios responses
- [Source: inex/ClientApp/src/pages/Transactions/TransactionList.tsx] — `props: any`, `record: any`, `mobileEditRecord: any`
- [Source: inex/ClientApp/src/components/Dropdown.tsx] — `props: any`, `item: any`
- [Source: inex/ClientApp/src/components/AutoComplete.tsx] — `props: any`, `useState([])` / `searchOptions: any`
- [Source: inex/ClientApp/.eslintrc.json] — current ESLint config (no rules, plugin not installed)
- [Source: inex/ClientApp/package.json] — dependencies; `@typescript-eslint/eslint-plugin` absent
- [Source: inex/Controllers/TransactionsController.cs] — current transactions list contract (`mode`, `pageSize`, `pageNumber`, `filter`)
- [Source: inex.Services/Models/Records/Transaction/TransactionResponse.cs] — backend record to mirror
- [Source: inex.Services/Models/Records/Account/AccountSummary.cs] — backend record for summaryItems
- [Source: inex/ClientApp/src/model/Account/AccountDetails.ts] — existing class model example
- [Source: inex/ClientApp/src/model/Category/CategoryDetails.ts] — existing interface model example
- [Source: inex/ClientApp/src/store/accounts/accounts-slice.ts] — well-typed slice to use as reference

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5

### Debug Log References

### Completion Notes List

### File List
