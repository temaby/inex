# Story 1.2: Fix Refresh Token Rotation Race Condition

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user with an active session on multiple devices,
I want refresh token rotation to be safe under concurrent requests,
so that my session security does not depend on request timing.

## Acceptance Criteria

1. Given a valid unused refresh token, when two concurrent requests arrive simultaneously to `POST /api/auth/refresh` using the same token, then only one request succeeds in rotating the token and the other receives a consistent non-success response: `401 Unauthorized` or `409 Conflict`.
2. Given a refresh token that has already been used, when any later request attempts to use that token, then the request is rejected and the active session chain is revoked; the current token-reuse detection behavior is preserved.
3. Given the implementation uses either an EF Core concurrency token on `RefreshToken` or a conditional database update inside a transaction, when the change is deployed, then no new external library dependencies are introduced.
4. Given the fix is implemented, when the story is complete, then `inex.Tests` contains a simultaneous refresh test that asserts exactly one refresh attempt succeeds and no second replacement token is issued.
5. Given existing auth behavior, when registration, login, refresh, logout, profile update, and password change tests run, then existing route names, JSON response shapes, HTTP-only cookie behavior, and ProblemDetails mappings remain compatible.

## Tasks / Subtasks

- [x] Replace the current grace-window refresh success behavior with single-winner rotation. (AC: 1, 2, 3)
  - [x] Update `AuthService.RefreshAsync` so an already-used token never returns `stored.ReplacedByToken` as a successful refresh.
  - [x] Keep reuse detection: when a request initially observes `UsedAt is not null`, revoke all active refresh tokens for the user and throw an auth failure.
  - [x] For a pure concurrent lost race, return one consistent non-success response without issuing a replacement token; prefer `409 Conflict` for a detected write race or `401 Unauthorized` if implemented through the existing auth-failure path.
- [x] Implement a built-in EF Core single-winner strategy. (AC: 1, 3)
  - [x] Preferred path: add an application-managed concurrency token to `RefreshToken`, configure it in `RefreshTokenConfiguration`, and update it whenever a refresh token row is mutated.
  - [x] Add an EF migration if the chosen strategy changes the `RefreshTokens` schema.
  - [x] Alternative path not used; preferred EF concurrency-token path implemented.
  - [x] Do not add distributed locks, Redis, new auth libraries, or frontend changes for this story.
- [x] Preserve existing refresh-token lifecycle semantics. (AC: 2, 5)
  - [x] Keep invalid, revoked, and expired refresh tokens rejected as `401 Unauthorized`.
  - [x] Keep logout idempotent and continue clearing the `refreshToken` cookie in `AuthController.Logout`.
  - [x] Keep refresh cookie attributes unchanged: `HttpOnly`, `SameSite.Strict`, environment-dependent `Secure`, expiry based on `RefreshTokenExpiryDays`, and `Path = "/api/auth"`.
  - [x] Keep `TokenResponse` body shape as `{ accessToken, expiresIn }`; the refresh token stays in the HTTP-only cookie only.
- [x] Update or replace auth unit tests that encode the old grace-window behavior. (AC: 1, 2)
  - [x] Replace `RefreshAsync_WithinGraceWindow_ReturnsCachedToken` with a test proving used-token reuse is rejected and active user tokens are revoked.
  - [x] Add a focused service-level race test if the implementation uses EF concurrency tokens and can be exercised with two `InExDbContext` instances sharing the same test database.
  - [x] Ensure mocked refresh-token generation returns distinct replacement token values to avoid testing unique-index collisions instead of rotation behavior.
- [x] Add API-level concurrency regression coverage in `inex.Tests/Auth/AuthControllerTests.cs`. (AC: 1, 4, 5)
  - [x] Register or log in with a cookie-aware client, then extract the issued `refreshToken` from the `Set-Cookie` header for test setup.
  - [x] Send two concurrent `POST /api/auth/refresh` requests with the same cookie value using separate clients or manual `Cookie` headers so both requests use the original token.
  - [x] Assert exactly one response is `200 OK`; assert the other response is the chosen non-success status.
  - [x] Assert only one new replacement refresh token is persisted for the original token chain.
- [x] Verify provider-sensitive behavior. (AC: 1, 3, 4)
  - [x] Run `dotnet test inex.sln` from the repo root.
  - [x] If a schema/concurrency-token migration is added, run `dotnet build inex.sln` and verify migration generation does not modify unrelated schema.
  - [x] Because `InExWebApplicationFactory` replaces MySQL with EF InMemory, manually verify the chosen concurrency strategy against MySQL or document the blocker in completion notes before marking done.

