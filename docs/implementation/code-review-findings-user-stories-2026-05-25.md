---
title: 'Code Review Findings and Remediation Stories'
type: 'review-backlog'
created: '2026-05-25'
status: 'ready-for-planning'
source: 'code-review 2026-05-25'
context: []
---

# Code Review Findings and Remediation Stories

## Intent

Document the architecture, development, code structure, and hygiene issues found during the 2026-05-25 code review, then convert them into developer-ready user stories for future implementation.

## Review Scope

- Backend API, service, repository, auth, and EF Core patterns.
- Frontend TypeScript, Redux, API client, and build output patterns.
- Repository hygiene, secrets handling, build/test feedback, and generated artifacts.

## Verification Snapshot

- `dotnet build inex.sln --no-restore` passed.
- `dotnet test inex.sln --no-build --verbosity minimal` passed: 95 tests.
- `npm run build` passed.
- Build warnings observed:
  - XML documentation warnings for missing `ct` parameter docs.
  - File-copy retry warnings caused by running build while tests were active.
  - Vite CJS API deprecation warning.
  - Large frontend chunk warning: main JS bundle about 1.9 MB minified.

## Findings

### F1 - Missing Object-Level Authorization

**Severity:** High

Single-item read, update, and delete flows fetch entities by `id` without also constraining by the authenticated user's `UserId`. A user who can guess another user's entity id may be able to read, update, or delete accounts, categories, budgets, or transactions.

**Evidence:**
- `inex.Services/Services/AccountService.cs` - `GetAsync`, `UpdateAsync`, `DeleteAsync`
- `inex.Services/Services/CategoryService.cs` - `GetAsync`, `UpdateAsync`, `DeleteAsync`
- `inex.Services/Services/BudgetService.cs` - `GetAsync`, `UpdateAsync`, `DeleteAsync`
- `inex.Services/Services/TransactionService.cs` - `GetAsync`, `UpdateAsync`, `DeleteAsync`

**Recommended resolution:**
- Require `userId` for single-entity service methods.
- Query with both `Id == id` and `UserId == userId`.
- Ensure delete predicates also include ownership.
- Add integration tests for cross-user access.

### F2 - `userId` Used as Audit Metadata Instead of Authorization Boundary

**Severity:** High

Several update paths accept `userId` but only use it to set `UpdatedBy`. The loaded entity is not verified to belong to that user.

**Evidence:**
- `inex.Services/Services/AccountService.cs`
- `inex.Services/Services/CategoryService.cs`
- `inex.Services/Services/BudgetService.cs`
- `inex.Services/Services/TransactionService.cs`

**Recommended resolution:**
- Treat `userId` as a hard ownership boundary.
- Add shared owned-entity lookup helpers or repository methods.
- Make cross-user access behavior consistent: preferably `404 Not Found` to avoid id enumeration.

### F3 - Transaction Tag/Ref Filtering Runs In Memory

**Severity:** Medium

`TransactionService.ApplyFilters` uses `AsEnumerable()` for tag/ref filtering, then converts back to `AsQueryable()`. This can pull many rows into memory before count and pagination, degrading performance and making query behavior less predictable.

**Evidence:**
- `inex.Services/Services/TransactionService.cs` - tag/ref filter branches.
- `inex.Services/Services/Base/Service.cs` - pagination is applied after filtering.

**Recommended resolution:**
- Prefer normalized tag/ref relation queries using `TransactionTagDetails.Any(...)`.
- If comment text remains the source of truth, use database-side `EF.Functions.Like`.
- Keep all filters database-side before `Count`, `Skip`, and `Take`.

### F4 - Refresh Token Rotation Has a Race Window

**Severity:** Medium

Concurrent refresh requests can both read an unused token before either request saves `UsedAt`, which can issue multiple valid replacement tokens.

**Evidence:**
- `inex.Services/Services/Auth/AuthService.cs` - `RefreshAsync`.

**Recommended resolution:**
- Add optimistic concurrency to refresh tokens, such as a `rowversion`.
- Or perform a conditional update in a transaction so only one request can mark a token as used.
- Add a concurrency test for duplicate refresh attempts.

### F5 - Repository and Unit-of-Work Abstractions Leak EF Details

**Severity:** Medium

