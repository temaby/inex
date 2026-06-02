# Story 4.2: Backend + Frontend — Typed Transaction Filter Query Parameters

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an API consumer,
I want transaction filtering to use standard typed query parameters,
So that filters are robust, URL-safe, and easy to construct without a custom string DSL.

## Acceptance Criteria

1. **Given** the current filter format (`AccountId:1;Tags:groceries;` concatenated string) **When** this story is complete **Then** `GET /api/transactions` accepts individual typed query parameters: `accountId`, `categoryId`, `tag`, `ref`, `startDate`, `endDate`, `page`, `pageSize`.

2. **Given** multiple values for the same filter (e.g. two account IDs) **When** the request is made **Then** repeated parameters are supported (e.g. `?accountId=1&accountId=2`) and treated as OR within that field.

3. **Given** special characters in tag or ref values (e.g. `#café`, `@user+name`) **When** passed as URL-encoded query parameters **Then** they are correctly decoded and matched without corruption.

4. **Given** the frontend `transactions-actions.ts` **When** building the filter request **Then** it uses `URLSearchParams` to construct the query string — no manual string concatenation of `Key:Value;` pairs.

5. **Given** the existing filter behavior (account, category, date range, tag, ref) **When** `dotnet test` runs after the change **Then** all existing filter tests pass; new tests cover multi-value params and URL-encoded special characters.

6. **Given** the `FilterHelper.cs` parsing logic **When** this story is complete **Then** the custom DSL parser (`FilterHelper.ParseFilter`) is removed from the transaction path; filtering is driven entirely by bound query parameters.

## Tasks / Subtasks

### Backend

- [x] Create `TransactionFilterQuery` record in `inex.Services/Models/Records/Transaction/`. (AC: 1, 2, 3)
  - [x] Add nullable array properties: `int[]? AccountIds`, `int[]? CategoryIds`, `string[]? Tags`, `string[]? Refs`.
  - [x] Add nullable date properties: `DateTime? StartDate`, `DateTime? EndDate`.
  - [x] Do NOT include `page`/`pageSize` — those remain as separate scalar parameters on the controller action.
  - [x] Decorate each property with `[FromQuery(Name = "...")]` using the lowercase camelCase names from AC 1: `accountId`, `categoryId`, `tag`, `ref`, `startDate`, `endDate`.

- [x] Update `TransactionsController.List` to accept `TransactionFilterQuery` and rename `pageNumber` → `page`. (AC: 1, 2)
  - [x] Replace the `string? filter` parameter with `[FromQuery] TransactionFilterQuery filter`.
  - [x] Rename `pageNumber` to `page` in the method signature to match the AC.
  - [x] Remove the `IDictionary<string, string> filters = FilterHelper.ParseFilter(...)` call.
  - [x] Remove the `using inex.Services.Helpers;` import from `TransactionsController.cs` if `FilterHelper` is no longer referenced there.
  - [x] Update the `<param name="filter">` XML doc comment to reflect the new format.
  - [x] Pass the typed `filter` and `page` directly to the updated service overload.

- [x] Add typed `Get` overload to `ITransactionService` and `TransactionService` for the paginated, controller-facing path. (AC: 1, 2, 5)
  - [x] In `inex.Services/Services/Base/ITransactionService.cs`, add: `PagedResponse<TransactionResponse, PaginationMetadata> Get(int userId, ActivityMode mode, int pageSize, int page, TransactionFilterQuery filter);`
  - [x] In `TransactionService`, add the new overload: call `GetTransactions(userId, mode, filter)` then `BuildPaginatedDataResponse`.
  - [x] Keep the existing `Get(int userId, ActivityMode mode, int pageSize, int pageNumber, IDictionary<string, string> filters)` overload — it is still called by `ReportService.GetCategoriesReportData`. Do NOT change or remove it.

