---
stepsCompleted: ['document-discovery', 'prd-analysis', 'epic-coverage-validation', 'ux-alignment', 'epic-quality-review', 'final-assessment']
project: inex
date: 2026-05-26
documentsIncluded:
  prd: D:\work\inex\docs\planning\prds\prd-inex-2026-05-20\prd.md
  architecture: D:\work\inex\docs\planning\architecture.md
  epics: D:\work\inex\docs\planning\epics.md
  ux: D:\work\inex\docs\planning\ux-design.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-05-26
**Project:** inex

## Document Discovery

### PRD Files Found

**Whole Documents:**
- None found under `D:\work\inex\docs\planning`

**Sharded Documents:**
- Folder: `D:\work\inex\docs\planning\prds\prd-inex-2026-05-20`
  - `prd.md` (20,962 bytes, modified 2026-05-26 15:26)
  - `.decision-log.md` (5,017 bytes, modified 2026-05-25 17:18)
  - `review-quality.md` (6,219 bytes, modified 2026-05-25 17:16)

### Architecture Files Found

**Whole Documents:**
- `D:\work\inex\docs\planning\architecture.md` (38,153 bytes, modified 2026-05-26 15:27)

**Sharded Documents:**
- None found

### Epics & Stories Files Found

**Whole Documents:**
- `D:\work\inex\docs\planning\epics.md` (81,039 bytes, modified 2026-05-26 15:27)

**Sharded Documents:**
- None found

### UX Design Files Found

**Whole Documents:**
- `D:\work\inex\docs\planning\ux-design.md` (685 bytes, modified 2026-05-26 14:57)

**Sharded Documents:**
- None found

### Issues Found

- Note: PRD is in a nested shard folder and has `prd.md`, but no `index.md`.
- No duplicate whole-plus-sharded document conflicts found.

## PRD Analysis

### Functional Requirements

FR-AUTH-1: JWT authentication with refresh token rotation via HTTP-only cookie.
FR-AUTH-2: Invite-token gated registration.
FR-AUTH-3: Rate limiting on auth endpoints (5 req/IP/min).
FR-AUTH-4: Profile management: update username, preferred currency, change password.
FR-AUTH-5: Language preference stored in JWT claims; EN/RU.
FR-AUTH-6: After registration, user receives a confirmation email (AWS SES in prod; LoggingEmailSender in dev).
FR-AUTH-7: Account cannot be used until email address is confirmed.
FR-AUTH-8: `POST /api/auth/resend-confirmation` endpoint.
FR-AUTH-9: `GET /api/auth/confirm-email?userId=&token=` endpoint; on success, issues JWT and redirects to `/transactions`.

FR-ACC-1: Create, read, update, delete accounts per user.
FR-ACC-2: Per-account currency selection from supported currency list.
FR-ACC-3: Account status: active / inactive / closed.
FR-ACC-4: Closed account data integrity preserved across all report queries.
FR-ACC-5: Status panel: accounts grouped by currency; per-group subtotals; base-currency equivalents; MoM % change on total row.

FR-CAT-1: Create, read, update, delete user-defined categories.
FR-CAT-2: Active/inactive status toggle.

FR-TXN-1: Create, read, update, delete income / expense / transfer transactions.
FR-TXN-2: Transaction linked to account, category, date, amount, comment.
FR-TXN-3: Tags (`#hashtag`) and references (`@reference`) parsed from comment field on read; never stored separately.
FR-TXN-4: Transaction list: rows grouped by date; explicit +/- signs; neutral color for transfers.
FR-TXN-5: Column reorder; tags + comment merged into Notes column.
FR-TXN-6: Humanized date display (`D MMM` format).
FR-TXN-7: CSV import (Fentury format) via ICSVService.
FR-TXN-8: Filtering by account, category, date range, tag, and ref; tag/ref filtering currently executes in-memory before pagination.

FR-BUD-1: Create, read, update, delete monthly budgets per category.
FR-BUD-2: Copy budgets from one month to another.
FR-BUD-3: Multiple budget entries per month supported.

FR-RATE-1: Date-based exchange rates via Frankfurter API (primary) with CurrencyAPI fallback.
FR-RATE-2: Batch range fetch: cold-cache yearly report triggers no more than 2 external API calls.
FR-RATE-3: In-process rate cache; stale dates fetched on demand.
FR-RATE-4: NBRB exchange rate client: BYN + RUB via single range call.

