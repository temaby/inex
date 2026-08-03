---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - docs/planning/prds/prd-inex-2026-08-03/prd.md
  - docs/planning/transactions-current-state-functionality.md
  - docs/planning/transactions-current-state-ui-ux.md
  - docs/project-context.md
inputScope:
  feature: "Transactions Page Enhancements: server-wide filtering and trustworthy summaries"
workflowType: 'architecture'
lastStep: 8
status: 'complete'
project_name: 'inex'
user_name: 'Artiom'
date: '2026-08-03'
completedAt: '2026-08-03'
---

# Transactions Architecture Decision Document

_This addendum defines the architecture for the Transactions Page Enhancements PRD. It supplements, rather than replaces, the repository-wide decisions in [architecture.md](architecture.md)._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The Transactions page must move Type and free-text Search from page-local UI filtering to authenticated, server-side filtering over the complete Selected Period. The same filtered scope must drive the unpaginated ledger summary, income/expense counts, rate-warning evidence, comparison with the preceding comparable period, and paginated ledger rows.

The API and client must retain and restore every server filter through a stable URL representation: account, category, tag, reference, date range, Type, and Search. Invalid URL values are ignored independently. Amount filters are removed from the Transactions contract and UI.

The page adds read-only Native Balance context for active accounts, including an on-demand account-balance companion and balance beneath selected account fields. Successful single-record edits refresh list and summary data, close the drawer, and return focus predictably.

**Non-Functional Requirements:**
All list, summary, account-balance, and mutation paths remain scoped to the authenticated user. Server-side search must remain database-side and occur before summary calculation and pagination. Missing exchange rates must produce an evidence-bearing `N/A`, never a silently partial converted result, without provider calls during rendering or tests.

The implementation must preserve the existing React/Redux/API-client/i18n architecture, accessible drawer behavior, financial semantics, and responsive contracts at 1440px, 1024px, 390px, and 360px. A local calendar date remains a date-only value; time-zone modelling is explicitly out of scope.

**Scale & Complexity:**

- Primary domain: authenticated full-stack financial ledger
- Complexity level: high
- Architectural components: transaction query contract; controller/service/repository query pipeline; summary and exchange-rate completeness model; frontend URL/filter state; Redux/RTK Query invalidation; account-summary reuse; transaction drawers; i18n; integration, service, and MySQL verification

### Technical Constraints & Dependencies

Use the existing .NET 8, EF Core 8/Pomelo MySQL, repository/unit-of-work, static mapper, React 18, TypeScript, Redux, shared `apiClient`, i18next, Day.js, Ant Design, and existing drawer primitives. No API versioning, dependency change, time-zone model, transfer-linking model, bulk-operation flow, or provider call is authorized by this PRD.

### Cross-Cutting Concerns Identified

- A single canonical server-filter specification must be shared by list, summary, previous-period comparison, URL parsing/serialization, and invalidation.
- Query composition must apply authenticated ownership and active-data rules before filtering, aggregation, and paging.
- Search semantics must preserve the current fields and case-insensitive behavior while translating safely to MySQL.
- Summary responses must represent conversion completeness and affected currency/period evidence explicitly.
- The previous-period comparison must use the same filters except for its computed comparable date range.
- URL parsing must fail soft per field and normalize the visible URL/state.
- Account Native Balances must remain native-currency only and must not introduce a converted cross-account total.
- All new copy, warnings, filter chips, drawers, and accessible hints require EN/RU translations and responsive visual QA.

## Starter Template Evaluation

### Primary Technology Domain

Brownfield full-stack financial web application enhancement: ASP.NET Core 8 API, EF Core 8/Pomelo MySQL, and React 18/TypeScript/Vite SPA.

### Starter Options Considered

**Existing InEx Solution**
- Preserves authenticated API boundaries, ownership-safe transaction services, EF Core data access, existing transaction routes/contracts, React/Redux data flow, `apiClient`, i18n, drawer primitives, and visual-QA harness.
- Best fit because the PRD evolves a production route rather than creating a separate application.