- [x] Add `ApplyFilters(IQueryable<Transaction> items, TransactionFilterQuery filter)` overload in `TransactionService`. (AC: 1, 2, 3, 5)
  - [x] Add the new static overload alongside the existing `ApplyFilters(IQueryable<Transaction>, IDictionary<string, string>)`.
  - [x] Implement all six filter branches using the typed properties (null/empty check on each array).
  - [x] `AccountIds` → `items.Where(i => filter.AccountIds.Contains(i.AccountId))`.
  - [x] `CategoryIds` → `items.Where(i => filter.CategoryIds.Contains(i.CategoryId))`.
  - [x] `Tags` → compose as `IQueryable` using `EF.Functions.Like` or `Comment.Contains($"#{tag}")` — **no `AsEnumerable()`**. Each tag match is a separate `Where` call (AND semantics per tag value, consistent with current behavior via the `Any` predicate). See Dev Notes for the correct EF Core LIKE pattern.
  - [x] `Refs` → same pattern as Tags with `@{ref}` prefix.
  - [x] `StartDate` → `items.Where(i => i.Created >= filter.StartDate.Value)` when non-null.
  - [x] `EndDate` → `items.Where(i => i.Created <= filter.EndDate.Value)` when non-null.
  - [x] Keep the existing `ApplyFilters(IDictionary<string, string>)` overload unchanged — the report service path depends on it.

- [x] Add `GetTransactions` overload accepting `TransactionFilterQuery` in `TransactionService`. (AC: 1)
  - [x] Private method `internal IQueryable<Transaction> GetTransactions(int userId, ActivityMode mode, TransactionFilterQuery filter)` — calls the new `ApplyFilters` overload.
  - [x] Keep the existing dict-based `GetTransactions` overload.

- [x] Backend integration tests in `inex.Tests/Transactions/TransactionsControllerTests.cs`. (AC: 2, 3, 5)
  - [x] Add `List_WithMultipleAccountIds_ReturnsOnlyMatchingTransactions` — sends `?accountId=X&accountId=Y`, asserts results contain only those account IDs.
  - [x] Add `List_WithUrlEncodedTag_ReturnsMatchingTransactions` — creates transaction with comment containing `#café`, sends `?tag=caf%C3%A9`, asserts the transaction is returned.
  - [x] Add `List_WithMultipleTagFilters_ReturnsTransactionsMatchingAll` — verifies AND semantics per tag (transaction must contain all specified tags).
  - [x] Existing tests must pass without modification.

- [x] Remove `FilterHelper.ParseFilter` call from `TransactionsController.cs` (confirmed in the controller task above). Do NOT delete `FilterHelper.cs` — `ReportsController` and `ReportService` still use it. (AC: 6)

### Frontend

- [x] Define `TransactionFilter` TypeScript type in `inex/ClientApp/src/store/transactions/transactions-slice.ts`. (AC: 4)
  - [x] Replace the inline `defaultFilter` shape with an explicit `TransactionFilter` type:
    ```typescript
    export interface TransactionFilter {
      accountIds: number[];
      categoryIds: number[];
      tags: string[];
      refs: string[];
      range: number[]; // [unixStart, unixEnd] — kept for Ant Design RangePicker compatibility
    }
    ```
  - [x] Remove the `tagsAndRefs: ""` field — it was unused in the API call.
  - [x] Update `defaultFilter` to match the new type.
  - [x] Update the slice state type to use `TransactionFilter` instead of the inline anonymous shape.

- [x] Rewrite `fetchTransactions` in `inex/ClientApp/src/store/transactions/transactions-actions.ts` to use `URLSearchParams`. (AC: 4)
  - [x] Change the `filter` parameter type from `any` to `TransactionFilter`.
  - [x] Replace all `Key:Value;` string concatenation with `URLSearchParams` construction (see Dev Notes for the exact pattern).
  - [x] Update `pageNumber` to `page` in the query string to match the renamed backend parameter.
  - [x] Ensure `apiClient.get` receives a properly constructed URL string from `params.toString()`.

- [x] Update any component that dispatches `fetchTransactions` to use the `TransactionFilter` type. (AC: 4)
  - [x] Locate call sites via the Redux `filter` state (typically in the Transactions page component).
  - [x] Ensure the `filter` payload dispatched matches the new `TransactionFilter` shape (remove `tagsAndRefs` if referenced).

- [x] Frontend build and lint. (AC: 4, 5)
  - [x] Run `npm run build` from `inex/ClientApp/` — must pass with no new errors.
  - [x] Run `npm run lint` from `inex/ClientApp/` — must pass with no new warnings.

### Review Follow-ups (AI)

- [x] [AI-Review][Medium] Encode/decode frontend transaction filter URL state for tag/ref values so special characters round-trip before `fetchTransactions` builds the typed API request.

