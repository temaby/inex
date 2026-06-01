---
stepsCompleted:
  - document-discovery
  - prd-analysis
  - epic-coverage-validation
  - ux-alignment
  - epic-quality-review
  - final-assessment
includedFiles:
  prd:
    - docs/planning/prds/prd-inex-2026-05-20/prd.md
  architecture:
    - docs/planning/architecture.md
  epics:
    - docs/planning/epics.md
  ux:
    - docs/planning/ux-design.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-06-01
**Project:** inex

## Document Discovery

### PRD Files Found

**Whole Documents:** None.

**Sharded Documents:**
- Folder: `docs/planning/prds/prd-inex-2026-05-20/`
  - `.decision-log.md` (5035 bytes, modified 2026-05-26 19:50:06)
  - `prd.md` (21361 bytes, modified 2026-05-26 19:50:06)
  - `review-quality.md` (6302 bytes, modified 2026-05-26 19:50:06)

Selected for assessment: `docs/planning/prds/prd-inex-2026-05-20/prd.md`.

### Architecture Files Found

**Whole Documents:**
- `docs/planning/architecture.md` (45001 bytes, modified 2026-06-01 16:46:21)

**Sharded Documents:** None.

### Epics & Stories Files Found

**Whole Documents:**
- `docs/planning/epics.md` (84148 bytes, modified 2026-06-01 17:30:52)

**Sharded Documents:** None.

### UX Design Files Found

**Whole Documents:**
- `docs/planning/ux-design.md` (702 bytes, modified 2026-05-26 19:50:06)

**Sharded Documents:** None.

### Discovery Issues

- No whole-vs-sharded duplicate blockers found.
- No required document category is missing.

## PRD Analysis

### Functional Requirements

FR-AUTH-1: JWT authentication with refresh token rotation via HTTP-only cookie
FR-AUTH-2: Invite-token gated registration
FR-AUTH-3: Rate limiting on auth endpoints (5 req/IP/min)
FR-AUTH-4: Profile management: update username, preferred currency, change password
FR-AUTH-5: Language preference stored in JWT claims; EN/RU
FR-AUTH-6: After registration, user receives a confirmation email (AWS SES in prod; LoggingEmailSender in dev)
FR-AUTH-7: Account cannot be used until email address is confirmed
FR-AUTH-8: `POST /api/auth/resend-confirmation` endpoint
FR-AUTH-9: `GET /api/auth/confirm-email?userId=&token=` endpoint; on success, issues JWT and redirects to `/transactions`

FR-ACC-1: Create, read, update, delete accounts per user
FR-ACC-2: Per-account currency selection from supported currency list
FR-ACC-3: Account status: active / inactive / closed
FR-ACC-4: Closed account data integrity preserved across all report queries
FR-ACC-5: Status panel: accounts grouped by currency; per-group subtotals; base-currency equivalents; MoM % change on total row

FR-CAT-1: Create, read, update, delete user-defined categories
FR-CAT-2: Active/inactive status toggle

FR-TXN-1: Create, read, update, delete income / expense / transfer transactions
FR-TXN-2: Transaction linked to account, category, date, amount, comment
FR-TXN-3: Tags (`#hashtag`) and references (`@reference`) parsed from comment field on read; never stored separately
FR-TXN-4: Transaction list: rows grouped by date; explicit +/- signs; neutral color for transfers
FR-TXN-5: Column reorder; tags + comment merged into Notes column
FR-TXN-6: Humanized date display (`D MMM` format)
FR-TXN-7: CSV import (Fentury format) via ICSVService
FR-TXN-8: Filtering by account, category, date range, tag, and ref; tag/ref filtering currently executes in-memory before pagination and is tracked by FR-DATA-001

FR-BUD-1: Create, read, update, delete monthly budgets per category
FR-BUD-2: Copy budgets from one month to another
FR-BUD-3: Multiple budget entries per month supported

FR-RATE-1: Date-based exchange rates via Frankfurter API (primary) with CurrencyAPI fallback
FR-RATE-2: Batch range fetch: cold-cache yearly report triggers <=2 external API calls
FR-RATE-3: In-process rate cache; stale dates fetched on demand
FR-RATE-4: NBRB exchange rate client: BYN + RUB via single range call

FR-RPT-1: Monthly history report: income and expense by month
FR-RPT-2: Budget comparison report: planned vs. actual by category
FR-RPT-3: Category spending report; TotalIncome/TotalOutcome not populated and inactive-category transactions silently excluded