### Review Findings

- [x] [Review][Patch] Late duplicate refresh can revoke the winning replacement token [inex.Services/Services/Auth/AuthService.cs:87]
- [x] [Review][Patch] Concurrent logout can return 500 instead of remaining idempotent [inex.Services/Services/Auth/AuthService.cs:131]
- [x] [Review][Patch] Reuse-detection revocation can roll back on token concurrency conflicts [inex.Services/Services/Auth/AuthService.cs:190]
- [x] [Review][Patch] API regression test misses extra or revoked replacement tokens [inex.Tests/Auth/AuthControllerTests.cs:292]
- [x] [Review][Patch] MySQL runtime concurrency verification remains unproven while provider-sensitive work is checked complete [docs/implementation/1-2-fix-refresh-token-rotation-race-condition.md:46]

## Dev Notes

### Current State Analysis

- `AuthController.Refresh` reads the `refreshToken` HTTP-only cookie, returns `Unauthorized()` when the cookie is absent, calls `IAuthService.RefreshAsync`, sets a replacement cookie on success, and returns `TokenResponse` containing only the access token and expiry. Preserve this controller contract. [Source: `inex/Controllers/AuthController.cs`]
- `AuthService.RefreshAsync` currently loads `RefreshToken` by token value with `Include(t => t.User)`, rejects missing/revoked/expired tokens, and then has a grace-window branch: if `UsedAt` is set and `ReplacedByToken` exists within `JwtOptions.RefreshGraceWindowSeconds`, it returns a new access token plus the already-issued replacement refresh token. This is the race condition acceptance failure; concurrent callers can both receive a valid replacement. [Source: `inex.Services/Services/Auth/AuthService.cs`]
- Normal rotation currently generates a new refresh token, sets `stored.UsedAt`, sets `stored.ReplacedByToken`, adds a new `RefreshToken`, and calls `SaveChangesAsync`. There is no concurrency token, conditional row-count check, transaction boundary, or conflict handling around the read-modify-write window. [Source: `inex.Services/Services/Auth/AuthService.cs`]
- `RefreshToken` currently has `Id`, `Token`, `UserId`, `ExpiresAt`, `UsedAt`, `RevokedAt`, `ReplacedByToken`, and `User`. There is no row version or concurrency stamp on this entity. [Source: `inex.Data/Models/RefreshToken.cs`]
- `RefreshTokenConfiguration` requires `Token`, limits `Token` and `ReplacedByToken` to 512 chars, configures the `AppUser` relationship, and adds a unique index on `Token`. There is no concurrency-token configuration. [Source: `inex.Data/Configurations/RefreshTokenConfiguration.cs`]
- Existing auth integration tests already cover register, login, valid refresh, missing-cookie refresh, profile, password change, and logout. They do not cover simultaneous refresh attempts. [Source: `inex.Tests/Auth/AuthControllerTests.cs`]
- Existing auth service tests include `RefreshAsync_WithinGraceWindow_ReturnsCachedToken`; that test represents old behavior and should be removed or rewritten because Story 1.2 requires the second use of the same token to fail. [Source: `inex.Services.Tests/Services/Auth/AuthServiceTests.cs`]

### Recommended Implementation Path

Use an application-managed EF Core concurrency token on `RefreshToken` unless a conditional-update design proves simpler with the existing test harness.

Recommended shape:

1. Add a property such as `public string ConcurrencyStamp { get; set; } = Guid.NewGuid().ToString("N");` to `RefreshToken`.
2. Configure it as required, length-bounded, and `.IsConcurrencyToken()` in `RefreshTokenConfiguration`.
3. Add a migration that adds the column to `RefreshTokens`. Existing rows may receive a default placeholder or generated value; individual updates still include the row key and original concurrency value.
4. When issuing, refreshing, revoking, or bulk-revoking refresh tokens, ensure mutated rows receive a new concurrency stamp.
5. In `RefreshAsync`, load the token once, reject missing/revoked/expired/used states, generate the replacement token, set `UsedAt`, `ReplacedByToken`, and a new concurrency stamp, add the replacement token, and call `SaveChangesAsync`.
6. Catch `DbUpdateConcurrencyException` around the rotation save. Do not issue or persist a replacement for the loser. Map it consistently to either `ConflictException` (`409`) or `AuthenticationFailedException` (`401`).