## Dev Notes

### Current DSL Format

The existing `filter` query parameter is a semicolon-delimited `Key:Value` string:

```
AccountId:1,2;CategoryId:5;Start:2024-01-01;End:2024-12-31;Tags:groceries,food;Refs:alice;
```

- Multiple IDs for the same field are **comma-separated within the value**: `AccountId:1,2`
- Tag/ref values are also comma-separated: `Tags:groceries,food`
- Date fields use key names `Start` and `End`

Constructed in `transactions-actions.ts` as:
```typescript
const tagsStr = filter.tags.length > 0 ? `Tags:${filter.tags.toString()};` : "";
const filterStr = `&filter=${accountIdsStr}${categoryIdsStr}${startStr}${endStr}${tagsStr}${refsStr}`;
// Full URL: /transactions?mode=active&pageSize=20&pageNumber=1&filter=AccountId:1;Tags:food;
```

Parsed in `TransactionsController.List` via:
```csharp
IDictionary<string, string> filters = FilterHelper.ParseFilter(filter, TransactionResponse.FieldsList);
```

### Current Controller Signature (before change)

```csharp
public ActionResult List(string? mode, int pageSize, int pageNumber, string? filter)
```

### New Controller Signature (after change)

```csharp
public ActionResult List(string? mode, int pageSize, int page, [FromQuery] TransactionFilterQuery filter)
```

### TransactionFilterQuery Record

Place in `inex.Services/Models/Records/Transaction/TransactionFilterQuery.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;
using System;

namespace inex.Services.Models.Records.Transaction;

public record TransactionFilterQuery
{
    [FromQuery(Name = "accountId")]
    public int[]? AccountIds { get; init; }

    [FromQuery(Name = "categoryId")]
    public int[]? CategoryIds { get; init; }

    [FromQuery(Name = "tag")]
    public string[]? Tags { get; init; }

    [FromQuery(Name = "ref")]
    public string[]? Refs { get; init; }

    [FromQuery(Name = "startDate")]
    public DateTime? StartDate { get; init; }

    [FromQuery(Name = "endDate")]
    public DateTime? EndDate { get; init; }
}
```

ASP.NET Core's `[FromQuery]` model binding on a record type handles repeated parameters natively: `?accountId=1&accountId=2` binds to `AccountIds = [1, 2]`. No custom model binder required.

### Model Binding: Repeated Parameters

For `int[]` and `string[]` decorated with `[FromQuery(Name = "...")]`, ASP.NET Core binds:
- `?accountId=1&accountId=2` → `AccountIds = new[] { 1, 2 }` ✓
- `?tag=groceries&tag=food` → `Tags = new[] { "groceries", "food" }` ✓
- URL-encoded values are decoded by the framework before binding: `?tag=caf%C3%A9` → `Tags = new[] { "café" }` ✓

The `[ApiController]` attribute on `TransactionsController` enables automatic model binding from query string. No additional configuration required.

### URL Construction Example (Before → After)

**Before** (string DSL):
```
GET /api/transactions?mode=active&pageSize=20&pageNumber=1&filter=AccountId:1,2;Tags:groceries;Start:2024-01-01;
```

**After** (typed params):
```
GET /api/transactions?mode=active&pageSize=20&page=1&accountId=1&accountId=2&tag=groceries&startDate=2024-01-01
```

### Frontend URLSearchParams Pattern

Replace the string-concatenation approach in `fetchTransactions` with:

```typescript
export const fetchTransactions = (pageSize: number, page: number, filter: TransactionFilter) => {
    return async (dispatch: AppDispatch) => {
        try {
            dispatch(transactionsActions.setIsLoading({ isLoading: true }));

            const params = new URLSearchParams();
            params.set("mode", "active");
            params.set("pageSize", String(pageSize));
            params.set("page", String(page));

            filter.accountIds.forEach(id => params.append("accountId", String(id)));
            filter.categoryIds.forEach(id => params.append("categoryId", String(id)));
            filter.tags.forEach(tag => params.append("tag", tag));
            filter.refs.forEach(ref => params.append("ref", ref));

            if (filter.range.length === 2 && filter.range[0] > 0) {
                params.set("startDate", dayjs.unix(filter.range[0]).format("YYYY-MM-DD"));
            }
            if (filter.range.length === 2 && filter.range[1] > 0) {
                params.set("endDate", dayjs.unix(filter.range[1]).format("YYYY-MM-DD"));
            }

            const { data } = await apiClient.get(`${API_BASE}?${params.toString()}`);
            // ... dispatch as before
        }
    };
};
```