FR-RPT-1: Monthly history report: income and expense by month.
FR-RPT-2: Budget comparison report: planned vs. actual by category.
FR-RPT-3: Category spending report; TotalIncome/TotalOutcome not populated and inactive-category transactions silently excluded.

FR-I18N-1: Full EN/RU UI via react-i18next + Ant Design locale.
FR-I18N-2: Machine-readable FluentValidation error codes (`field.rule` format); frontend translates.

FR-INF-1: Docker multi-stage build + docker-compose.
FR-INF-2: GitHub Actions CI: build + test + coverage.
FR-INF-3: AWS E-track: ECR + EC2 t4g.small (ARM) + nginx + Let's Encrypt + Porkbun DNS.
FR-INF-4: CloudWatch structured logging via Serilog sink.
FR-INF-5: MySQL daily backup to S3 (30-day retention, 02:00 UTC cron).
FR-INF-6: Secrets in SSM Parameter Store; never in source.

FR-SEC-001: All single-item reads, updates, and deletes must constrain by authenticated `UserId` in AccountService, CategoryService, BudgetService, TransactionService.
FR-SEC-002: Refresh token rotation must be safe under concurrent requests; only one refresh per token via optimistic concurrency or conditional DB update.
FR-SEC-003: Credentials in `.env` (DB password, exchange API key) must be rotated; replaced by user-secrets or SSM injection locally.

FR-DATA-001: Transaction tag/ref filtering must execute database-side before `Count`, `Skip`, and `Take`; `AsEnumerable` removed from filter path.
FR-DATA-002: Remove tracked frontend build output from git (`git rm --cached -r inex/ClientApp/build`).

FR-FE-001: Active filter indicator on transaction list: visual cue when any filter is applied.
FR-FE-002: Month summary cards on dashboard home: total income, total expenses, net savings, MoM delta for each.
FR-FE-003: Dashboard home page established as app landing; Reports navigation restructured.
FR-FE-004: Spending heatmap calendar: GitHub-style daily spend grid on Reports.
FR-FE-005: Shared frontend DTO/model types for accounts, categories, budgets, transactions, reports; `any` eliminated from core transaction and Redux flows.
FR-FE-006: Transaction filter string DSL replaced with typed query parameters; frontend uses `URLSearchParams`; backend accepts standard query params.
FR-FE-007: Route-based lazy loading + vendor chunk split; main bundle warning resolved.
FR-FE-008: RTK Query replaces manual Axios thunks across all domain slices.
FR-FE-009: Vitest + React Testing Library test suite introduced.

FR-ARCH-001: Repository disposal must not manually dispose a DI-managed `DbContext`; data access boundary decision documented.
FR-ARCH-002: UTC timestamp consistency: injectable clock abstraction; persisted timestamps use UTC throughout; EF seed data uses fixed constants.
FR-ARCH-003: Vertical Slice Architecture spike: CopyBudgets implemented as MediatR/CQRS handler alongside existing layered architecture.

FR-HIST-001: Historical account value report: net worth over time chart with period-accurate exchange rates.
FR-DX-001: Build warning noise reduced; XML doc warning baseline cleaned; future warning policy documented.

FR-AWS-001: ECR: Docker image push from CI.
FR-AWS-002: RDS: managed MySQL replacing EC2-hosted MySQL.
FR-AWS-003: ECS Fargate: container deployment replacing EC2 Docker stack.
FR-AWS-004: ALB + ACM: HTTPS termination at load balancer.
FR-AWS-005: Route 53: custom domain management.
FR-AWS-006: Secrets Manager: runtime secret injection replacing SSM Parameter Store.
FR-AWS-007: CloudWatch: logs + alarms + dashboard.
FR-AWS-008: CI/CD: GitHub Actions to ECR to ECS rolling deploy.