**New Vite React TypeScript Starter**
- Would provide a blank frontend foundation but omit the existing authenticated API client, state architecture, transaction models, translations, routing, and visual system.
- Rejected as unrelated churn.

**New ASP.NET Core + React Starter**
- Would similarly omit the existing service/repository, EF/MySQL, authorization, contract, and test infrastructure.
- Rejected as unrelated churn.

### Selected Starter: Existing InEx Solution

**Rationale for Selection:**
The enhancement must integrate with established transaction query, summary, authentication, exchange-rate, cache invalidation, and responsive-ledger behavior. Preserve the current solution and make narrow, compatible changes.

**Initialization Command:**

```bash
# No initialization command.
# Implement within the existing solution.
```

**Architectural Decisions Provided by the Existing Foundation:**

**Language & Runtime:**
.NET 8/C# backend and React 18 with strict TypeScript frontend remain unchanged.

**Styling Solution:**
Continue using the existing design tokens/primitives and Ant Design bridge. The design files remain visual references, not runtime dependencies.

**Build Tooling:**
Retain solution builds/tests and the existing Vite build/lint/visual-QA commands.

**Testing Framework:**
Keep xUnit service/integration testing, fixture-based Transactions visual QA, and provider-aware MySQL verification for query-sensitive behavior.

**Code Organization:**
Controllers remain thin; transaction business/query logic stays in services and repository/unit-of-work paths. Frontend calls remain in the existing Transactions API/state layer through `apiClient`.

**Development Experience:**
Retain Vite development/proxy behavior, Redux/RTK Query cache invalidation, Day.js date handling, i18next, and existing drawer/accessibility patterns.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Define one typed, authenticated server-filter contract for Transactions. It adds `type` and `search` to the existing account/category/tag/reference/date filters; it does not add Amount filtering.
- Build one canonical EF query pipeline that applies user ownership, active-data mode, every server filter, and deterministic ordering before either aggregation or pagination.
- Extend the unpaginated summary response to include the current scope and the preceding comparable scope, both derived from the same effective filters.
- Use the authenticated user's preferred currency as the KPI base and return date-and-currency cash-flow buckets for transaction-date conversion in both summary scopes.
- Treat currency conversion completeness as explicit frontend display state. An unavailable required bucket rate yields `N/A` and affected currency/date/period evidence, never a partial sum.
- Reuse the existing authenticated account-summary endpoint for Native Balance context; do not create a Transactions-specific balance aggregate.
- Reject omitted or language-default transaction dates on every create, update, and transfer request at the server validation boundary.

**Important Decisions (Shape Architecture):**
- Serialize all server filters in the existing `filter` URL parameter and normalize invalid values independently.
- Retain the current API routes, `mode=active`, date-time query shape, comment-based tag/reference storage, and shared RTK Query invalidation model.
- Treat Story 7.4a's reviewed Transactions RTK Query API/cache pattern as a prerequisite; this scope extends its typed contract and cache keys rather than introducing a second data-fetching pattern.
- Keep Type, Search, and result-navigation state in canonical Transactions state rather than separate page-local filtering state.
- Use progressive loading for ranges of at most one calendar month and numbered pagination for longer custom ranges; both use the same server pagination contract.
- Preserve the existing local date interpretation: the client sends selected calendar days as inclusive start/end values; no time-zone model is introduced.

**Deferred Decisions:**
- Full-text search infrastructure, generated search columns, and new search indexes are not introduced without MySQL query-plan and timing evidence from the 50,000-transactions-per-user verification gate.
- Linked-transfer management, bulk actions, a converted account-balance total, and exchange-rate provider invocation remain out of scope.

### Data Architecture

**Decision: Evolve `TransactionFilterQuery` additively.**
Add typed `type` and `search` fields to the existing query record. Existing account/category/tag/reference/date parameter names and AND semantics for multiple tags/references remain stable. `type=transfer` selects system-category records; otherwise Income and Expense follow the established signed-value semantics. Empty or whitespace-only search is equivalent to no Search filter.

