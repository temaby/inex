# InEx Agent Instructions

InEx is a multi-user personal finance app. Treat user data isolation as a hard invariant: every backend query and service path must remain scoped to the current user.

Use `CLAUDE.md` and `README.md` for broader project context. This file defines agent behavior and project-specific guardrails.

## Documentation Sources

- Before implementation, read the applicable active story/spec and directly relevant docs under `docs/implementation`, `docs/planning`, or `docs/operations`.
- Treat `docs/project-context.md` as the extended AI-agent rule source when a change touches architecture, security, testing, frontend migration, or database behavior.
- Use `docs/design/docs/design-implementation-guide.md` and `docs/design/*` as visual references for frontend visual work, not as runtime source code.
- This project uses BMad-generated planning and implementation artifacts.
- Before story-sized work, read the active story/spec in `docs/implementation` and relevant planning docs in `docs/planning`.
- Treat accepted BMad decisions as project constraints unless current code contradicts them or the user explicitly changes direction.
- Do not rewrite Dev Agent Records, Change Logs, or completed story history unless explicitly asked.
- For small bug fixes or mechanical edits, use BMad docs only when they are directly relevant to the touched area.

## Session Workflow

- Before UI/browser work, run the project doctor if available; see `docs/operations/project-doctor.md`. If it fails, report setup blockers before continuing.
- For frontend visual changes, produce or update visual QA evidence before code review. Missing visual QA tooling is a blocker for visual-parity claims.
- When given more than 10 UI findings, classify and group them into implementation-owned issues before coding.
- After sessions with repeated environment or tool friction, propose one durable doc, script, or skill update.

## Communication

- Do not open criticism with softening preambles. State the concern directly.
- Do not thank, compliment, echo, or restate the user's request before answering.
- Start with the answer or action. Every sentence must add information.
- For automatically created branches, never use `codex/`. Use `feature/`, `fix/`, `refactor/`, or `docs/`.

## Safety

- Do not start the application or trigger live external API calls during investigation unless explicitly approved.
- Do not call live CurrencyAPI, Frankfurter, NBRB, or other paid/external providers from tests or exploratory work.
- Never print secrets, connection strings, tokens, `.env` contents, or credentials.
- Preserve unrelated user changes. Do not revert files unless explicitly requested.
- Prefer narrow, reviewable changes that match existing patterns.

## Tool Priority

- Use MySQL MCP for read-only DB inspection before Docker, app startup, local `mysql`, migrations, or connection-string fallbacks. See `docs/operations/codex-mcp.md`.
- Use the GitHub connector for issue and PR operations when available; use `gh` only for connector gaps.

## GitHub Issues

- Follow `docs/operations/github-issue-guidelines.md` when creating or editing GitHub issues.
- Keep issue content public-safe: do not include local absolute paths, localhost evidence URLs, credentials, tokens, or user-local details.
- Prefer repo-relative source references such as `inex/ClientApp/src/pages/Accounts.tsx`.
- Issue titles should start with an action verb and should not use prefixes such as `fix(...)`, `refactor(...)`, `docs(...)`, or `[Feature]`.
- Open issues should have exactly one allowed type label and one priority label.
- Keep each issue uniquely scoped; avoid mixing decision work, implementation work, and test-only work unless intentionally grouped.

## Security And Ownership

- For user-owned data, never query, update, delete, aggregate, or report by entity ID alone.
- Include `UserId` or an equivalent ownership predicate before returning or mutating user-owned data.
- Never trust client-supplied ownership fields such as `UserId`; derive the current user from the authenticated principal.
- Cross-user single-entity access should use the same `404 Not Found` path as missing resources.
- Transfer creation has historically loaded source/destination accounts by ID only. Any transfer work must verify both accounts belong to the current user.

## Database Access

When database access is needed for inspection, validation, debugging, or data analysis, keep it read-only unless explicitly approved.

- Prefer `mcp_server_mysql.mysql_query` / `mysql_query` for all read-only SQL.
- Use read-only SQL only: `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`.
- If MySQL MCP is unavailable or insufficient, state that explicitly before using a fallback.
- Do not run write SQL unless explicitly requested and separately approved.
- EF InMemory tests do not prove MySQL translation, migrations, constraints, collation, transactions, or concurrency.
- For schema, provider-specific query, transaction, or concurrency changes, verify against MySQL before treating the change as complete.

## Common Commands

Run from repo root unless noted:

```powershell
dotnet test
dotnet test inex.Services.Tests/
dotnet test inex.Tests/
dotnet build
```

Frontend commands from `inex/ClientApp/`:

```powershell
npm run build
npm run lint
npm start
```

Local dependencies:

```powershell
docker compose up -d mysql
```

Migrations:

```powershell
dotnet ef migrations add <Name> --project inex.Data --startup-project inex
dotnet ef database update --project inex.Data --startup-project inex
```

## Backend Conventions

- ASP.NET Core 8, EF Core 8, Pomelo MySQL, Repository + Unit of Work.
- Controllers inherit `ApiControllerBase`, use `CurrentUserId`, and return typed response records through `ActionResult`.
- Services implement `IInExService`, return domain `XxxResponse` records or wrappers such as `ListResponse<T>`, `PagedResponse<T,TMeta>`, and `CreatedResponse`, and throw `InExException` for domain errors.
- DTOs live in `inex.Services/Models/Records/`.
- New backend contract records should use `CreateXxxRequest`, `UpdateXxxRequest`, `DeleteXxxRequest`, `XxxResponse`, or intentional `XxxSummary`. Do not introduce new `*DTO` contract types.
- Preserve JSON property names, routes, status codes, enum values, validation keys, and response shapes unless the active story explicitly changes the contract.
- Mappings use static extension methods under `inex.Services/Models/Mappers/`. Do not reintroduce mapping libraries or `IMapper` without an explicit architecture decision.
- Validators live in `inex.Services/Validators/` and use machine-readable error codes.
- Config uses options classes with `ValidateOnStart()`.
- Transaction `Comment` encodes `#hashtags` and `@references`; parse on read and do not store parsed values separately.
- Schema changes require EF migrations with explicit indexes, relationships, and delete behavior.

## Frontend Conventions

- For frontend work, also read `inex/ClientApp/AGENTS.md`.
- Authenticated API calls must preserve shared `apiClient`, auth headers, and refresh-token behavior.
- All user-visible strings must use i18n.
- Frontend visual work must follow `docs/design/docs/design-implementation-guide.md`.

## Testing

- Unit tests in `inex.Services.Tests/` should cover pure service logic and avoid DB access.
- Integration tests in `inex.Tests/` may hit a real DB.
- Exchange-rate provider behavior must be mocked.
- For backend service changes, run focused `dotnet test inex.Services.Tests/` first, then broader tests when feasible.

## Project Gotchas

- `InExDbContextFactory.cs` has hardcoded MySQL credentials for design-time only; do not treat it as the production path.
- Exchange-rate behavior is quota-sensitive. For cache repair or provider-call changes, read `docs/operations/exchange-rate-cache-repair.md` before editing.
- Registration is invite-token gated through `InviteOptions:Token` until proper email-confirmed registration exists.

## Agent File Maintenance

- If `Backend Conventions` grows beyond 20 bullet lines, remind the user to consider splitting backend-specific rules into `inex.Services/AGENTS.md` and/or `inex.Data/AGENTS.md`.