FR-UX-001: Production frontend implements the `docs/design` shell: sticky desktop top nav, mobile bottom nav, page header, brand mark, user pill, and no app footer inside authenticated routes.
FR-UX-002: Frontend design tokens and shared primitives are introduced for money values, buttons, icon buttons, drawers, segmented controls, empty states, progress, and responsive layout.
FR-UX-003: Transactions page is rebuilt as a ledger-first workspace with KPI strip, grouped day rows, active filter chips, advanced filter drawer, and mobile stacked rows.
FR-UX-004: Accounts, Categories, and Budgets are rebuilt as dense management workspaces using the new hero, grouping, toolbar, row, drawer, and empty-state patterns.
FR-UX-005: Reports hub, dashboard landing, and report drill-down chrome follow the design guide, including chart accessibility and export/share/print action placement.
FR-UX-006: Profile, settings, login, and registration screens follow the design guide, include production validation/loading/error states, and fix mobile profile overflow.
FR-UX-007: Converted pages pass the documented visual QA matrix at 1440px, 1024px, 390px, and 360px where applicable.

Total FRs: 76

### Non-Functional Requirements

NFR-SEC-1: All user-owned data queries must include `UserId` ownership predicate.
NFR-SEC-2: API authentication is JWT-based; backend is authoritative; frontend ProtectedRoute is UX-only.
NFR-SEC-3: Secrets must not appear in committed source, logs, comments, or screenshots.
NFR-SEC-4: HSTS in production; standard security headers in all environments.

NFR-PERF-1: All filtering (pagination, date range, tag/ref) must execute database-side before count and pagination.
NFR-PERF-2: Cold-cache yearly report triggers no more than 2 external exchange rate API calls.
NFR-PERF-3: Frontend initial bundle no more than 500 KB minified per Vite threshold.

NFR-REL-1: Startup DB validation via `EnsureDatabaseInitialized` + `/health` endpoint.
NFR-REL-2: MySQL daily backup to S3 with 30-day retention.

NFR-OBS-1: Structured JSON logs to CloudWatch via Serilog in production.
NFR-OBS-2: After DX-001 completes, `dotnet build inex.sln` produces zero CS1591 XML documentation warnings in default build output.

NFR-I18N-1: All user-visible strings through react-i18next; no hardcoded UI text.
NFR-I18N-2: Backend validation errors return machine-readable codes (`field.rule`), not prose strings.

NFR-TEST-1: Unit tests cover service logic, mappers, external client adapters (`inex.Services.Tests`).
NFR-TEST-2: Integration tests cover auth flows, validation, authorization, RFC 7807 contracts, cross-user access denial (`inex.Tests`).
NFR-TEST-3: EF InMemory must not be the sole coverage for MySQL-specific behavior (migrations, concurrency, constraints).

NFR-UX-1: Money values use tabular numerics, clear income/expense/transfer semantics, and a color-independent signage option.
NFR-UX-2: Authenticated app routes have no horizontal overflow at 390px or 360px mobile widths.
NFR-UX-3: Drawers, segmented controls, tabs, icon buttons, and navigation are keyboard accessible and screen-reader labeled.
NFR-UX-4: Design changes are made through shared tokens and primitives first; page-specific one-off styling is avoided unless documented.

Total NFRs: 20

### Additional Requirements

- Registration remains invite-token gated; open public SaaS registration is out of scope.
- Native mobile applications are out of scope.
- Automatic bank feed/API-based transaction import is out of scope; CSV Fentury import is the current onboarding path.
- Multi-currency accounting within a single account is out of scope.
- Each user's data must be fully isolated, with no cross-user data access at any layer.
- If non-owner users are active in production, FR-SEC-001 is an unscheduled hotfix rather than ordinary sprint work.
- Existing production baseline is AWS EC2 + MySQL 8 + nginx + Let's Encrypt + CloudWatch.
- Typical user volume is assumed at 2-5 accounts and hundreds to low thousands of transactions per year.
- AWS A-track migration is assumed to replace E-track gradually while E-track stays live.
- NBRB integration is assumed independently schedulable.
- Historical net worth chart is treated as independent, with data integrity verification during story creation.

### PRD Completeness Assessment

The PRD is structurally complete enough for traceability validation: it has stable requirement IDs, current production baseline, roadmap items, NFRs, known bugs, suggested delivery order, and open questions. The main readiness risks are not missing requirement text, but unresolved planning context: OQ-2 can change SEC-001 from planned work into an incident hotfix, several current-state requirements are knowingly violated by active bugs, and UX readiness depends on whether the lightweight `ux-design.md` artifact is sufficient for implementation guidance.