**Decision: Use a canonical query pipeline.**
The transaction service constructs a base `IQueryable` scoped by `UserId` and active-data mode, then applies account, category, tag, reference, date, Type, and Search predicates. It applies ordering only after all predicates. The list endpoint paginates that query; all summary calculations aggregate the same unpaginated query. No list, summary, or account-balance path may filter a loaded page in memory.

**Decision: Search remains provider-translated.**
Search matches the current ledger fields—comment, account name, category name/path, account currency, tags, and references—through a database-side, case-insensitive MySQL-translated predicate. The implementation must verify its SQL translation and plan against MySQL; it must not materialize results or rely on client-side `ToLower()` filtering.

**Decision: No schema change is presumed.**
First verify list and summary Search query plans with representative MySQL data for one user holding 50,000 transactions. The documented verification environment must complete each list and summary Search query in at most one second. Add a migration only if `EXPLAIN` and timing evidence shows the current schema cannot meet that gate; any index must align with ownership, date, and active filter predicates, be documented in the implementation story, and be re-verified against MySQL.

**Decision: Date presence is validated server-side.**
`TransactionCreateValidator`, `TransactionUpdateValidator`, and `TransferCreateValidator` must reject `Created == default(DateTime)` with a stable machine-readable error key. The client continues sending a user-entered local calendar date; this rule prevents missing/default values without introducing time-zone conversion.

### Authentication & Security

**Decision: Ownership predicates remain the first data constraint.**
Every base query starts with authenticated `UserId`; account/category/tag/reference joins or subqueries cannot broaden the result scope. Existing single-record and transfer ownership behavior remains unchanged, including not-found treatment for cross-user access.

**Decision: Account balances reuse `/api/accounts/details`.**
Transactions requests summaries only for active accounts it already knows. The existing endpoint remains authoritative for user-scoped native balances, and its transaction aggregate must constrain `Transaction.UserId` to the authenticated user in addition to account IDs. The response is displayed per account currency and is never summed into a converted total.

### API & Communication Patterns

**Decision: Keep list and summary endpoints; evolve them additively.**
`GET /api/transactions` continues to return a paged ledger and `GET /api/transactions/summary` remains unpaginated. Both accept the same complete filter contract. Changing any filter produces a new query key and resets result navigation to page 1.

**Decision: Make summary scopes and conversion inputs explicit.**
The summary response derives the KPI base currency from the authenticated user's preferred currency. For both current and preceding comparable scopes, it returns type counts, a period descriptor, and date-and-currency cash-flow buckets: local transaction date, native currency, income total, expense total, and record count. Buckets are emitted from the same unpaginated filtered query as the ledger; Transfer records contribute only to Transfer count and never to monetary buckets. For a complete calendar month, the preceding scope is the preceding calendar month. For a custom inclusive range, it is the immediately preceding equal-length range. The comparison uses the same non-date filters, including Type and Search.

**Decision: Convert each cash-flow bucket by transaction date, or render `N/A`.**
The backend remains free of exchange-rate provider calls. The frontend uses one pure typed conversion-result helper to convert each non-zero bucket into the authenticated user's preferred base currency using its local transaction date. A rate is usable only when the existing cache supplies an entry for that date or an explicitly recorded effective prior-business-date entry under the established weekend/holiday cache policy. The helper never fetches, repairs, synthesizes, or probes a rate. A missing bucket yields an unavailable result naming currency, local transaction date, and summary period; affected KPIs display `N/A`, never a partial sum. Net comparison is `N/A` if either compared net aggregate is incomplete. A zero previous net flow suppresses percentage change; no previous transactions adds the required no-activity context. For Transfer-only Type scope, all three KPI cards remain visible at zero, Transfer count remains available, and no rate lookup or Rate Warning is generated solely by that scope.

### Frontend Architecture