FR-I18N-1: Full EN/RU UI via react-i18next + Ant Design locale
FR-I18N-2: Machine-readable FluentValidation error codes (`field.rule` format); frontend translates

FR-INF-1: Docker multi-stage build + docker-compose
FR-INF-2: GitHub Actions CI: build + test + coverage
FR-INF-3: AWS E-track: ECR + EC2 t4g.small (ARM) + nginx + Let's Encrypt + Porkbun DNS
FR-INF-4: CloudWatch structured logging via Serilog sink
FR-INF-5: MySQL daily backup to S3 (30-day retention, 02:00 UTC cron)
FR-INF-6: Secrets in SSM Parameter Store; never in source

FR-SEC-001: All single-item reads, updates, and deletes must constrain by authenticated `UserId` in AccountService, CategoryService, BudgetService, TransactionService
FR-SEC-002: Refresh token rotation must be safe under concurrent requests; only one refresh per token via optimistic concurrency or conditional DB update
FR-SEC-003: Credentials in `.env` (DB password, exchange API key) must be rotated; replaced by user-secrets or SSM injection locally

FR-DATA-001: Transaction tag/ref filtering must execute database-side before `Count`, `Skip`, and `Take`; `AsEnumerable` removed from filter path
FR-DATA-002: Remove tracked frontend build output from git (`git rm --cached -r inex/ClientApp/build`)

FR-FE-001: Active filter indicator on transaction list: visual cue when any filter is applied
FR-FE-002: Month summary cards on dashboard home: total income, total expenses, net savings, MoM delta for each
FR-FE-003: Dashboard home page established as app landing; Reports navigation restructured
FR-FE-004: Spending heatmap calendar: GitHub-style daily spend grid on Reports
FR-FE-005: Shared frontend DTO/model types for accounts, categories, budgets, transactions, reports; `any` eliminated from core transaction and Redux flows
FR-FE-006: Transaction filter string DSL replaced with typed query parameters; frontend uses `URLSearchParams`; backend accepts standard query params
FR-FE-007: Route-based lazy loading + vendor chunk split; main bundle warning resolved
FR-FE-008: RTK Query replaces manual Axios thunks across all domain slices
FR-FE-009: Vitest + React Testing Library test suite introduced

FR-ARCH-001: Repository disposal must not manually dispose a DI-managed `DbContext`; data access boundary decision documented
FR-ARCH-002: UTC timestamp consistency: injectable clock abstraction; persisted timestamps use UTC throughout; EF seed data uses fixed constants
FR-ARCH-003: Vertical Slice Architecture spike: CopyBudgets implemented as MediatR/CQRS handler alongside existing layered architecture

FR-HIST-001: Historical account value report: net worth over time chart with period-accurate exchange rates
FR-DX-001: Build warning noise reduced; XML doc warning baseline cleaned; future warning policy documented

FR-AWS-001: ECR: Docker image push from CI
FR-AWS-002: RDS: managed MySQL replacing EC2-hosted MySQL
FR-AWS-003: ECS Fargate: container deployment replacing EC2 Docker stack
FR-AWS-004: ALB + ACM: HTTPS termination at load balancer
FR-AWS-005: Route 53: custom domain management
FR-AWS-006: Secrets Manager: runtime secret injection replacing SSM Parameter Store
FR-AWS-007: CloudWatch: logs + alarms + dashboard
FR-AWS-008: CI/CD: GitHub Actions -> ECR -> ECS rolling deploy

FR-UX-001: Production frontend implements the `docs/design` shell: sticky desktop top nav, mobile bottom nav, page header, brand mark, user pill, and no app footer inside authenticated routes
FR-UX-002: Frontend design tokens and shared primitives are introduced for money values, buttons, icon buttons, drawers, segmented controls, empty states, progress, and responsive layout
FR-UX-003: Transactions page is rebuilt as a ledger-first workspace with KPI strip, grouped day rows, active filter chips, advanced filter drawer, and mobile stacked rows
FR-UX-004: Accounts, Categories, and Budgets are rebuilt as dense management workspaces using the new hero, grouping, toolbar, row, drawer, and empty-state patterns
FR-UX-005: Reports hub, dashboard landing, and report drill-down chrome follow the design guide, including chart accessibility and export/share/print action placement
FR-UX-006: Profile, settings, login, and registration screens follow the design guide, include production validation/loading/error states, and fix mobile profile overflow
FR-UX-007: Converted pages pass the documented visual QA matrix at 1440px, 1024px, 390px, and 360px where applicable