## Epic Coverage Validation

### Epic FR Coverage Extracted

**Production baseline FRs inventoried as already implemented, not assigned to new implementation epics:** FR-AUTH-1, FR-AUTH-2, FR-AUTH-3, FR-AUTH-4, FR-AUTH-5, FR-ACC-1, FR-ACC-2, FR-ACC-3, FR-ACC-4, FR-ACC-5, FR-CAT-1, FR-CAT-2, FR-TXN-1, FR-TXN-2, FR-TXN-3, FR-TXN-4, FR-TXN-5, FR-TXN-6, FR-TXN-7, FR-TXN-8, FR-BUD-1, FR-BUD-2, FR-BUD-3, FR-RATE-1, FR-RATE-2, FR-RATE-3, FR-RPT-1, FR-RPT-2, FR-RPT-3, FR-I18N-1, FR-I18N-2, FR-INF-1, FR-INF-2, FR-INF-3, FR-INF-4, FR-INF-5, FR-INF-6.

**Roadmap FRs covered by epics:**

| FR Number | Epic Coverage | Status |
| --------- | ------------- | ------ |
| FR-SEC-001 | Epic 1 - Object-level auth fix across service single-entity operations | Covered |
| FR-SEC-002 | Epic 1 - Refresh token rotation concurrency safety | Covered |
| FR-SEC-003 | Epic 1 - Secrets rotation; Epic 9 Secrets Manager supersedes it | Covered |
| FR-AUTH-6 | Epic 3 - Email confirmation send on registration | Covered |
| FR-AUTH-7 | Epic 3 - Block account use until email confirmed | Covered |
| FR-AUTH-8 | Epic 3 - Resend confirmation endpoint | Covered |
| FR-AUTH-9 | Epic 3 - Confirm-email endpoint; issues JWT on success | Covered |
| FR-DATA-001 | Epic 4 - DB-side tag/ref filtering | Covered |
| FR-DATA-002 | Epic 1 - Remove tracked build artifacts from git | Covered |
| FR-FE-001 | Epic 4 - Active filter indicator | Covered |
| FR-FE-002 | Epic 6 - Month summary cards | Covered |
| FR-FE-003 | Epic 6 - Dashboard home page and Reports nav restructure | Covered |
| FR-FE-004 | Epic 6 - Spending heatmap calendar | Covered |
| FR-FE-005 | Epic 7 - Typed frontend DTOs and no `any` in core flows | Covered |
| FR-FE-006 | Epic 4 - Typed query params replace string filter DSL | Covered |
| FR-FE-007 | Epic 7 - Route-based bundle splitting and vendor chunk | Covered |
| FR-FE-008 | Epic 7 - RTK Query replacing manual Axios thunks | Covered |
| FR-FE-009 | Epic 7 - Vitest + React Testing Library | Covered |
| FR-ARCH-001 | Epic 2 - Repository disposal fix | Covered |
| FR-ARCH-002 | Epic 2 - UTC consistency + injectable clock | Covered |
| FR-ARCH-003 | Epic 8 - VSA/MediatR spike on CopyBudgets | Covered |
| FR-RATE-4 | Epic 5 - NBRB exchange rate client for BYN/RUB | Covered |
| FR-HIST-001 | Epic 6 - Historical net worth chart | Covered |
| FR-DX-001 | Epic 8 - Build warning cleanup | Covered |
| FR-AWS-001 | Epic 9 - ECR image push | Covered |
| FR-AWS-002 | Epic 9 - RDS managed MySQL | Covered |
| FR-AWS-003 | Epic 9 - ECS Fargate deployment | Covered |
| FR-AWS-004 | Epic 9 - ALB + ACM HTTPS | Covered |
| FR-AWS-005 | Epic 9 - Route 53 custom domain | Covered |
| FR-AWS-006 | Epic 9 - Secrets Manager | Covered |
| FR-AWS-007 | Epic 9 - CloudWatch logs, alarms, dashboard | Covered |
| FR-AWS-008 | Epic 9 - CI/CD GitHub Actions to ECR to ECS rolling deploy | Covered |
| FR-UX-001 | Epic 10 - App shell and navigation redesign | Covered |
| FR-UX-002 | Epic 10 - Design tokens and shared frontend primitives | Covered |
| FR-UX-003 | Epic 10 - Transactions ledger redesign | Covered |
| FR-UX-004 | Epic 10 - Management pages redesign for Accounts, Categories, Budgets | Covered |
| FR-UX-005 | Epic 10 - Reports hub, dashboard landing, report drill-down chrome | Covered |
| FR-UX-006 | Epic 10 - Profile, settings, and auth redesign | Covered |
| FR-UX-007 | Epic 10 - Visual QA baseline and responsive regression checks | Covered |