Why this path fits the repo:

- EF Core optimistic concurrency is built in and works through `SaveChanges`; no external dependency is needed. Microsoft documents concurrency tokens as the standard EF Core optimistic concurrency mechanism. [Source: https://learn.microsoft.com/en-us/ef/core/saving/concurrency]
- The current tests use EF InMemory. A normal tracked-entity `SaveChanges` concurrency-token approach is more likely to remain testable through the existing service/integration harness than a relational-only bulk update. [Source: `inex.Tests/Infrastructure/InExWebApplicationFactory.cs`; `inex.Services.Tests/Services/Auth/AuthServiceTests.cs`]
- MySQL does not provide SQL Server-style `rowversion`; an application-managed stamp avoids provider-specific row-version behavior and keeps migration intent explicit. [Source: `inex.Data/inex.Data.csproj`; `docs/project-context.md`]

### Conditional Update Alternative

If using conditional update instead of a concurrency token:

- Use a transaction so marking the old token and inserting the replacement token are atomic.
- Apply the update only when the current database row is still unused and unrevoked, for example by filtering on `Id`, `UsedAt == null`, and `RevokedAt == null`.
- Check the affected row count. If it is `0`, treat the request as a lost race and return the chosen non-success status without inserting a replacement token.
- Be careful with `ExecuteUpdateAsync`: Microsoft documents that it bypasses change tracking and does not automatically apply EF concurrency control, but it returns affected row counts that can be used for manual concurrency control. [Source: https://learn.microsoft.com/en-us/ef/core/saving/execute-insert-update-delete]
- Verify this path with the test provider. The current integration factory uses EF InMemory, while production uses Pomelo MySQL; do not assume a relational bulk-update API is covered by existing InMemory tests. [Source: `inex.Tests/Infrastructure/InExWebApplicationFactory.cs`; `docs/project-context.md`]

### Response And Error Semantics

- Acceptance allows the concurrent loser to be either `401 Unauthorized` or `409 Conflict`. Choose one and assert it in tests.
- `AuthenticationFailedException` already maps to `401` with type `/errors/authentication-failed`. `ConflictException` already maps to `409` with type `/errors/conflict`. Use these existing exceptions; do not add controller-specific error bodies. [Source: `inex.Services/Exceptions/DomainExceptions.cs`; `inex/Exceptions/GlobalExceptionsHandler.cs`]
- A request that arrives after a token has already been used is token reuse, not a harmless retry. Preserve the current security response: revoke all active refresh tokens for that user and reject the request.
- A request that loses a simultaneous write race after reading an unused token should not get the winning replacement token. If the implementation can distinguish this case, returning `409 Conflict` without revoking the whole chain is acceptable and avoids logging out a legitimate multi-tab user because of timing.

### Files To Inspect And Likely Touch

- `inex.Services/Services/Auth/AuthService.cs` - update refresh rotation, remove grace-window success, handle concurrency conflicts, preserve revocation behavior.
- `inex.Services/Services/Auth/IAuthService.cs` - likely no signature change needed.
- `inex.Data/Models/RefreshToken.cs` - add concurrency token only if using the recommended EF concurrency-token path.
- `inex.Data/Configurations/RefreshTokenConfiguration.cs` - configure the concurrency token only if added.
- `inex.Data/Migrations/*` and `inex.Data/Migrations/InExDbContextModelSnapshot.cs` - required only if schema changes are made.
- `inex/Controllers/AuthController.cs` - likely no code change; inspect to preserve cookie and response behavior.
- `inex.Services.Tests/Services/Auth/AuthServiceTests.cs` - update old grace-window tests and add focused refresh race/reuse coverage.
- `inex.Tests/Auth/AuthControllerTests.cs` - add API-level simultaneous refresh coverage.
- `inex.Tests/Infrastructure/InExWebApplicationFactory.cs` - inspect only if test setup needs same-cookie multi-client support; avoid broad test architecture changes.
- `inex.Data/inex.Data.csproj`, `inex.Services/inex.Services.csproj`, `inex.Tests/inex.Tests.csproj`, `inex.Services.Tests/inex.Services.Tests.csproj` - verify package versions; do not add dependencies.

### Testing Requirements

- Required final verification: `dotnet test inex.sln` from `D:\work\inex`.
- Add at least one integration test that exercises the real `POST /api/auth/refresh` endpoint with two concurrent requests using the same refresh cookie.
- Add or update service tests for:
  - valid token rotation persists exactly one replacement token;
  - used token reuse rejects and revokes active user tokens;
  - concurrent/stale rotation conflict does not persist a second replacement token;
  - invalid, revoked, and expired token tests remain green.
- Use `CreateCookieClient` for cookie-preserving happy-path auth tests. For same-token race tests, prefer manual `Cookie` headers on two separate clients so both requests send the original cookie and the first response cannot update the second client's cookie before it sends. [Source: `inex.Tests/Infrastructure/InExWebApplicationFactory.cs`]
- EF InMemory does not prove MySQL concurrency semantics. If the automated test uses InMemory only, include a completion note describing the MySQL verification performed or why it could not be performed. [Source: `docs/project-context.md`; `docs/planning/architecture.md`]

### Project Structure Notes

- Keep business logic in `inex.Services`; `AuthController` should stay thin.
- Keep EF entity configuration in `inex.Data/Configurations`; do not add inline refresh-token configuration in `InExDbContext.OnModelCreating`.
- Keep schema changes in EF migrations; no raw DDL outside a migration.
- Do not introduce a new auth framework, distributed lock, cache, queue, background job, or frontend behavior.
- Do not change JWT claims, token response shape, auth routes, rate-limit policies, cookie path, or cookie security attributes unless required by a failing test and explicitly documented.

### Previous Story Intelligence

- Story 1.1 established the expected story format: concrete file paths, current-state analysis, domain-specific guardrails, explicit test placement, and final verification commands.
- Story 1.1 could not use git history because Git rejected the workspace as a dubious ownership path. The same limitation applies here unless the dev agent configures safe.directory with explicit approval.
- Story 1.1 reinforced that backend trust boundaries matter more than frontend behavior and that API-compatible fixes should avoid route, JSON, or error-contract churn. Apply the same discipline to auth refresh.
- Story 1.1 did not implement code; it is ready-for-dev context only. Do not assume object-level authorization changes already exist unless the code/diff proves they were implemented.

### Architecture And Project Context Guardrails

- Backend targets .NET 8 and EF Core 8 with Pomelo MySQL; do not upgrade framework or packages for this story. [Source: `docs/project-context.md`; project `.csproj` files]
- Controllers stay thin; auth business logic belongs in `AuthService`. [Source: `docs/project-context.md`; `docs/planning/architecture.md`]
- Refresh-token rotation is explicitly security- and concurrency-sensitive; account for concurrent refresh requests, replay detection, revocation, storage/hashing, and token reuse behavior. [Source: `docs/project-context.md`]
- Provider behavior matters. Do not rely only on EF InMemory for MySQL-sensitive concurrency behavior. [Source: `docs/project-context.md`; `docs/planning/prds/prd-inex-2026-05-20/prd.md`]
- Preserve serialized API contracts unless intentionally changing them and updating all consumers. This story should not change auth response JSON. [Source: `docs/project-context.md`]
- No frontend work is expected for this story. The frontend already relies on the auth cookie and `TokenResponse`; changing the API contract would be scope creep. [Source: `docs/planning/architecture.md`]

### References

- `docs/planning/epics.md` - Epic 1 and Story 1.2 acceptance criteria.
- `docs/planning/architecture.md` - Story 1.2 architecture mapping, refresh-token pattern, provider-verification caveat.
- `docs/planning/prds/prd-inex-2026-05-20/prd.md` - FR-SEC-002 and BUG-002 production bug description.
- `docs/project-context.md` - stack versions, testing rules, and refresh-token critical risk.
- `docs/implementation/1-1-enforce-object-level-authorization-in-service-methods.md` - prior story structure and handoff style.
- `inex.Services/Services/Auth/AuthService.cs` - current race window and grace-window behavior.
- `inex.Data/Models/RefreshToken.cs` and `inex.Data/Configurations/RefreshTokenConfiguration.cs` - current token persistence model.
- `inex/Controllers/AuthController.cs` - refresh endpoint and cookie contract.
- `inex.Tests/Auth/AuthControllerTests.cs` and `inex.Services.Tests/Services/Auth/AuthServiceTests.cs` - existing auth test coverage to extend.
- Microsoft Learn: EF Core concurrency tokens - https://learn.microsoft.com/en-us/ef/core/saving/concurrency
- Microsoft Learn: EF Core `ExecuteUpdate` / `ExecuteDelete` affected row counts - https://learn.microsoft.com/en-us/ef/core/saving/execute-insert-update-delete

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-27: Created branch `story-1-2-fix-refresh-token-rotation-race-condition`.
- 2026-05-27: Confirmed red phase with `dotnet test D:\work\inex\inex.Services.Tests\inex.Services.Tests.csproj --filter AuthServiceTests`; new reuse and stale-concurrency tests failed against old grace-window behavior.
- 2026-05-27: Ran focused green checks: `dotnet test D:\work\inex\inex.Services.Tests\inex.Services.Tests.csproj --filter AuthServiceTests` and `dotnet test D:\work\inex\inex.Tests\inex.Tests.csproj --filter AuthControllerTests`.
- 2026-05-27: Ran final verification: `dotnet test D:\work\inex\inex.sln` and `dotnet build D:\work\inex\inex.sln`.
- 2026-05-27: Generated MySQL migration SQL with `dotnet ef migrations script 20260424070214_AddExchangeRateUniqueConstraint 20260527052323_AddRefreshTokenConcurrencyStamp`; SQL only adds `RefreshTokens.ConcurrencyStamp`.
- 2026-05-27: Addressed code-review findings and ran focused auth verification: `dotnet test D:\work\inex\inex.Services.Tests\inex.Services.Tests.csproj --filter AuthServiceTests` and `dotnet test D:\work\inex\inex.Tests\inex.Tests.csproj --filter AuthControllerTests`.
- 2026-05-27: Ran final post-review verification: `dotnet test D:\work\inex\inex.sln`.
- 2026-05-27: Ran disposable MySQL EF concurrency probe against local `inex-mysql`; two contexts racing on the same refresh-token concurrency stamp produced one successful replacement and one `DbUpdateConcurrencyException`.

### Completion Notes List

- Story context generated from BMAD create-story workflow.
- Ultimate context engine analysis completed - comprehensive developer guide created.
- `docs/implementation/sprint-status.yaml` was updated from `ready-for-dev` to `in-progress`, then to `review`.
- Git branch `story-1-2-fix-refresh-token-rotation-race-condition` was created before implementation.
- No new external library dependencies were added.
- Implemented single-winner refresh-token rotation with an application-managed EF Core concurrency token on `RefreshToken`.
- Removed grace-window successful reuse; observed used-token reuse now revokes active refresh tokens and returns the existing authentication failure path.
- Concurrent stale writes now map to `ConflictException` / `409 Conflict` and clean up the failed replacement token for EF InMemory test consistency.
- Added `AddRefreshTokenConcurrencyStamp` migration; generated SQL was reviewed to avoid unrelated schema or seed-data churn.
- Added service-level tests for used-token reuse revocation and two-context stale rotation conflict with distinct replacement tokens.
- Added API-level concurrent refresh regression coverage using two manual-cookie clients and asserting exactly one success plus one replacement token.
- MySQL provider note: local `inex-mysql` was available; generated migration SQL was reviewed, and a disposable MySQL database probe verified EF concurrency-token behavior with two contexts racing on the same refresh-token row.
- Code review findings were resolved: late duplicate refresh now returns `409 Conflict` within the configured race window without revoking the winning replacement, logout treats stale revoke races idempotently, reuse-detection revocation retries concurrency conflicts, and API coverage asserts exactly one active replacement token.

### File List

- `docs/implementation/1-2-fix-refresh-token-rotation-race-condition.md`
- `docs/implementation/sprint-status.yaml`
- `inex.Data/Models/RefreshToken.cs`
- `inex.Data/Configurations/RefreshTokenConfiguration.cs`
- `inex.Data/Migrations/20260527052323_AddRefreshTokenConcurrencyStamp.cs`
- `inex.Data/Migrations/20260527052323_AddRefreshTokenConcurrencyStamp.Designer.cs`
- `inex.Data/Migrations/InExDbContextModelSnapshot.cs`
- `inex.Services/Services/Auth/AuthService.cs`
- `inex.Services.Tests/Services/Auth/AuthServiceTests.cs`
- `inex.Tests/Auth/AuthControllerTests.cs`

### Change Log

- 2026-05-27: Implemented Story 1.2 refresh-token single-winner rotation fix and moved story to review.
- 2026-05-27: Resolved code-review findings for Story 1.2.

