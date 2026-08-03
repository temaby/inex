---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - docs/planning/prds/prd-inex-2026-05-20/prd.md
  - docs/project-context.md
  - docs/planning/epics.md
inputScope:
  epics: "Epic 1: Security & Production Hygiene; Epic 10: Frontend Design System Rebuild"
workflowType: 'architecture'
lastStep: 8
status: 'ready-for-epic-1-and-epic-10'
project_name: 'inex'
user_name: 'Artiom'
date: '2026-05-26'
completedAt: '2026-05-26'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The current architecture work is scoped to Epic 1: Security & Production Hygiene. The relevant functional requirements are FR-SEC-001, FR-SEC-002, FR-SEC-003, and FR-DATA-002, plus the account update regression tracked in Epic 1. Architecturally, this means the first decisions must focus on hardening existing production behavior rather than introducing new user-facing capability.

The application already has working CRUD flows for accounts, categories, transactions, budgets, reports, exchange rates, authentication, and invite-gated registration. Epic 1 affects these existing flows at their trust boundaries: single-entity service methods must enforce ownership, refresh-token rotation must become concurrency-safe, account updates must preserve the required request contract, local secrets must leave tracked/plaintext files, and frontend build artifacts must stop being source-controlled.

**Non-Functional Requirements:**
The dominant NFR is security: all user-owned data access must include an authenticated-user ownership predicate, and cross-user single-entity access must return `404 Not Found`. Session security must survive concurrent refresh attempts, preserving refresh-token reuse detection while allowing only one successful rotation per token.

Reliability and compatibility also shape the work. API routes, JSON response shapes, validation error keys, and existing success behavior must remain stable for owning users. EF InMemory tests are insufficient for MySQL-sensitive behavior, so implementation must distinguish integration confidence from provider-specific guarantees. Build and deployment hygiene must ensure generated SPA output and real secrets are not committed or treated as durable source artifacts.

**Scale & Complexity:**

- Primary domain: full-stack personal finance web application
- Complexity level: medium-high
- Estimated architectural components: API controllers, service layer, repository/unit-of-work data access, EF Core identity/data models, refresh-token persistence, React/Redux frontend account flow, local configuration/secrets, CI/build/source-control hygiene

### Technical Constraints & Dependencies

The backend targets .NET 8, ASP.NET Core, EF Core 8, Identity, Pomelo MySQL, FluentValidation, JWT auth, and Serilog. Business logic belongs in `inex.Services`; controllers stay thin and use shared controller helpers. Persistence follows the existing repository/unit-of-work pattern unless an explicit architecture story changes that boundary.

The frontend uses React 18, TypeScript strict mode, Vite, Ant Design, Redux Toolkit, Axios, React Router, and i18next. Authenticated API calls must continue through the shared `apiClient`; frontend changes must avoid `any` and preserve existing localization/error-handling patterns.

Epic 1 has no prerequisite epic dependencies and must complete before later work expands query surfaces, auth flows, frontend rollout, or infrastructure changes. SEC-003 is a temporary local/EC2-era secret cleanup that Epic 9 Secrets Manager later supersedes.

### Cross-Cutting Concerns Identified

- Object-level authorization must be enforced at the backend service/data-access boundary, not only in controllers or frontend route guards.
- User-owned single-entity reads, updates, and deletes must query by both entity ID and authenticated user ID.
- Cross-user access should consistently return `404 Not Found` to avoid leaking resource existence.
- Refresh-token rotation needs a single-winner concurrency design using EF Core capabilities, without adding external dependencies.
- Refresh-token reuse detection and session-chain revocation must remain intact after the concurrency fix.
- Request/response contracts and FluentValidation error keys must remain stable while fixing the account update payload regression.
- Secrets must be separated from committed files and documented with safe placeholders.
- Generated frontend build output must be treated as disposable build product, not source.
- Integration tests must cover cross-user denial and token concurrency behavior; provider-sensitive assumptions must be called out where EF InMemory cannot prove MySQL behavior.

## Starter Template Evaluation

### Primary Technology Domain

Brownfield full-stack web application: ASP.NET Core API with React/TypeScript SPA.

The project is already initialized and running in production. Architecture work for Epic 1 should not introduce a new starter template, replace the app shell, or restructure the solution. The correct foundation is the existing repository structure and documented project conventions.

### Starter Options Considered

**Existing InEx Brownfield Solution**
- Backend: .NET 8 ASP.NET Core API, EF Core 8, Identity, Pomelo MySQL, FluentValidation, JWT, Serilog
- Frontend: React 18, TypeScript strict mode, Vite, Ant Design 5, Redux Toolkit, React Router 6, Axios, i18next
- Architecture: thin controllers, service-layer business logic, repository/unit-of-work data access, static mapper extensions, RFC 7807 error handling
- Fit for Epic 1: best fit. It preserves production behavior and allows targeted security fixes.

