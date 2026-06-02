# InEx

InEx is a multi-user personal finance management web application. The backend is ASP.NET Core 8 with EF Core and MySQL. The frontend is a React 18 + TypeScript + Vite SPA.

## Local Development

### Prerequisites

- .NET 8 SDK
- Node.js and npm
- Docker Desktop or another Docker Compose runtime
- A CurrencyAPI key for exchange-rate lookups

### First-Time Setup

Create local environment settings for Docker Compose:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set non-placeholder values for:

- `DB_ROOT_PASSWORD`
- `DB_PASSWORD`
- `JWT_SECRET`
- `INVITE_TOKEN`
- `CURRENCY_API_KEY`

For local `dotnet watch` runs, set ASP.NET Core user-secrets from the repo root:

```powershell
dotnet user-secrets set "ConnectionStrings:InExConnection" "Server=localhost;Port=3306;Database=inex_db;Uid=inex_user;Pwd=<DB_PASSWORD>;Convert Zero Datetime=True" --project inex
dotnet user-secrets set "JwtOptions:Secret" "<JWT_SECRET>" --project inex
dotnet user-secrets set "JwtOptions:Issuer" "inex-api" --project inex
dotnet user-secrets set "JwtOptions:Audience" "inex-client" --project inex
dotnet user-secrets set "InviteOptions:Token" "<INVITE_TOKEN>" --project inex
dotnet user-secrets set "CurrencyApiSettings:ApiKey" "<CURRENCY_API_KEY>" --project inex
```

Install frontend dependencies:

```powershell
Set-Location inex\ClientApp
npm install
Set-Location ..\..
```

### Start The App

Use three terminals from the repo root.

Terminal 1: start MySQL.

```powershell
docker compose up -d mysql
```

Terminal 2: start the backend.

```powershell
dotnet watch run --project inex
```

Terminal 3: start the frontend.

```powershell
Set-Location inex\ClientApp
npm start
```

### Local URLs

- Frontend: `http://localhost:3000`
- Backend health check: `http://localhost:5000/health`
- Swagger UI: `http://localhost:5000/help`
- MySQL: `localhost:3306`

The Vite dev server proxies `/api` requests to `http://localhost:5000`, so frontend API calls should use relative `/api/...` paths.

### Stop Local Services

Stop the backend and frontend with `Ctrl+C` in their terminals. Stop MySQL with:

```powershell
docker compose stop mysql
```

### Full Docker Compose Stack

The repository also has a Docker Compose API service. For normal development, prefer the local backend/frontend commands above because they support hot reload. To build and run the API container with MySQL:

```powershell
docker compose up --build
```

The API container listens on `http://localhost:5000`.

## Verification

Backend:

```powershell
dotnet build inex.sln
dotnet test inex.sln
```

Frontend:

```powershell
Set-Location inex\ClientApp
npm run build
npm run lint
```

## Migrations

From the repo root:

```powershell
dotnet ef migrations add <Name> --project inex.Data --startup-project inex
dotnet ef database update --project inex.Data --startup-project inex
```