Repositories return `IQueryable`, leaving services coupled to EF query composition. Repository disposal also disposes a shared `DbContext`; the unit of work disposes multiple repositories that all reference the same context.

**Evidence:**
- `inex.Data/Repositories/Base/Repository.cs`
- `inex.Data/Repositories/InExUnitOfWork.cs`
- `inex.Services/Services/Base/Service.cs`

**Recommended resolution:**
- Either use `InExDbContext` directly in application services/handlers, or make repositories expose intentional domain-specific methods.
- Let DI own `DbContext` lifetime.
- Remove service-level disposal unless a service owns unmanaged resources.

### F6 - Frontend Build Artifacts Are Tracked

**Severity:** Medium

`.gitignore` excludes `ClientApp/build`, but files under `inex/ClientApp/build` are tracked. Running `npm run build` rewrites tracked output and creates noisy diffs.

**Evidence:**
- `.gitignore`
- `git ls-files inex/ClientApp/build`

**Recommended resolution:**
- Remove tracked build artifacts with `git rm --cached -r inex/ClientApp/build`.
- Keep build output generated by CI/container builds.

### F7 - Local Secrets Exist in Plaintext Workspace Files

**Severity:** Medium

`.env` contains database passwords and an exchange API key. The file is ignored, but the secrets are still present in the local workspace.

**Evidence:**
- `.env`

**Recommended resolution:**
- Rotate any real exposed credentials.
- Move secrets to user-secrets, environment injection, or a secret manager.
- Keep `.env.example` as the only committed template.

### F8 - TypeScript Strict Mode Is Weakened by Widespread `any`

**Severity:** Low/Medium

Strict TypeScript is enabled, but many core components, Redux slices, actions, and table renderers use `any`, reducing the value of static checks.

**Evidence:**
- `inex/ClientApp/src/components/Dropdown.tsx`
- `inex/ClientApp/src/components/AutoComplete.tsx`
- `inex/ClientApp/src/store/transactions/transactions-slice.ts`
- `inex/ClientApp/src/store/transactions/transactions-actions.ts`
- `inex/ClientApp/src/pages/Transactions/TransactionList.tsx`

**Recommended resolution:**
- Define API DTO and UI model types.
- Type component props and Redux payloads.
- Add `@typescript-eslint/no-explicit-any` after the first cleanup pass.

### F9 - Client/Server Filtering Uses an Ad Hoc String DSL

**Severity:** Low/Medium

The frontend manually concatenates filter strings like `AccountId:1;Tags:x;` into query parameters. Values are not consistently URL encoded, and server parsing is custom.

**Evidence:**
- `inex/ClientApp/src/store/transactions/transactions-actions.ts`
- `inex.Services/Helpers/FilterHelper.cs`

**Recommended resolution:**
- Replace the string DSL with normal query parameters, such as repeated `accountIds=1&accountIds=2`.
- Or introduce a typed search request DTO.
- Add contract tests around special characters in tags, refs, and comments.

### F10 - Time Handling Is Inconsistent

**Severity:** Low

Some code uses `DateTime.UtcNow`, other code uses `DateTime.Now`, and seed data uses dynamic timestamps.

**Evidence:**
- `inex.Services/Services/BudgetService.cs`
- `inex.Data/Configurations/CurrencyConfiguration.cs`

**Recommended resolution:**
- Introduce an injectable clock abstraction.
- Use UTC consistently for persisted timestamps.
- Use fixed constants in EF seed data.

### F11 - Build Warning Noise Reduces Signal

**Severity:** Low

Build output contains repeated XML documentation warnings for missing `ct` comments. Warning noise makes real warnings easier to miss.

**Evidence:**
- `dotnet build inex.sln --no-restore`

**Recommended resolution:**
- Either document cancellation token parameters, remove XML docs where not valuable, or adjust documentation warning policy.
- Consider warning-as-error for selected categories once noise is reduced.

### F12 - Frontend Bundle Is Large

**Severity:** Low

Vite reports the main production chunk is larger than 500 KB after minification.

**Evidence:**
- `npm run build`

**Recommended resolution:**
- Add route-level lazy loading.
- Split vendor chunks for large libraries such as `antd` and charting dependencies.
- Track bundle size in CI after the split.

## User Stories

