# InEx — CLAUDE.md

Personal finance management app. Multi-user. Each user has fully isolated data.

## Tech Stack

**Backend:** ASP.NET Core 8 · EF Core 8 + Pomelo MySQL · Custom static mappers (`inex.Services/Models/Mappers/`) · Repository + UoW pattern · FluentValidation · Polly · Serilog · JWT with refresh token rotation · AWS CloudWatch (production)

**Frontend:** React 18 + TypeScript strict · Redux Toolkit · Ant Design v5 · Vite · react-i18next (EN/RU) · dayjs · recharts · Axios

**Infra:** Docker multi-stage build · docker-compose · GitHub Actions CI · MySQL 8 · AWS (EC2/ECR target)

## Project Layout

```
inex/                   ASP.NET Core web host + React SPA
inex.Data/              EF Core: DbContext, entities, migrations, repositories
inex.Services/          Business logic, DTOs, AutoMapper profiles, validators
inex.Services.Tests/    Unit tests (xUnit)
inex.Tests/             Integration tests (xUnit, real DB)
inex/ClientApp/         React frontend (src/)
docs/                   Learning plan, architecture docs
```

## Dev Commands

For full local startup instructions, see `README.md`.

**Start local dependencies** (from repo root):
```powershell
docker compose up -d mysql
```

**Backend only** (from repo root):
```powershell
dotnet watch run --project inex
```
Swagger UI: `http://localhost:5000/help`

**Frontend only** (from `inex/ClientApp/`):
```powershell
npm start       # Vite dev server, proxies /api → localhost:5000
npm run build   # tsc --noEmit && vite build
npm run lint
```

**Tests:**
```powershell
dotnet test                         # all projects
dotnet test inex.Services.Tests/    # unit only
dotnet test inex.Tests/             # integration only
```

**Migrations** (from repo root):
```powershell
dotnet ef migrations add <Name> --project inex.Data --startup-project inex
dotnet ef database update           --project inex.Data --startup-project inex
```

## Backend Conventions

### Controllers
- Inherit `ApiControllerBase` — provides `CurrentUserId` and `BuildErrorMessage()`
- Route constants as `public const string RoutePrefix` / `GetSingleRoute` etc.
- Return `ResponseDTO` for all responses

### Services
- All implement `IInExService` base interface
- Registered via `WalletServicesExtension.AddInExServices()`
- Return `ResponseDTO` with message collections; throw `InExException` for domain errors

### Error handling
- `InExException` → `MessageCode` enum → `ResponseDTO`
- Global RFC 7807 Problem Details handler in middleware

### DTOs
- Live in `inex.Services/Models/Records/`
- AutoMapper profiles in `inex.Services/Models/ConfigProfiles/`
- Naming target: `CreateAccountRequest` / `AccountResponse` convention (migration in progress)

### Validation
- FluentValidation with machine-readable error codes (i18n-ready)
- Validators in `inex.Services/Validators/`

### Configuration
- Options classes + `ValidateOnStart()` — all settings validated at startup
- Env var override pattern: `ConnectionStrings__InExConnection` → `ConnectionStrings:InExConnection`

### Tags/refs
- Transaction `Comment` field encodes `#hashtags` (tags) and `@references` (refs)
- Parsed on read; never store parsed values separately

## Frontend Conventions

### State management
- Redux Toolkit slices per domain: `accounts`, `transactions`, `budgets`, `categories`, `rates`, `report`, `budgetReport`, `auth`
- Async thunks for all API calls
- Custom hooks via `store/hooks.ts` — use `useAppDispatch` / `useAppSelector`, not raw Redux hooks

### API calls
- All HTTP via `utils/apiClient.ts` (Axios instance with interceptors + JWT attach)
- Error parsing: `parseApiError.ts` / `parseAxiosError.ts`

### Routing
- React Router v6. Main routes: `/transactions`, `/accounts`, `/categories`, `/budgets`, `/reports`
- Protected routes via `components/ProtectedRoute.tsx`

### i18n
- `react-i18next`, languages: `en` / `ru`
- All user-visible strings must go through `useTranslation()` — no hardcoded UI text

### Dates
- Always use `dayjs` — `moment` is removed

## Database

- MySQL via `InExConnection` connection string
- EF Core with `IInExUnitOfWork` Unit of Work pattern
- Migrations auto-applied on startup via `EnsureDatabaseInitialized()` (Docker/production)
- 5 existing migrations: InitialCreate → AddTemporaryExchangeRatesSupport → AddBudgetsSupport → AddBudgetMonthYear → AddMultipleBudgetsSupport

## Testing

- **Unit tests** (`inex.Services.Tests/`): pure service logic, no DB
- **Integration tests** (`inex.Tests/`): hit real DB, cover Auth, Accounts, Categories, Validation, ErrorContract

## Known Issues / Gotchas

1. `InExDbContextFactory.cs` has MySQL credentials hardcoded — design-time only, not in production path

## Architecture Notes

- **Multi-user isolation:** every query must be scoped to `CurrentUserId` — never return cross-user data
- **CSV import:** `ICSVService` handles Fentury format
- **Exchange rates:** date-based fetching; `ExchangeRateService` + Frankfurter API fallback
- **Security headers + HSTS** applied in middleware (HSTS production only)
- **Rate limiting** on auth endpoints
- **Registration** is currently invite-token gated via `InviteOptions:Token` — temporary solution, proper email-confirmed registration planned