### Missing Requirements

No PRD roadmap FRs are missing from the epic coverage map.

The following PRD production-baseline FRs are not assigned to new epics because `epics.md` explicitly categorizes them as already implemented: FR-AUTH-1 through FR-AUTH-5, FR-ACC-1 through FR-ACC-5, FR-CAT-1 through FR-CAT-2, FR-TXN-1 through FR-TXN-8, FR-BUD-1 through FR-BUD-3, FR-RATE-1 through FR-RATE-3, FR-RPT-1 through FR-RPT-3, FR-I18N-1 through FR-I18N-2, and FR-INF-1 through FR-INF-6.

### Requirements In Epics But Not In PRD FR List

| Epic Requirement | Epic Coverage | Assessment |
| ---------------- | ------------- | ---------- |
| IR-REPORT-001 | Epic 6 - Category report inactive-category data gap and totals fix | Valid implementation requirement derived from PRD BUG-005/BUG-006, but not present as a PRD FR ID |
| IR-REPORT-002 | Epic 6 - Hardcoded report title i18n fix | Valid implementation requirement derived from PRD BUG-007/NFR-I18N-1, but not present as a PRD FR ID |
| IR-DTO-001 | Epic 8 - DTO naming convention and hierarchy fix | Valid technical debt requirement derived from PRD BUG-009, but not present as a PRD FR ID |
| IR-CODE-001 | Epic 8 - Remaining code quality items | Valid technical debt requirement derived from PRD BUG-008 and code quality notes, but not present as a PRD FR ID |

### Coverage Statistics

- Total PRD FRs: 76
- PRD roadmap FRs covered in epics: 39 of 39
- PRD production-baseline FRs inventoried as already implemented: 37 of 37
- Missing PRD roadmap FRs: 0
- Coverage percentage for roadmap implementation work: 100%
- Traceability caveat: four epic-only FR IDs should either be added to the PRD FR list or renamed as story/internal technical requirements to avoid two competing requirement namespaces.

## UX Alignment Assessment

### UX Document Status

UX planning entry point found:
- `D:\work\inex\docs\planning\ux-design.md`

The UX index intentionally points to these primary UX sources:
- `D:\work\inex\docs\design\docs\design-implementation-guide.md`
- `D:\work\inex\docs\planning\design-update-plan.md`
- `D:\work\inex\docs\planning\epics.md` Epic 10 / FR-UX-001 through FR-UX-007

UX is clearly implied and required because InEx is a user-facing React web application with authenticated finance workflows, mobile breakpoints, route chrome, forms, charts, reports, and accessibility requirements.

### UX To PRD Alignment

The design guide and design update plan align with the PRD's UX requirements:
- FR-UX-001 maps to the documented app shell: sticky desktop top nav, mobile bottom nav, page header, brand mark, user pill, and no authenticated footer.
- FR-UX-002 maps to the token and primitive contract for money values, buttons, drawers, segmented controls, empty states, progress, and layout.
- FR-UX-003 maps to the Transactions ledger design with KPI strip, grouped day rows, filter chips, advanced drawer, and mobile stacked rows.
- FR-UX-004 maps to Accounts, Categories, and Budgets management workspace specifications.
- FR-UX-005 maps to Reports hub, dashboard landing, report drill-down chrome, chart accessibility, and export/share/print placement.
- FR-UX-006 maps to Profile, settings, login, and registration redesign, including production validation and mobile profile overflow.
- FR-UX-007 maps to the visual QA matrix at 1440px, 1024px, 390px, and 360px.

No UX requirements were found that conflict with the PRD. The design documents add implementation detail, not new product scope.

### UX To Architecture Alignment