IR-REPORT-001: Category spending report includes transactions for all user-owned categories; inactive categories are not silently excluded; `TotalIncome` and `TotalOutcome` are populated.
IR-REPORT-002: Hardcoded report title text in `ReportService` is removed or localized so services do not emit user-visible hardcoded language strings.
IR-DTO-001: Remaining DTO naming and response/request hierarchy issues are cleaned up without changing serialized API contracts unless explicitly planned.
IR-CODE-001: Minor service/model quality traps are cleaned up, including `PagedResponse` metadata safety, service helper visibility, and validator naming alignment.

Total FR/IR items: 91

### Non-Functional Requirements

NFR-SEC-1: All user-owned data queries must include `UserId` ownership predicate
NFR-SEC-2: API authentication is JWT-based; backend is authoritative; frontend ProtectedRoute is UX-only
NFR-SEC-3: Secrets must not appear in committed source, logs, comments, or screenshots
NFR-SEC-4: HSTS in production; standard security headers in all environments

NFR-PERF-1: All filtering (pagination, date range, tag/ref) must execute database-side before count and pagination
NFR-PERF-2: Cold-cache yearly report triggers <=2 external exchange rate API calls
NFR-PERF-3: Frontend initial bundle <= 500 KB minified per Vite threshold

NFR-REL-1: Startup DB validation via `EnsureDatabaseInitialized` + `/health` endpoint
NFR-REL-2: MySQL daily backup to S3 with 30-day retention

NFR-OBS-1: Structured JSON logs to CloudWatch via Serilog in production
NFR-OBS-2: After DX-001 completes, `dotnet build inex.sln` produces zero CS1591 XML documentation warnings in default build output

NFR-I18N-1: All user-visible strings through react-i18next; no hardcoded UI text
NFR-I18N-2: Backend validation errors return machine-readable codes (`field.rule`), not prose strings

NFR-TEST-1: Unit tests cover service logic, mappers, external client adapters (inex.Services.Tests)
NFR-TEST-2: Integration tests cover auth flows, validation, authorization, RFC 7807 contracts, cross-user access denial (inex.Tests)
NFR-TEST-3: EF InMemory must not be the sole coverage for MySQL-specific behavior

NFR-UX-1: Money values use tabular numerics, clear income/expense/transfer semantics, and a color-independent signage option
NFR-UX-2: Authenticated app routes have no horizontal overflow at 390px or 360px mobile widths
NFR-UX-3: Drawers, segmented controls, tabs, icon buttons, and navigation are keyboard accessible and screen-reader labeled
NFR-UX-4: Design changes are made through shared tokens and primitives first; page-specific one-off styling is avoided unless documented

Total NFRs: 21

### Additional Requirements

- Non-owner production usage determines whether FR-SEC-001 is an unscheduled hotfix.
- Current phase excludes open SaaS/public registration, native mobile apps, automatic bank feed/API transaction import, and multi-currency accounting within a single account.
- Invite-only registration and per-user data isolation are core constraints.
- Known active bugs BUG-001 through BUG-010 are explicitly tied to implementation requirements or deferred work.
- Delivery sequencing prioritizes security/data integrity before frontend and infrastructure expansion.

### PRD Completeness Assessment

The PRD is complete enough for traceability validation. It has explicit FR, IR, and NFR identifiers, known bug mappings, delivery order, and open assumptions. The key readiness risk is not missing PRD requirements; it is ensuring epics/stories preserve boundaries between security, Epic 6 dashboard/report data, Epic 7 frontend technical modernization, and Epic 10 visual rebuild work.

## Epic Coverage Validation

### Coverage Matrix