**Decision: Replace local ledger filters with canonical server-filter state.**
The current local `LedgerUiFilter` is removed for Type, Search, and Amount. Type and Search join `TransactionFilter`/Redux state, filter URL parsing and serialization, RTK Query arguments, active chips, clear actions, drawer state, and list/summary requests. Amount controls, values, chips, and test fixtures are removed.

**Decision: Use adaptive result navigation over one server contract.**
The API always returns deterministic `page`, `pageSize`, and total-count results. Whole-month ranges and custom ranges no longer than one calendar month use progressive loading: the client appends next server pages as the ledger end approaches and exposes a visible, keyboard-operable Load more fallback. A custom range whose inclusive end date is later than `startDate + one calendar month` uses numbered pagination. Changing a server filter, date range, page size, or navigation mode discards loaded pages and restarts at page 1; the decision does not depend on the number of matching records.

**Decision: Preserve shared data and mutation behavior.**
Transactions continues to use `apiClient` through the existing RTK Query API. Successful create, transfer, update, and delete continue invalidating the transaction list/summary and dependent account, budget, and report data. A successful update also closes the edit drawer and restores focus to the edited row; failures retain drawer state and surface existing parsed errors.

**Decision: Use current account summaries for balance context.**
The page’s account-balance control obtains active-account summaries once through the existing account API/cache. The same selected-account summary drives native-balance supporting text in create and edit drawers. The panel/drawer visibility remains page-session UI state only.

**Decision: Isolate obsolete progressive responses.**
Every progressive page request is bound to the complete normalized filter key and expected next page. A response whose key no longer equals the current canonical key, or whose page is no longer the expected next page, is discarded and cannot append records to the current ledger.

### Infrastructure & Deployment

No hosting, deployment, provider, or dependency change is required. Tests and visual fixtures must not invoke a live exchange-rate provider. Query-sensitive behavior is validated against MySQL before acceptance.

### Decision Impact Analysis

**Implementation Sequence:**
1. Extend query/filter contracts, service pipeline, summary scopes, and tests.
2. Extend RTK Query contracts, URL state, cache keys, and filter tests.
3. Replace page-local filter behavior, implement adaptive result navigation, and render rate-complete KPI/comparison states.
4. Reuse account summaries for the companion and form balance context.
5. Update drawer-close/focus behavior, layout ordering, translations, and visual QA.
6. Verify MySQL query behavior, integration coverage, frontend tests/build/lint, and all Transactions visual states.

**Cross-Component Dependencies:**
The server filter contract drives both API query strings and URL state. The canonical filtered query drives list pagination and every summary value. The native summary scopes feed frontend conversion-completeness logic. Mutation invalidation refreshes the ledger, summary, and Native Balance context together.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
- One filter representation must stay aligned across URL, Redux, RTK Query, controller binding, service predicates, list metadata, and summary scopes.
- No agent may reintroduce page-local Type/Search filtering, Amount filtering, partial currency totals, or separate account-balance aggregation.
- Progressive loading must not change the server contract or mix results from different filters.

### Naming Patterns

**Backend Contracts:**
- Keep query contracts in `inex.Services/Models/Records/Transaction/`.
- Extend `TransactionFilterQuery`; do not introduce `*DTO` types.
- Use `TransactionSummaryResponse` for the enhanced response and intentional nested records such as `TransactionPeriodSummary` only when a distinct current/previous scope is required.
- Use additive camel-case query parameters: `type`, `search`, `accountId`, `categoryId`, `tag`, `ref`, `startDate`, and `endDate`.

**Frontend Types and Helpers:**
- Keep shared API/filter types under the Transactions store/model conventions.
- Use names that distinguish scope: `transactionFilter`, `currentSummary`, `previousSummary`, `conversionResult`, `navigationMode`.
- Keep pure URL, date-range, query-parameter, conversion, and navigation-mode helpers in existing `Transactions/*` utility modules.
- Use PascalCase component names and `*-api.ts`, `*-utils.ts`, and `*.test.ts[x]` filenames matching nearby code.