Architecture support is partial by design:
- The architecture document explicitly preserves the current React/Redux/Axios frontend for Epic 1.
- It explicitly defers route redesign, RTK Query, typed frontend DTO overhaul, frontend modernization, and styling/shell changes to later epics.
- It preserves the existing frontend stack that Epic 10 depends on: React 18, TypeScript strict, Vite, Ant Design, Redux Toolkit, Axios, React Router, and i18next.
- It reinforces constraints that UX implementation must preserve: shared `apiClient`, route protection, localization, API compatibility, and frontend build/lint verification.

### Alignment Issues

- The architecture document is complete for Epic 1 only; it does not provide detailed architectural decisions for Epic 10 design-system implementation, visual QA tooling, or the production component/module structure recommended by the design guide.
- Architecture metadata and body text refer to older epic numbering in at least one place, such as later Secrets Manager work being called Epic 8 while current `epics.md` assigns AWS managed infrastructure to Epic 9.
- The design implementation guide references Epic 9 as the planning location for the design rebuild, while current `epics.md` assigns the frontend design-system rebuild to Epic 10.
- UX guidance is discoverable through `ux-design.md`, but that file is only an index. Implementation agents must still load the linked design guide and design update plan, not treat the index as sufficient UX detail.

### Warnings

- Before Epic 10 implementation starts, create or update architecture guidance for the design-system layer, shell migration, visual QA workflow, and accessibility primitives. The current architecture's "READY" status applies to Epic 1, not the full design rebuild.
- Update architecture and design-guide references that still use older epic numbering so implementation sequencing does not drift between architecture, epics, and PRD.

## Epic Quality Review

### Critical Violations

No critical violations were found.

No forward-dependency blockers were found in the current epic ordering. Epics only depend on earlier epics or explicitly allow parallel scheduling where ownership remains clear. The brownfield architecture correctly avoids an initial starter-template setup story.

### Major Issues

#### 1. Architecture Readiness Is Scoped To Epic 1

The architecture document is marked ready, but its body is explicitly scoped to Epic 1: Security & Production Hygiene. It does not provide equivalent architecture decisions for Epic 9 managed infrastructure or Epic 10 frontend design-system rollout.

Impact: implementation agents could incorrectly treat the architecture document as full-roadmap authorization.

Recommendation: create targeted architecture addenda before implementing Epic 9 or Epic 10.

#### 2. Requirement Namespaces Still Diverge

`epics.md` introduces `IR-REPORT-001`, `IR-REPORT-002`, `IR-DTO-001`, and `IR-CODE-001`. These are valid implementation requirements derived from bugs and technical debt, and the PRD now has an Implementation Requirements section for them. However, they are still represented alongside FRs in epic coverage.

Impact: implementers may treat `IR-*` items as product FRs unless the distinction stays visible in story handoff.

Recommendation: keep `IR-*` requirements in a separate implementation-requirements subsection in story files and trace them to PRD bugs/NFRs, not to product FR coverage.

#### 3. Epic 6 Mixes Dashboard Features With Category Report Bug Fixes

Epic 6 delivers dashboard and reporting value while also fixing `IR-REPORT-001` and `IR-REPORT-002` category report defects. Current `epics.md` keeps those fixes explicit in Story 6.5, which is the right boundary.

Impact: acceptable if Story 6.5 remains independently testable; risky if folded into dashboard UI work.

Recommendation: preserve Story 6.5 as a separate story with service/API tests and localization verification.

### Minor Concerns

- Epic 1 lists BUG-003 under "Bugs fixed" but the FR coverage line does not include a corresponding FR ID. This is understandable because BUG-003 is a defect, but it weakens traceability in the epic summary.
- Story 1.4 includes real credential rotation, local setup documentation, and secret scanning. This is valuable but may require manual external actions that should be called out as implementation prerequisites.
- The BDD acceptance criteria are generally strong and testable, but some "When this story is complete" criteria could be tightened to a verifiable action, especially in technical debt stories.
- The design implementation guide still references Epic 9 as the design planning location, while the current epics document assigns the design-system rebuild to Epic 10.

### Dependency Analysis

No circular dependencies were found.

No stale forward references were found in the current `epics.md` dependency lines reviewed: Story 7.4a now references Epic 4 for typed query params, and Story 9.3 now references Story 9.1 and Story 9.2.