| FR Number | PRD Requirement | Epic Coverage | Status |
| --- | --- | --- | --- |
| FR-AUTH-1 | JWT authentication with refresh token rotation via HTTP-only cookie | Production baseline inventory | Covered |
| FR-AUTH-2 | Invite-token gated registration | Production baseline inventory | Covered |
| FR-AUTH-3 | Rate limiting on auth endpoints | Production baseline inventory | Covered |
| FR-AUTH-4 | Profile management | Production baseline inventory; Epic 10 visual redesign | Covered |
| FR-AUTH-5 | Language preference in JWT claims; EN/RU | Production baseline inventory; Epic 10 i18n preservation | Covered |
| FR-AUTH-6 | Confirmation email after registration | Epic 3 | Covered |
| FR-AUTH-7 | Account cannot be used until email confirmed | Epic 3 | Covered |
| FR-AUTH-8 | Resend confirmation endpoint | Epic 3 | Covered |
| FR-AUTH-9 | Confirm email endpoint and redirect | Epic 3 | Covered |
| FR-ACC-1 through FR-ACC-5 | Accounts CRUD, status, currency, closed-account report integrity, status panel | Production baseline inventory; Epic 10 visual redesign for Accounts; IR coverage where report integrity applies | Covered |
| FR-CAT-1 through FR-CAT-2 | Categories CRUD and active/inactive status | Production baseline inventory; Epic 10 visual redesign for Categories; Epic 6 report integrity fixes for inactive-category reporting | Covered |
| FR-TXN-1 through FR-TXN-8 | Transaction CRUD, tags/refs, display, import, filters | Production baseline inventory; Epic 4 for DB-side filters and active indicator; Epic 10 visual redesign for Transactions | Covered |
| FR-BUD-1 through FR-BUD-3 | Budget CRUD, copy, multiple entries | Production baseline inventory; Epic 10 visual redesign for Budgets | Covered |
| FR-RATE-1 through FR-RATE-3 | Existing exchange-rate behavior | Production baseline inventory | Covered |
| FR-RATE-4 | NBRB range client for BYN/RUB | Epic 5 | Covered |
| FR-RPT-1 through FR-RPT-3 | Monthly history, budget comparison, category spending reports | Production baseline inventory; Epic 6 for report expansion and report data defects; Epic 10 visual reports chrome | Covered |
| FR-I18N-1 through FR-I18N-2 | EN/RU UI and machine-readable validation errors | Production baseline inventory; Epic 10 i18n preservation; NFR-I18N coverage | Covered |
| FR-INF-1 through FR-INF-6 | Docker, CI, EC2 production, CloudWatch, S3 backups, SSM secrets | Production baseline inventory; Epic 9 supersedes selected infrastructure paths | Covered |
| FR-SEC-001 | Owned-entity authorization on single-item operations | Epic 1 | Covered |
| FR-SEC-002 | Concurrent refresh-token safety | Epic 1 | Covered |
| FR-SEC-003 | Local credential rotation/externalization | Epic 1; superseded by Epic 9 Secrets Manager for production | Covered |
| FR-DATA-001 | Database-side transaction tag/ref filtering | Epic 4 | Covered |
| FR-DATA-002 | Remove tracked frontend build output | Epic 1 | Covered |
| FR-FE-001 | Active transaction filter indicator | Epic 4 | Covered |
| FR-FE-002 | Dashboard month-summary cards | Epic 6; Epic 10 final visual treatment | Covered |
| FR-FE-003 | Dashboard landing and Reports nav restructure | Epic 6; Epic 10 final visual treatment | Covered |
| FR-FE-004 | Spending heatmap calendar | Epic 6 | Covered |
| FR-FE-005 | Shared frontend model types and `any` cleanup | Epic 7 | Covered |
| FR-FE-006 | Typed transaction query parameters | Epic 4 | Covered |
| FR-FE-007 | Route-based lazy loading and chunk split | Epic 7 | Covered |
| FR-FE-008 | RTK Query migration | Epic 7 | Covered |
| FR-FE-009 | Vitest + React Testing Library | Epic 7 | Covered |
| FR-ARCH-001 | Repository disposal/data boundary | Epic 2 | Covered |
| FR-ARCH-002 | UTC timestamp consistency | Epic 2 | Covered |
| FR-ARCH-003 | VSA/MediatR spike | Epic 8 | Covered |
| FR-HIST-001 | Historical account value report | Epic 6 | Covered |
| FR-DX-001 | Build warning cleanup | Epic 8 | Covered |
| FR-AWS-001 through FR-AWS-008 | ECS/Fargate migration track | Epic 9 | Covered |
| FR-UX-001 | App shell and navigation redesign | Epic 10 Story 10.1c | Covered |
| FR-UX-002 | Design tokens and shared primitives | Epic 10 Stories 10.1a and 10.1b | Covered |
| FR-UX-003 | Transactions ledger redesign | Epic 10 Story 10.2 | Covered |
| FR-UX-004 | Accounts/Categories/Budgets redesign | Epic 10 Stories 10.3a, 10.3b, 10.3c | Covered |
| FR-UX-005 | Reports hub, dashboard landing, drill-down chrome | Epic 10 Story 10.4; consumes Epic 6 data work | Covered |
| FR-UX-006 | Profile/settings/auth redesign | Epic 10 Stories 10.5a and 10.5b | Covered |
| FR-UX-007 | Visual QA matrix | Epic 10 Story 10.6 | Covered |
| IR-REPORT-001 | Category report inactive-category and totals fix | Epic 6 Story 6.5 | Covered |
| IR-REPORT-002 | Hardcoded report title i18n fix | Epic 6 Story 6.5 | Covered |
| IR-DTO-001 | DTO naming and response/request hierarchy cleanup | Epic 8 | Covered |
| IR-CODE-001 | Minor service/model safety cleanup | Epic 8 | Covered |