`URLSearchParams.append` correctly percent-encodes special characters (e.g. `café` → `caf%C3%A9`). No manual encoding needed.

### Tag/Ref Filtering — EF Core LIKE Pattern (No AsEnumerable)

This story must NOT re-introduce `AsEnumerable()` in the new `ApplyFilters` overload. The database-side approach from Story 4.1:

```csharp
// Tags — each tag must be present (AND semantics, consistent with current behavior)
if (filter.Tags is { Length: > 0 })
{
    foreach (string tag in filter.Tags)
    {
        string pattern = $"%#{tag}%";
        items = items.Where(i => i.Comment != null && EF.Functions.Like(i.Comment, pattern));
    }
}

// Refs — same pattern with @ prefix
if (filter.Refs is { Length: > 0 })
{
    foreach (string r in filter.Refs)
    {
        string pattern = $"%@{r}%";
        items = items.Where(i => i.Comment != null && EF.Functions.Like(i.Comment, pattern));
    }
}
```

> **Prerequisite:** Story 4.1 (database-side tag/ref filtering) must be complete before this story merges, or the `AsEnumerable()` removal from 4.1 must be included here. The two stories touch `TransactionService.ApplyFilters` — coordinate to avoid merge conflicts. If developed sequentially after 4.1, only the new typed overload is added; the dict-based overload that 4.1 fixed remains untouched.

### FilterHelper.cs — Scope of Change

`FilterHelper.cs` is **NOT deleted** by this story. It has two callers after this story:
- `ReportsController.GetCategoryReport` → `FilterHelper.ParseFilter` (out of scope)
- `ReportService.GetCategoriesReportData` → `FilterHelper.GetDateTimeFromFilter` (out of scope)

What IS removed from the transactions path:
1. The `FilterHelper.ParseFilter(filter, TransactionResponse.FieldsList)` call in `TransactionsController.List`.
2. All six `FilterHelper.*FromFilter(...)` calls in `TransactionService.ApplyFilters(IDictionary<string, string>)`.

The existing dict-based `ApplyFilters` overload is **kept** because `ReportService.GetCategoriesReportData` calls `_transactionService.Get(userId, ActivityMode.ALL, filters)` using the dict path.

The `using inex.Services.Helpers;` import in `TransactionsController.cs` can be removed once `FilterHelper` is no longer called there.

### Special Character Handling

Special characters in tags/refs (`#café`, `@user+name`) are handled automatically:

- **Frontend → backend**: `URLSearchParams.append("tag", "café")` encodes to `tag=caf%C3%A9`. ASP.NET Core decodes this before model binding. No corruption.
- **Backend → DB**: EF Core parameterizes the LIKE pattern — no SQL injection risk, correct Unicode comparison.
- **Current DSL risk**: The old format used `Tags:café;` in a raw string — URL-encoded input could arrive as `Tags:caf%C3%A9;` and the `ParseFilter` split would leave it encoded. The typed param approach eliminates this ambiguity.

### Files to Modify

**Backend:**
- `inex.Services/Models/Records/Transaction/TransactionFilterQuery.cs` — **CREATE NEW**
- `inex/Controllers/TransactionsController.cs` — update `List` signature, remove `FilterHelper` usage
- `inex.Services/Services/Base/ITransactionService.cs` — add new typed `Get` overload
- `inex.Services/Services/TransactionService.cs` — add typed `Get` + `GetTransactions` + `ApplyFilters` overloads
- `inex.Tests/Transactions/TransactionsControllerTests.cs` — add 3 new filter tests

**Frontend:**
- `inex/ClientApp/src/store/transactions/transactions-slice.ts` — add `TransactionFilter` interface, update state shape
- `inex/ClientApp/src/store/transactions/transactions-actions.ts` — rewrite `fetchTransactions` with `URLSearchParams`
- Any Transactions page component that dispatches `fetchTransactions` with the old `filter` shape — update call sites

