---
title: "InEx — Personal Finance Management"
status: final
created: 2026-05-20
updated: 2026-05-26
---

# InEx — Personal Finance Management

## 1. Product Overview

InEx is a multi-user personal finance management web application running in production at **in-ex.app**. It helps invited users track accounts across multiple currencies, categorize transactions, plan monthly budgets, and understand spending patterns through reports.

Registration is invite-token gated: the owner controls who gets an account, making InEx suitable for family/small-group use without open SaaS operational overhead. Each user's data is fully isolated — no cross-user data access is permitted at any layer.

**Current state:** InEx is live on AWS (EC2 + MySQL 8 + nginx + Let's Encrypt + CloudWatch). The core CRUD surface — accounts, categories, transactions, budgets, reports, exchange rates — is implemented and functional.

---

## 2. Goals

### Primary goals

- Provide a private, self-controlled finance tracker for the owner and invited users
- Deliver a full-cycle senior-developer learning experience: modern .NET 8, React/TypeScript strict, AWS production deployment
- Maintain production reliability for real users while the codebase continues to evolve

### Out of scope (current phase)

- Open SaaS / public registration
- Mobile native apps
- Automatic bank feed / API-based transaction import (CSV Fentury import is the current onboarding path)
- Multi-currency accounting within a single account

---

## 3. Users

### Primary User: Invited account holder

- Registered via invite token provided by the app owner
- Manages their own accounts, categories, transactions, and budgets
- Uses EN or RU interface
- Typical usage: 2–5 accounts, hundreds to low thousands of transactions per year [ASSUMPTION]

### Secondary User: App Owner

- Issues invite tokens; controls who can register
- Maintains infrastructure and applies codebase updates
- Also uses the app as a regular account holder

---

## 4. Current Capabilities (Production Baseline)

### 4.1 Authentication & Identity

| ID | Feature |
|---|---|
| FR-AUTH-1 | JWT authentication with refresh token rotation via HTTP-only cookie |
| FR-AUTH-2 | Invite-token gated registration |
| FR-AUTH-3 | Rate limiting on auth endpoints (5 req/IP/min) |
| FR-AUTH-4 | Profile management: update username, preferred currency, change password |
| FR-AUTH-5 | Language preference stored in JWT claims; EN/RU |

### 4.2 Accounts

| ID | Feature |
|---|---|
| FR-ACC-1 | Create, read, update, delete accounts per user |
| FR-ACC-2 | Per-account currency selection from supported currency list |
| FR-ACC-3 | Account status: active / inactive / closed |
| FR-ACC-4 | Closed account data integrity preserved across all report queries |
| FR-ACC-5 | Status panel: accounts grouped by currency; per-group subtotals; base-currency equivalents; MoM % change on total row |

### 4.3 Categories

| ID | Feature |
|---|---|
| FR-CAT-1 | Create, read, update, delete user-defined categories |
| FR-CAT-2 | Active/inactive status toggle |

### 4.4 Transactions

| ID | Feature |
|---|---|
| FR-TXN-1 | Create, read, update, delete income / expense / transfer transactions |
| FR-TXN-2 | Transaction linked to account, category, date, amount, comment |
| FR-TXN-3 | Tags (`#hashtag`) and references (`@reference`) parsed from comment field on read; never stored separately |
| FR-TXN-4 | Transaction list: rows grouped by date; explicit +/− signs; neutral color for transfers |
| FR-TXN-5 | Column reorder; tags + comment merged into Notes column |
| FR-TXN-6 | Humanized date display (`D MMM` format) |
| FR-TXN-7 | CSV import (Fentury format) via ICSVService |
| FR-TXN-8 | Filtering by account, category, date range, tag, and ref — **note:** tag/ref filtering currently executes in-memory before pagination (see BUG-SEC-003, FR-DATA-001) |

### 4.5 Budgets

| ID | Feature |
|---|---|
| FR-BUD-1 | Create, read, update, delete monthly budgets per category |
| FR-BUD-2 | Copy budgets from one month to another |
| FR-BUD-3 | Multiple budget entries per month supported |

### 4.6 Exchange Rates

| ID | Feature |
|---|---|
| FR-RATE-1 | Date-based exchange rates via Frankfurter API (primary) with CurrencyAPI fallback |
| FR-RATE-2 | Batch range fetch: cold-cache yearly report triggers ≤2 external API calls |
| FR-RATE-3 | In-process rate cache; stale dates fetched on demand |

### 4.7 Reports

| ID | Feature |
|---|---|
| FR-RPT-1 | Monthly history report: income and expense by month |
| FR-RPT-2 | Budget comparison report: planned vs. actual by category |
| FR-RPT-3 | Category spending report — **note:** TotalIncome/TotalOutcome not populated; inactive-category transactions silently excluded (see BUG-005, BUG-006) |

### 4.8 Internationalisation

| ID | Feature |
|---|---|
| FR-I18N-1 | Full EN/RU UI via react-i18next + Ant Design locale |
| FR-I18N-2 | Machine-readable FluentValidation error codes (`field.rule` format); frontend translates |

### 4.9 Infrastructure

| ID | Feature |
|---|---|
| FR-INF-1 | Docker multi-stage build + docker-compose |
| FR-INF-2 | GitHub Actions CI: build + test + coverage |
| FR-INF-3 | AWS E-track: ECR + EC2 t4g.small (ARM) + nginx + Let's Encrypt + Porkbun DNS |
| FR-INF-4 | CloudWatch structured logging via Serilog sink |
| FR-INF-5 | MySQL daily backup to S3 (30-day retention, 02:00 UTC cron) |
| FR-INF-6 | Secrets in SSM Parameter Store; never in source |

---

## 5. Feature Roadmap

### 5.1 P0 — Security Hardening (Active bugs in production)

> **Important:** If OQ-2 resolves to "yes" (non-owner users are currently active), FR-SEC-001 must be treated as an unscheduled hotfix and deployed immediately — not held for sprint planning. A live multi-user app with missing ownership checks is a live data exposure incident.

| ID | Requirement | Story | Notes |
|---|---|---|---|
| FR-SEC-001 | All single-item reads, updates, and deletes must constrain by authenticated `UserId` in AccountService, CategoryService, BudgetService, TransactionService | SEC-001 | Cross-user access currently returns entity instead of 404 |
| FR-SEC-002 | Refresh token rotation must be safe under concurrent requests; only one refresh per token via optimistic concurrency or conditional DB update | SEC-002 | Race window can issue multiple valid replacement tokens |
| FR-SEC-003 | Credentials in `.env` (DB password, exchange API key) must be rotated; replaced by user-secrets or SSM injection locally | SEC-003 | |

### 5.2 P1 — Auth: Email Confirmation

| ID | Requirement | Story |
|---|---|---|
| FR-AUTH-6 | After registration, user receives a confirmation email (AWS SES in prod; LoggingEmailSender in dev) | B8 |
| FR-AUTH-7 | Account cannot be used until email address is confirmed | B8 |
| FR-AUTH-8 | `POST /api/auth/resend-confirmation` endpoint | B8 |
| FR-AUTH-9 | `GET /api/auth/confirm-email?userId=&token=` endpoint; on success, issues JWT and redirects to `/transactions` | B8 |

### 5.3 P1 — Data Integrity & Performance

| ID | Requirement | Story |
|---|---|---|
| FR-DATA-001 | Transaction tag/ref filtering must execute database-side before `Count`, `Skip`, and `Take`; `AsEnumerable` removed from filter path | DATA-001, B9 |
| FR-DATA-002 | Remove tracked frontend build output from git (`git rm --cached -r inex/ClientApp/build`) | DEVOPS-001 |

### 5.4 P1–P2 — Frontend: Core UX

| ID | Requirement | Story |
|---|---|---|
| FR-FE-001 | Active filter indicator on transaction list: visual cue when any filter is applied | FE-TXN3 |
| FR-FE-002 | Month summary cards on dashboard home: total income, total expenses, net savings, MoM delta for each | FE-DASH1 |
| FR-FE-003 | Dashboard home page established as app landing; Reports navigation restructured | FE-ARCH1 |
| FR-FE-004 | Spending heatmap calendar: GitHub-style daily spend grid on Reports | FE-RPT2 |

### 5.5 P2 — Frontend: Technical Quality

| ID | Requirement | Story |
|---|---|---|
| FR-FE-005 | Shared frontend DTO/model types for accounts, categories, budgets, transactions, reports; `any` eliminated from core transaction and Redux flows | FE-001 |
| FR-FE-006 | Transaction filter string DSL replaced with typed query parameters; frontend uses `URLSearchParams`; backend accepts standard query params | API-001 |
| FR-FE-007 | Route-based lazy loading + vendor chunk split; main bundle warning resolved | FE-split, FE-002 |
| FR-FE-008 | RTK Query replaces manual Axios thunks across all domain slices | FE6 |
| FR-FE-009 | Vitest + React Testing Library test suite introduced | FE7 |

### 5.6 P1 — Backend: Architecture

| ID | Requirement | Story |
|---|---|---|
| FR-ARCH-001 | Repository disposal must not manually dispose a DI-managed `DbContext`; data access boundary decision documented (direct DbContext vs. domain-method repositories) | ARCH-001 |
| FR-ARCH-002 | UTC timestamp consistency: injectable clock abstraction; persisted timestamps use UTC throughout; EF seed data uses fixed constants | TIME-001 |
| FR-ARCH-003 | Vertical Slice Architecture spike: CopyBudgets implemented as MediatR/CQRS handler alongside existing layered architecture | VSA1 |

### 5.7 P2 — Exchange Rates

| ID | Requirement | Story |
|---|---|---|
| FR-RATE-4 | NBRB exchange rate client: BYN + RUB via single range call | B10 |

### 5.8 P2 — Full-Stack Feature

| ID | Requirement | Story |
|---|---|---|
| FR-HIST-001 | Historical account value report: net worth over time chart with period-accurate exchange rates | HIST1 |

### 5.9 P3 — Developer Experience

| ID | Requirement | Story |
|---|---|---|
| FR-DX-001 | Build warning noise reduced; XML doc warning baseline cleaned; future warning policy documented | DX-001 |

### 5.10 P3 — AWS Migration Track (A-track: ECS Fargate target)

| ID | Requirement | Story |
|---|---|---|
| FR-AWS-001 | ECR: Docker image push from CI | A1 |
| FR-AWS-002 | RDS: managed MySQL replacing EC2-hosted MySQL | A2 |
| FR-AWS-003 | ECS Fargate: container deployment replacing EC2 Docker stack | A3 |
| FR-AWS-004 | ALB + ACM: HTTPS termination at load balancer | A4 |
| FR-AWS-005 | Route 53: custom domain management | A5 |
| FR-AWS-006 | Secrets Manager: runtime secret injection replacing SSM Parameter Store | A6 |
| FR-AWS-007 | CloudWatch: logs + alarms + dashboard | A7 |
| FR-AWS-008 | CI/CD: GitHub Actions → ECR → ECS rolling deploy | A8 |

---

### 5.11 P2 - Frontend: Design System Rebuild

| ID | Requirement | Story |
|---|---|---|
| FR-UX-001 | Production frontend implements the `docs/design` shell: sticky desktop top nav, mobile bottom nav, page header, brand mark, user pill, and no app footer inside authenticated routes | UX-001 |
| FR-UX-002 | Frontend design tokens and shared primitives are introduced for money values, buttons, icon buttons, drawers, segmented controls, empty states, progress, and responsive layout | UX-001 |
| FR-UX-003 | Transactions page is rebuilt as a ledger-first workspace with KPI strip, grouped day rows, active filter chips, advanced filter drawer, and mobile stacked rows | UX-002 |
| FR-UX-004 | Accounts, Categories, and Budgets are rebuilt as dense management workspaces using the new hero, grouping, toolbar, row, drawer, and empty-state patterns | UX-003 |
| FR-UX-005 | Reports hub, dashboard landing, and report drill-down chrome follow the design guide, including chart accessibility and export/share/print action placement | UX-004 |
| FR-UX-006 | Profile, settings, login, and registration screens follow the design guide, include production validation/loading/error states, and fix mobile profile overflow | UX-005 |
| FR-UX-007 | Converted pages pass the documented visual QA matrix at 1440px, 1024px, 390px, and 360px where applicable | UX-006 |

---

### 5.12 Implementation Requirements

The following `IR-*` items are implementation requirements derived from known bugs or technical debt. They are not product feature requirements, but they are tracked in epics because they affect correctness, maintainability, or implementation safety.

| ID | Requirement | Source |
|---|---|---|
| IR-REPORT-001 | Category spending report includes transactions for all user-owned categories; inactive categories are not silently excluded; `TotalIncome` and `TotalOutcome` are populated. | BUG-005, BUG-006 |
| IR-REPORT-002 | Hardcoded report title text in `ReportService` is removed or localized so services do not emit user-visible hardcoded language strings. | BUG-007, NFR-I18N-1 |
| IR-DTO-001 | Remaining DTO naming and response/request hierarchy issues are cleaned up without changing serialized API contracts unless explicitly planned. | BUG-009 |
| IR-CODE-001 | Minor service/model quality traps are cleaned up, including `PagedResponse` metadata safety, service helper visibility, and validator naming alignment. | BUG-008 and code-quality notes |

---

## 6. Non-Functional Requirements

### 6.1 Security

| ID | Requirement | Current State |
|---|---|---|
| NFR-SEC-1 | All user-owned data queries must include `UserId` ownership predicate | **Violated** for single-entity service methods (FR-SEC-001) |
| NFR-SEC-2 | API authentication is JWT-based; backend is authoritative; frontend ProtectedRoute is UX-only | Met |
| NFR-SEC-3 | Secrets must not appear in committed source, logs, comments, or screenshots | **Partial** — `.env` contains plaintext secrets locally (FR-SEC-003) |
| NFR-SEC-4 | HSTS in production; standard security headers in all environments | Met |

### 6.2 Performance

| ID | Requirement | Current State |
|---|---|---|
| NFR-PERF-1 | All filtering (pagination, date range, tag/ref) must execute database-side before count and pagination | **Violated** for tag/ref filters (FR-DATA-001) |
| NFR-PERF-2 | Cold-cache yearly report triggers ≤2 external exchange rate API calls | Met |
| NFR-PERF-3 | Frontend initial bundle ≤ 500 KB minified per Vite threshold | **Violated** — main chunk ~1.9 MB (FR-FE-007) |

### 6.3 Reliability

| ID | Requirement |
|---|---|
| NFR-REL-1 | Startup DB validation via `EnsureDatabaseInitialized` + `/health` endpoint |
| NFR-REL-2 | MySQL daily backup to S3 with 30-day retention |

### 6.4 Observability

| ID | Requirement |
|---|---|
| NFR-OBS-1 | Structured JSON logs to CloudWatch via Serilog in production |
| NFR-OBS-2 | After DX-001 completes, `dotnet build inex.sln` produces zero CS1591 XML documentation warnings in default build output |

### 6.5 Internationalisation

| ID | Requirement |
|---|---|
| NFR-I18N-1 | All user-visible strings through react-i18next; no hardcoded UI text |
| NFR-I18N-2 | Backend validation errors return machine-readable codes (`field.rule`), not prose strings |

### 6.6 Testing

| ID | Requirement |
|---|---|
| NFR-TEST-1 | Unit tests cover service logic, mappers, external client adapters (inex.Services.Tests) |
| NFR-TEST-2 | Integration tests cover auth flows, validation, authorization, RFC 7807 contracts, cross-user access denial (inex.Tests) |
| NFR-TEST-3 | EF InMemory must not be the sole coverage for MySQL-specific behavior (migrations, concurrency, constraints) |

### 6.7 Frontend UX Quality

| ID | Requirement |
|---|---|
| NFR-UX-1 | Money values use tabular numerics, clear income/expense/transfer semantics, and a color-independent signage option |
| NFR-UX-2 | Authenticated app routes have no horizontal overflow at 390px or 360px mobile widths |
| NFR-UX-3 | Drawers, segmented controls, tabs, icon buttons, and navigation are keyboard accessible and screen-reader labeled |
| NFR-UX-4 | Design changes are made through shared tokens and primitives first; page-specific one-off styling is avoided unless documented |

---

## 7. Known Active Bugs

| ID | Priority | Description | Story |
|---|---|---|---|
| BUG-001 | P0 | Object-level authorization missing: single-entity operations fetch by `id` only with no `UserId` constraint across Account, Category, Budget, Transaction services | SEC-001 |
| BUG-002 | P0 | Refresh token rotation race: concurrent requests can both read an unused token and each issue a valid replacement | SEC-002 |
| BUG-003 | P0/P1 | Frontend `updateAccount` thunk omits `key` field; every account update from the UI returns 422 — functional regression for all active users | deferred-work |
| BUG-004 | P1 | Two types named `ExchangeRateResponse` in same assembly (DTO vs. external model); managed via `using` aliases — fragile | deferred-work |
| BUG-005 | P1 | `BuildReportDataResponse` leaves `TotalIncome`/`TotalOutcome` at 0 for the category report | deferred-work |
| BUG-006 | P1 | `GetCategoriesReportData` silently excludes transactions against inactive categories | deferred-work |
| BUG-007 | P1 | Hardcoded Russian string `"Расходы по категориям"` in `ReportService.GetCategoriesReportData` — bypasses i18n, user-visible (violates NFR-I18N-1) | deferred-work |
| BUG-008 | P2 | `PagedResponse<T,TMeta>.Metadata` initialized with `default!` null suppressor; any caller that `new`s `PagedResponse` without setting `Metadata` gets a runtime null deref | deferred-work |
| BUG-009 | P2 | Response types inherit request types (`AccountResponse : UpdateAccountRequest`, `CategoryResponse : UpdateCategoryRequest`); structural defect that will surface during any Account/Category domain story | deferred-work |
| BUG-010 | P2 | Frontend build artifacts tracked in git; `npm run build` creates noisy commit diffs | DEVOPS-001 |

---

## 8. Suggested Delivery Order

The sequencing below prioritizes security and data integrity before feature development. AWS A-track is independent and can proceed in parallel after P0 items are resolved.

**Sprint 1 — Security + P0 functional regression**
1. SEC-001: Owned-entity authorization across all service single-entity operations (**hotfix if OQ-2 = yes**)
2. SEC-002: Refresh token rotation concurrency safety
3. BUG-003: Fix `updateAccount` missing `key` field — every account update is broken for all users
4. DEVOPS-001: Remove tracked build artifacts
5. SEC-003: Rotate and externalize local secrets

**Sprint 2 — Backend reliability prerequisites (P1–P2)**
6. ARCH-001: Repository lifetime and boundary decision
7. TIME-001: UTC consistency + clock abstraction

**Sprint 3 — Auth and transaction data quality (P1)**
8. B8: Email confirmation flow (backend + frontend)
9. DATA-001 / B9: Database-side tag/ref filtering
10. API-001: Typed transaction filter parameters
11. FE-TXN3: Active filter indicator

**Sprint 4 — Rates and dashboard insights (P2)**
12. B10: NBRB exchange rate client
13. FE-DASH1: Month summary cards
14. FE-ARCH1: Dashboard restructuring
15. FE-RPT2: Spending heatmap
16. HIST1: Historical net worth chart

**Sprint 5 — Frontend modernization foundations (P2)**
17. FE-001: Typed frontend DTOs; eliminate `any` in core flows
18. FE-split / FE-002: Bundle splitting
19. FE7: Vitest + RTL
20. FE6-a: RTK Query pattern for Transactions
21. FE6-b: RTK Query migration for Accounts and Categories
22. FE6-c: RTK Query migration for Budgets and Reports

**Sprint 6 — Design system rebuild + advanced UX (P2)**
23. UX-001a: Design tokens and theme bridge
24. UX-001b: Shared primitives
25. UX-001c: App shell and navigation
26. UX-002: Transactions ledger redesign
27. UX-003a: Accounts management redesign
28. UX-003b: Categories management redesign
29. UX-003c: Budgets management redesign
30. UX-004: Reports hub, dashboard route, and drill-down chrome
31. UX-005: Profile, settings, and auth screens redesign
32. UX-006: Visual QA baseline and responsive regression checklist

**Sprint 7 — Backend quality and architecture exploration (P2–P3)**
33. VSA1: CopyBudgets MediatR spike
34. DX-001: Build warning cleanup
35. DTO cleanup: backend DTO naming cleanup
36. Report model cleanup: frontend report model naming cleanup
37. Response/request split: Account and Category response contracts independent from requests
38. Service response safety cleanup: pagination metadata guard and helper visibility

**Sprint 8+ — Migration + modernisation (P3)**
39. A1–A8: AWS A-track (ECS Fargate migration)

---

## 9. Open Questions

| # | Question | Assumption Applied |
|---|---|---|
| OQ-1 | Does the AWS A-track (ECS Fargate) replace the E-track (EC2) or run in parallel as a gradual migration? | A-track is the planned migration target; E-track stays live during transition |
| OQ-2 | Are there non-owner users currently active on the production instance? | Assumed yes. **If confirmed yes:** SEC-001 is a live data exposure incident and must be deployed as an unscheduled hotfix, bypassing sprint planning. If no non-owner users exist yet, Sprint 1 scheduling stands. |
| OQ-3 | Is NBRB integration (B10) blocked on any other item, or independently schedulable? | Independent; can be scheduled any time |
| OQ-4 | Is the historical net worth chart (HIST1) blocked by data integrity bugs (BUG-005/006)? | Treat as independent; verify during story creation |