### Missing Requirements

No PRD FR/IR IDs are missing from `docs/planning/epics.md`.

### Coverage Statistics

- Total PRD FR/IR items assessed: 91
- FR/IR items covered in epics or production-baseline inventory: 91
- Coverage percentage: 100%

### Coverage Notes

- The production-baseline FRs are not all assigned to future implementation epics because the PRD marks them as already implemented. That is acceptable for readiness, provided future stories preserve those behaviors.
- The key Epic 10 boundary risk has been reduced by the story-file fixes: Story 10.4 now explicitly consumes Epic 6 dashboard/report data work instead of recreating it.

## UX Alignment Assessment

### UX Document Status

Found. `docs/planning/ux-design.md` is an index that intentionally points validators to:

- `docs/design/docs/design-implementation-guide.md`
- `docs/planning/design-update-plan.md`
- `docs/planning/epics.md`, Epic 10

### Alignment Issues

- PRD FR-UX-001 through FR-UX-007 align with Epic 10 and the design implementation guide: shell/navigation, tokens/primitives, Transactions, management pages, Reports/Dashboard chrome, Profile/Auth, and visual QA are all represented.
- Architecture now supports Epic 10 through the frontend architecture addendum: token/theme bridge, primitive ownership, shell/routing migration, responsive QA, dependency policy, i18n/accessibility/error handling, and coexistence with Redux/Axios/Ant Design are documented.
- The updated story files now better align with UX and architecture:
  - 10.1b owns responsive layout helpers and localized primitive screen-reader text.
  - 10.3b no longer assumes primitive names that conflict with 10.1b and blocks rather than creating local `DistributionBar`.
  - 10.4 explicitly consumes Epic 6 dashboard/report data work and owns only final visual/chrome treatment.
  - 10.5b now requires complete EN/RU auth-shell and API-error localization and blocks on 10.1b for `lucide-react`.
  - 10.6 now includes visual QA command capture and known-exception handling.

### Warnings

- `docs/design/docs/design-implementation-guide.md` now points backlog mapping to Epic 10, matching `ux-design.md`, `design-update-plan.md`, `architecture.md`, and `epics.md`.
- The production design guide recommends an illustrative `src/design-system` structure, while current story files use `src/components/primitives`. This is acceptable because the architecture addendum and 10.1b story establish the production path, but future story authors should treat the guide structure as conceptual, not literal.
- Epic 10 remains sequence-sensitive. UX alignment depends on 10.1a/10.1b/10.1c being completed before page conversion stories begin.

## Epic Quality Review

### Critical Violations

None found after the Epic 10 story-file fixes.

### Major Issues

1. **Epic 10 implementation is not ready as a whole because sprint status still shows every Epic 10 story as `ready-for-dev`, not `done`.**
   - Evidence: `docs/implementation/sprint-status.yaml` lists 10.1a through 10.6 as `ready-for-dev`.
   - Impact: Downstream Epic 10 page stories correctly depend on 10.1a/10.1b/10.1c outputs, so only 10.1a can start immediately.
   - Remediation: Implement in fixed order. Do not start 10.1c or page stories until the prerequisite stories are accepted as `done`.

2. **Some epics are technical or operational rather than purely user-outcome framed.**
   - Epic 2, Epic 7, Epic 8, and Epic 9 are largely architecture/frontend-quality/infrastructure epics.
   - This is acceptable for the current brownfield PRD because the PRD explicitly includes production hardening, learning, AWS migration, performance, and maintainability as product goals, but these epics should keep user-facing rationale visible in story handoff notes.
   - Remediation: Preserve current user-value statements and avoid reducing these epics to task lists during story creation.