**Files to NOT delete:**
- `inex.Services/Helpers/FilterHelper.cs` — still used by reports path; leave intact

### Dependency: Story 4.1

Story 4.1 (Backend — Move Tag/Ref Filtering to Database-Side) modifies `TransactionService.ApplyFilters` to remove `AsEnumerable()`. Both stories touch this method. Recommended sequencing: merge 4.1 first, then implement 4.2 on top. If implementing concurrently, the new typed `ApplyFilters` overload in this story must also be free of `AsEnumerable()`.

### No i18n Changes

This story makes no user-visible UI changes. No strings need to be added to `en/translation.json` or `ru/translation.json`.

### Breaking Change: `pageNumber` → `page`

The `pageNumber` query parameter is renamed to `page` in the new API contract. This is a coordinated frontend+backend change within the same story — both sides change together. The frontend `fetchTransactions` action is the only caller. No external API consumers are affected (API is not publicly documented).

### References

- [Source: inex/Controllers/TransactionsController.cs] — current `List` signature with `string? filter` param
- [Source: inex.Services/Services/TransactionService.cs#ApplyFilters] — current DSL-consuming filter logic
- [Source: inex.Services/Helpers/FilterHelper.cs] — full DSL parser; kept for reports path
- [Source: inex/ClientApp/src/store/transactions/transactions-actions.ts#fetchTransactions] — current string-concat DSL construction
- [Source: inex/ClientApp/src/store/transactions/transactions-slice.ts] — filter state shape
- [Source: inex\Controllers\ReportsController.cs] — FilterHelper still called here; out of scope
- [Source: docs/planning/epics.md — Epic 4 Story 4.2] — AC source of record

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Red phase: `dotnet test inex.Tests\inex.Tests.csproj --filter FullyQualifiedName~TransactionsControllerTests` failed before implementation because typed query parameters were ignored by the existing transaction endpoint.
- Green/refactor: `dotnet test inex.Tests\inex.Tests.csproj --filter FullyQualifiedName~TransactionsControllerTests` passed after adding the typed controller/service path.
- Final validation: `dotnet build inex.sln`, `dotnet test inex.sln`, `npm run build`, and `npm run lint` passed.

### Completion Notes List

- Added `TransactionFilterQuery` with typed repeated query parameter binding for account IDs, category IDs, tags, refs, and date range filters.
- Reworked `TransactionsController.List` and the paginated `TransactionService` path to use typed query parameters and the renamed `page` parameter; removed the transaction endpoint dependency on `FilterHelper.ParseFilter`.
- Added typed transaction filtering coverage for repeated account IDs, URL-decoded tag values, and AND semantics for repeated tag filters.
- Replaced the frontend transaction API request DSL with `URLSearchParams` and typed the Redux transaction filter shape.
- Installed the missing `@typescript-eslint/eslint-plugin` dev dependency required by the existing ESLint config so the required lint gate can run.
- Resolved review finding [Medium]: frontend transaction filter route state now percent-encodes tag/ref values inside the `filter` DSL and uses `URLSearchParams` for the outer query parameter, including tag/ref click navigation.

### File List

- docs/implementation/4-2-backend-frontend-typed-transaction-filter-query-parameters.md
- docs/implementation/sprint-status.yaml
- inex.Services/Models/Records/Transaction/TransactionFilterQuery.cs
- inex.Services/Services/Base/ITransactionService.cs
- inex.Services/Services/TransactionService.cs
- inex.Services/inex.Services.csproj
- inex.Tests/Transactions/TransactionsControllerTests.cs
- inex/ClientApp/package-lock.json
- inex/ClientApp/package.json
- inex/ClientApp/src/pages/Transactions/TransactionFilterForm.tsx
- inex/ClientApp/src/pages/Transactions/TransactionList.tsx
- inex/ClientApp/src/pages/Transactions/transaction-filter-url.ts
- inex/ClientApp/src/store/transactions/transactions-actions.ts
- inex/ClientApp/src/store/transactions/transactions-slice.ts
- inex/Controllers/TransactionsController.cs
- inex/inex.xml

### Change Log

- 2026-05-31: Implemented typed transaction query filters across backend and frontend; added integration coverage; validated backend and frontend gates.
- 2026-05-31: Addressed code review finding - encoded frontend transaction filter URL state for tag/ref special-character round trips.
