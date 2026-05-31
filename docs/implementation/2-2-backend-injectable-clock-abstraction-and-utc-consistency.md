# Story 2.2: Backend - Injectable Clock Abstraction and UTC Consistency

## Status

done

## Story

As a developer,
I want time reads to use an injectable clock abstraction,
So that code depending on "now" is deterministically testable and persisted timestamps are UTC-consistent throughout.

## Acceptance Criteria

1. Given `DateTime.Now` and `DateTime.UtcNow` are used directly in services, when this story is complete, then an `IClock` interface with a `UtcNow` property is introduced in `inex.Services`; a `SystemClock` production implementation is registered in DI.
2. Given `BudgetService` uses `DateTime.Now` for default year/month, when this story is complete, then it receives `IClock` via constructor injection and uses `_clock.UtcNow`.
3. Given `CurrencyConfiguration.cs` EF seed data uses dynamic timestamps, when this story is complete, then seed data uses fixed `DateTime` constants, not runtime values.
4. Given any service that creates audit timestamps (`CreatedAt`, `UpdatedAt`), when this story is complete, then all persisted timestamps use UTC consistently; no mix of `DateTime.Now` and `DateTime.UtcNow`.
5. Given `IClock` is injectable, when unit tests for token expiry and rate date logic are written, then they inject a `FakeClock` with a fixed timestamp and are fully deterministic.
6. Given the story is complete, when `dotnet test` runs, then all existing tests pass; a unit test covers budget default year/month behavior with a fixed `FakeClock`.

## Tasks/Subtasks

- [x] Introduce injectable clock abstraction.
  - [x] Add `IClock.UtcNow`.
  - [x] Add `SystemClock`.
  - [x] Register `SystemClock` in DI.
- [x] Replace direct service time reads with `IClock`.
  - [x] Update `BudgetService` default year/month behavior.
  - [x] Update service-created persisted timestamps to use UTC clock values.
  - [x] Update auth token expiry and refresh-token timestamps.
  - [x] Update exchange-rate "today" logic to use the injected clock.
- [x] Replace dynamic EF seed timestamps with fixed UTC constants.
- [x] Add deterministic fixed-clock tests.
  - [x] Add shared `FakeClock`.
  - [x] Cover budget default year/month with a fixed clock.
  - [x] Cover access-token expiry with a fixed clock.
  - [x] Cover exchange-rate today behavior with a fixed clock.
- [x] Run full regression tests.

## Dev Notes

Source story was derived from `docs/planning/epics.md` Story 2.2 and `docs/implementation/code-review-findings-user-stories-2026-05-25.md` TIME-001 because the implementation story file was missing and sprint status still marked this story as `backlog`.

Keep business date concepts separate from audit timestamps. Avoid changing existing stored data without a migration plan.

## Dev Agent Record

### Implementation Plan

Use a minimal `IClock` abstraction in `inex.Services` and inject it into services that currently read system time. Keep the public service contracts unchanged. Update tests by injecting a shared fake clock where behavior depends on "today" or token expiry.

### Debug Log

- `dotnet test inex.Services.Tests/inex.Services.Tests.csproj` initially exposed two auth tests that still assumed wall-clock validation behavior.
- Adjusted token expiry coverage to use a future fixed clock and aligned the existing auth refresh fixtures with their relative timestamp setup.

### Completion Notes

- Added `IClock` and `SystemClock`; registered `SystemClock` as the production clock.
- Replaced direct service-layer time reads in account summary, budget defaults/category timestamps, onboarding seed timestamps, auth refresh/token expiry, and exchange-rate today logic.
- Replaced dynamic currency seed timestamps with a fixed UTC constant.
- Added deterministic `FakeClock` test support and new budget default period coverage.
- Verified the full solution test suite passes.

### File List

- `docs/implementation/2-2-backend-injectable-clock-abstraction-and-utc-consistency.md`
- `docs/implementation/sprint-status.yaml`
- `inex.Data/Configurations/CurrencyConfiguration.cs`
- `inex.Data/Migrations/20260424070214_AddExchangeRateUniqueConstraint.cs`
- `inex.Data/Migrations/20260424070214_AddExchangeRateUniqueConstraint.Designer.cs`
- `inex.Data/Migrations/20260527052323_AddRefreshTokenConcurrencyStamp.Designer.cs`
- `inex.Data/Migrations/InExDbContextModelSnapshot.cs`
- `inex.Services/Infrastructure/Time/IClock.cs`
- `inex.Services/Infrastructure/Time/SystemClock.cs`
- `inex.Services/Extensions/InExServicesExtensions.cs`
- `inex.Services/Services/AccountService.cs`
- `inex.Services/Services/Auth/AuthService.cs`
- `inex.Services/Services/Auth/TokenService.cs`
- `inex.Services/Services/BudgetService.cs`
- `inex.Services/Services/ExchangeRateService.cs`
- `inex.Services/Services/UserOnboardingService.cs`
- `inex.Services.Tests/Helpers/FakeClock.cs`
- `inex.Services.Tests/Services/Auth/AuthServiceTests.cs`
- `inex.Services.Tests/Services/Auth/TokenServiceTests.cs`
- `inex.Services.Tests/Services/BudgetServiceTests.cs`
- `inex.Services.Tests/Services/ExchangeRateServiceTests.cs`

### Change Log

- 2026-05-31: Implemented injectable UTC clock abstraction and fixed-clock test coverage.
- 2026-05-31: Addressed review finding by aligning EF currency seed migration metadata with fixed UTC seed constants.