### Structure Patterns

**Backend:**
- Controller: bind `TransactionFilterQuery`, use `CurrentUserId`, select active mode, and preserve response/status conventions.
- Service: create the ownership-scoped base query, apply all filters, derive list and summary scopes, and return records.
- Repository/unit of work: preserve existing access paths; add a narrowly named helper only if it removes genuine duplication.
- Validators: add or extend a FluentValidation validator only where query/request validation requires machine-readable errors. Do not place business filtering rules in controllers.

**Frontend:**
- RTK Query owns API serialization, cache keys, list/summary queries, and mutation invalidation.
- Redux owns canonical URL-restorable filter state.
- The Transactions page owns drawer visibility, selected edit record, progressive-page accumulator, and focus-return target.
- Account summaries remain in `accounts-api.ts`; Transactions consumes them without duplicating their API or cache.

### Format Patterns

**Filter and Date Rules:**
- One frontend serializer/parser round-trip represents every server filter. Each invalid value is ignored independently; valid values remain and the URL is rewritten to normalized state.
- Search is trimmed before serialization and API use. Empty search is omitted.
- Date ranges remain inclusive local calendar ranges: start is `00:00:00`, end is `23:59:59`. Date-only values are not converted through a new time-zone abstraction.
- The same normalized filter object is passed to the list and summary endpoints.

**Summary and Conversion Rules:**
- The server returns native-currency aggregates and count/scope facts only; it never calls a rate provider.
- The frontend conversion helper returns either a complete monetary value or a structured unavailable result containing affected currencies and period evidence.
- The conversion input preserves native currency and local transaction date; unavailable evidence contains the missing currency, transaction date, and scope period.
- A KPI never displays the sum of only convertible currencies.
- Transfer records contribute to Transfer counts but not income/expense/net monetary aggregates.
- Transfer-only scope renders all three KPI cards as zero and never causes a rate lookup or warning by itself.

### Communication Patterns

**RTK Query and Result Navigation:**
- Every list/summary query key includes the complete normalized filter.
- A filter/date/page-size/navigation-mode change clears accumulated progressive pages before requesting page 1.
- Progressive loading appends only the next sequential page for the current key; concurrent duplicate page requests are suppressed.
- A late response for an obsolete filter key or an unexpected page is ignored before it can update the page accumulator.
- The intersection trigger is progressive enhancement. A visible Load more control remains available, announces progress, and is disabled while the next page is loading or no next page exists.
- Numbered pagination is selected only when the range’s inclusive end exceeds `start + one calendar month`; it remains server-paginated.

**Mutation and Focus:**
- Create, transfer, update, and delete invalidate Transaction plus dependent account/budget/report tags after success.
- Update failure leaves the edit drawer open and routes errors through existing parsing/localized handling.
- Successful update closes the drawer and restores focus using the edited transaction ID, with a predictable ledger fallback if the row no longer matches the active filters.

### Process Patterns

**Loading and Errors:**
- Keep already loaded rows and prior summary data visible during refresh.
- Initial list/summary failures use existing retry/error treatment.
- Progressive-page failures preserve already loaded rows and expose retry for the failed next page.
- A filter-empty state is based on server total count, never on a locally filtered page.
- Account-balance companion loading, empty, and failure states are local to the panel/drawer and never replace ledger state; failure offers Retry while preserving the accessible close and focus contract.

**Verification:**
- Add service/integration coverage for user isolation, filter-before-page semantics, Type/Search semantics, comparison ranges, date-and-currency summary buckets, preferred-base selection, Transfer-only zero cards, and default-date rejection.
- Add MySQL verification for generated Search SQL, list/summary query plans, and the 50,000-transactions-per-user at-most-one-second Search gate; add and re-verify an index only with evidence.
- Add frontend tests for URL normalization, query serialization, progressive-loading reset/deduplication/stale-response rejection, conversion incompleteness/effective-date handling, companion loading/empty/error, and mutation focus behavior.
- Add EN/RU translations and fixture-based visual QA for ledger-owned desktop/mobile populated, no-match, missing-rate, progressive-loading, and long-range pagination states; Stories 12.2--12.5 separately own companion, create/edit, and edit-return evidence.