**ASP.NET Core + React Template**
- Current Microsoft guidance supports ASP.NET Core and React integration through Visual Studio templates.
- Not selected because reinitializing would create churn unrelated to Epic 1 and risk changing routing, auth, build, and deployment behavior.

**Vite React TypeScript Starter**
- Current Vite guidance supports `react-ts` through `npm create vite@latest`.
- Not selected because the project already uses Vite + React + TypeScript. A fresh Vite starter would not include the existing auth, Redux, API client, i18n, or deployment integration.

### Selected Starter: Existing InEx Brownfield Solution

**Rationale for Selection:**
Epic 1 is production hardening, not greenfield setup. The safest architectural foundation is the current solution layout, with changes constrained to service-layer ownership enforcement, refresh-token concurrency, frontend account update payload correctness, local secret hygiene, and generated artifact cleanup.

**Initialization Command:**

```bash
# No starter initialization command.
# Continue from the existing production repository.
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
The backend remains .NET 8 with nullable reference types enabled. The frontend remains React 18 with TypeScript strict mode.

**Styling Solution:**
No starter-driven styling change for Epic 1. Existing Ant Design and current app styling remain in place.

**Build Tooling:**
Backend build remains solution-based through `dotnet build inex.sln`. Frontend build remains `npm run build` from `inex/ClientApp`, using TypeScript checking plus Vite build output.

**Testing Framework:**
Backend tests remain split between `inex.Tests` integration tests and `inex.Services.Tests` service/unit tests. Epic 1 requires integration coverage for cross-user access denial and refresh-token concurrency.

**Code Organization:**
Keep the existing controller/service/repository boundaries. Controllers remain thin, business logic stays in `inex.Services`, persistence stays behind existing data access patterns, and frontend API calls continue through the shared authenticated `apiClient`.

**Development Experience:**
Use the existing repo workflows and verification commands. Do not introduce starter-generated folder structures, new state libraries, new auth frameworks, or new deployment conventions as part of Epic 1.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Ownership enforcement belongs in service/data-access queries for every user-owned single-entity read, update, and delete.
- Cross-user single-entity access returns `404 Not Found`, preserving non-disclosure of resource existence.
- Refresh-token rotation uses a single-winner database concurrency strategy; concurrent use of the same unused token cannot issue multiple replacement tokens.
- Existing API contracts, validation keys, and owning-user success behavior are preserved.

**Important Decisions (Shape Architecture):**
- Keep the existing repository/unit-of-work boundary for Epic 1; add ownership-aware lookup/delete patterns without replacing data architecture.
- Use integration tests in `inex.Tests` for cross-user denial and refresh-token concurrency behavior.
- Fix the frontend account update payload at the existing thunk/form boundary without introducing a broader account model refactor.
- Treat local secrets and frontend build output as environment/generated artifacts, not source.

**Deferred Decisions (Post-Epic 1):**
- Broader repository-vs-direct-DbContext decision remains deferred to ARCH-001.
- UTC clock abstraction remains deferred to TIME-001.
- RTK Query, typed frontend DTO overhaul, and bundle splitting remain deferred to later frontend modernization epics.

### Data Architecture

**Decision: Preserve the current EF Core + repository/unit-of-work architecture for Epic 1.**

Epic 1 should add ownership-safe access patterns inside the existing service/repository flow rather than replacing the data boundary. The affected services are `AccountService`, `CategoryService`, `BudgetService`, and `TransactionService`.

Single-entity operations must no longer retrieve user-owned entities by `Id` alone. Queries must include both the entity identifier and authenticated `UserId`, either directly in the service query or through explicit repository methods such as ownership-aware lookup/delete helpers.

**Rationale:**
The project context explicitly says to use existing repository/unit-of-work patterns unless a story changes the data architecture. Epic 1 is a security hardening epic, not the ARCH-001 repository boundary redesign.

**Affects:**
- `AccountService`
- `CategoryService`
- `BudgetService`
- `TransactionService`
- user-owned repository query paths
- integration tests for account/category/budget/transaction endpoints

### Authentication & Security

**Decision: Backend service/data-access boundary is authoritative for ownership.**

Controllers may pass `CurrentUserId`, but authorization cannot depend on frontend route guards, client-supplied `UserId`, or controller-only checks. Service/data-access methods that load user-owned entities must constrain by authenticated user.

**Decision: Cross-user access returns `404 Not Found`.**

For single-entity reads, updates, and deletes, if the entity does not belong to the current user, the operation behaves as not found. This avoids leaking whether another user's entity exists.

**Decision: Refresh-token rotation uses a single-winner EF Core/MySQL-safe concurrency strategy.**

The preferred implementation is a conditional database update or EF concurrency-token flow that marks an unused refresh token as used only if it is still unused at update time. If zero rows are affected or a concurrency exception occurs, the request must not issue a second replacement token.

**Rationale:**
EF Core supports optimistic concurrency and conditional update row-count checks. For MySQL production behavior, the implementation must be verified with provider-aware judgment rather than relying solely on EF InMemory semantics.

**Affects:**
- `AuthService.RefreshAsync`
- `RefreshToken` model/configuration if a concurrency token is chosen
- refresh-token migrations if schema changes are required
- auth integration tests

### API & Communication Patterns

**Decision: Preserve existing REST endpoints and ProblemDetails conventions.**

Epic 1 should not change API routes, JSON property names, response shapes, enum values, or validation error keys except where the existing account update request is currently malformed by the frontend.

**Decision: Account update fix preserves backend validation contract.**

The frontend `updateAccount` thunk should send the required `key` field expected by `AccountUpdateValidator`. The backend validator contract should not be weakened just to accommodate the current frontend omission.

**Rationale:**
The bug is in the client payload, and the project context requires API compatibility and stable validation/error keys unless a story explicitly changes the contract.

**Affects:**
- `inex/ClientApp/src/store/accounts/accounts-actions.ts`
- `AccountEditForm.tsx`
- account update build/lint verification

### Frontend Architecture

**Decision: Keep existing React/Redux/Axios architecture for Epic 1.**

No RTK Query migration, route restructuring, component-system rewrite, or DTO overhaul belongs in Epic 1. The frontend change is limited to correcting the account update request body and verifying TypeScript/build/lint behavior.

**Rationale:**
Epic 1 is security and production hygiene. Larger frontend modernization is already tracked separately and would add unnecessary blast radius.

**Affects:**
- account edit flow
- shared authenticated `apiClient` usage
- frontend build/lint verification

### Epic 10 Frontend Architecture Addendum

**Decision: Epic 10 rebuilds visual structure through a token and primitive layer while preserving the existing application architecture.**

Epic 10 may replace the authenticated shell, route chrome, page layout components, and visual primitives needed by `docs/design`, but it must not replace the current React 18, TypeScript strict, Vite, Ant Design 5, Redux Toolkit, Axios, React Router 6, i18next, or Recharts stack unless an individual story explicitly requires a dependency change.

**Token And Theme Bridge:**
- Story 10.1a owns the production token baseline and Ant Design theme bridge.
- Production tokens should live in frontend source as CSS custom properties derived from `docs/design/tokens.css`; the design mockup files remain references, not runtime dependencies.
- Ant Design v5 stays available for existing forms, layout primitives, drawers, modals, selects, tables, and feedback components. Map InEx color, typography, radius, border, background, and focus decisions into `ConfigProvider` theme tokens where AntD components are still used.
- Do not hard-code page-local colors, shadows, radii, spacing scales, or money semantics when a shared token exists.

**Primitive Ownership:**
- Story 10.1b owns shared primitives and wrappers for finance values, buttons, icon buttons, drawers, segmented controls, fields/selects, empty states, progress, page headers, responsive layout helpers, and accessible chart summaries where needed.
- Shared primitives should live under the production frontend source tree and expose typed React/TypeScript APIs. Do not import from `docs/design/*.jsx`.
- Page stories should consume the primitives rather than creating one-off CSS or duplicate component contracts. Page-local styling is acceptable only for layout details unique to that route.
- Money primitives must use tabular numerics, explicit income/expense/transfer semantics, and a non-color-only signal.

**App Shell And Routing Migration:**
- Story 10.1c owns replacement of the current authenticated Ant Design shell with the documented desktop top navigation, mobile bottom navigation, brand mark, page header, user pill, logout affordance, and removal of authenticated-route footer chrome.
- Existing route definitions, `ProtectedRoute`, auth state, logout behavior, locale switching, and relative `/api` behavior must continue to work during the shell migration.
- If Story 10.4 introduces or confirms a dashboard/home landing route, keep legacy route redirects or navigation affordances explicit so existing user entry points do not silently break.
- App shell changes must not move data fetching out of existing Redux thunks or bypass the shared `apiClient`.

**Responsive And Visual QA Workflow:**
- Converted routes must be checked at 1440px, 1024px, 390px, and 360px. At minimum, story-level QA should cover the states named by each story; Story 10.6 is the full regression gate for every top-level route.
- Page-level horizontal overflow, clipped controls, overlapping text, bottom-nav occlusion, inaccessible drawer focus behavior, and blank charts are acceptance failures for converted routes.
- For frontend stories, run `npm run build` and `npm run lint` from `inex/ClientApp`. Visual QA evidence should be recorded in the story or the visual QA checklist, not as committed generated screenshots unless a story explicitly asks for artifacts.

**Dependency Policy:**
- Do not add a new styling framework, routing framework, state library, data-fetching library, i18n library, charting library, or component library during Epic 10.
- Ant Design and Recharts may be wrapped, themed, or progressively reduced at page level, but they remain part of the supported stack for Epic 10.
- New dependencies require story-level justification, manifest and lockfile updates, and build/lint verification. Prefer existing browser APIs, React, AntD, Recharts, and local primitives before adding packages.

**I18n, Accessibility, And Error Handling:**
- All user-visible strings added or changed by Epic 10 must go through `react-i18next` locale files for EN/RU.
- Forms must preserve existing validation and API error handling through established helpers and slice/thunk patterns. Do not replace machine-readable validation keys with prose-only UI assumptions.
- Drawers, menus, segmented controls, icon buttons, tabs, mobile navigation, and chart summaries must be keyboard accessible and screen-reader labeled.
- Loading, empty, filter-empty, disabled, success, and API-error states are part of the production UI contract, not optional polish.

**Coexistence With Existing Redux/Axios/Ant Design Architecture:**
- Redux slices and thunks remain the source of shared domain data during Epic 10. RTK Query migration remains Epic 7 scope unless explicitly reprioritized.
- Authenticated API calls must continue through `apiClient`; do not introduce raw `fetch`, raw authenticated `axios`, or component-local API clients.
- Existing Ant Design components may remain inside new shell/page layouts if wrapped or themed consistently. Rebuild the visual surface incrementally without forcing unrelated domain state or API rewrites.
- Epic 10 work should avoid backend contract changes. If a visual flow exposes a missing API capability, record the dependency instead of changing backend behavior inside the frontend story.

**Affects:**
- `inex/ClientApp/src/App.tsx`
- `inex/ClientApp/src/index.tsx`
- `inex/ClientApp/src/layouts/*`
- `inex/ClientApp/src/components/*`
- `inex/ClientApp/src/pages/*`
- `inex/ClientApp/src/store/*`
- `inex/ClientApp/public/locales/*`
- `docs/design/docs/design-implementation-guide.md`

### Infrastructure & Deployment

**Decision: Local secrets must be externalized without introducing the Epic 9 production Secrets Manager architecture early.**

Epic 1 secret work should rotate exposed local credentials, ensure tracked files contain only placeholders, and document local setup through `.env.example` or `dotnet user-secrets`. AWS Secrets Manager remains the later Epic 9 production target.

**Decision: Remove tracked SPA build output from git while preserving build generation.**

`inex/ClientApp/build` should be removed from the index and remain generated by frontend/container build steps. Docker publish behavior should continue to build the SPA during publish/container build rather than relying on committed assets.

**Affects:**
- `.env` / `.env.example`
- local secret setup docs
- `.gitignore`
- tracked files under `inex/ClientApp/build`
- Docker/publish verification

### Decision Impact Analysis

**Implementation Sequence:**
1. Fix object-level authorization in service/data-access paths and add cross-user integration tests.
2. Fix refresh-token rotation concurrency and add simultaneous refresh coverage.
3. Fix frontend account update payload and verify frontend build/lint.
4. Rotate/externalize local secrets and document placeholder-based setup.
5. Remove tracked frontend build artifacts and verify build output no longer creates tracked diffs.

**Cross-Component Dependencies:**
- Ownership enforcement must land before later epics expand query surfaces or UI usage.
- Refresh-token concurrency must preserve existing reuse detection and revocation behavior.
- Account update payload correction must preserve backend validation rather than weakening it.
- Secret cleanup is a local/EC2-era hygiene step that must not conflict with the later Epic 9 Secrets Manager migration.
- Build artifact cleanup must preserve Docker/publish generation paths.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
Eight areas need explicit consistency rules: ownership lookup patterns, delete patterns, refresh-token concurrency, API error semantics, frontend API action shape, test placement, secret handling, and generated artifact handling.

### Naming Patterns

**Database Naming Conventions:**
Keep existing EF Core entity/table/column conventions. Epic 1 must not rename tables, columns, indexes, entities, or migrations unless required for a refresh-token concurrency token.

**API Naming Conventions:**
Preserve existing REST routes and route parameter style:
- Good: `GET /api/accounts/{id}`
- Good: `PUT /api/categories/{id}`
- Avoid: route renames, pluralization changes, or new action-style endpoints for existing CRUD behavior

**Code Naming Conventions:**
Use existing C# and TypeScript naming:
- C# service methods remain `GetAsync`, `UpdateAsync`, `DeleteAsync` unless adding explicit ownership-aware helpers.
- New backend contracts use `CreateXxxRequest`, `UpdateXxxRequest`, `XxxResponse`.
- Frontend action files keep the existing `*-actions.ts` / `*-slice.ts` pattern.

### Structure Patterns

**Project Organization:**
- Service logic stays in `inex.Services`.
- Persistence helpers stay in `inex.Data`.
- Controllers stay thin and pass `CurrentUserId`; they do not become the ownership enforcement layer.
- Integration tests for endpoint behavior stay in `inex.Tests`.
- Service-only tests stay in `inex.Services.Tests`.

**File Structure Patterns:**
- Add cross-user access tests to the relevant domain controller test files or parallel domain-specific test files under `inex.Tests`.
- Add refresh-token endpoint/concurrency tests under `inex.Tests/Auth` unless a lower-level service test is also needed.
- Do not create new top-level architecture folders for Epic 1.

### Format Patterns

**API Response Formats:**
Use existing RFC 7807 ProblemDetails behavior through `GlobalExceptionsHandler`.

For cross-user single-entity access:
- Return `404 Not Found`.
- Use the same not-found exception path as missing resources.
- Do not return `403`, `401`, or a custom ownership error body.

**Data Exchange Formats:**
Preserve existing JSON camelCase request/response shapes. The account update fix must add the missing `key` field to the frontend payload; it must not remove backend validation or rename request properties.

### Communication Patterns

**State Management Patterns:**
Frontend Epic 1 changes stay inside existing Redux thunk patterns:
- Use `apiClient`.
- Use `parseAxiosError`.
- Keep `setIsLoading`, `setIsCreating`, `setIsUpdating`, `setError`, and `setLastUpdate` conventions.
- Do not introduce RTK Query, new global state libraries, or raw `fetch`.

**Logging Patterns:**
Use existing exception logging and ProblemDetails mapping. Do not add ad hoc logging of secrets, tokens, connection strings, or request bodies that may contain credentials.

### Process Patterns

**Ownership Enforcement Patterns:**
All single-entity user-owned reads, updates, and deletes must include both entity ID and authenticated user ID before returning or mutating data.

Good:
```csharp
var account = await DbInEx.AccountRepository
    .Get(false, i => i.Id == id && i.UserId == userId)
    .SingleOrDefaultAsync(ct)
    ?? throw new ResourceNotFoundException($"Account {id} was not found.", "Account", id);
```

Avoid:
```csharp
var account = await DbInEx.AccountRepository.GetAsync(id, ct);
```

For delete operations, filter by ownership in the delete predicate or query:
```csharp
await DbInEx.AccountRepository.ExecuteDeleteAsync(
    i => ids.Contains(i.Id) && i.UserId == userId,
    ct);
```

Avoid deleting by ID alone:
```csharp
await DbInEx.AccountRepository.ExecuteDeleteAsync(i => ids.Contains(i.Id), ct);
```

**Refresh Token Patterns:**
Refresh rotation must be single-winner:
- The first concurrent request that marks the token used may issue a replacement token.
- Losing concurrent requests must not issue another replacement token.
- Token reuse detection and revocation behavior must remain intact.
- Do not preserve a grace-window behavior that returns the already-issued replacement token if Epic 1 acceptance requires only one success.

**Error Handling Patterns:**
- Domain failures should use existing service exceptions that map to ProblemDetails.
- Validation failures should preserve machine-readable validation keys.
- Cross-user access should be indistinguishable from missing resource access.

**Loading State Patterns:**
Frontend thunks should preserve existing `try/catch/finally` loading state structure. Do not introduce new loading state conventions in Epic 1.

### Enforcement Guidelines

**All AI Agents MUST:**
- Search for `GetAsync(id` and delete-by-ID patterns in affected services before declaring SEC-001 complete.
- Include authenticated `userId` in every user-owned single-entity lookup and mutation path.
- Preserve `404` semantics for cross-user access.
- Preserve existing REST routes, JSON shapes, and validation keys.
- Add or update integration tests for cross-user read, update, and delete denial.
- Keep frontend account update changes limited to the existing thunk/form flow.
- Keep real secrets out of tracked files, logs, docs, and screenshots.
- Remove generated SPA build output from git without breaking build generation.

**Pattern Enforcement:**
- Use targeted `rg` searches for unsafe lookup/delete patterns.
- Run backend integration tests for affected domains.
- Run frontend build/lint for account update changes.
- Check `git status --short` for accidental generated output or secret-bearing files.

### Pattern Examples

**Good Examples:**
- `AccountService.UpdateAsync(id, request, userId, ct)` loads by `Id` and `UserId`.
- Cross-user `DELETE /api/accounts/{id}` returns `404`.
- `updateAccount` sends `{ id, key, name, description, currencyId, isEnabled }`.
- Refresh-token concurrency tests assert exactly one successful rotation.

**Anti-Patterns:**
- Loading an account/category/budget/transaction by `Id` alone.
- Checking ownership only in React or only in a controller.
- Returning `403` for guessed entity IDs belonging to another user.
- Weakening `AccountUpdateValidator` to make the current frontend bug pass.
- Adding RTK Query, direct DbContext architecture changes, or route redesign as part of Epic 1.
- Committing `inex/ClientApp/build` files after a local build.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
inex/
├── .github/
│   └── workflows/
│       └── dotnet.yml
├── docker/
│   └── api/
│       └── Dockerfile
├── docs/
│   ├── planning/
│   │   ├── architecture.md
│   │   ├── epics.md
│   │   └── prds/
│   │       └── prd-inex-2026-05-20/
│   │           └── prd.md
│   ├── implementation/
│   └── project-context.md
├── inex/
│   ├── ClientApp/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── components/
│   │       ├── layouts/
│   │       ├── model/
│   │       ├── pages/
│   │       ├── store/
│   │       │   └── accounts/
│   │       │       ├── accounts-actions.ts
│   │       │       └── accounts-slice.ts
│   │       └── utils/
│   │           ├── apiClient.ts
│   │           └── parseAxiosError.ts
│   ├── Controllers/
│   │   ├── AccountsController.cs
│   │   ├── AuthController.cs
│   │   ├── BudgetsController.cs
│   │   ├── CategoriesController.cs
│   │   └── TransactionsController.cs
│   ├── Exceptions/
│   │   └── GlobalExceptionsHandler.cs
│   ├── Infrastructure/
│   ├── Extensions/
│   ├── Program.cs
│   ├── appsettings.json
│   └── inex.csproj
├── inex.Data/
│   ├── Configurations/
│   │   └── RefreshTokenConfiguration.cs
│   ├── Migrations/
│   ├── Models/
│   │   ├── AppUser.cs
│   │   └── RefreshToken.cs
│   ├── Repositories/
│   │   ├── Base/
│   │   ├── AccountRepository.cs
│   │   ├── BudgetRepository.cs
│   │   ├── CategoryRepository.cs
│   │   └── TransactionRepository.cs
│   ├── InExDbContext.cs
│   └── inex.Data.csproj
├── inex.Services/
│   ├── Exceptions/
│   ├── Models/
│   │   ├── Mappers/
│   │   └── Records/
│   ├── Options/
│   ├── Services/
│   │   ├── Auth/
│   │   │   └── AuthService.cs
│   │   ├── Base/
│   │   ├── AccountService.cs
│   │   ├── BudgetService.cs
│   │   ├── CategoryService.cs
│   │   └── TransactionService.cs
│   ├── Validators/
│   └── inex.Services.csproj
├── inex.Tests/
│   ├── Accounts/
│   ├── Auth/
│   ├── Categories/
│   ├── Infrastructure/
│   │   ├── InExWebApplicationFactory.cs
│   │   └── IntegrationTestCollection.cs
│   ├── Validation/
│   ├── ErrorContractTests.cs
│   └── inex.Tests.csproj
├── inex.Services.Tests/
│   └── inex.Services.Tests.csproj
├── scripts/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── docker-compose.override.yml
├── docker-compose.prod.yml
└── inex.sln
```

Generated/local-only directories and files such as `bin/`, `obj/`, `inex/ClientApp/build`, `inex/logs`, `.env`, and PEM/private-key files are not architecture source boundaries and must not be treated as implementation artifacts.

### Architectural Boundaries

**API Boundaries:**
Controllers in `inex/Controllers` define HTTP routes, authentication requirements, model binding, and response status behavior. They should pass `CurrentUserId` into service methods where ownership matters, but they should not contain business logic or become the only ownership enforcement layer.

**Component Boundaries:**
The React app under `inex/ClientApp/src` communicates with the backend through `utils/apiClient.ts`. Redux thunks under `src/store/*/*-actions.ts` own async API calls and loading/error state dispatches. Components and pages should not create raw authenticated HTTP clients.

**Service Boundaries:**
Business rules live in `inex.Services/Services`. For Epic 1, ownership-safe single-entity read/update/delete behavior belongs in `AccountService`, `CategoryService`, `BudgetService`, and `TransactionService`, using repository/data access queries that include authenticated `userId`.

`AuthService.RefreshAsync` owns refresh-token rotation behavior. It may use `InExDbContext` directly as it already does for Identity refresh-token persistence.

**Data Boundaries:**
EF entities, configurations, migrations, repositories, and `InExDbContext` live in `inex.Data`. Data access changes that affect schema must include migrations. Epic 1 should not redesign the repository/unit-of-work boundary; it should add ownership-safe query patterns within the existing boundary.

### Requirements to Structure Mapping

**Epic 1: Security & Production Hygiene**
- Story 1.1 object-level authorization:
  - Services: `inex.Services/Services/AccountService.cs`, `CategoryService.cs`, `BudgetService.cs`, `TransactionService.cs`
  - Data access: `inex.Data/Repositories/*` only if ownership-aware helpers are added
  - Controllers: `inex/Controllers/*Controller.cs` only to pass `CurrentUserId` where existing service signatures lack it
  - Tests: `inex.Tests/Accounts`, `inex.Tests/Categories`, plus new or matching `Budgets` and `Transactions` test locations if absent
- Story 1.2 refresh-token race:
  - Service: `inex.Services/Services/Auth/AuthService.cs`
  - Data model/config: `inex.Data/Models/RefreshToken.cs`, `inex.Data/Configurations/RefreshTokenConfiguration.cs`
  - Migrations: `inex.Data/Migrations` if a concurrency token or schema change is used
  - Tests: `inex.Tests/Auth` for endpoint behavior; `inex.Services.Tests/Services/Auth` for focused service behavior if needed
- Story 1.3 account update 422:
  - Frontend action: `inex/ClientApp/src/store/accounts/accounts-actions.ts`
  - Frontend form call site: `inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx`
  - Backend validator remains in `inex.Services/Validators`
- Story 1.4 local secrets:
  - Root `.env.example`
  - Root `.gitignore`
  - Local `.env` remains untracked/local-only
  - Any documentation belongs in `docs/implementation` only if the story requires a report
- Story 1.5 tracked build artifacts:
  - Remove tracked files under `inex/ClientApp/build`
  - Preserve build configuration in `inex/inex.csproj`, `docker/api/Dockerfile`, and compose files

**Cross-Cutting Concerns:**
- ProblemDetails mapping: `inex/Exceptions/GlobalExceptionsHandler.cs`
- Test host and auth helpers: `inex.Tests/Infrastructure/InExWebApplicationFactory.cs`
- Frontend API error parsing: `inex/ClientApp/src/utils/parseAxiosError.ts`
- CI verification: `.github/workflows/dotnet.yml`

### Integration Points

**Internal Communication:**
HTTP request flow is controller -> service -> repository/DbContext -> mapper -> response. Frontend flow is page/component -> Redux thunk -> `apiClient` -> API -> slice update.

**External Integrations:**
Epic 1 should not change external exchange-rate clients, AWS production topology, nginx, DNS, or future ECS/RDS migration plans. Secret cleanup may affect local configuration and deployment secret handling, but AWS Secrets Manager architecture remains Epic 9.

**Data Flow:**
Authenticated user identity is established by JWT middleware, exposed through controller base helpers, passed as `userId` to services, and applied in data queries before returning or mutating user-owned records.

### File Organization Patterns

**Configuration Files:**
Root compose files control container orchestration. API settings live in `inex/appsettings*.json` and environment/user-secret providers. Real secret values do not belong in tracked config or docs.

**Source Organization:**
Keep source changes inside the existing projects:
- API host: `inex`
- data layer: `inex.Data`
- business/services: `inex.Services`
- frontend SPA: `inex/ClientApp`

**Test Organization:**
Endpoint/security behavior belongs in `inex.Tests`. Service-only logic belongs in `inex.Services.Tests`. Shared integration setup belongs in `inex.Tests/Infrastructure`.

**Asset Organization:**
`inex/ClientApp/build` is generated output. It should be produced by frontend/container builds and excluded from tracked source.

### Development Workflow Integration

**Development Server Structure:**
Backend runs from the ASP.NET Core host. Frontend runs from Vite in `inex/ClientApp`, with API calls using relative `/api` paths through the configured proxy/client behavior.

**Build Process Structure:**
Backend verification uses `dotnet build inex.sln` and `dotnet test inex.sln` or focused subsets while iterating. Frontend verification uses `npm run build` and `npm run lint` from `inex/ClientApp`.

**Deployment Structure:**
Docker and publish flows should build the SPA during container/publish steps. Deployment must not depend on committed `ClientApp/build` artifacts.

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:**
The architecture is coherent for the scoped Epic 1 work. The brownfield starter decision, repository/unit-of-work preservation, service/data ownership enforcement, REST/ProblemDetails compatibility, React/Redux preservation, and source-control hygiene decisions all reinforce the same goal: targeted production hardening without broad redesign.

No contradictory decisions were found. The document explicitly defers broader architecture changes such as ARCH-001 repository boundary redesign, TIME-001 clock abstraction, RTK Query migration, and frontend DTO modernization.

**Pattern Consistency:**
The implementation patterns support the core decisions. Ownership examples show the exact conflict to avoid: `GetAsync(id)` and delete-by-ID alone. Error patterns reinforce `404` for cross-user access. Frontend patterns keep account-update work inside the existing thunk and API-client flow. Secret/build-output rules align with the infrastructure decisions.

**Structure Alignment:**
The project structure maps each Epic 1 story to concrete files and directories. The API, service, data, frontend, test, config, Docker, and generated-artifact boundaries are clear enough for implementation agents to avoid unrelated refactors.

### Requirements Coverage Validation

**Epic/Feature Coverage:**
Epic 1 is covered:
- Story 1.1 object-level authorization maps to affected services, data access, controllers only where user ID must be passed, and integration tests.
- Story 1.2 refresh-token race maps to `AuthService`, `RefreshToken` model/configuration, migrations if needed, and auth tests.
- Story 1.3 account update 422 maps to the frontend account thunk/form boundary while preserving backend validation.
- Story 1.4 secrets maps to root env/example/gitignore and local secret handling.
- Story 1.5 build artifacts maps to `ClientApp/build`, publish/build config, Docker, and git hygiene.

**Functional Requirements Coverage:**
- FR-SEC-001: covered by ownership-query decisions, patterns, and structure mapping.
- FR-SEC-002: covered by single-winner refresh-token concurrency decision and AuthService/data model mapping.
- FR-SEC-003: covered by local secret externalization decision and structure mapping.
- FR-DATA-002: covered by generated build artifact decision and deployment/build boundaries.
- BUG-003 account update regression: covered by frontend thunk payload decision and validation-contract preservation.

**Non-Functional Requirements Coverage:**
Security requirements are strongly covered, especially backend trust-boundary enforcement and secret handling. Compatibility is covered through REST, JSON, validation-key, and ProblemDetails preservation. Testability is covered through integration-test placement and enforcement guidance. Provider-specific risk is acknowledged for refresh-token concurrency because EF InMemory cannot prove MySQL locking/concurrency behavior.

### Implementation Readiness Validation

**Decision Completeness:**
Critical Epic 1 decisions are documented with rationale, affected components, implementation sequence, and deferred decisions. Technology versions and existing stack are sufficiently specified for Epic 1 because no stack migration is planned.

**Structure Completeness:**
The project structure is specific to the existing repo and maps implementation targets to actual directories. It identifies local/generated artifacts that must not be treated as source.

**Pattern Completeness:**
The main AI-agent conflict points are addressed: ownership lookup, delete behavior, refresh-token concurrency, error semantics, frontend API calls, tests, secrets, and generated output.

### Gap Analysis Results

**Critical Gaps:**
None found for architecture readiness.

**Important Gaps:**
- Refresh-token concurrency needs implementation-time provider verification. The architecture allows either EF concurrency tokens or conditional database updates, but the exact implementation must be verified against MySQL semantics, not only EF InMemory tests.
- Budget and transaction integration test directories may need to be created if they do not already exist when Story 1.1 is implemented.

**Nice-to-Have Gaps:**
- A short implementation checklist per Epic 1 story could be created later as story-level execution guidance.
- A MySQL-backed concurrency test harness would increase confidence for SEC-002 beyond the default integration-test setup.

### Validation Issues Addressed

No blocking validation issues were found. The refresh-token provider-verification caveat is documented as an important implementation gap rather than an architecture blocker.

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

**Overall Status:** READY FOR EPIC 1 AND EPIC 10 IMPLEMENTATION

This architecture document is ready for Epic 1 implementation and, through the Epic 10 frontend architecture addendum, ready for Epic 10 frontend design-system rebuild implementation. It does not authorize implementation of Epic 9 managed infrastructure without additional architecture guidance.

**Confidence Level:** High

**Key Strengths:**
- Scope is tightly constrained to Epic 1 production hardening.
- Existing brownfield architecture is preserved.
- Security-sensitive boundaries are explicit.
- Implementation conflict points are called out with examples.
- Requirements map to concrete source and test locations.
- Epic 10 now has explicit frontend architecture guidance for tokens, primitives, shell migration, QA, dependencies, accessibility, i18n, error handling, and coexistence with Redux/Axios/Ant Design.

**Areas for Future Enhancement:**
- Provider-backed MySQL verification for refresh-token concurrency.
- Story-level checklists for Epic 1 implementation.
- Later architecture work for repository boundary cleanup, UTC clock abstraction, and Epic 9 managed infrastructure remains intentionally deferred.

### Implementation Handoff

### Transactions Page Enhancements Addendum

The Transactions Page Enhancements architecture is maintained separately in [transactions-architecture.md](transactions-architecture.md). It supplements this document for server-wide filtering, trustworthy summaries, adaptive result navigation, Native Balance context, and related validation; it does not supersede the Epic 1 or Epic 10 decisions here.

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented.
- Use implementation patterns consistently across all affected components.
- Respect project structure and boundaries.
- Treat this document as the source of truth for Epic 1 and Epic 10 architecture questions.
- Do not expand Epic 1 into deferred architecture or frontend modernization work. Do not expand Epic 10 into backend contract changes, RTK Query migration, or production infrastructure work.

**First Implementation Priority:**
Implement Story 1.1 object-level authorization first, because it is the highest-risk production data isolation issue and blocks safer expansion of later work.
