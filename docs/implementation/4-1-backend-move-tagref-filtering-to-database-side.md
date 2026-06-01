# Story 4.1: Backend — Move Tag/Ref Filtering to Database-Side

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user with a large transaction history,
I want tag and reference filters to apply at the database level,
So that filtering and pagination remain fast regardless of how many transactions I have.

## Acceptance Criteria

1. **Given** `TransactionService.ApplyFilters` currently calls `AsEnumerable()` before evaluating tag/ref predicates **When** this story is complete **Then** `AsEnumerable()` is removed from the tag/ref filter branches; all filtering composes as `IQueryable` before `Count`, `Skip`, and `Take` are applied.

2. **Given** a tag filter is applied (e.g. `#groceries`) **When** the query executes **Then** the generated SQL contains a `LIKE` predicate or a join on `TransactionTagDetails` — no in-memory evaluation.

3. **Given** a ref filter is applied (e.g. `@alice`) **When** the query executes **Then** the same database-side translation applies.

4. **Given** existing tag-only, ref-only, and combined tag+ref filter scenarios **When** `dotnet test` runs after the change **Then** all existing filter behavior is preserved and new tests cover tag-only, ref-only, combined, and paginated results.

5. **Given** a request with both a tag filter and pagination (`?page=2&pageSize=20`) **When** the query executes **Then** `Count` reflects the filtered total (not the full table), and `Skip`/`Take` operate on the already-filtered set.

## Tasks / Subtasks

- [x] Replace the `AsEnumerable()` refs filter branch with an `IQueryable` predicate using `TransactionTagDetails`. (AC: 1, 3)
  - [x] In `inex.Services/Services/TransactionService.cs`, locate the `ApplyFilters` method starting at line ~154.
  - [x] Find the refs block (lines ~163–170): `IEnumerable<string> markedRefs = refs.Select(i => $"@{i}").ToList(); items = items.AsEnumerable().Where(i => markedRefs.Any(markedRef => i.Comment != null && i.Comment.Contains(markedRef))).AsQueryable();`
  - [x] Replace the `AsEnumerable` + `AsQueryable` chain with: `var refList = refs.ToList(); items = items.Where(t => t.TransactionTagDetails.Any(ttd => ttd.Tag.Type == TagType.REF && refList.Contains(ttd.Tag.Key)));`
  - [x] Remove the `markedRefs` local variable — it is no longer needed.
  - [x] Ensure `using inex.Data.Models;` (covers `TagType`) is present at the top of the file — it is already there at line 6; no changes needed.

- [x] Replace the `AsEnumerable()` tags filter branch with an `IQueryable` predicate using `TransactionTagDetails`. (AC: 1, 2)
  - [x] Find the tags block (lines ~172–178): `IList<string> markedTags = tags.Select(i => $"#{i}").ToList(); items = items.AsEnumerable().Where(i => markedTags.Any(markedTag => i.Comment != null && i.Comment.Contains(markedTag))).AsQueryable();`
  - [x] Replace the `AsEnumerable` + `AsQueryable` chain with: `var tagList = tags.ToList(); items = items.Where(t => t.TransactionTagDetails.Any(ttd => ttd.Tag.Type == TagType.TAG && tagList.Contains(ttd.Tag.Key)));`
  - [x] Remove the `markedTags` local variable — it is no longer needed.