### Story SEC-001 - Enforce Owned-Entity Access Across API Services

**Priority:** P0

As an authenticated user, I want API operations to only access entities I own, so that another user's private financial data cannot be read or modified.

**Findings addressed:** F1, F2

**Acceptance criteria:**
- `GET`, `PUT`, and `DELETE` operations for accounts, categories, budgets, and transactions constrain by authenticated `UserId`.
- Cross-user access returns a consistent non-success response, preferably `404`.
- Service method signatures make ownership explicit where needed.
- Existing same-user behavior remains unchanged.
- Integration tests cover cross-user read, update, and delete denial for each affected domain.

**Implementation notes:**
- Start with service methods, then controller call sites.
- Prefer shared helper methods only if they reduce duplication without hiding authorization checks.
- Watch system categories and other special rows so they still follow intended business rules.

### Story SEC-002 - Make Refresh Token Rotation Concurrency-Safe

**Priority:** P0

As a user with an active session, I want refresh token rotation to be safe under concurrent requests, so that session security does not depend on request timing.

**Findings addressed:** F4

**Acceptance criteria:**
- Only one concurrent refresh request can rotate a given unused refresh token.
- Duplicate refresh attempts either receive the already-issued replacement within the configured grace policy or fail consistently.
- Token reuse outside the grace window still revokes active sessions.
- Automated tests cover concurrent refresh attempts.

**Implementation notes:**
- Consider EF Core concurrency tokens on `RefreshToken`.
- Alternatively use a database transaction and conditional update.
- Keep the frontend singleton refresh promise behavior; this story hardens the backend.

### Story DATA-001 - Move Transaction Tag and Ref Filtering to the Database

**Priority:** P1

As a user filtering transactions by tags or references, I want filtering and pagination to remain fast and accurate as my transaction history grows.

**Findings addressed:** F3

**Acceptance criteria:**
- Tag/ref filters no longer use `AsEnumerable()` before pagination.
- Filtering occurs database-side before `Count`, `Skip`, and `Take`.
- Existing filter behavior is preserved for tag/ref matches.
- Tests cover tag-only, ref-only, combined tag/ref, and pagination behavior.

**Implementation notes:**
- Prefer querying `TransactionTagDetails` if it is reliable.
- If comments remain part of the contract, use translated EF expressions such as `EF.Functions.Like`.

### Story ARCH-001 - Simplify Data Access Lifetime and Repository Boundaries

**Priority:** P1

As a developer, I want data access abstractions to make ownership, query shape, and lifetime clear, so that service code is easier to reason about and less coupled to accidental EF behavior.

**Findings addressed:** F5

**Acceptance criteria:**
- Repository disposal no longer manually disposes a shared DI-managed `DbContext`.
- The team decides whether to keep repositories or move services toward direct `InExDbContext` usage.
- New or updated data access APIs avoid exposing broad `IQueryable` where a specific method would be safer.
- Existing tests pass after the refactor.

**Implementation notes:**
- This should be handled incrementally, not as a sweeping rewrite.
- Start with a design note or ADR before changing many services.

### Story DEVOPS-001 - Remove Tracked Frontend Build Output

**Priority:** P1

As a developer, I want generated frontend build output excluded from source control, so that commits contain source changes instead of generated asset churn.

**Findings addressed:** F6

**Acceptance criteria:**
- `inex/ClientApp/build` is no longer tracked by git.
- `.gitignore` continues to ignore build output.
- Docker or deployment flow still produces/serves the SPA build.
- Running `npm run build` does not dirty tracked build assets.

**Implementation notes:**
- Use `git rm --cached -r inex/ClientApp/build`.
- Verify container and production deployment still copy or generate the SPA.

### Story SEC-003 - Rotate and Externalize Local Secrets

**Priority:** P1

As a maintainer, I want real credentials kept out of plaintext workspace files, so that local development does not leak production or shared secrets.

**Findings addressed:** F7

**Acceptance criteria:**
- Any real credentials found in `.env` are rotated.
- Local secret setup is documented using `.env.example`, user-secrets, or a secret manager.
- No secret-bearing files are tracked.
- Secret scanning remains configured and can be run locally or in CI.

**Implementation notes:**
- Validate whether the exposed exchange API key and DB credentials are real before rotating.
- Do not commit regenerated local secret files.

