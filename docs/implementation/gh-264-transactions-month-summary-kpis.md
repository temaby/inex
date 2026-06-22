# Story GH-264: Transactions Month Summary KPIs

Status: review

GitHub Issue: https://github.com/temaby/inex/issues/264

## Story

As an invited account holder,
I want the Transactions KPI cards to use the full selected month and server-filter scope,
so that income, expenses, net flow, and type counts do not change when I paginate ledger rows.

## Acceptance Criteria

1. Given a selected month has more transactions than the current page size, when the user switches between ledger pages, then KPI card totals and segmented type counts remain unchanged.
2. Given account, category, tag, ref, or date filters are active, when the Transactions page renders, then KPI card totals and type counts use the full filtered server scope before pagination.
3. Given local search, type, min amount, or max amount filters are applied, when the user narrows visible rows, then the paginated ledger row set changes but the monthly KPI cards remain scoped to the selected month and server filters.
4. Given transactions are created, updated, or deleted, when RTK Query invalidates transaction data, then both the paginated ledger rows and summary cards refresh.
5. Given backend summary data is queried, when the service loads transactions, then all data remains scoped by authenticated `CurrentUserId`.

## Tasks / Subtasks

- [x] Add a backend transaction summary response. (AC: 1, 2, 5)
  - [x] Add `TransactionSummaryResponse` and supporting nested record types under `inex.Services/Models/Records/Transaction/`.
  - [x] Add `ITransactionService.GetSummary(...)` using the existing typed `TransactionFilterQuery` and `ActivityMode`.
  - [x] Reuse `GetTransactions(userId, mode, filter)` so the summary query preserves `UserId`, activity mode, account/category/tag/ref/date filters, and active account/category behavior.
  - [x] Aggregate by transaction/account currency and kind; treat system-category transfers as transfer counts, not income or expense totals.
- [x] Expose `GET /api/transactions/summary`. (AC: 1, 2, 5)
  - [x] Accept `mode`, `accountId`, `categoryId`, `tag`, `ref`, `startDate`, and `endDate` query params.
  - [x] Return the summary response without changing the existing paginated `GET /api/transactions` route or response shape.
- [x] Add frontend RTK Query support. (AC: 1, 2, 4)
  - [x] Add `getTransactionsSummary` to `inex/ClientApp/src/store/transactions/transactions-api.ts`.
  - [x] Reuse the same filter serialization as `getTransactions`, without page or page size.
  - [x] Invalidate summary data from create, transfer, update, and delete mutations with the existing transaction list invalidation.
- [x] Update the Transactions page data flow. (AC: 1, 2, 3)
  - [x] Fetch summary data in `Transactions.tsx` for the active server filter.
  - [x] Convert native currency summary totals to the current base currency using existing `transaction-ledger-utils` conversion behavior.
  - [x] Render KPI cards and segmented type counts from summary metrics.
  - [x] Keep `TransactionList` responsible for paginated rows, local search/type/amount filtering, grouped rows, visible-row counts, and pagination summary.
- [x] Add regression coverage. (AC: 1, 2, 4, 5)
  - [x] Add or update backend integration tests in `inex.Tests/Transactions/TransactionsControllerTests.cs` proving summary totals ignore pagination and respect filters.
  - [x] Add or update frontend tests for summary URL serialization, cache invalidation, and summary-to-ledger metric conversion.

## Dev Notes

### Current State

- `inex/ClientApp/src/pages/Transactions.tsx` renders KPI cards from `ledgerMetrics`.
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx` computes `ledgerMetrics` from `data.data`, which is only the current paginated page from `useGetTransactionsQuery`.
- `inex/ClientApp/src/store/transactions/transactions-api.ts` only exposes `getTransactions({ pageSize, page, filter })`.
- `inex/Controllers/TransactionsController.cs` only exposes paginated list data for typed transaction filters.
- `inex.Services/Services/TransactionService.cs` already has `GetTransactions(userId, mode, filter)` that applies `UserId`, activity mode, and typed filters before pagination.

### Implementation Guidance

- Keep pagination. Do not load the entire month into the ledger list just to fix cards.
- Do not call live exchange-rate providers. Frontend summary conversion must reuse existing `state.rates.items` behavior.
- Backend should return native per-currency aggregate totals plus counts; frontend converts each currency aggregate to base currency using existing `toBaseCurrencyAmount`.
- If a currency cannot be converted, preserve the current 10.2a safety behavior: do not silently mix unconvertible native values into base-currency KPI totals.
- Preserve existing routes, JSON shapes, status codes, and query parameter names for `GET /api/transactions`.
- Do not store parsed tags or refs separately for this work; existing comment/tag behavior remains unchanged.

### Likely Files

- `inex.Services/Models/Records/Transaction/TransactionSummaryResponse.cs`
- `inex.Services/Services/Base/ITransactionService.cs`
- `inex.Services/Services/TransactionService.cs`
- `inex/Controllers/TransactionsController.cs`
- `inex.Tests/Transactions/TransactionsControllerTests.cs`
- `inex/ClientApp/src/store/transactions/transactions-api.ts`
- `inex/ClientApp/src/store/transactions/__tests__/transactions-api.test.ts`
- `inex/ClientApp/src/pages/Transactions.tsx`
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`
- `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts`
- `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.test.ts`

## Verification Checklist

- [x] `dotnet test inex.Tests/ --filter FullyQualifiedName~TransactionsControllerTests`
- [x] `dotnet test inex.Services.Tests/`
- [x] `npm test -- src/store/transactions/__tests__/transactions-api.test.ts src/pages/Transactions/transaction-ledger-utils.test.ts`
- [x] `npm run build`
- [x] `npm run lint`
- [x] `dotnet build`

## Dev Agent Record

### Completion Notes

- Created GitHub issue #264 as the delivery tracker.
- Added `GET /api/transactions/summary` with the same typed server filters and activity mode as the paginated list.
- Added a native per-currency summary contract so frontend base-currency conversion continues to use existing loaded rates without live provider calls.
- Updated Transactions KPI cards and segmented counts to use full server-scope summary data while the ledger list remains paginated.
- Kept client-only search/type/amount filters local to visible rows.

### Verification

- `dotnet test inex.Tests/ --filter FullyQualifiedName~TransactionsControllerTests` passed: 23 tests.
- `dotnet test inex.Services.Tests/` passed: 88 tests.
- `npm test -- src/store/transactions/__tests__/transactions-api.test.ts src/pages/Transactions/transaction-ledger-utils.test.ts` passed: 14 tests.
- `npm run build` passed; Vite reported the existing large AntD chunk warning.
- `npm run lint` passed.
- `dotnet build` passed.

## BMad Checklist Validation

- [x] Story is single-goal and tied to GitHub issue #264.
- [x] Acceptance criteria are testable and use Given/When/Then.
- [x] File paths and implementation constraints are concrete.
- [x] User data isolation is explicit.
- [x] External provider calls are explicitly out of scope.
