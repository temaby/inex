---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - docs/planning/prds/prd-inex-2026-05-20/prd.md
  - docs/project-context.md
  - docs/design/docs/design-implementation-guide.md
  - docs/planning/design-update-plan.md
---

# inex - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for InEx, decomposing the requirements from the PRD and project conventions into implementable stories.

## Requirements Inventory

### Functional Requirements

**Section 4 — Production Baseline (already implemented)**

FR-AUTH-1: JWT authentication with refresh token rotation via HTTP-only cookie
FR-AUTH-2: Invite-token gated registration
FR-AUTH-3: Rate limiting on auth endpoints (5 req/IP/min)
FR-AUTH-4: Profile management: update username, preferred currency, change password
FR-AUTH-5: Language preference stored in JWT claims; EN/RU
FR-ACC-1: Create, read, update, delete accounts per user
FR-ACC-2: Per-account currency selection from supported currency list
FR-ACC-3: Account status: active / inactive / closed
FR-ACC-4: Closed account data integrity preserved across all report queries
FR-ACC-5: Status panel: accounts grouped by currency; per-group subtotals; base-currency equivalents; MoM % change on total row
FR-CAT-1: Create, read, update, delete user-defined categories
FR-CAT-2: Active/inactive status toggle
FR-TXN-1: Create, read, update, delete income / expense / transfer transactions
FR-TXN-2: Transaction linked to account, category, date, amount, comment
FR-TXN-3: Tags (#hashtag) and references (@reference) parsed from comment field on read; never stored separately
FR-TXN-4: Transaction list: rows grouped by date; explicit +/− signs; neutral color for transfers
FR-TXN-5: Column reorder; tags + comment merged into Notes column
FR-TXN-6: Humanized date display (D MMM format)
FR-TXN-7: CSV import (Fentury format) via ICSVService
FR-TXN-8: Filtering by account, category, date range, tag, and ref
FR-BUD-1: Create, read, update, delete monthly budgets per category
FR-BUD-2: Copy budgets from one month to another
FR-BUD-3: Multiple budget entries per month supported
FR-RATE-1: Date-based exchange rates via Frankfurter API (primary) with CurrencyAPI fallback
FR-RATE-2: Batch range fetch: cold-cache yearly report triggers ≤2 external API calls
FR-RATE-3: In-process rate cache; stale dates fetched on demand
FR-RPT-1: Monthly history report: income and expense by month
FR-RPT-2: Budget comparison report: planned vs. actual by category
FR-RPT-3: Category spending report
FR-I18N-1: Full EN/RU UI via react-i18next + Ant Design locale
FR-I18N-2: Machine-readable FluentValidation error codes (field.rule format); frontend translates
FR-INF-1: Docker multi-stage build + docker-compose
FR-INF-2: GitHub Actions CI: build + test + coverage
FR-INF-3: AWS E-track: ECR + EC2 t4g.small (ARM) + nginx + Let's Encrypt + Porkbun DNS
FR-INF-4: CloudWatch structured logging via Serilog sink
FR-INF-5: MySQL daily backup to S3 (30-day retention, 02:00 UTC cron; operational runbook: `docs/operations/mysql-backups.md`)
FR-INF-6: Secrets in SSM Parameter Store; never in source

**Section 5 — Roadmap (work to be done)**

FR-SEC-001 [P0]: All single-item reads, updates, and deletes must constrain by authenticated UserId in AccountService, CategoryService, BudgetService, TransactionService
FR-SEC-002 [P0]: Refresh token rotation must be safe under concurrent requests; only one refresh per token via optimistic concurrency or conditional DB update
FR-SEC-003 [P0]: Credentials in .env must be rotated; replaced by user-secrets or SSM injection locally
FR-AUTH-6 [P1]: After registration, user receives a confirmation email (AWS SES in prod; LoggingEmailSender in dev)
FR-AUTH-7 [P1]: Account cannot be used until email address is confirmed
FR-AUTH-8 [P1]: POST /api/auth/resend-confirmation endpoint
FR-AUTH-9 [P1]: GET /api/auth/confirm-email?userId=&token= endpoint; on success, issues JWT and redirects to /transactions
FR-DATA-001 [P1]: Transaction tag/ref filtering must execute database-side before Count, Skip, and Take; AsEnumerable removed from filter path
FR-DATA-002 [P1]: Remove tracked frontend build output from git (git rm --cached -r inex/ClientApp/build)
FR-FE-001 [P1]: Active filter indicator on transaction list: visual cue when any filter is applied
FR-FE-002 [P1]: Month summary cards on dashboard home: total income, total expenses, net savings, MoM delta for each
FR-FE-003 [P2]: Dashboard home page established as app landing; Reports navigation restructured
FR-FE-004 [P2]: Spending heatmap calendar: GitHub-style daily spend grid on Reports
FR-FE-005 [P2]: Shared frontend DTO/model types for accounts, categories, budgets, transactions, reports; any eliminated from core transaction and Redux flows
FR-FE-006 [P2]: Transaction filter string DSL replaced with typed query parameters; frontend uses URLSearchParams; backend accepts standard query params
FR-FE-007 [P2]: Route-based lazy loading + vendor chunk split; main bundle warning resolved
FR-FE-008 [P2]: RTK Query replaces manual Axios thunks across all domain slices
FR-FE-009 [P2]: Vitest + React Testing Library test suite introduced
FR-ARCH-001 [P1]: Repository disposal must not manually dispose a DI-managed DbContext; data access boundary decision documented
FR-ARCH-002 [P2]: UTC timestamp consistency: injectable clock abstraction; persisted timestamps use UTC throughout; EF seed data uses fixed constants
FR-ARCH-003 [P2]: Vertical Slice Architecture spike: CopyBudgets implemented as MediatR/CQRS handler alongside existing layered architecture
FR-RATE-4 [P2]: NBRB exchange rate client: BYN + RUB via single range call
FR-HIST-001 [P2]: Historical account value report: net worth over time chart with period-accurate exchange rates
FR-DX-001 [P3]: Build warning noise reduced; XML doc warning baseline cleaned; future warning policy documented
IR-REPORT-001 [P1]: Category spending report must include transactions for all user-owned categories — inactive categories silently excluded from `GetCategoriesReportData` fixed; `TotalIncome`/`TotalOutcome` always populated
IR-REPORT-002 [P1]: Hardcoded Russian string `"Расходы по категориям"` in `ReportService.GetCategoriesReportData` replaced with an i18n lookup — no hardcoded language strings in services
IR-DTO-001 [P2]: Remaining DTO naming convention work — `ResponseTransferDTO` → `TransferResponse`; frontend `BudgetComparisonDTO` → `BudgetComparison`, `ReportMetadataDTO` → `ReportMetadata`; response-inherits-request hierarchy in Account and Category domains split into independent request/response types (BUG-009)
IR-CODE-001 [P3]: Minor code quality — `PagedResponse<T,TMeta>.Metadata` construction guard (BUG-008); service base helpers `BuildPaginatedDataResponse`/`BuildReportDataResponse` visibility `public` → `protected`; validator class naming alignment
FR-AWS-001 [P3]: ECR: Docker image push from CI
FR-AWS-002 [P3]: RDS: managed MySQL replacing EC2-hosted MySQL
FR-AWS-003 [P3]: ECS Fargate: container deployment replacing EC2 Docker stack
FR-AWS-004 [P3]: ALB + ACM: HTTPS termination at load balancer
FR-AWS-005 [P3]: Route 53: custom domain management
FR-AWS-006 [P3]: Secrets Manager: runtime secret injection replacing SSM Parameter Store
FR-AWS-007 [P3]: CloudWatch: logs + alarms + dashboard
FR-AWS-008 [P3]: CI/CD: GitHub Actions → ECR → ECS rolling deploy

FR-UX-001 [P2]: Production frontend implements the docs/design shell: sticky desktop top nav, mobile bottom nav, page header, brand mark, user pill, and no app footer inside authenticated routes
FR-UX-002 [P2]: Frontend design tokens and shared primitives are introduced for money values, buttons, icon buttons, drawers, segmented controls, empty states, progress, and responsive layout
FR-UX-003 [P2]: Transactions page is rebuilt as a ledger-first workspace with KPI strip, grouped day rows, active filter chips, advanced filter drawer, and mobile stacked rows
FR-UX-004 [P2]: Accounts, Categories, and Budgets are rebuilt as dense management workspaces using the new hero, grouping, toolbar, row, drawer, and empty-state patterns
FR-UX-005 [P2]: Reports hub, dashboard landing, and report drill-down chrome follow the design guide, including chart accessibility and export/share/print action placement
FR-UX-006 [P2]: Profile, settings, login, and registration screens follow the design guide, include production validation/loading/error states, and fix mobile profile overflow
FR-UX-007 [P2]: Converted pages pass the documented visual QA matrix at 1440px, 1024px, 390px, and 360px where applicable

### NonFunctional Requirements

NFR-SEC-1: All user-owned data queries must include UserId ownership predicate — currently violated for single-entity service methods
NFR-SEC-2: API authentication is JWT-based; backend is authoritative; frontend ProtectedRoute is UX-only
NFR-SEC-3: Secrets must not appear in committed source, logs, comments, or screenshots
NFR-SEC-4: HSTS in production; standard security headers in all environments
NFR-PERF-1: All filtering must execute database-side before count and pagination — currently violated for tag/ref filters
NFR-PERF-2: Cold-cache yearly report triggers ≤2 external exchange rate API calls
NFR-PERF-3: Frontend initial bundle ≤ 500 KB minified per Vite threshold — currently violated (~1.9 MB)
NFR-REL-1: Startup DB validation via EnsureDatabaseInitialized + /health endpoint
NFR-REL-2: MySQL daily backup to S3 with 30-day retention; operational runbook: `docs/operations/mysql-backups.md`
NFR-OBS-1: Structured JSON logs to CloudWatch via Serilog in production
NFR-OBS-2: After DX-001 completes, dotnet build inex.sln produces zero CS1591 XML documentation warnings
NFR-I18N-1: All user-visible strings through react-i18next; no hardcoded UI text
NFR-I18N-2: Backend validation errors return machine-readable codes (field.rule), not prose strings
NFR-TEST-1: Unit tests cover service logic, mappers, external client adapters (inex.Services.Tests)
NFR-TEST-2: Integration tests cover auth flows, validation, authorization, RFC 7807 contracts, cross-user access denial (inex.Tests)
NFR-TEST-3: EF InMemory must not be the sole coverage for MySQL-specific behavior (migrations, concurrency, constraints)

NFR-UX-1: Money values use tabular numerics, clear income/expense/transfer semantics, and a color-independent signage option
NFR-UX-2: Authenticated app routes have no horizontal overflow at 390px or 360px mobile widths
NFR-UX-3: Drawers, segmented controls, tabs, icon buttons, and navigation are keyboard accessible and screen-reader labeled
NFR-UX-4: Design changes are made through shared tokens and primitives first; page-specific one-off styling is avoided unless documented

### Additional Requirements

- Controllers must inherit ApiControllerBase; provides CurrentUserId and BuildErrorMessage(); business logic stays in services
- All service inputs validated via FluentValidation validators in inex.Services/Validators/
- All mapping via static extension methods in inex.Services/Models/Mappers/; no AutoMapper/IMapper injection
- Repository + UoW pattern for data access; no direct DbContext in controllers
- All user-owned data queries must include UserId ownership predicate — non-negotiable, enforced at service layer
- Schema changes require EF Core migrations; no raw DDL
- CancellationToken propagated through all async service/repository methods
- JWT with HTTP-only refresh cookie; frontend API calls via shared apiClient (auth headers + refresh retry)
- Known active bugs tracked in PRD Section 7: BUG-001 (SEC-001), BUG-002 (SEC-002), BUG-003 (updateAccount missing key), BUG-004 (ExchangeRateResponse naming collision), BUG-005/006 (category report data gaps), BUG-007 (hardcoded Russian string), BUG-008 (PagedResponse null guard), BUG-009 (response-inherits-request hierarchy), BUG-010 (build artifacts tracked)

### UX Design Requirements

The design specification lives in `docs/design/docs/design-implementation-guide.md`, with the implementation sequence and current-app gap review in `docs/planning/design-update-plan.md`. UX requirements are tracked as FR-UX-* entries and should be implemented through shared tokens and primitives before page-specific rebuilds.

### FR Coverage Map

FR-SEC-001: Epic 1 — Object-level auth fix across all service single-entity operations
FR-SEC-002: Epic 1 — Refresh token rotation concurrency safety
FR-SEC-003: Epic 1 — Secrets rotation (note: superseded by Epic 9 Secrets Manager)
FR-DATA-002: Epic 1 — Remove tracked build artifacts from git
FR-ARCH-001: Epic 2 — Repository disposal fix prerequisite
FR-ARCH-002: Epic 2 — UTC consistency + injectable clock prerequisite
FR-AUTH-6: Epic 3 — Email confirmation send on registration
FR-AUTH-7: Epic 3 — Block account use until email confirmed
FR-AUTH-8: Epic 3 — Resend confirmation endpoint
FR-AUTH-9: Epic 3 — Confirm-email endpoint; issues JWT on success
FR-DATA-001: Epic 4 — DB-side tag/ref filtering (remove AsEnumerable)
FR-FE-001: Epic 4 — Active filter indicator on transaction list
FR-FE-006: Epic 4 — Typed query params replace string filter DSL
FR-RATE-4: Epic 5 — NBRB exchange rate client for BYN/RUB
FR-FE-002: Epic 6 — Month summary cards on dashboard
FR-FE-003: Epic 6 — Dashboard home page + Reports nav restructure
FR-FE-004: Epic 6 — Spending heatmap calendar
FR-HIST-001: Epic 6 — Historical net worth chart (depends on Epic 5 for BYN/RUB accuracy)
IR-REPORT-001: Epic 6 — Category report inactive-category data gap and total population fix
IR-REPORT-002: Epic 6 — Hardcoded report title i18n fix
FR-FE-005: Epic 7 — Typed frontend DTOs; eliminate any in core flows
FR-FE-007: Epic 7 — Route-based bundle splitting + vendor chunk
FR-FE-008: Epic 7 — RTK Query replacing manual Axios thunks (depends on Epic 4 API contract)
FR-FE-009: Epic 7 — Vitest + React Testing Library
FR-ARCH-003: Epic 8 — VSA/MediatR spike on CopyBudgets
FR-DX-001: Epic 8 — Build warning cleanup
IR-DTO-001: Epic 8 — Complete DTO naming convention and hierarchy fix
IR-CODE-001: Epic 8 — Remaining minor code quality items
FR-AWS-001: Epic 9 — ECR image push
FR-AWS-002: Epic 9 — RDS managed MySQL
FR-AWS-003: Epic 9 — ECS Fargate deployment
FR-AWS-004: Epic 9 — ALB + ACM HTTPS
FR-AWS-005: Epic 9 — Route 53 custom domain
FR-AWS-006: Epic 9 — Secrets Manager (supersedes Epic 1 SEC-003 rotation)
FR-AWS-007: Epic 9 — CloudWatch logs + alarms + dashboard
FR-AWS-008: Epic 9 — CI/CD GitHub Actions → ECR → ECS rolling deploy

FR-UX-001: Epic 10 - App shell and navigation redesign
FR-UX-002: Epic 10 - Design tokens and shared frontend primitives
FR-UX-003: Epic 10 - Transactions ledger redesign
FR-UX-004: Epic 10 - Management pages redesign for Accounts, Categories, and Budgets
FR-UX-005: Epic 10 - Reports hub, dashboard landing, and report drill-down chrome
FR-UX-006: Epic 10 - Profile/settings and auth redesign
FR-UX-007: Epic 10 - Visual QA baseline and responsive regression checks

## Epic List

### Epic 1: Security & Production Hygiene
Users can trust that their financial data is fully isolated to their account and that session management is race-condition-safe. Developers work in a clean, secret-free local environment.
**FRs covered:** FR-SEC-001, FR-SEC-002, FR-SEC-003, FR-DATA-002
**Bugs fixed:** BUG-001, BUG-002, BUG-003 (updateAccount 422), BUG-010 (build artifacts)
**Delivery note:** FR-SEC-001 may need to deploy as an unscheduled hotfix if non-owner users are active (see PRD OQ-2). SEC-003 secrets rotation is temporary — Epic 9 Secrets Manager supersedes it.
**Dependency:** None. Must complete before all other epics.

### Epic 2: Safer Data Access And Reliable Time Behavior
Data access lifetime and timestamp behavior are made safe so later auth, filtering, rate, and reporting work produces reliable results.
**FRs covered:** FR-ARCH-001, FR-ARCH-002
**Dependencies:** Epic 1 must complete.

### Epic 3: Email Verification
New registrations require email ownership verification before the account can be used.
**FRs covered:** FR-AUTH-6, FR-AUTH-7, FR-AUTH-8, FR-AUTH-9
**Dependencies:**
- Epic 1 (SEC-003) must complete before registration flow is extended — both touch the same auth entry point
- Epic 2 (Safer Data Access And Reliable Time Behavior) must complete before this epic — token confirmation uses the same user retrieval path, and token expiry logic requires the shared injectable clock

### Epic 4: Transaction Filtering Quality
Users can filter large transaction histories by tag and reference reliably, with all filtering executing database-side. A visual indicator shows when filters are active. The filter API moves to typed query parameters.
**FRs covered:** FR-DATA-001, FR-FE-001, FR-FE-006
**Dependencies:**
- Epic 1 must complete (SEC-001 fix before expanding query surface area)
- Epic 2 should complete before this epic — moving more query logic to the database increases the blast radius of the DbContext lifetime bug

### Epic 5: Exchange Rate Expansion
Users with BYN or RUB accounts get accurate exchange rates sourced from NBRB via a single batch range call.
**FRs covered:** FR-RATE-4
**Dependencies:**
- Epic 2 should complete before this epic — NBRB date-based fetch logic needs IClock to be mockable for deterministic testing

### Epic 6: Dashboard & Spending Insights
Users see their financial picture at a glance: monthly income/expense/savings summary cards, a spending heatmap, and a historical net worth chart. Category report data integrity is also fixed in this epic.
**FRs covered:** FR-FE-002, FR-FE-003, FR-FE-004, FR-HIST-001, IR-REPORT-001, IR-REPORT-002
**Bugs fixed:** BUG-005, BUG-006 (category report data gaps), BUG-007 (hardcoded Russian string)
**Delivery note:** Report data integrity fixes must remain independently testable. Dashboard and historical chart work must not be accepted as complete unless IR-REPORT-001 and IR-REPORT-002 have explicit service/API coverage and localized UI behavior where applicable.
**Dependencies:**
- Epic 2 must complete before this epic — time-series features (month cards, net worth chart) produce silently wrong data if timestamps are not UTC-normalized
- Epic 5 must complete before FR-HIST-001 — historical net worth is a multi-currency aggregation, and BYN/RUB accounts must use NBRB rates rather than being excluded or treated as unsupported

### Epic 7: Faster, Safer Frontend Evolution
The frontend becomes easier to change safely through typed models, smaller bundles, RTK Query data ownership, and automated component tests.
**FRs covered:** FR-FE-005, FR-FE-007, FR-FE-008, FR-FE-009
**Dependencies:**
- Epic 4 (FR-FE-006 typed query params) must complete before FR-FE-008 (RTK Query) — RTK Query cache keys are built on the API contract shape; building against the old string-DSL API means reworking the entire cache key design after Epic 4 ships

### Epic 8: Maintainable Backend Change And Clean Build Signal
Backend change becomes safer through a VSA/MediatR spike, clearer contracts, warning cleanup, and removal of small code-quality traps.
**FRs covered:** FR-ARCH-003, FR-DX-001, IR-DTO-001, IR-CODE-001
**Bugs fixed:** BUG-008 (PagedResponse null guard), BUG-009 (response-inherits-request hierarchy)
**Dependencies:** Epic 1 and Epic 2 must complete.

### Epic 9: Managed Production Operations On AWS
Production moves toward managed deploys, backups, secrets, TLS, and observability while the existing EC2 track remains live until cutover is proven.
**FRs covered:** FR-AWS-001, FR-AWS-002, FR-AWS-003, FR-AWS-004, FR-AWS-005, FR-AWS-006, FR-AWS-007, FR-AWS-008
**Dependencies:**
- Epic 2 should complete before this epic — migrating to ECS Fargate with higher container concurrency and a DbContext lifetime bug in place is a latent failure waiting for load
- Epic 1 (SEC-003) rotation is temporary; Epic 9 (FR-AWS-006 Secrets Manager) supersedes it

---

### Epic 10: Frontend Design System Rebuild
The production React app implements the `docs/design` visual system: custom shell, tokenized primitives, finance-first page layouts, accessible drawers and controls, mobile bottom navigation, and verified responsive behavior.
**FRs covered:** FR-UX-001, FR-UX-002, FR-UX-003, FR-UX-004, FR-UX-005, FR-UX-006, FR-UX-007
**Dependencies:**
- Epic 1 must complete before broad UI rollout so redesigned screens do not expand usage of known object-level authorization defects
- Epic 4 should complete before the Transactions redesign ships, because the redesigned filter chips and drawer should bind to typed, database-side filtering semantics
- Epic 7 Story 7.1 should complete before Story 10.1b or the first TypeScript-heavy page rebuild; every Epic 10 story remains responsible for adding no new `any` usage even if 7.1 is not complete
- Epic 7 Story 7.2 may be scheduled with this epic, but route lazy-loading remains Epic 7 ownership

**Execution order:**
10.1a -> 10.1b -> 10.1c -> 10.2 -> 10.3a/10.3b/10.3c -> 10.4 -> 10.5a/10.5b -> 10.6.

Stories grouped with slashes may run in parallel only after their prerequisite foundation stories are done and when shared ownership hotspots are actively coordinated: `App.tsx`, EN/RU locale files, `package.json`/`package-lock.json`, shared primitives, and route/redirect ownership. Story 10.6 is the final visual QA gate and starts only after Stories 10.1a through 10.5b are done.

---

## Epic 1: Security & Production Hygiene

Users can trust that their financial data is fully isolated to their account and that session management is race-condition-safe. Developers work in a clean, secret-free local environment.

### Story 1.1: Enforce Object-Level Authorization in Service Methods

As an authenticated user,
I want API operations to only access entities I own,
So that another user cannot read, modify, or delete my financial data by guessing entity IDs.

**Acceptance Criteria:**

**Given** an authenticated user A and a separate authenticated user B with their own accounts, categories, budgets, and transactions
**When** user A calls `GET /api/accounts/{id}`, `PUT /api/accounts/{id}`, or `DELETE /api/accounts/{id}` using an ID that belongs to user B
**Then** the API returns `404 Not Found` (not the entity, not a 403)

**Given** the same scenario for categories, budgets, and transactions
**When** user A calls any single-entity read, update, or delete endpoint on user B's data
**Then** each returns `404 Not Found` consistently

**Given** a valid single-entity operation by the owning user
**When** user A accesses their own account, category, budget, or transaction by ID
**Then** the operation succeeds with the same behavior as before this change

**Given** the fix is implemented in `AccountService`, `CategoryService`, `BudgetService`, and `TransactionService`
**When** each service method performs a single-entity lookup
**Then** the query includes both `Id == id` AND `UserId == userId` predicates — never Id alone

**Given** the integration test suite
**When** the story is complete
**Then** `inex.Tests` contains cross-user read, update, and delete denial tests for each of the four affected domains, and all 95+ existing tests continue to pass

### Story 1.2: Fix Refresh Token Rotation Race Condition

As a user with an active session on multiple devices,
I want refresh token rotation to be safe under concurrent requests,
So that my session security does not depend on request timing.

**Acceptance Criteria:**

**Given** a valid unused refresh token
**When** two concurrent requests arrive simultaneously to `POST /api/auth/refresh` using the same token
**Then** only one request succeeds in rotating the token; the other receives a consistent non-success response (401 or 409)

**Given** a refresh token that has already been used
**When** any subsequent request attempts to use that token
**Then** the request is rejected and the active session chain is revoked (existing reuse detection behavior preserved)

**Given** the implementation uses either an EF Core concurrency token on `RefreshToken` or a conditional database update within a transaction
**When** the change is deployed
**Then** no new external library dependencies are introduced; the fix uses EF Core's built-in concurrency mechanisms

**Given** the fix is implemented
**When** the story is complete
**Then** a concurrency test in `inex.Tests` covers simultaneous refresh attempts and asserts only one succeeds

### Story 1.3: Fix Account Update Returns 422

As a user editing an account,
I want saving account changes to succeed,
So that I can rename, describe, or enable/disable accounts from the UI.

**Acceptance Criteria:**

**Given** a user opens an existing account and changes its name or description
**When** they submit the edit form
**Then** the update succeeds (200 OK) and the changes are reflected immediately — no 422 error

**Given** the root cause: `updateAccount` thunk in `accounts-actions.ts` omits the `key` field from its payload
**When** the fix is applied
**Then** the PUT request body includes `key`, satisfying `AccountUpdateValidator` which inherits the `key.required` rule from `AccountCreateValidator`

**Given** the fix is applied
**When** `npm run build` and `npm run lint` complete
**Then** both pass with no new errors or type warnings

### Story 1.4: Rotate and Externalize Local Secrets

As a maintainer,
I want real credentials kept out of plaintext workspace files,
So that local development does not leak production or shared secrets.

**Acceptance Criteria:**

**Given** the `.env` file currently contains a database password and an exchange API key
**When** this story is complete
**Then** any real (non-placeholder) credentials found in `.env` are rotated in their respective services (exchange API, database)

**Given** the new local development setup
**When** a developer follows the documented process
**Then** secrets are injected via either `dotnet user-secrets` or a `.env` file that is never committed — documented in `.env.example` with placeholder values only

**Given** the `.env.example` file
**When** reviewed
**Then** it contains all required variable names with safe placeholder values and instructions for obtaining real values

**Given** the git history
**When** this story is complete
**Then** no secret-bearing files are tracked; secret scanning can run clean locally

### Story 1.5: Remove Tracked Frontend Build Artifacts

As a developer,
I want generated frontend build output excluded from source control,
So that `npm run build` does not produce noisy commit diffs of binary and hashed assets.

**Acceptance Criteria:**

**Given** `inex/ClientApp/build` is currently tracked in git
**When** this story is complete
**Then** `git ls-files inex/ClientApp/build` returns no output

**Given** `.gitignore` already lists `ClientApp/build`
**When** the tracked files are removed with `git rm --cached -r inex/ClientApp/build`
**Then** running `npm run build` afterward produces no changes to tracked files

**Given** the Docker multi-stage build and production deployment
**When** the tracked artifacts are removed
**Then** the container build and `docker-compose up` still produce and serve the SPA correctly — build output is generated at container build time, not committed

---

## Epic 2: Safer Data Access And Reliable Time Behavior

Data access lifetime and timestamp behavior are made safe so later auth, filtering, rate, and reporting work produces reliable results.

### Story 2.1: Backend — Fix Repository Disposal and DbContext Lifetime

As a developer,
I want data access abstractions to manage DbContext lifetime correctly,
So that services do not manually dispose a DI-managed context and introduce stale-state or connection-pool bugs.

**Acceptance Criteria:**

**Given** `inex.Data/Repositories/Base/Repository.cs` currently implements `IDisposable` and disposes the `DbContext`
**When** this story is complete
**Then** `Repository` no longer implements `IDisposable`; the `DbContext` lifetime is managed entirely by the DI container

**Given** `inex.Data/Repositories/InExUnitOfWork.cs` disposes multiple repositories sharing the same context
**When** this story is complete
**Then** `InExUnitOfWork.Dispose` no longer chains repository disposals; it only disposes resources it directly owns

**Given** `inex.Services/Services/Base/Service.cs` calls `Dispose` on repositories or the unit of work
**When** this story is complete
**Then** those calls are removed; services do not manually manage DbContext lifetime

**Given** the existing 95+ tests
**When** `dotnet test` runs after the change
**Then** all tests pass; no new connection or context errors appear

### Story 2.2: Backend — Injectable Clock Abstraction and UTC Consistency

As a developer,
I want time reads to use an injectable clock abstraction,
So that code depending on "now" is deterministically testable and persisted timestamps are UTC-consistent throughout.

**Acceptance Criteria:**

**Given** `DateTime.Now` and `DateTime.UtcNow` are used directly in services
**When** this story is complete
**Then** an `IClock` interface with a `UtcNow` property is introduced in `inex.Services`; a `SystemClock` production implementation is registered in DI

**Given** `BudgetService` uses `DateTime.Now` for default year/month
**When** this story is complete
**Then** it receives `IClock` via constructor injection and uses `_clock.UtcNow`

**Given** `CurrencyConfiguration.cs` EF seed data uses dynamic timestamps
**When** this story is complete
**Then** seed data uses fixed `DateTime` constants — not runtime values

**Given** any service that creates audit timestamps (`CreatedAt`, `UpdatedAt`)
**When** this story is complete
**Then** all persisted timestamps use UTC consistently — no mix of `DateTime.Now` and `DateTime.UtcNow`

**Given** `IClock` is injectable
**When** unit tests for token expiry and rate date logic are written
**Then** they inject a `FakeClock` with a fixed timestamp — fully deterministic

**Given** the story is complete
**When** `dotnet test` runs
**Then** all existing tests pass; a unit test covers budget default year/month behavior with a fixed `FakeClock`

---

## Epic 3: Email Verification

New registrations require email ownership verification before the account can be used. The invite-token gate controls who registers; email confirmation verifies they own the address.

### Story 3.1: Backend — Registration Sends Confirmation Email

As a newly registered user,
I want to receive an email confirmation link immediately after registering,
So that I can verify my email address before using the app.

**Acceptance Criteria:**

**Given** `POST /api/auth/register` is called with a valid invite token and registration payload
**When** the user is created successfully
**Then** the response is `202 Accepted` (not a JWT) and a confirmation email is sent to the registered address

**Given** the development environment
**When** registration completes
**Then** the confirmation link appears in Serilog output via `LoggingEmailSender` — no SMTP config required locally

**Given** the production environment
**When** registration completes
**Then** the confirmation email is sent via `SesEmailSender` using `AWSSDK.SimpleEmail`; the sender address is read from SSM/environment (`EMAIL_SENDER_ADDRESS`)

**Given** a user whose email is not yet confirmed
**When** they attempt to log in via `POST /api/auth/login`
**Then** the response is `403 Forbidden` with error code `email-not-confirmed`

**Given** the injectable `IClock` abstraction (from Epic 2)
**When** the confirmation token is generated via `UserManager.GenerateEmailConfirmationTokenAsync`
**Then** token creation uses the clock abstraction so expiry is deterministically testable

**Given** the story is complete
**When** `dotnet test` runs
**Then** unit tests cover token generation and `LoggingEmailSender`; integration tests cover the 202 response on register and 403 on unconfirmed login

### Story 3.2: Backend — Confirm-Email and Resend Endpoints

As a user who received a confirmation email,
I want clicking the link to confirm my account and log me in,
So that I can start using the app without a separate login step.

**Acceptance Criteria:**

**Given** a valid `userId` and `token` from the confirmation email
**When** `GET /api/auth/confirm-email?userId={id}&token={token}` is called
**Then** the response is `200 OK` with a JWT (same payload as a successful login)

**Given** an invalid or expired token
**When** `GET /api/auth/confirm-email` is called
**Then** the response is `400 Bad Request` with a machine-readable error code (`token.invalid` or `token.expired`)

**Given** a user who did not receive or lost their confirmation email
**When** they call `POST /api/auth/resend-confirmation` with their email address
**Then** a new confirmation email is sent and the previous token is superseded

**Given** a user whose email is already confirmed
**When** `POST /api/auth/resend-confirmation` is called
**Then** the response is `400 Bad Request` with error code `email.already-confirmed`

**Given** the story is complete
**When** `dotnet test` runs
**Then** integration tests cover: valid confirmation issues JWT, invalid token returns 400, already-confirmed returns 400, resend sends new email

### Story 3.3: Frontend — Email Confirmation UI Flow

As a newly registered user,
I want the app to guide me through email confirmation,
So that I understand what to do next after registering and can complete verification from my email.

**Acceptance Criteria:**

**Given** `POST /api/auth/register` returns `202 Accepted`
**When** the registration form submits successfully
**Then** the app redirects to `/check-email` — a static page saying "We sent a confirmation link to your email. Check your inbox." with a "Resend" button

**Given** a user clicks the confirmation link in their email (format: `/confirm-email?userId=&token=`)
**When** the `/confirm-email` route mounts
**Then** it reads `userId` and `token` from the URL, calls `GET /api/auth/confirm-email`, shows a loading state, then either redirects to `/transactions` on success or shows an error message on failure

**Given** a user attempts to log in with an unconfirmed account and the API returns `403` with `email-not-confirmed`
**When** the login form receives this response
**Then** it displays a localized message with a "Resend confirmation email" link

**Given** the "Resend" button on `/check-email` or the login error link
**When** the user clicks it
**Then** it calls `POST /api/auth/resend-confirmation` and shows success or error feedback

**Given** all new UI strings
**When** reviewed
**Then** every string is in `en/translation.json` and `ru/translation.json`; no hardcoded UI text

---

## Epic 4: Transaction Filtering Quality

Users can filter large transaction histories by tag and reference reliably — all filtering executes database-side. A visual indicator shows when filters are active. The filter API moves from a custom string DSL to typed query parameters.

### Story 4.1: Backend — Move Tag/Ref Filtering to Database-Side

As a user with a large transaction history,
I want tag and reference filters to apply at the database level,
So that filtering and pagination remain fast regardless of how many transactions I have.

**Acceptance Criteria:**

**Given** `TransactionService.ApplyFilters` currently calls `AsEnumerable()` before evaluating tag/ref predicates
**When** this story is complete
**Then** `AsEnumerable()` is removed from the tag/ref filter branches; all filtering composes as `IQueryable` before `Count`, `Skip`, and `Take` are applied

**Given** a tag filter is applied (e.g. `#groceries`)
**When** the query executes
**Then** the generated SQL contains a `LIKE` predicate or a join on `TransactionTagDetails` — no in-memory evaluation

**Given** a ref filter is applied (e.g. `@alice`)
**When** the query executes
**Then** the same database-side translation applies

**Given** existing tag-only, ref-only, and combined tag+ref filter scenarios
**When** `dotnet test` runs after the change
**Then** all existing filter behavior is preserved and new tests cover tag-only, ref-only, combined, and paginated results

**Given** a request with both a tag filter and pagination (`?page=2&pageSize=20`)
**When** the query executes
**Then** `Count` reflects the filtered total (not the full table), and `Skip`/`Take` operate on the already-filtered set

### Story 4.2: Backend + Frontend — Typed Transaction Filter Query Parameters

As an API consumer,
I want transaction filtering to use standard typed query parameters,
So that filters are robust, URL-safe, and easy to construct without a custom string DSL.

**Acceptance Criteria:**

**Given** the current filter format (`AccountId:1;Tags:groceries;` concatenated string)
**When** this story is complete
**Then** `GET /api/transactions` accepts individual typed query parameters: `accountId`, `categoryId`, `tag`, `ref`, `startDate`, `endDate`, `page`, `pageSize`

**Given** multiple values for the same filter (e.g. two account IDs)
**When** the request is made
**Then** repeated parameters are supported (e.g. `?accountId=1&accountId=2`) and treated as OR within that field

**Given** special characters in tag or ref values (e.g. `#café`, `@user+name`)
**When** passed as URL-encoded query parameters
**Then** they are correctly decoded and matched without corruption

**Given** the frontend `transactions-actions.ts`
**When** building the filter request
**Then** it uses `URLSearchParams` to construct the query string — no manual string concatenation of `Key:Value;` pairs

**Given** the existing filter behavior (account, category, date range, tag, ref)
**When** `dotnet test` runs after the change
**Then** all existing filter tests pass; new tests cover multi-value params and URL-encoded special characters

**Given** the `FilterHelper.cs` parsing logic
**When** this story is complete
**Then** the custom DSL parser is removed; filtering is driven entirely by bound query parameters

### Story 4.3: Frontend — Active Filter Indicator on Transaction List

As a user viewing the transaction list,
I want a visual indicator when filters are active,
So that I don't forget I'm looking at a filtered subset of my transactions.

**Acceptance Criteria:**

**Given** no filters are applied to the transaction list
**When** the list renders
**Then** no filter indicator is shown

**Given** one or more filters are active (account, category, date range, tag, or ref)
**When** the list renders
**Then** a visible indicator appears (e.g. a badge on the filter button, or a dismissible chip row) showing that results are filtered

**Given** the filter indicator is visible
**When** the user clears all filters
**Then** the indicator disappears and the full unfiltered list reloads

**Given** the indicator renders
**When** `npm run build` and `npm run lint` complete
**Then** both pass with no new errors; all indicator text is in `en/translation.json` and `ru/translation.json`

---

## Epic 5: Exchange Rate Expansion

Users with BYN or RUB accounts get accurate exchange rates sourced from NBRB via a single batch range call.

### Story 5.1: Backend — NBRB Exchange Rate Client for BYN/RUB

As a user with BYN or RUB accounts,
I want my exchange rates sourced from the National Bank of the Republic of Belarus (NBRB),
So that my multi-currency calculations use accurate rates for those currencies.

**Acceptance Criteria:**

**Given** a request for BYN or RUB exchange rates for a date range
**When** `ExchangeRateService` processes the request
**Then** it calls the NBRB rate endpoint via `NbrbApiClient` using a single range call — not one call per date

**Given** NBRB provides rates via `GET https://api.nbrb.by/exrates/rates?periodicity=0&ondate={date}`
**When** the client fetches a date range
**Then** it makes the minimum number of API calls required, respecting any `Retry-After` header on 429 responses

**Given** NBRB returns rates only for dates it has data (weekends/holidays may be missing)
**When** a missing date is requested
**Then** the client falls back to the nearest available prior date's rate — not an error

**Given** the `IClock` abstraction (from Epic 2)
**When** `NbrbApiClient` determines "today" for relative date calculations
**Then** it uses the injected clock — not `DateTime.UtcNow` directly

**Given** currencies other than BYN and RUB
**When** `ExchangeRateService` processes those currencies
**Then** the existing Frankfurter/CurrencyAPI chain is used unchanged — NBRB is additive, not a replacement

**Given** the naming collision risk noted in deferred-work
**When** `NbrbApiClient` defines its API response model
**Then** it is named `NbrbRateResponse` — no new collision with existing `ExchangeRateResponse` types

**Given** the story is complete
**When** `dotnet test` runs
**Then** unit tests cover: BYN/RUB routes through NBRB client, missing-date fallback to nearest prior rate, non-BYN/RUB routes through existing chain unchanged

---

## Epic 6: Dashboard & Spending Insights

Users see their financial picture at a glance: monthly income/expense/savings summary cards on the home dashboard, a spending heatmap calendar, and a historical net worth chart.

### Story 6.1: Frontend — Dashboard Home Page and Navigation Restructure

As a user opening the app,
I want to land on a meaningful home dashboard,
So that I see my financial overview immediately rather than navigating blind.

**Acceptance Criteria:**

**Given** the app currently lands on `/transactions` after login
**When** this story is complete
**Then** the default post-login route is `/dashboard` (or `/`) and the navigation menu reflects the new structure

**Given** the Reports section in the navigation
**When** this story is complete
**Then** Reports is reorganized as a top-level nav item (or submenu) clearly separate from the dashboard — no functional regression on existing report pages

**Given** the new `/dashboard` route
**When** it renders
**Then** it displays a placeholder layout ready to receive the month summary cards and charts from subsequent stories — the shell is wired, not empty

**Given** all navigation label strings
**When** reviewed
**Then** every label is in `en/translation.json` and `ru/translation.json`

**Given** `npm run build` and `npm run lint`
**When** run after this change
**Then** both pass with no regressions on existing routes (`/transactions`, `/accounts`, `/categories`, `/budgets`, `/reports`)

### Story 6.2: Frontend — Month Summary Cards

As a user on the dashboard,
I want to see this month's income, expenses, and net savings at a glance,
So that I can quickly assess my financial health without running a report.

**Acceptance Criteria:**

**Given** the dashboard home page (from Story 4.1)
**When** it loads
**Then** three summary cards are displayed: Total Income, Total Expenses, Net Savings — each showing the current month's figure in the user's base currency

**Given** a previous month exists with transaction data
**When** the cards render
**Then** each card shows a MoM delta (e.g. +12% vs last month) with directional color coding (green for positive savings/income trend, red for negative)

**Given** no transactions exist for the current month
**When** the cards render
**Then** each card shows 0 with a neutral state — no errors or blank space

**Given** the data is fetched from the existing reports API
**When** the API call is made
**Then** it reuses an existing endpoint — no new backend endpoint required for this story

**Given** all card labels and delta text
**When** reviewed
**Then** all strings are in `en/translation.json` and `ru/translation.json`

### Story 6.3: Frontend — Spending Heatmap Calendar

As a user wanting to understand my spending patterns,
I want a GitHub-style daily spend heatmap on the Reports page,
So that I can see at a glance which days I spend the most.

**Acceptance Criteria:**

**Given** the Reports section
**When** a user navigates to the heatmap view
**Then** a calendar grid is displayed showing the last 12 months, with each day cell colored by spend intensity (darker = higher spend)

**Given** a day with no transactions
**When** it renders in the grid
**Then** the cell shows the lowest intensity color — not blank or broken

**Given** a day with transactions
**When** the user hovers over or taps the cell
**Then** a tooltip shows the date and total spend amount in the user's base currency

**Given** the heatmap is built using the `recharts` library (already in the project)
**When** `npm run build` completes
**Then** no new charting dependencies are added

**Given** all labels and tooltip text
**When** reviewed
**Then** all strings are in `en/translation.json` and `ru/translation.json`

### Story 6.4: Backend + Frontend — Historical Net Worth Chart

As a user wanting to track my financial progress over time,
I want a chart showing my total net worth by month,
So that I can see whether I'm accumulating or losing wealth over time.

**Acceptance Criteria:**

**Given** a user with accounts in multiple currencies
**When** `GET /api/reports/net-worth?months=12` is called
**Then** the response returns a monthly series of total net worth values converted to the user's base currency using period-accurate exchange rates

**Given** the NBRB exchange rate client is available (Epic 5)
**When** the net worth calculation includes BYN or RUB accounts
**Then** NBRB rates are used for those currencies; Frankfurter rates used for all others

**Given** an account that was closed mid-period
**When** the net worth for months before closure is calculated
**Then** the account's balance at that time is included — closed accounts do not retroactively disappear from history

**Given** the injectable `IClock` abstraction (from Epic 2)
**When** "current month" is calculated
**Then** it uses the clock abstraction — deterministically testable

**Given** the frontend dashboard
**When** the chart renders
**Then** a line chart (using `recharts`) shows net worth by month for the selected period with axis labels in the user's locale

**Given** the story is complete
**When** `dotnet test` runs
**Then** unit tests cover the multi-currency aggregation logic and period-accurate rate selection

### Story 6.5: Backend — Fix Category Report Data Gaps and Localization

As a user running a category spending report,
I want the report to include transactions for all my categories (including inactive ones),
So that my historical spending data is complete and not silently excluded by category status.

**Acceptance Criteria:**

**Given** a user has categories that were active when transactions were made but are now inactive
**When** `GET /api/reports/categories` is called
**Then** transactions against inactive categories appear in the report output — category active/inactive status must not filter out transactions from history

**Given** `GetCategoriesReportData` currently filters to ACTIVE categories only
**When** this story is complete
**Then** the query includes transactions for all user-owned categories regardless of status; category status may be included in the response for display purposes but must not exclude spending data

**Given** `BuildReportDataResponse` is used by `GetCategoriesReportData` and leaves `TotalIncome` and `TotalOutcome` at 0
**When** this story is complete
**Then** category report entries correctly populate both totals, matching the explicit assignment pattern used in `BudgetReportService`

**Given** `ReportService.GetCategoriesReportData` contains the hardcoded Russian string `"Расходы по категориям"`
**When** this story is complete
**Then** the report title is either removed from the API response (rendered on the frontend via i18n) or returned as a translation key — no hardcoded language strings in services

**Given** the story is complete
**When** `dotnet test` runs
**Then** existing report tests pass; new tests cover: inactive-category transactions included, `TotalIncome`/`TotalOutcome` correctly populated, no hardcoded string in service output

## Epic 7: Faster, Safer Frontend Evolution

The frontend becomes easier to change safely through typed models, smaller bundles, RTK Query data ownership, and automated component tests.

### Story 7.1: Frontend — Typed API Models, Eliminate `any` in Core Flows

As a frontend developer,
I want API response shapes and Redux payloads typed explicitly,
So that TypeScript catches contract drift and wiring mistakes before runtime.

**Acceptance Criteria:**

**Given** the transaction list, transaction slice, and transaction actions currently use `any` extensively
**When** this story is complete
**Then** `transactions-slice.ts`, `transactions-actions.ts`, and `TransactionList.tsx` use explicit types for all API payloads, state shapes, and component props

**Given** the shared API model types
**When** created
**Then** they live under `inex/ClientApp/src/model/` following the existing domain folder structure and mirror the backend `*Response` / `*Request` naming convention

**Given** `Dropdown.tsx` and `AutoComplete.tsx` currently use `any` for option props
**When** this story is complete
**Then** both components are typed with explicit option interfaces

**Given** the change is applied
**When** `npm run build` and `npm run lint` complete
**Then** both pass; no new `any` usages are introduced in touched files

**Given** future new files in cleaned areas
**When** `@typescript-eslint/no-explicit-any` is enabled for those paths
**Then** the lint rule is configured (warn or error) for at minimum `store/transactions/` and `components/` directories

### Story 7.2: Frontend — Route-Based Code Splitting and Vendor Chunks

As a user loading the app for the first time,
I want the initial JavaScript bundle to be small,
So that the app starts quickly even on a slower connection.

**Acceptance Criteria:**

**Given** the current main production chunk is ~1.9 MB minified (exceeds Vite's 500 KB warning threshold)
**When** this story is complete
**Then** `npm run build` no longer reports the oversized chunk warning for the main entry point

**Given** the major page routes (Reports, Transactions, Budgets, Categories, Accounts, Dashboard)
**When** this story is complete
**Then** each is loaded via `React.lazy` + `Suspense` — route-level lazy loading applied to all top-level pages

**Given** large vendor libraries (`antd`, `recharts`)
**When** the Vite config is updated
**Then** a `manualChunks` configuration splits them into separate vendor chunks

**Given** the lazy-loaded routes
**When** a user navigates to any page
**Then** the page loads correctly with no blank screens or chunk fetch errors; a loading fallback is shown during chunk fetch

**Given** `npm run build` after the change
**When** reviewed
**Then** no single chunk exceeds 500 KB (or any exception is documented with justification)

### Story 7.3: Frontend — Introduce Vitest and React Testing Library

As a frontend developer,
I want a fast, reliable frontend test runner with React component testing support,
So that I can write and run tests for UI components and Redux logic without a full browser.

**Acceptance Criteria:**

**Given** the frontend currently has no committed test script or test files
**When** this story is complete
**Then** `vitest` and `@testing-library/react` are installed as dev dependencies and a `test` script exists in `package.json`

**Given** the test runner setup
**When** `npm test` runs from `inex/ClientApp`
**Then** it executes all `*.test.tsx` / `*.test.ts` files and reports pass/fail

**Given** the new test infrastructure
**When** this story is complete
**Then** at least two smoke tests exist: one testing a Redux slice reducer directly, one rendering a simple component and asserting on output

**Given** the Vite configuration
**When** Vitest is configured
**Then** it reuses the existing Vite config via `defineConfig` merge — no duplicate build config

**Given** `npm run build` and `npm test`
**When** both run
**Then** both pass with no conflicts between build and test configurations

### Story 7.4a: Frontend — RTK Query Pattern For Transactions

As a frontend developer,
I want the transactions domain to establish the RTK Query migration pattern,
So that cache keys, loading states, and authenticated API behavior are proven before all domains move.

**Acceptance Criteria:**

**Given** the typed query params API contract from Epic 4 (FR-FE-006 / API-001)
**When** the transactions RTK Query endpoint is defined
**Then** the cache key is built from the typed `TransactionFilterParams` object — not a concatenated string

**Given** the existing transactions Redux state
**When** the migration is complete
**Then** transactions loading states, error states, and data are sourced from RTK Query hooks — manual transaction thunk behavior is removed only after the replacement is verified

**Given** the `apiClient` Axios instance (owns auth headers + refresh retry)
**When** RTK Query is configured
**Then** it uses `axiosBaseQuery` wrapping the existing `apiClient` — bearer token injection and refresh retry behavior are preserved

**Given** the story is complete
**When** `npm test` runs
**Then** transactions RTK Query endpoint tests cover: successful fetch caches result, refetch on invalidation, error state on API failure

### Story 7.4b: Frontend — RTK Query Migration For Accounts And Categories

As a frontend developer,
I want accounts and categories migrated after the transactions pattern is proven,
So that shared cache and invalidation conventions are reused instead of reinvented per domain.

**Acceptance Criteria:**

**Given** Story 7.4a has established the RTK Query API pattern
**When** accounts and categories are migrated
**Then** each domain has an RTK Query API slice defined in `store/{domain}/{domain}-api.ts` replacing its manual `*-actions.ts` thunks

**Given** account and category create, update, status, and delete flows
**When** mutations complete
**Then** affected lists and detail views invalidate or refresh predictably without stale UI state

**Given** the story is complete
**When** `npm test` and `npm run build` run
**Then** both pass with account and category endpoint coverage for success and API failure states

### Story 7.4c: Frontend — RTK Query Migration For Budgets And Reports

As a frontend developer,
I want budgets and reports migrated after simpler domains,
So that period-based cache keys and report invalidation are handled deliberately.

**Acceptance Criteria:**

**Given** budgets use month/year and copy-from-month workflows
**When** budgets are migrated
**Then** budget cache keys include the relevant period and copy mutations invalidate both source-sensitive and target month views where needed

**Given** reports use period, account, category, and currency-sensitive parameters
**When** reports are migrated
**Then** report cache keys are typed and deterministic, not concatenated strings

**Given** the story is complete
**When** `npm test` and `npm run build` run
**Then** both pass with budget and report endpoint coverage for success and API failure states

---

## Epic 8: Maintainable Backend Change And Clean Build Signal

Backend change becomes safer through a VSA/MediatR spike, clearer contracts, warning cleanup, and removal of small code-quality traps.

### Story 8.1: Backend — VSA Spike: CopyBudgets as MediatR Handler

As a developer,
I want to explore Vertical Slice Architecture with MediatR,
So that I understand how CQRS-style handlers compare to the existing layered service pattern on a real feature.

**Acceptance Criteria:**

**Given** `BudgetService.CopyBudgetsAsync` currently implements copy logic inside the layered service
**When** this story is complete
**Then** a new `CopyBudgetsCommand` + `CopyBudgetsHandler` exists in `inex.Services/Features/Budgets/CopyBudgets/` implementing `IRequest<Unit>`

**Given** `MediatR` is added to `inex.Services`
**When** the handler is registered
**Then** `Program.cs` uses `AddMediatR(cfg => cfg.RegisterServicesFromAssembly(...))` — no service locator patterns

**Given** the new handler
**When** the copy budgets endpoint is called
**Then** behavior is identical to the previous `BudgetService` implementation — no functional regression

**Given** the existing layered `BudgetService`
**When** this story is complete
**Then** the copy logic remains in `BudgetService` as well — the handler runs alongside it as a spike, not a migration; a decision note is added to `deferred-work.md` on whether to proceed with VSA more broadly

**Given** the story is complete
**When** `dotnet test` runs
**Then** existing budget tests pass; a unit test covers `CopyBudgetsHandler` directly with a mocked repository

### Story 8.2: Backend — Build Warning Cleanup

As a developer,
I want build output to be free of XML documentation warning noise,
So that real warnings are not drowned out and the build signal is reliable.

**Acceptance Criteria:**

**Given** `dotnet build inex.sln` currently produces repeated CS1591 warnings for missing `ct` parameter documentation
**When** this story is complete
**Then** `dotnet build inex.sln` produces zero CS1591 warnings

**Given** the decision on XML documentation
**When** this story is complete
**Then** either: (a) all `ct` parameters are documented consistently, or (b) XML doc generation is disabled for projects where it adds no value — the chosen approach is documented in `.editorconfig` or a code comment

**Given** the cleaned build output
**When** a new genuine warning is introduced
**Then** it is visible without being buried in repeated noise

### Story 8.3a: Backend — DTO Naming Cleanup

As a developer,
I want remaining backend DTO-shaped contracts renamed to purpose-based request/response names,
So that backend contracts follow established naming conventions consistently.

**Acceptance Criteria:**

**Given** `ResponseTransferDTO` still follows the old `Response*DTO` naming pattern
**When** this story is complete
**Then** it is renamed to `TransferResponse` and all backend usages are updated

**Given** all backend contract renames are applied
**When** this story is complete
**Then** stale `DTO` names are not present in backend model, mapper, service, controller, or test usages

**Given** the story is complete
**When** `dotnet build inex.sln` runs
**Then** it passes with no new errors or warnings

### Story 8.3b: Frontend — Report Model Naming Cleanup

As a frontend developer,
I want report model names to describe app concepts rather than transport suffixes,
So that frontend types remain clear and consistent with the no-`DTO` convention.

**Acceptance Criteria:**

**Given** frontend TypeScript interfaces `BudgetComparisonDTO` and `ReportMetadataDTO` in `inex/ClientApp/src/model/Report/`
**When** this story is complete
**Then** they are renamed to `BudgetComparison` and `ReportMetadata`; all usages in slice, action, and page files are updated

**Given** the story is complete
**When** `npm run build` runs
**Then** it passes with no stale report DTO imports or type references

### Story 8.3c: Backend — Split Response Types From Request Types

As a developer,
I want response contracts structurally independent from request contracts,
So that API responses do not inherit request-intent semantics.

**Acceptance Criteria:**

**Given** `AccountResponse` inherits from `UpdateAccountRequest` which inherits from `CreateAccountRequest`, and `CategoryResponse` follows the same pattern (BUG-009)
**When** this story is complete
**Then** response types and request types are structurally independent — response types no longer carry request-intent semantics; a decision note is added to the PR if the split introduces non-trivial API surface changes

**Given** the response/request split is complete
**When** affected controller, service, mapper, frontend type, and test usages are searched
**Then** no stale inheritance assumptions remain

**Given** the story is complete
**When** `dotnet build inex.sln` and `npm run build` run
**Then** both pass with no new errors

### Story 8.3d: Backend — Service Response Safety Cleanup

As a developer,
I want service response helpers and pagination metadata to be safe by construction,
So that latent null and visibility defects are removed without bundling unrelated renames.

**Acceptance Criteria:**

**Given** `BuildPaginatedDataResponse` and `BuildReportDataResponse` in `inex.Services/Services/Base/Service.cs` are `public`
**When** this story is complete
**Then** both helpers are `protected` — they are internal service implementation details, not public API

**Given** `PagedResponse<T,TMeta>.Metadata` uses `default!` to suppress a nullable warning (BUG-008)
**When** this story is complete
**Then** all construction sites set `Metadata` explicitly, or the property type is adjusted so the suppressor is not needed

**Given** the story is complete
**When** `dotnet build inex.sln` runs
**Then** it passes with no new errors or warnings

---

## Epic 9: Managed Production Operations On AWS

Production moves toward managed deploys, backups, secrets, TLS, and observability while the existing EC2 track remains live until cutover is proven.

### Story 9.1: Infra — ECR Image Push from CI

As a developer,
I want the CI pipeline to push Docker images to ECR automatically,
So that a versioned, immutable image is available for every merged commit.

**Acceptance Criteria:**

**Given** a push to `master` triggers GitHub Actions
**When** the CI workflow runs
**Then** a Docker image is built, tagged with the commit SHA, and pushed to the existing ECR repository

**Given** the image is pushed
**When** ECR is checked
**Then** the image has an immutable SHA tag and a `latest` tag; old untagged images are subject to the existing lifecycle policy

**Given** the CI workflow
**When** reviewed
**Then** AWS credentials are injected via GitHub Actions OIDC — no long-lived access keys stored as secrets

### Story 9.2: Infra — RDS Managed MySQL

As a developer,
I want the database running on RDS rather than a self-managed MySQL container,
So that backups, patching, and failover are handled by AWS.

**Acceptance Criteria:**

**Given** an RDS MySQL 8.0 instance is provisioned
**When** the app connects using the existing `ConnectionStrings:InExConnection` pattern
**Then** all EF Core migrations apply cleanly and the app starts successfully against RDS

**Given** the RDS instance
**When** provisioned
**Then** it is in a private subnet; not publicly accessible; the security group allows inbound only from the ECS task security group

**Given** the RDS connection string
**When** stored
**Then** it is in AWS Secrets Manager — not hardcoded in task definitions or environment variables

**Given** the existing MySQL S3 backup cron
**When** RDS is active
**Then** RDS automated backups are enabled (7-day retention minimum) as a replacement; the EC2 mysqldump cron is documented as superseded

### Story 9.3: Infra — ECS Fargate Container Deployment

As a developer,
I want the app running on ECS Fargate,
So that container infrastructure is managed by AWS without maintaining an EC2 instance.

**Acceptance Criteria:**

**Given** an ECS cluster, task definition, and service are created
**When** the task starts
**Then** the container runs the image from ECR (Story 9.1), connects to RDS (Story 9.2), and `GET /health` returns 200

**Given** the task definition
**When** reviewed
**Then** the task IAM role has only required permissions: ECR pull, Secrets Manager read, CloudWatch Logs write — no wildcard policies

**Given** ECS service deployment
**When** a new task revision is deployed
**Then** the old task continues serving traffic until the new task passes health checks — no downtime during deployment

**Given** the E-track (EC2) deployment
**When** ECS is running and verified healthy
**Then** both stacks run in parallel until cutover is confirmed — EC2 is not terminated in this story

### Story 9.4: Infra — ALB + ACM HTTPS Termination

As a user,
I want HTTPS traffic handled by a load balancer with an AWS-managed certificate,
So that TLS termination is reliable and certificate renewal is automatic.

**Acceptance Criteria:**

**Given** an Application Load Balancer is created with an ACM certificate for the production domain
**When** a request arrives on port 443
**Then** it is forwarded to the ECS Fargate target group and the app responds correctly

**Given** a request on port 80
**When** it arrives at the ALB
**Then** it is redirected to HTTPS — no plain HTTP traffic reaches the app

**Given** the existing nginx + Let's Encrypt setup on EC2
**When** ALB is handling TLS
**Then** nginx TLS termination is documented as superseded; EC2 is not yet terminated

### Story 9.5: Infra — Route 53 Custom Domain

As a user,
I want `in-ex.app` to resolve to the ALB,
So that the production domain works with the managed load balancer.

**Acceptance Criteria:**

**Given** a Route 53 hosted zone is created for `in-ex.app`
**When** the DNS record is created
**Then** an alias A record points `in-ex.app` to the ALB (Story 9.4)

**Given** the existing Porkbun DNS → Elastic IP setup
**When** Route 53 is active
**Then** Porkbun nameservers are updated to delegate to Route 53; propagation is verified with `dig`

**Given** the domain is live via ALB
**When** `https://in-ex.app/health` is called
**Then** it returns 200 — end-to-end path through Route 53 → ALB → ECS → RDS is verified

### Story 9.6: Infra — Secrets Manager Runtime Injection

As a developer,
I want all production secrets injected from AWS Secrets Manager at runtime,
So that no sensitive values appear in task definitions, environment variables, or source control.

**Acceptance Criteria:**

**Given** the ECS task definition
**When** this story is complete
**Then** `ConnectionStrings:InExConnection`, `Jwt:Secret`, `InviteOptions:Token`, and the exchange API key are sourced from Secrets Manager via `valueFrom` references — no plaintext values in the task definition

**Given** the Secrets Manager entries
**When** rotated
**Then** the task picks up new values on the next deployment without a code change

**Given** the local development setup
**When** a developer runs the app locally
**Then** they use `dotnet user-secrets` or `.env` — the Secrets Manager path is production-only; documented in `.env.example`

**Given** Epic 1 (SEC-003) established the initial rotation
**When** this story is complete
**Then** this story is noted as superseding the EC2-era SSM approach

### Story 9.7: Infra — CloudWatch Logs, Alarms, and Dashboard

As a developer operating the production system,
I want CloudWatch configured with structured logs, key alarms, and an operational dashboard,
So that I can monitor app health and be alerted to problems without manually checking logs.

**Acceptance Criteria:**

**Given** the ECS task is running
**When** the app produces structured JSON logs via Serilog
**Then** they are written to the `/inex/api` CloudWatch log group

**Given** the CloudWatch log group
**When** an unhandled exception occurs
**Then** a metric filter detects it and a CloudWatch Alarm triggers an SNS email notification

**Given** a CloudWatch dashboard is created
**When** viewed
**Then** it shows: ECS task CPU and memory, ALB request count and 5xx rate, RDS connections and latency

### Story 9.8: Infra — CI/CD GitHub Actions → ECR → ECS Rolling Deploy

As a developer,
I want merging to `master` to automatically deploy to ECS,
So that production is updated without manual intervention.

**Acceptance Criteria:**

**Given** a push to `master` passes all CI checks (build + test)
**When** the deploy step runs
**Then** it updates the ECS service with the new ECR image SHA tag, triggering a rolling deployment

**Given** the rolling deployment
**When** it completes
**Then** ECS health checks confirm new tasks are healthy before old tasks are stopped — zero-downtime deploy

**Given** the deployment workflow
**When** reviewed
**Then** it uses OIDC for AWS authentication; deploy permissions are scoped to ECS `UpdateService` and ECR `GetAuthorizationToken` only

**Given** the E-track CI/CD (GitHub Actions → ECR → EC2)
**When** the ECS pipeline is live
**Then** the EC2 deploy step is disabled or removed — one active deploy target
---

## Epic 10: Frontend Design System Rebuild

The production React app implements the `docs/design` visual system: custom shell, tokenized primitives, finance-first page layouts, accessible drawers and controls, mobile bottom navigation, and verified responsive behavior.

Execution order is fixed for foundation and final gate work: 10.1a -> 10.1b -> 10.1c -> 10.2 -> 10.3a/10.3b/10.3c -> 10.4 -> 10.5a/10.5b -> 10.6. The grouped management and settings/auth stories may run in parallel only after their prerequisites are done and shared ownership hotspots are coordinated. Story 10.6 is the final Epic 10 visual QA gate and starts only after 10.1a through 10.5b are done.

### Story 10.1a: Frontend UX - Design Tokens And Theme Bridge

As an invited InEx user,
I want the production app to expose the documented design tokens,
So that later UI work shares a stable visual foundation.

**Acceptance Criteria:**

**Given** the design tokens in `docs/design/tokens.css`
**When** this story is complete
**Then** production CSS exposes equivalent tokens for brand ink, semantic money colors, neutral surfaces, borders, elevation, radius, spacing, typography, focus rings, and motion

**Given** Ant Design components remain in production
**When** this story is complete
**Then** Ant Design theme tokens are mapped where needed without replacing the existing data-fetching, routing, or localization architecture

**Given** the story is complete
**When** `npm run build` and `npm run lint` run from `inex/ClientApp`
**Then** both pass with no new `any` usage in touched files

### Story 10.1b: Frontend UX - Shared Primitives

**Dependency:** Story 10.1b must start only after Story 10.1a is complete. Story 10.1c and later page stories consume the primitive surface and must not run ahead of it.

As an invited InEx user,
I want controls and finance values to behave consistently across every route,
So that financial workflows are easier to scan and operate on desktop and mobile.

**Acceptance Criteria:**

**Given** shared production primitives are introduced
**When** the primitive modules are imported and rendered in isolation
**Then** buttons, icon buttons, drawers, segmented controls, fields, selects, progress bars, empty states, and money values are created, exported, typed without `any`, and behave according to their documented accessibility and interaction contracts; page adoption is left to later page and shell stories

**Given** money movement is rendered
**When** income, expense, and transfer values appear in shared primitives
**Then** they use tabular numerics, explicit signage or accessible text, and do not rely on color alone

**Given** the current frontend uses React, TypeScript strict, Ant Design, Redux Toolkit, React Router, Axios, i18next, and Recharts
**When** this story is complete
**Then** existing routing, `ProtectedRoute`, logout, `apiClient`, Redux data loading, and EN/RU localization still work

**Given** the story is complete
**When** `npm run build` and `npm run lint` run from `inex/ClientApp`
**Then** both pass with no new `any` usage in touched files

### Story 10.1c: Frontend UX - App Shell And Navigation

**Dependency:** Story 10.1c must start only after Story 10.1a and Story 10.1b are complete. Story 10.1b owns the shared primitive surface and icon dependency.

As an invited InEx user,
I want the app shell and route navigation to match the design guide,
So that desktop and mobile navigation are predictable across authenticated workflows.

**Acceptance Criteria:**

**Given** the current `BasicPage` Ant Design shell
**When** the authenticated shell is rebuilt
**Then** it provides a sticky desktop top nav, brand mark, route tabs, page header, user pill, logout affordance, and no authenticated app footer

**Given** a mobile viewport at 390px
**When** a protected app route is opened
**Then** top route tabs are hidden, bottom navigation is fixed, content has safe bottom padding, and no page-level horizontal overflow appears

**Given** the story is complete
**When** `npm run build`, `npm run lint`, and mobile visual QA run
**Then** all pass with no route protection, logout, or localization regressions

### Story 10.2: Frontend UX - Transactions Ledger Redesign

As an invited account holder,
I want the Transactions page to behave like a dense financial ledger,
So that I can scan recent movement, filter quickly, and understand cash flow without leaving the page.

**Acceptance Criteria:**

**Given** the Transactions design in `docs/design/Transactions.jsx`
**When** the production Transactions route is rebuilt
**Then** it includes the KPI strip, ledger toolbar, type segmented control, search input, active filter chips, grouped day headers, right-aligned amounts, and pagination controls

**Given** transaction filtering is available
**When** any filter, search, date range, account, category, tag, reference, or amount condition is active
**Then** the page shows a visible active-filter indicator and clearable chips without relying only on URL query text

**Given** the add/edit transaction flows
**When** the user opens create, edit, or advanced filter UI
**Then** the UI uses the shared drawer contract with Escape close, focus return, mobile full-width or bottom-sheet behavior, and accessible labels

**Given** income, expense, and transfer rows
**When** transactions render
**Then** amounts use tabular numerics, semantic colors, explicit signs or an accessible signage preference, and neutral transfer treatment

**Given** a 390px mobile viewport
**When** the Transactions route is opened with populated and empty data
**Then** ledger rows stack without horizontal overflow and the bottom navigation does not cover the final row, drawer action, or empty-state action

**Given** the story is complete
**When** visual QA is run
**Then** screenshots are captured for desktop populated, mobile populated, filter-active, filter-empty, and drawer-open states

### Story 10.3a: Frontend UX - Accounts Management Redesign

As an invited account holder,
I want the Accounts page rebuilt around balance scanning and currency groups,
So that account balances are easy to compare on desktop and mobile.

**Acceptance Criteria:**

**Given** the Accounts design reference
**When** `/accounts` is rebuilt
**Then** it includes a net-worth hero, currency distribution, active/all scope control, currency-grouped and flat views, searchable rows, compact balance cells, and create/edit drawer or inline edit behavior

**Given** empty or filter-empty states on Accounts
**When** no data or no matching results are shown
**Then** the page uses the shared InEx empty-state pattern with product-specific EN/RU copy and useful primary actions

**Given** 390px and 360px mobile viewports
**When** Accounts is opened with populated data
**Then** toolbars wrap, wide controls scroll internally, rows stack cleanly, and no page-level horizontal overflow appears

**Given** the story is complete
**When** `npm run build`, `npm run lint`, and visual QA run
**Then** all pass and screenshots cover populated, empty, and drawer-open states

### Story 10.3b: Frontend UX - Categories Management Redesign

As an invited account holder,
I want category management to preserve hierarchy while staying easy to scan,
So that category structure and spend signals remain clear.

**Acceptance Criteria:**

**Given** the Categories design reference
**When** `/categories` is rebuilt
**Then** it includes hierarchy-aware parent/child rows, tree and by-spend modes, search that preserves ancestor visibility, active/all scope, category color cues, and mobile-safe child indentation

**Given** empty or filter-empty states on Categories
**When** no data or no matching results are shown
**Then** the page uses the shared InEx empty-state pattern with product-specific EN/RU copy and useful primary actions

**Given** 390px and 360px mobile viewports
**When** Categories is opened with populated data
**Then** toolbars wrap, wide controls scroll internally, rows stack cleanly, and no page-level horizontal overflow appears

**Given** the story is complete
**When** `npm run build`, `npm run lint`, and visual QA run
**Then** all pass and screenshots cover populated, empty, drawer-open, and expanded-row states

### Story 10.3c: Frontend UX - Budgets Management Redesign

As an invited account holder,
I want budget management to focus on month planning and burn rate,
So that monthly budget health is easy to compare.

**Acceptance Criteria:**

**Given** the Budgets design reference
**When** `/budgets` is rebuilt
**Then** it includes a month switcher, burn-rate summary, copy-from-previous-month action, add budget action, budget rows, progress bars, over-budget state, and remaining/spent scan targets

**Given** empty or filter-empty states on Budgets
**When** no data or no matching results are shown
**Then** the page uses the shared InEx empty-state pattern with product-specific EN/RU copy and useful primary actions

**Given** 390px and 360px mobile viewports
**When** Budgets is opened with populated data
**Then** toolbars wrap, wide controls scroll internally, rows stack cleanly, and no page-level horizontal overflow appears

**Given** the story is complete
**When** `npm run build`, `npm run lint`, and visual QA run
**Then** all pass and screenshots cover populated, empty, and drawer-open states

### Story 10.4: Frontend UX - Reports Hub, Dashboard Landing, And Drill-Down Chrome

As an invited account holder,
I want a clear dashboard and report hub,
So that quick financial status and deeper analysis are separated but connected.

**Acceptance Criteria:**

**Given** FR-FE-002 and FR-FE-003
**When** the route IA is updated
**Then** the authenticated app has a dashboard/home landing route with month summary cards, while Reports remains the analytical hub

**Given** the Reports design reference
**When** `/reports` is opened
**Then** report cards behave as launch points with clear title, description, preview metric, and date period controls

**Given** a report drill-down route is opened
**When** the report renders
**Then** the header uses an All reports back affordance and places Share, Export, and Print actions on the drill-down route, not the hub

**Given** charts render in dashboard or report routes
**When** the chart is available visually
**Then** an accessible text or table summary is available for screen readers and export-oriented review

**Given** 1440px and 390px viewports
**When** dashboard, reports hub, and one drill-down report are opened
**Then** page chrome, cards, charts, and action bars fit without overlap or horizontal overflow

### Story 10.5a: Frontend UX - Profile And Settings Redesign

As an invited account holder,
I want account settings to be clear, responsive, and trustworthy,
So that profile, currency, language, and password changes are easy to complete on desktop and mobile.

**Acceptance Criteria:**

**Given** the Profile design reference and the known mobile overflow issue in the implementation guide
**When** `/profile` is rebuilt
**Then** desktop uses the two-column settings layout, mobile uses horizontal settings tabs, grid children use `min-width: 0`, and 390px mobile has no horizontal overflow

**Given** username, preferred currency, language, and password changes
**When** the user edits settings
**Then** forms show loading, disabled, success, validation error, and API error states using localized EN/RU text

**Given** profile forms fail validation
**When** field or API errors are shown
**Then** errors are associated with fields and no user-visible hardcoded strings bypass i18next

**Given** the story is complete
**When** desktop and mobile visual QA runs
**Then** screenshots cover profile overview, profile form error state, and mobile settings tabs

### Story 10.5b: Frontend UX - Login And Registration Redesign

As an invited account holder,
I want sign-in and invite registration screens to be clear and password-manager-friendly,
So that authentication feels reliable and consistent with the finance app.

**Acceptance Criteria:**

**Given** the Auth design reference
**When** `/login` and `/register` are rebuilt
**Then** they use the separate auth layout, password-manager-friendly inputs, connected labels, visible validation summaries, loading states, and invite-token registration treatment

**Given** authentication forms fail validation
**When** field or API errors are shown
**Then** errors are associated with fields and no user-visible hardcoded strings bypass i18next

**Given** the story is complete
**When** desktop and mobile visual QA runs
**Then** screenshots cover login, register, loading state, validation error state, and API error state

### Story 10.6: Frontend UX - Visual QA Baseline And Responsive Regression Checklist

As a developer,
I want a repeatable visual QA process for the redesigned UI,
So that responsive and layout regressions are caught before production.

**Acceptance Criteria:**

**Given** the visual regression coverage list in `docs/design/docs/design-implementation-guide.md`
**When** this story is complete
**Then** the repo documents the exact manual or automated screenshot commands for 1440px, 1024px, 390px, and 360px checks

**Given** all top-level routes
**When** the visual QA checklist is executed
**Then** it covers Transactions, Accounts, Categories, Budgets, Dashboard, Reports hub, a report drill-down, Profile, Login, and Register

**Given** important UI states
**When** the visual QA checklist is executed
**Then** it covers populated, empty, filter-empty, drawer-open, expanded-row, report drill-down, long translated labels, and long amounts

**Given** a screenshot reveals overlap, clipped button text, page-level horizontal overflow, bottom-nav occlusion, or chart blankness
**When** the story is reviewed
**Then** the regression is treated as a failed acceptance criterion, not a cosmetic follow-up

**Given** the story is complete
**When** the design guide is updated
**Then** it records the current QA workflow and any known exceptions with owner-visible rationale