No database/entity creation timing violation was found. This is a brownfield project, and stories do not create all tables upfront.

Starter template handling is correct. The architecture selects the existing brownfield solution and explicitly states no starter initialization is needed, so Epic 1 does not need a starter setup story.

### Best Practices Compliance Summary

| Epic | User Value | Independence | Story Sizing | Dependency Status | Assessment |
| ---- | ---------- | ------------ | ------------ | ----------------- | ---------- |
| Epic 1 | Strong production/security value | Independent | Mostly acceptable | Clean | Ready after story-level review |
| Epic 2 | Safer data access and reliable time behavior | Depends on Epic 1 | Acceptable | Backward dependency | Ready |
| Epic 3 | Strong user/auth value | Depends on Epics 1-2 | Acceptable | Backward dependencies | Ready |
| Epic 4 | Strong transaction UX/data value | Depends on Epics 1-2 | Acceptable | Backward dependencies | Ready |
| Epic 5 | Clear BYN/RUB user value | Depends on Epic 2 | Acceptable | Backward dependency | Ready |
| Epic 6 | Strong dashboard/reporting value | Depends on Epics 2 and 5 | Acceptable if Story 6.5 stays explicit | Backward dependencies | Ready with story-boundary caution |
| Epic 7 | Faster, safer frontend evolution | Depends on Epic 4 for RTK Query | Improved slicing | Backward dependency | Ready |
| Epic 8 | Maintainable backend change and clean build signal | Depends on Epics 1-2 | Improved slicing | Backward dependencies | Ready |
| Epic 9 | Managed production operations | Depends on Epics 1-2 | Acceptable by infrastructure track | Backward dependencies | Needs architecture addendum before implementation |
| Epic 10 | Strong UX/user value | Depends on Epics 1, 4, 7 | Well sliced after Story 10.5 split | Backward/parallel dependencies | Needs architecture addendum before implementation |

### Remediation Priority

1. Create architecture addenda for Epic 9 and Epic 10 before implementing those epics.
2. Keep `IR-*` items separated from product FRs in story handoff.
3. Preserve Epic 6 Story 6.5 as an independently testable report-data integrity fix.
4. Tighten any "When this story is complete" acceptance criteria during story creation.
5. Fix the design-guide Epic 9/Epic 10 numbering drift.

## Summary and Recommendations

### Overall Readiness Status

**NEEDS WORK**

The PRD and epic coverage are strong enough to support implementation. The current epic ordering has no critical forward-dependency blockers, and recent updates fixed the stale story references, technical-value framing, and oversized Story 10.5 issue from the prior report.

Epic 1 is ready to proceed as the first implementation target after story-level review, especially because it addresses active production security defects. The full roadmap is not ready for blind handoff because architecture coverage is only complete for Epic 1, `IR-*` requirement handling needs to stay clearly separated from product FRs, and Epic 6 report defect work must remain independently testable.

### Critical Issues Requiring Immediate Action

1. **Resolve PRD OQ-2 before normal sprint sequencing.** If non-owner users are active, SEC-001 is a hotfix incident, not ordinary planned sprint work.
2. **Architecture readiness is scoped to Epic 1.** The architecture document is marked ready, but its decisions cover Security & Production Hygiene, not Epic 9 infrastructure migration or Epic 10 design-system rollout.

### Recommended Next Steps

1. Confirm whether non-owner users are active in production before implementing anything else.
2. Run story-level review for Epic 1 and start with SEC-001.
3. Create architecture addenda for Epic 9 and Epic 10 before implementing those epics.
4. Keep `IR-*` items separated from product FRs in story files and handoff notes.
5. Preserve Epic 6 Story 6.5 as an independently testable report-data integrity fix.
6. Fix the design-guide Epic 9/Epic 10 numbering drift.

### Final Note

This assessment identified **0 current critical sequencing blockers**, **3 major planning issues**, and **4 minor/process concerns** across UX alignment, requirement traceability, architecture scope, and epic quality. Epic 1 can proceed after story-level review; Epic 9 and Epic 10 need additional architecture guidance before implementation.

**Assessor:** Codex using `bmad-check-implementation-readiness`
**Completed:** 2026-05-26
