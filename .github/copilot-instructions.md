# InEx - Income & Expense Management System

## Architecture Overview

InEx is a full-stack financial management application built with .NET 8 + React + Redux, using clean architecture patterns.

### Project Structure
- **`inex/`** - Main ASP.NET Core web application with React SPA
- **`inex.Services/`** - Business logic layer with AutoMapper profiles and service contracts  
- **`inex.Data/`** - Data access layer with Entity Framework and repositories
- **`inex/ClientApp/`** - React TypeScript frontend with Redux Toolkit state management

### Backend Patterns

**Controllers**: Inherit from `ApiControllerBase` which provides common error handling and user context. All API routes use const string pattern for maintainability:
```csharp
public const string RoutePrefix = "api/transactions";
public const string GetSingleRoute = "{id}";
```

**Services**: Follow interface-based dependency injection registered in `WalletServicesExtension.cs`. All services inherit from `IInExService`. Business logic returns standardized `ResponseDTO` objects with message collections.

**Error Handling**: Uses custom `InExException` with `MessageCode` enums. Controllers call `BuildErrorMessage()` to create consistent error responses.

**Data Transfer**: Extensive use of record-based DTOs (e.g., `TransactionDetailsDTO`, `TransactionCreateDTO`) with AutoMapper profiles for entity mapping.

### Frontend Patterns

**State Management**: Redux Toolkit with domain-specific slices (`accounts`, `transactions`, `budgets`, etc.). Each slice follows async thunk pattern for API calls.

**UI Framework**: Ant Design components with TypeScript. Pages follow container/presentation component pattern.

**Routing**: React Router v6 with nested routes. Main navigation: `/transactions`, `/accounts`, `/categories`, `/budgets`, `/reports`.

**API Communication**: Development proxy configured to `localhost:5000` for backend API calls.

### Key Development Commands

**Backend**:
- `dotnet build` - Build solution
- `dotnet watch run` - Hot reload development (use VS Code task)
- Swagger UI available at `/help` in development

**Frontend** (from `inex/ClientApp/`):
- `npm start` - Development server
- `npm run build` - Production build
- `npm test` - Run tests

### Critical Integrations

**CSV Import**: `ICSVService` handles transaction imports from external sources (Fentury format supported).

**Multi-Currency**: Exchange rate service with date-based rate fetching.

**AutoMapper**: All entity-DTO mappings configured in `ConfigProfiles/` directory.

### Database Context

Uses Entity Framework with Unit of Work pattern (`IInExUnitOfWork`). Connection string configured in `appsettings.json` as "InExConnection".

When working with transactions, note the tags/refs pattern - comments support `#hashtags` and `@references` extraction.