### Enforcement Guidelines

**All AI Agents MUST:**
- Reuse the canonical filter object and shared API parameter builder.
- Apply `UserId` before any transaction relation/filter predicate.
- Preserve existing REST, ProblemDetails, `apiClient`, i18n, and account-summary contracts unless this addendum explicitly changes them.
- Run focused tests, MySQL verification where applicable, frontend build/lint, and Transactions visual QA before acceptance.

### Pattern Examples

**Good Examples:**
- `GET /api/transactions` and `/summary` receive identical normalized filters; only the list receives page parameters.
- A missing PLN rate causes `N/A` with PLN and the selected period, not a USD total excluding PLN.
- A month view appends page 2 only after page 1 for the same filter has loaded.
- A cross-user search result remains absent because the base query is already scoped to the current user.

**Anti-Patterns:**
- Filtering Type or Search in `TransactionList` after page retrieval.
- Keeping an Amount filter in the filter drawer, URL, Redux, API helper, or tests.
- Summing supported currencies while omitting unsupported ones.
- Adding a Transactions-specific account-balance endpoint.
- Using automatic infinite scroll without an accessible Load more fallback.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
docs/
├── planning/
│   ├── architecture.md                         # Root architecture; links to this addendum
│   ├── transactions-architecture.md            # This Transactions-specific architecture
│   └── prds/prd-inex-2026-08-03/prd.md
├── design/docs/
│   ├── design-implementation-guide.md          # Update only if reusable patterns change
│   └── visual-qa-checklist.md                  # Record visual QA evidence
└── implementation/visual-qa/transactions/
    └── qa-summary.json                         # Generated QA evidence; do not hand-edit

inex/
├── Controllers/
│   └── TransactionsController.cs               # Bind extended filter; list/summary endpoints
├── ClientApp/
│   ├── public/locales/
│   │   ├── en/translation.json                  # Transactions additions
│   │   └── ru/translation.json
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Transactions.tsx                 # Page orchestration, URL/filter state, KPI, balances
│   │   │   └── Transactions/
│   │   │       ├── TransactionList.tsx          # Progressive/paged result rendering
│   │   │       ├── TransactionFilterForm.tsx    # Server filters; remove Amount controls
│   │   │       ├── TransactionCreate.tsx
│   │   │       ├── TransactionCreateExpenseForm.tsx
│   │   │       ├── TransactionCreateIncomeForm.tsx
│   │   │       ├── TransactionCreateTransferForm.tsx
│   │   │       ├── TransactionEditForm.tsx      # Native balance and close/focus flow
│   │   │       ├── transaction-filter-url.ts    # Canonical URL serializer/parser
│   │   │       ├── transaction-ledger-utils.ts  # Conversion, periods, navigation helpers
│   │   │       └── transactions-ledger.css
│   │   └── store/
│   │       ├── transactions/
│   │       │   ├── transactions-api.ts          # API serialization/query tags
│   │       │   ├── transactions-slice.ts        # Canonical filter state
│   │       │   └── __tests__/transactions-api.test.ts
│   │       └── accounts/accounts-api.ts         # Reused active-account native summaries
│   └── visual-qa/transactions.mjs               # Fixture scenarios and request assertions
└── ...

inex.Services/
├── Models/Records/Transaction/
│   ├── TransactionFilterQuery.cs                # Extend with Type/Search
│   ├── TransactionSummaryResponse.cs            # Extend current/previous summary scopes
│   └── TransactionPeriodSummary.cs              # New only if a nested scope record is needed
├── Services/
│   ├── Base/ITransactionService.cs
│   ├── TransactionService.cs                    # Canonical filter and summary pipeline
│   └── AccountService.cs                        # User-scoped native summary reuse
└── Validators/Transaction/                      # Enforce non-default Created values on create/update/transfer