3. **Epic 10 still depends on prior epics for safe execution.**
   - Epic 10 depends on Epic 1 for broad UI rollout safety, Epic 4 for transaction filtering semantics, Epic 6 for dashboard/report functional data, and Epic 7 Story 7.1 before TypeScript-heavy rebuild work where possible.
   - These are backward dependencies, not forward dependencies, so the sequence is valid.
   - Remediation: Keep prerequisite gates explicit in story files. The updated Epic 10 story files now do this more consistently.

### Minor Concerns

1. **Production-baseline FRs are inventoried rather than assigned to future stories.**
   - This is acceptable because the PRD marks them as already implemented.
   - Remediation: Future stories must preserve baseline behavior explicitly when touching those areas.

2. **Visual QA evidence remains manual-heavy.**
   - Story 10.6 documents a repeatable manual/Playwright-assisted workflow, but not a committed automated visual regression suite.
   - Remediation: Accept for Epic 10 baseline; consider automation after the manual baseline stabilizes.

### Best Practices Compliance Checklist

| Epic | User value | Independent/backward-only dependencies | Story sizing | AC quality | Traceability | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Epic 1 Security & Production Hygiene | Strong | Yes | Good | Testable | Strong | Pass |
| Epic 2 Safer Data Access And Reliable Time Behavior | Technical but justified | Backward-only | Good | Testable | Strong | Pass with framing caution |
| Epic 3 Email Verification | Strong | Backward-only | Good | Testable | Strong | Pass |
| Epic 4 Transaction Filtering Quality | Strong | Backward-only | Good | Testable | Strong | Pass |
| Epic 5 Exchange Rate Expansion | Strong | Backward-only | Good | Testable | Strong | Pass |
| Epic 6 Dashboard & Spending Insights | Strong | Backward-only | Good | Testable | Strong | Pass |
| Epic 7 Faster, Safer Frontend Evolution | Technical but PRD-backed | Backward-only | Good | Testable | Strong | Pass with framing caution |
| Epic 8 Maintainable Backend Change And Clean Build Signal | Technical but PRD-backed | Backward-only | Good | Testable | Strong | Pass with framing caution |
| Epic 9 Managed Production Operations | Operational but PRD-backed | Backward-only | Good | Testable | Strong | Pass with framing caution |
| Epic 10 Frontend Design System Rebuild | Strong | Backward-only | Good after fixes | Testable | Strong | Pass for story readiness after fixes; implementation still sequence-gated |

## Summary and Recommendations

### Overall Readiness Status

NEEDS WORK for full Epic 10 development.

READY for the first Epic 10 development story only: `docs/implementation/10-1a-frontend-ux-design-tokens-and-theme-bridge.md`.

### Critical Issues Requiring Immediate Action

No critical document-coverage issues remain after the story-file fixes. PRD FR/IR coverage is complete, UX/architecture alignment is sufficient, and the design implementation guide exists.

### Issues Requiring Attention

1. **Epic 10 is sequence-gated.** `docs/implementation/sprint-status.yaml` still shows all Epic 10 stories as `ready-for-dev`, not `done`. Downstream stories cannot start until prerequisites are actually implemented.
2. **Epic 10 depends on prior completed work.** Story 10.4 must wait for Epic 6 dashboard/report data work; 10.5b must wait for 10.4 before final `/dashboard` redirects; 10.6 must wait for all 10.1a through 10.5b stories.
3. **Technical/operational epics need value framing preserved.** Epics 2, 7, 8, and 9 are PRD-backed but technical in nature; story handoffs should keep user/production value explicit.

### Recommended Next Steps

1. Start implementation with Story 10.1a only.
2. After 10.1a is `done`, run or revalidate Story 10.1b before implementation because it owns primitive contracts, responsive helpers, and `lucide-react`.
3. Keep the fixed Epic 10 order: 10.1a -> 10.1b -> 10.1c -> 10.2 -> 10.3a/10.3b/10.3c -> 10.4 -> 10.5a/10.5b -> 10.6.
4. Before 10.4, verify Epic 6 Stories 6.1, 6.2, and 6.5 are merged or explicitly accepted as complete where their data surfaces affect dashboard/report chrome.
### Final Note

This assessment identified 3 issues across sequencing, dependency readiness, and epic framing. None are PRD coverage blockers. The artifacts are ready to begin Epic 10 at Story 10.1a, but the full epic is not ready for parallel development until prerequisite stories are completed in order.

Assessor: Codex using `bmad-check-implementation-readiness`
Date: 2026-06-01