- [x] Add integration tests for tag/ref filtering in `inex.Tests/Transactions/TransactionsControllerTests.cs`. (AC: 2, 3, 4, 5)
  - [x] Add helper `CreateTransactionWithCommentAsync(HttpClient client, int accountId, int categoryId, string comment)` that POSTs a transaction and returns the created id.
  - [x] Add `Filter_ByTag_ReturnOnlyMatchingTransactions` — creates two transactions (one tagged `#groceries`, one plain), GETs the list with a tag filter, asserts only the tagged transaction is returned.
  - [x] Add `Filter_ByRef_ReturnOnlyMatchingTransactions` — same pattern for a `@alice` ref filter.
  - [x] Add `Filter_ByTagAndRef_Combined_ReturnsOnlyMatchingTransactions` — creates three transactions (tagged, ref'd, both), applies combined filter, asserts only the transaction with both tag AND ref is returned.
  - [x] Add `Filter_ByTag_WithPagination_CountReflectsFilteredTotal` — creates 5 transactions (3 tagged `#food`, 2 plain), requests `?pageSize=2&page=1` with the tag filter, asserts `totalCount == 3` and `items.Count == 2`.
  - [x] Use the existing `CreateAuthenticatedClientAsync` + `CreateAccountAsync` + `CreateCategoryAsync` helpers already present in the test class.
  - [x] Determine the filter query-string format from `TransactionsController` (existing DSL: `filter=Tags:groceries;`). See Dev Notes for the exact format to use in tests.

- [x] Build and verify. (AC: 4)
  - [x] Run `dotnet build inex.sln` from the repo root; zero build errors.
  - [x] Run `dotnet test inex.sln` from the repo root; all existing tests pass; all new filter tests pass.

- [x] Review Follow-ups (AI)
  - [x] [AI-Review][Medium] Revert unrelated `docs/implementation/sprint-status.yaml` status changes outside story 4-1 while keeping story 4-1 required tracking.

## Dev Notes

### Current State of `ApplyFilters`

Full current code of the tag/ref branches (lines 154–180 in `inex.Services/Services/TransactionService.cs`):

```csharp
IEnumerable<string> refs = FilterHelper.GetStringArrayFromFilter(filters, nameof(TransactionResponse.Refs));
if (refs.Count() > 0)
{
    IEnumerable<string> markedRefs = refs.Select(i => $"@{i}").ToList();
    items = items.AsEnumerable().Where(i => markedRefs.Any(markedRef => i.Comment != null && i.Comment.Contains(markedRef))).AsQueryable();
}

IEnumerable<string> tags = FilterHelper.GetStringArrayFromFilter(filters, nameof(TransactionResponse.Tags));
if (tags.Count() > 0)
{
    IList<string> markedTags = tags.Select(i => $"#{i}").ToList();
    items = items.AsEnumerable().Where(i => markedTags.Any(markedTag => i.Comment != null && i.Comment.Contains(markedTag))).AsQueryable();
}
```

**Root cause — two bugs in one pattern:**
1. `AsEnumerable()` materializes the entire upstream query result (all transactions for the user, with `Account` and `Category` join already applied) into application memory before filtering. For a user with 10,000 transactions this means loading all 10,000 rows just to filter to perhaps 50.
2. The downstream `Count` and `Skip`/`Take` (called by `BuildPaginatedDataResponse`) operate on the in-memory-materialized `IQueryable` wrapper, not on the database query. `Count` therefore returns the count of already-memory-filtered items, which would be correct for that specific filter combination — but the performance cost of loading all rows first makes the operation O(N) on the database instead of O(filtered result).

Note: because `.AsQueryable()` is called on the `IEnumerable` result, the `Count`, `Skip`, and `Take` calls later operate on `EnumerableQuery<T>`, not `IQueryable<T>` backed by EF Core. This means EF Core's translation no longer applies — subsequent `Where` calls added after the tag/ref branches (e.g., the `ActivityMode` filter in `GetTransactions`) are also evaluated in memory.

**Why EF Core cannot translate the original predicate:**
`markedRefs.Any(markedRef => i.Comment.Contains(markedRef))` — here `markedRefs` is a local `IEnumerable<string>` and `i.Comment.Contains(markedRef)` is a closure over each element. EF Core cannot translate a lambda that iterates a local collection in this way. EF Core *can* translate `localList.Contains(dbColumn)` (→ SQL `IN`) and `dbNavigation.Any(predicate)` (→ SQL `EXISTS`), but not "for each item in a local list, check if the db column contains it" as a LINQ expression.

### Schema — How Tags Are Stored

Tags and refs are stored in **two places simultaneously**:
- Raw in `transaction.comment` as `#tag` and `@ref` tokens embedded in human-readable text.
- Structured in the `tag` table + `transaction_tag_map` join table, populated by `TransactionService.ProcessTagsRefs` on every Create/Update.

Data model:
- `tag` table (entity: `Tag`): columns `tag_pk`, `user_fk`, `tag_type` (`TAG` or `REF`), `tag_key` (value without `#`/`@` prefix), `tag_name`, etc.
- `transaction_tag_map` (entity: `TransactionTagMap`): composite PK `(transaction_fk, tag_fk)`; FK to `transaction` and `tag`.
- Navigation: `Transaction.TransactionTagDetails` → `ICollection<TransactionTagMap>` (many side); `TransactionTagMap.Tag` → `Tag`.
- `TagType` enum (in `inex.Data/Models/TagType.cs`): `TAG`, `REF`.

**Key observation:** `Tag.Key` stores the token WITHOUT the `#`/`@` prefix. This matches what `FilterHelper.GetStringArrayFromFilter` returns — the raw value `groceries`, not `#groceries`. So the filter input can be compared directly to `Tag.Key`.

### The Fix — Exact Code

**Refs filter replacement:**
```csharp
IEnumerable<string> refs = FilterHelper.GetStringArrayFromFilter(filters, nameof(TransactionResponse.Refs));
if (refs.Count() > 0)
{
    var refList = refs.ToList();
    items = items.Where(t => t.TransactionTagDetails.Any(ttd => ttd.Tag.Type == TagType.REF && refList.Contains(ttd.Tag.Key)));
}
```

**Tags filter replacement:**
```csharp
IEnumerable<string> tags = FilterHelper.GetStringArrayFromFilter(filters, nameof(TransactionResponse.Tags));
if (tags.Count() > 0)
{
    var tagList = tags.ToList();
    items = items.Where(t => t.TransactionTagDetails.Any(ttd => ttd.Tag.Type == TagType.TAG && tagList.Contains(ttd.Tag.Key)));
}
```

**Why this translates to SQL:**
- `t.TransactionTagDetails.Any(...)` — EF Core 8 translates navigation `.Any()` predicates to a correlated `EXISTS` subquery. The navigation does NOT need to be eagerly included for this to work; EF Core uses the configured relationship metadata.
- `tagList.Contains(ttd.Tag.Key)` — EF Core 8 translates `localList.Contains(columnExpr)` to SQL `IN (...)`.
- The join to `tag` to reach `ttd.Tag.Type` and `ttd.Tag.Key` is handled by EF Core automatically via the configured `HasOne(ttm => ttm.Tag)` relationship in `TransactionTagMapConfiguration`.

**Expected SQL shape for `tagList = ["groceries", "food"]`:**
```sql
WHERE EXISTS (
  SELECT 1 FROM transaction_tag_map ttm
  INNER JOIN tag t ON ttm.tag_fk = t.tag_pk
  WHERE ttm.transaction_fk = transaction.transaction_pk
    AND t.tag_type = 'TAG'
    AND t.tag_key IN ('groceries', 'food')
)
```

### Behavioral Note — Precision Improvement

The current `AsEnumerable` approach uses `i.Comment.Contains("@alice")`, which matches `@alice` as a *substring* of the comment. This could false-positive match `@alicesmith`. The new join-based approach checks exact key equality: `Tag.Key == "alice"`. Since `ProcessTagsRefs` splits by space (not by `#`/`@`), `@alicesmith` would be stored as a single key `alicesmith`, not matched by a filter for `alice`. The new behavior is more precise and is the semantically correct behavior. This is not a regression — it is a fix.

### Filter Query String Format (for Writing Tests)

The current API consumes filters via the `filter` query parameter (string DSL parsed by `FilterHelper.ParseFilter`). Looking at the controller (verify in `inex/Controllers/TransactionsController.cs`):
- Tag filter: `?filter=Tags:groceries;`
- Ref filter: `?filter=Refs:alice;`
- Combined: `?filter=Tags:groceries;Refs:alice;`
- With pagination (paginated endpoint): `?filter=Tags:groceries;&page=1&pageSize=2`

Verify the exact controller route and parameter names before writing tests — read `TransactionsController.cs`.

### Files to Modify

| File | Change |
|------|--------|
| `inex.Services/Services/TransactionService.cs` | Replace two `AsEnumerable()` + `AsQueryable()` blocks in `ApplyFilters` with `IQueryable` predicates |

### Files to Create

| File | Contents |
|------|----------|
| New test methods appended to `inex.Tests/Transactions/TransactionsControllerTests.cs` | 5 new `[Fact]` methods covering tag-only, ref-only, combined, and paginated filter scenarios |

**Do NOT create a new test file.** Append to the existing `TransactionsControllerTests.cs` to stay consistent with project test organization.

### EF Core Version

`Microsoft.EntityFrameworkCore` **8.0.6** (inex.Data), `Pomelo.EntityFrameworkCore.MySql` **8.0.2**. Navigation `.Any()` with local list `.Contains()` is fully supported for SQL translation in EF Core 8 with Pomelo MySQL provider.

### Preserved Behaviors

The following must remain unchanged after this story:

- Account and category filter branches (use `Contains` on int arrays — already IQueryable-safe; do not touch).
- Date range filter branches (`Start`/`End` — already IQueryable-safe; do not touch).
- `GetTransactions` method signature and behavior.
- Non-paginated list endpoint behavior (`BuildDataResponse` path).
- `ProcessTagsRefs` logic — no changes to how tags are stored on create/update.
- All 10 existing tests in `TransactionsControllerTests.cs` (CRUD + authorization scenarios).
- All tests in `inex.Services.Tests` (40 tests: auth, exchange rate, mapper, external client).

### Build Commands

```bash
# From repo root
dotnet build inex.sln
dotnet test inex.sln
```

### Checking the Controller for Filter Format

Before writing new tests, read `inex/Controllers/TransactionsController.cs` to confirm:
1. The action method parameter name for the filter string.
2. Whether the paginated and non-paginated endpoints use the same filter format.
3. The exact route path (expected: `GET /api/transactions`).

### Architecture Constraints

- No new NuGet packages.
- No EF Core migrations — no schema changes.
- No changes to API contracts, routes, or DTOs.
- No changes to `FilterHelper.cs` — parsing is unchanged; only the predicate construction changes.
- `TagType` enum is in `inex.Data/Models/TagType.cs` — already referenced in `TransactionService.cs` via `inex.Services.Models.Enums;` (verify the actual using — the enum may be in `inex.Data`).

### Confirm TagType Namespace

`TagType` is defined in `inex.Data/Models/TagType.cs` (`namespace inex.Data.Models`). `TransactionService.cs` already has `using inex.Data.Models;` at line 6 and already uses `TagType.TAG` / `TagType.REF` in `ProcessTagsRefs`. The new `Where` predicates reference the same enum — no new `using` directives are required.

### References

- FR-DATA-001, NFR-PERF-1 [Source: docs/planning/epics.md#Requirements-Inventory]
- Story 4.1 AC [Source: docs/planning/epics.md#Story-4.1]
- `ApplyFilters` with `AsEnumerable` [Source: inex.Services/Services/TransactionService.cs#L154–L180]
- `Tag` + `TransactionTagMap` entities [Source: inex.Data/Models/Tag.cs, inex.Data/Models/TransactionTagMap.cs]
- `TagType` enum [Source: inex.Data/Models/TagType.cs]
- Join table configuration [Source: inex.Data/Configurations/TransactionTagMapConfiguration.cs]
- Existing transaction tests [Source: inex.Tests/Transactions/TransactionsControllerTests.cs]
- EF Core version [Source: inex.Data/inex.Data.csproj#L22–L33]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Red phase: `dotnet test inex.Tests/inex.Tests.csproj --filter "FullyQualifiedName~TransactionsControllerTests.Filter_By"` failed before implementation because substring tag/ref matches returned `#groceriesx` and `@alicex`.
- Green phase: focused filter tests passed after replacing `AsEnumerable()` branches with `TransactionTagDetails` predicates.
- Provider SQL validation: `ApplyFilters_ByTagAndRef_ProducesDatabaseSideSql` verifies Pomelo SQL generation contains `EXISTS`, `transaction_tag_map`, `tag_type`, and mapped tag `key`.
- Validation: `dotnet build inex.sln` passed.
- Validation: `dotnet test inex.sln` passed.
- Review follow-up validation: `dotnet build inex.sln` passed after limiting `sprint-status.yaml` changes to story 4-1.
- Review follow-up validation: `dotnet test inex.sln` passed after limiting `sprint-status.yaml` changes to story 4-1.

### Completion Notes List

- Replaced refs filtering with an EF-composable `TransactionTagDetails.Any(...)` predicate using `TagType.REF` and `Tag.Key`.
- Replaced tags filtering with an EF-composable `TransactionTagDetails.Any(...)` predicate using `TagType.TAG` and `Tag.Key`.
- Added transaction API integration coverage for tag-only, ref-only, combined tag+ref, and paginated filtered results. Tag/ref tests also guard against substring false positives.
- Added provider-level SQL generation coverage for tag+ref filtering without requiring a live MySQL connection.
- Resolved review finding [Medium]: `docs/implementation/sprint-status.yaml` now keeps only story 4-1-related status changes (`epic-4: in-progress`, story 4-1 `review`, and timestamp) and reverts unrelated sprint status entries.

### File List

- `inex.Services/Services/TransactionService.cs`
- `inex.Tests/Transactions/TransactionsControllerTests.cs`
- `docs/implementation/4-1-backend-move-tagref-filtering-to-database-side.md`
- `docs/implementation/sprint-status.yaml`

### Change Log

- 2026-05-31: Moved transaction tag/ref filtering to database-composable predicates and added integration coverage for required filter scenarios.
- 2026-05-31: Addressed code review finding by reverting unrelated sprint-status changes outside story 4-1.