inex.Data/
├── Repositories/TransactionRepository.cs        # Preserve unless a narrow helper removes duplication
├── Configurations/                              # Change only for an evidence-backed index
└── Migrations/                                  # New only for an evidence-backed index

inex.Tests/
├── Transactions/TransactionsControllerTests.cs  # Contract, ownership, filtering, summary integration
└── Accounts/                                   # Account-summary ownership regression coverage

inex.Services.Tests/
└── Services/TransactionServiceTests.cs          # New focused query/summary helper coverage if practical
```

### Architectural Boundaries

**API Boundaries:**
`TransactionsController` remains responsible only for binding the extended `TransactionFilterQuery`, reading `CurrentUserId`, preserving `mode=active`, and returning existing list/summary response conventions. The list and summary endpoints share filter semantics; only the list receives `page` and `pageSize`.

**Component Boundaries:**
`Transactions.tsx` composes page-level state and the balance companion. `TransactionList.tsx` renders results and adaptive navigation. Forms display Native Balance for the current account but do not calculate it. URL and conversion utilities stay pure and independently tested.

**Service Boundaries:**
`TransactionService` owns the canonical user-scoped query, server filtering, list pagination, current/previous date-and-currency summary buckets, and no-provider conversion inputs. `AccountService.GetDetails` remains the balance source, but its transaction aggregation must include `i.UserId == userId` in addition to requested account IDs.

**Data Boundaries:**
The transaction base query applies `UserId` before all relations or predicates. The account summary’s account query and transaction aggregate both apply the authenticated user predicate. Search executes in MySQL; no result set is materialized before filtering, aggregation, or paging. An index/migration is conditional on verified MySQL evidence.

### Requirements to Structure Mapping

- FR-1/FR-2: `TransactionFilterQuery`, `TransactionService`, controller, Transactions slice/API/URL/List, integration and frontend tests.
- FR-3: URL parser/serializer, Redux filter state, page initialization, chips, clear controls, filter-form tests.
- FR-4/FR-5: summary records/service, ledger conversion utilities, KPI rendering, missing-rate unit and visual fixtures.
- FR-6/FR-7: `TransactionList.tsx`, ledger CSS, design guide, locale files, visual QA.
- FR-8/FR-9: `accounts-api.ts`, `AccountService`, Transactions page, create/edit forms, account ownership coverage.
- FR-10: edit form, list focus target, mutation handling, frontend tests and drawer visual QA.
- Delivery constraint (date input): transaction create/update/transfer validators and validation-contract tests.

### Integration Points

**Internal Communication:**
Page → canonical filter state/RTK Query → authenticated API → controller → service → repository/EF query → typed response. Account balances use the established accounts RTK Query endpoint and cache, then flow into the companion and form supporting text.

**External Integrations:**
Exchange rates are read only from the established frontend cache. The list, summary, visual QA, and tests do not trigger a rate-provider call.

**Data Flow:**
A normalized URL becomes the canonical filter state. That state drives both list and summary queries. The summary's date-and-currency buckets pass into the shared frontend conversion-completeness helper. A successful mutation invalidates transaction and account summary tags, refreshing ledger, KPI, and Native Balance context together.

### File Organization Patterns

No generated build or visual-QA output belongs in source changes. A migration is added only with a matching entity/configuration/index change and provider verification. All visible copy changes are co-located in EN/RU translation files.

### Development Workflow Integration

Run the project doctor before visual/browser work, then focused backend/frontend tests, MySQL query validation where relevant, frontend build/lint, the Transactions fixture harness, and visual-QA verification. Record visual evidence in the established design/QA locations.

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:**
The design preserves the existing .NET 8/EF Core/MySQL and React/Redux/RTK Query architecture. One canonical server-filter object drives URL state, list pagination, summaries, comparison scope, progressive loading, and cache invalidation. Progressive loading changes only frontend presentation; the server remains conventionally paginated.

**Pattern Consistency:**
The patterns prevent the main implementation conflicts: page-local filtering, client-side search, partial converted KPIs, duplicate balance aggregation, unscoped account-summary transactions, and inaccessible infinite scrolling. Date validation, ownership, API compatibility, and error handling follow existing conventions.

**Structure Alignment:**
Each requirement maps to an existing source/test/visual-QA location. New records are limited to an intentional nested summary scope if necessary. A migration is explicitly conditional, not presumed.

### Requirements Coverage Validation

**Feature Coverage:**
- FR-1–FR-3: canonical server filters, pre-pagination query composition, URL restore/normalization, and result reset.
- FR-4–FR-5: preferred-base current/previous date-and-currency summaries, complete-or-`N/A` conversion model, currency/date/period rate evidence, Transfer-only zero cards, and no provider calls.
- FR-6–FR-7: ledger component/CSS, visual design guidance, translations, and responsive QA.
- FR-8–FR-9: reused account summaries, Native Balance context, and explicit user scoping.
- FR-10: mutation success closes the drawer and restores focus.
- Delivery constraints: ownership, date validation, accessibility, i18n, responsive checks, and rate-provider safety are covered.

**Non-Functional Requirements Coverage:**
Security is enforced at the query base and account-summary aggregate. Performance is addressed through database-side filtering, shared summaries, server pagination, and required MySQL query-plan verification. Accessibility is addressed through Load more fallback, drawer/focus requirements, accessible rate warnings, and responsive QA.

### Implementation Readiness Validation

**Decision Completeness:**
All implementation-blocking choices are specified, including the adaptive boundary: a range uses numbered pages only when its inclusive end is later than `start + one calendar month`.

**Structure Completeness:**
The structure identifies controller, service, contracts, account summary, frontend page/list/forms/utilities/state, locale, API/frontend, integration, and visual-QA ownership.

**Pattern Completeness:**
Naming, data/response format, state ownership, progressive-loading deduplication, error/loading behavior, mutation focus, and verification requirements are explicit.

### Gap Analysis Results

**Critical Gaps:**
None.

**Important Gaps:**
- MySQL must verify generated Search SQL, collation/case behavior, list/summary query plans, and the 50,000-transactions-per-user at-most-one-second Search gate before the feature is accepted.
- The existing account-summary transaction aggregate requires the documented `Transaction.UserId == userId` correction before it powers Transactions balances.
- Current create/update/transfer validators require the documented non-default `Created` validation before acceptance.

**Nice-to-Have Gaps:**
- A dedicated MySQL-backed benchmark fixture would improve confidence if real production-like transaction volumes become available.
- A reusable progressive-paged ledger hook could be extracted later only after Transactions establishes the pattern.

### Validation Issues Addressed

The architecture now explicitly requires user scoping in the account-summary transaction aggregate, server rejection of omitted/default dates in create, update, and transfer validators, and MySQL verification rather than reliance on EF InMemory for Search/query performance.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- One server-filter contract governs all list and summary behavior.
- Transaction-date conversion uses the authenticated user's preferred base currency and is truthful and evidence-bearing.
- Adaptive navigation preserves an accessible, stable server contract.
- User isolation is explicit for both transactions and Native Balance context.
- The addendum is isolated from the prior Epic 1/Epic 10 architecture.

**Areas for Future Enhancement:**
- Search indexing/full-text infrastructure, only after measured need.
- Reusable progressive-ledger abstractions, only after this feature proves the pattern.

### Implementation Handoff

**AI Agent Guidelines:**
- Follow this addendum together with `docs/project-context.md` and the root architecture document.
- Preserve the existing API client, route, i18n, error, ownership, and account-summary boundaries.
- Do not treat EF InMemory coverage as MySQL verification.

**First Implementation Priority:**
Complete Story 11.1a, then implement and test the canonical ownership-scoped filter pipeline. Verify the 50,000-transaction MySQL gate, complete the account-summary ownership correction, then add the date-and-currency summary contract before frontend result-navigation or KPI work.