### Story FE-001 - Introduce Typed Frontend DTOs and Remove Core `any` Usage

**Priority:** P2

As a frontend developer, I want API data and component props typed explicitly, so that TypeScript catches contract drift and UI wiring mistakes before runtime.

**Findings addressed:** F8

**Acceptance criteria:**
- Shared frontend DTO/model types exist for accounts, categories, budgets, transactions, reports, rates, and auth responses touched by this pass.
- Core transaction components and Redux slice/action payloads no longer use `any`.
- `npm run build` passes.
- Lint rules are prepared or enabled to prevent new `any` usage in cleaned areas.

**Implementation notes:**
- Start with transaction flows because they contain many `any` usages and complex UI behavior.
- Avoid a giant all-frontend migration unless the team schedules it deliberately.

### Story API-001 - Replace Transaction Filter String DSL with Typed Query Parameters

**Priority:** P2

As an API consumer, I want transaction filtering to use standard typed query parameters, so that filters are robust, URL-safe, and easy to test.

**Findings addressed:** F9

**Acceptance criteria:**
- Transaction list accepts typed query parameters for account ids, category ids, tags, refs, start date, and end date.
- Frontend builds query strings using `URLSearchParams`.
- Existing filter URLs either continue to work during a transition or are intentionally removed with documented migration.
- Tests cover multiple values and special characters.

**Implementation notes:**
- This can pair well with DATA-001 but should stay a separate story if compatibility work is non-trivial.

### Story TIME-001 - Standardize Application Time Handling

**Priority:** P2

As a developer, I want time reads and persisted timestamps to be consistent and testable, so that behavior does not vary by server locale or test timing.

**Findings addressed:** F10

**Acceptance criteria:**
- A clock abstraction is available to services that create timestamps.
- Persisted timestamps use UTC consistently.
- EF seed data uses fixed timestamp constants or omits dynamic audit fields where appropriate.
- Tests cover budget default year/month behavior with a fixed clock.

**Implementation notes:**
- Keep business date concepts separate from audit timestamps.
- Avoid changing existing stored data without a migration plan.

### Story DX-001 - Reduce Build Warning Noise

**Priority:** P3

As a developer, I want build output to highlight actionable issues, so that warnings do not become background noise.

**Findings addressed:** F11

**Acceptance criteria:**
- XML documentation warning noise is removed or intentionally suppressed.
- Build output has a known warning baseline.
- Future warning policy is documented.

**Implementation notes:**
- Decide whether controller XML docs are worth maintaining.
- If XML docs remain, add missing `ct` parameter documentation consistently.

### Story FE-002 - Split the Frontend Production Bundle

**Priority:** P3

As a user, I want the frontend to load quickly, so that initial application startup is not slowed by one oversized JavaScript bundle.

**Findings addressed:** F12

**Acceptance criteria:**
- Route-level lazy loading is introduced for major pages.
- Vendor chunking is configured for large dependencies where useful.
- `npm run build` no longer reports the current oversized main chunk warning, or the remaining warning is justified with a documented threshold.
- Smoke testing confirms major routes still load.

**Implementation notes:**
- Start with reports and transaction-heavy pages.
- Measure output after each split to avoid premature complexity.

## Suggested Delivery Order

1. `SEC-001` - ownership checks.
2. `SEC-002` - refresh-token race hardening.
3. `DEVOPS-001` - remove tracked build output.
4. `SEC-003` - rotate and externalize local secrets.
5. `DATA-001` - database-side tag/ref filtering.
6. `ARCH-001` - data access boundary decision and first refactor.
7. `FE-001` - typed frontend DTOs for core flows.
8. `API-001` - typed transaction filters.
9. `TIME-001` - clock and UTC consistency.
10. `DX-001` - build warning cleanup.
11. `FE-002` - frontend bundle splitting.

## BMAD Follow-Up

Recommended next workflow:

1. Use `bmad-create-story` for `SEC-001`.
2. Implement with `bmad-dev-story`.
3. Run `bmad-code-review` after each high-priority security story.

The full `bmad-create-epics-and-stories` workflow was not run for this artifact because it expects PRD, architecture, and optional UX source documents. This review backlog is narrower: it converts an already completed code review into remediation stories.
