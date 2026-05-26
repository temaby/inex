# Story 1.4: Rotate and Externalize Local Secrets

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a maintainer,
I want real credentials kept out of plaintext workspace files,
so that local development does not leak production or shared secrets.

## Acceptance Criteria

1. Given the local `.env` file contains non-placeholder secret-like values, when this story is complete, then every real database password and exchange API key discovered there has been rotated in the owning service, and no real value is copied into source, docs, logs, screenshots, or PR text.
2. Given the local development setup, when a developer runs the API locally, then secrets are provided through either `dotnet user-secrets` for the ASP.NET host or an untracked `.env` consumed by Docker Compose; tracked config files contain placeholders or empty values only.
3. Given `.env.example`, when reviewed against the actual app binding and compose files, then it lists all required variable names with safe placeholder values and concise instructions for obtaining or generating real values.
4. Given Docker Compose local development, when `docker compose` starts the API, then required runtime settings map to the configuration sections the app actually binds: `ConnectionStrings:InExConnection`, `JwtOptions`, `InviteOptions`, and `CurrencyApiSettings`.
5. Given source control and secret scanning, when this story is complete, then `.env`, local appsettings files, PEM/private key files, database data/backup directories, logs, and generated build output are not tracked; secret scanning runs with redacted output and has no unresolved findings.

## Tasks / Subtasks

- [ ] Inventory and rotate local secrets without exposing values. (AC: 1, 5)
  - [ ] Inspect `.env` by variable name and placeholder/non-placeholder classification only; do not print or paste actual values.
  - [ ] Treat `DB_ROOT_PASSWORD`, `DB_PASSWORD`, and `EXCHANGE_API_KEY` or `CURRENCY_API_KEY` as rotation candidates when non-placeholder values exist.
  - [ ] If any value is shared with production or a third-party account, rotate it in the external service first, then update the local secret store.
  - [ ] For local Docker MySQL with persisted `docker/mysql/mysql_data`, do not assume changing `.env` changes existing database users; rotate with MySQL user/password commands or intentionally recreate the local data volume only after the maintainer accepts the data loss/backup tradeoff.
- [ ] Normalize local secret injection paths. (AC: 2, 3, 4)
  - [ ] Keep `inex/appsettings.json` secret values empty or placeholder-only; do not add secrets to tracked `appsettings*.json`.
  - [ ] Preserve `dotnet user-secrets` support through `inex/inex.csproj` and document required keys in `.env.example` comments: `ConnectionStrings:InExConnection`, `JwtOptions:Secret`, `InviteOptions:Token`, and `CurrencyApiSettings:ApiKey`.
  - [ ] Update `.env.example` so Docker variable names and ASP.NET option names are unambiguous for local dev and EC2-era compose.
  - [ ] Prefer one exchange API variable name. The app binds `CurrencyApiSettings`, so local compose should map the chosen variable to `CurrencyApiSettings__ApiKey`, not `ExchangeApiSettings__ApiKey`.
- [ ] Fix Docker Compose config binding gaps. (AC: 2, 4)
  - [ ] In `docker-compose.override.yml`, replace the ineffective `ExchangeApiSettings__ApiKey` mapping with `CurrencyApiSettings__ApiKey`.
  - [ ] Ensure the API container receives required local runtime secrets: connection string, JWT secret, invite token, allowed origins, and currency API key.
  - [ ] Keep MySQL-only secrets scoped to the `mysql` service unless the API needs the derived connection string.
  - [ ] Do not use broad `env_file: .env` for the API if it would inject unrelated root passwords or local-only variables into the app container.
- [ ] Preserve and verify source-control exclusions. (AC: 5)
  - [ ] Keep `.env`, `.env.local`, `user-secrets/`, `appsettings.*.json`, `*.local.json`, `*.pem`, logs, Docker MySQL data, Docker backups, and `inex/ClientApp/build` ignored.
  - [ ] Verify no secret-bearing files are tracked with `git ls-files` path checks.
  - [ ] If a secret-bearing file is tracked, remove it from the index with a scoped command; do not delete the local working copy unless the maintainer explicitly asks.
  - [ ] Leave Story 1.5 to handle tracked frontend build artifacts; do not fold broad build cleanup into this story.
- [ ] Run redacted verification and record safe evidence. (AC: 1, 3, 4, 5)
  - [ ] Run a redacted secret scan, preferably `gitleaks detect --redact --source .` if available.
  - [ ] Run a value-safe config audit of variable names used by `.env.example`, `docker-compose*.yml`, and ASP.NET options.
  - [ ] Run `dotnet build inex.sln` from the repo root to catch missing required configuration or compile regressions.
  - [ ] If Docker is available, run a config/startup check without publishing secrets in logs; avoid pasting expanded compose output because it can contain secret values.

## Dev Notes

### Current State Analysis

- `.env` exists locally and is ignored by git. It was inspected only by variable name and placeholder/non-placeholder classification. Non-placeholder entries were found for `DB_ROOT_PASSWORD`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `ASPNETCORE_ENVIRONMENT`, `ASPNETCORE_URLS`, `EXCHANGE_API_KEY`, and `CURRENT_USER_ID`; actual values were not read into this story. Secret rotation scope is the secret-like subset, especially database passwords and the exchange API key. [Source: local `.env` classification; `docs/planning/epics.md` Story 1.4]
- `.env.example` is tracked and currently uses placeholder values. It includes `DB_ROOT_PASSWORD`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `ConnectionStrings__InExConnection`, `JwtOptions__Secret`, `JwtOptions__Issuer`, `JwtOptions__Audience`, `InviteOptions__Token`, `AllowedOrigins__0`, and `EXCHANGE_API_KEY`. [Source: `.env.example`]
- The app does not bind an `ExchangeApiSettings` section. It binds `CurrencyApiSettings` and `FrankfurterApiSettings`; `CurrencyApiSettings.ApiKey` is required and is sent as the `apikey` header by `CurrencyApiClient`. [Source: `inex.Services/Extensions/InExServicesExtensions.cs`; `inex.Services/Infrastructure/ExternalClients/ExchangeRate/CurrencyApiSettings.cs`]
- `docker-compose.override.yml` currently maps `ExchangeApiSettings__ApiKey: ${EXCHANGE_API_KEY}`, which does not satisfy the bound `CurrencyApiSettings:ApiKey` option. This is the main local-compose startup trap for this story. [Source: `docker-compose.override.yml`; `inex.Services/Extensions/InExServicesExtensions.cs`]
- `docker-compose.prod.yml` maps `CurrencyApiSettings__ApiKey` from `${CURRENCY_API_KEY}` and maps JWT/invite values from `${JWT_SECRET}`, `${JWT_ISSUER}`, `${JWT_AUDIENCE}`, and `${INVITE_TOKEN}`. `.env.example` should either document those names or the compose files should be normalized so the example and runtime agree. [Source: `docker-compose.prod.yml`; `.env.example`]
- `docker-compose.yml` uses `.env` interpolation for MySQL root/user/database/password and constructs `ConnectionStrings__InExConnection` for the API. Compose interpolation reads `.env` but does not automatically inject every `.env` key into the API container. Required API settings must be listed explicitly or provided by another supported mechanism. [Source: `docker-compose.yml`; Docker Compose behavior implied by compose file variable interpolation]
- `inex/appsettings.json` is tracked and contains empty secret/config placeholders for `InviteOptions.Token`, `JwtOptions.Secret`, `ConnectionStrings.InExConnection`, and `CurrencyApiSettings.ApiKey`. `appsettings.Development.json` and `appsettings.Production.json` exist locally but are ignored by `.gitignore`; only `inex/appsettings.json` is tracked. [Source: `inex/appsettings.json`; `.gitignore`; `git ls-files`]
- `inex/inex.csproj` has a `UserSecretsId`, so `dotnet user-secrets` is already available for local ASP.NET runs. [Source: `inex/inex.csproj`]
- `InExDbContextFactory` requires `INEX_CONNECTION_STRING` for design-time migrations and already points developers toward `dotnet user-secrets` plus an environment-variable handoff. Keep that path value-safe. [Source: `inex.Data/InExDbContextFactory.cs`]
- `.gitignore` excludes `.env`, `.env.local`, `user-secrets/`, `appsettings.*.json`, `*.local.json`, `*.pem`, logs, Docker MySQL data/backup, and `inex/ClientApp/build`. `.dockerignore` excludes `.env`, `.env.local`, Docker MySQL data/backup, bin/obj, node_modules, and ClientApp build/dist. [Source: `.gitignore`; `.dockerignore`]
- A local PEM file exists in the workspace root and is covered by the `*.pem` ignore rule. Do not track, print, copy, or inspect its contents. [Source: root file listing; `.gitignore`]
- `.gitleaks.toml` is tracked and contains an allowlist for false positives from a historical minified build-artifact commit. Do not broaden scanner allowlists to hide real findings. [Source: `.gitleaks.toml`]

### Required Secret Handling Guardrails

- Never include real secret values in this story, code comments, commit messages, PR descriptions, terminal transcripts, screenshots, test fixtures, or docs.
- Avoid commands that echo expanded values, especially raw `Get-Content .env`, unredacted `docker compose config`, and unredacted scanner output.
- When documenting evidence, refer to file paths and variable names only, for example "`.env` had non-placeholder `DB_PASSWORD`" rather than the value.
- Rotate before deleting local evidence if the value may have been shared externally. Removing `.env` from the working tree is not a rotation.
- Do not weaken option validation to make missing secrets pass. Required options should fail fast when real runtime configuration is absent.
- Do not commit local `appsettings.Development.json`, `appsettings.Production.json`, `.env`, `.env.local`, PEM files, database dumps, logs, or Docker volumes.

### Implementation Guidance By File

- `.env.example`: update placeholder names/instructions so a maintainer can configure both user-secrets and Docker Compose without guessing. Use placeholder strings only, such as `change-me-*` or `<...>`, never real-looking tokens.
- `docker-compose.override.yml`: likely update `ExchangeApiSettings__ApiKey` to `CurrencyApiSettings__ApiKey` and ensure local API secrets required by `ValidateOnStart` are explicitly provided.
- `docker-compose.prod.yml`: inspect for naming consistency with `.env.example`; keep production values sourced from environment variables, not plaintext.
- `docker-compose.yml`: preserve the derived `ConnectionStrings__InExConnection` pattern unless intentionally replaced with an equivalent safe mapping.
- `.gitignore` and `.dockerignore`: verify they still cover local secret and generated-output paths. Add narrowly scoped patterns only if a gap is proven.
- `inex/appsettings.json`: keep base values empty or non-secret placeholders; do not move local secrets into this tracked file.
- `inex/inex.csproj`: preserve `UserSecretsId`; no package or framework upgrade is required.
- `inex.Data/InExDbContextFactory.cs`: update only if migration secret guidance is wrong after the final local-secret approach is chosen.

### Verification And Scanning Requirements

- Required value-safe searches:
  - `git -c safe.directory=D:/work/inex ls-files .env .env.local '*.pem' 'inex/appsettings.*.json'`
  - `git -c safe.directory=D:/work/inex ls-files | Select-String -Pattern '(^|/)(\\.env|.*\\.pem|appsettings\\..*\\.json|user-secrets|secrets?|keys?|credential|token)'`
  - `rg -n "ExchangeApiSettings|CurrencyApiSettings|EXCHANGE_API_KEY|CURRENCY_API_KEY|JwtOptions__Secret|JWT_SECRET|InviteOptions__Token|INVITE_TOKEN|ConnectionStrings__InExConnection|INEX_CONNECTION_STRING" . --glob "!.env" --glob "!**/bin/**" --glob "!**/obj/**" --glob "!**/ClientApp/build/**"`
- Preferred scanner: `gitleaks detect --redact --source .`. If `gitleaks` is unavailable, document that blocker and run the strongest local fallback without copying raw secret values into notes.
- Required build verification: `dotnet build inex.sln`.
- Optional runtime verification: Docker Compose local API startup and `GET /health`, but only if output can be kept value-safe. Do not paste expanded environment output.
- Final completion notes must state which variables were rotated by name, where they now live (`dotnet user-secrets` or untracked `.env`), which scanners/checks ran, and whether any values could not be rotated because they require external account access.

### Previous Story Intelligence

- Story 1.1 established that Epic 1 stories must preserve existing architecture and avoid broad refactors. Apply the same discipline here: do not redesign deployment or introduce Epic 9 Secrets Manager work early. [Source: `docs/implementation/1-1-enforce-object-level-authorization-in-service-methods.md`; `docs/planning/architecture.md`]
- Story 1.2 emphasized provider-sensitive verification and no new dependencies. For Story 1.4, do not add secret-management libraries or cloud dependencies; use ASP.NET Core configuration, user-secrets, Compose environment variables, and existing scanner tooling. [Source: `docs/implementation/1-2-fix-refresh-token-rotation-race-condition.md`]
- Story 1.3 is a separate ready-for-dev story for the account update payload regression. Do not assume account-update work has been implemented unless the code proves it.
- Current git status shows many unrelated planning/implementation docs changed or untracked. Do not revert or overwrite them; keep implementation changes scoped to the secret-hygiene files this story requires.
- Recent commits include code-review backlog documentation and DTO/mapper refactors, especially PR #118 removing AutoMapper. This story should not touch mapping or domain contracts.

### Project Structure Notes

- This is an environment/configuration hygiene story, not an API, database schema, or frontend feature story.
- No EF migration is expected.
- No React build artifact cleanup should be performed here except verifying secret scans do not rely on tracked generated output; Story 1.5 owns build artifact removal.
- No AWS Secrets Manager implementation belongs here. Epic 9 Story 9.6 later supersedes this EC2-era/local secret cleanup with production runtime injection.
- If the dev agent finds a real tracked secret in git history, stop and record the finding without value disclosure; coordinate external rotation and history-remediation scope with the maintainer before attempting broad history rewrite.

### References

- `docs/planning/epics.md` - Epic 1 and Story 1.4 acceptance criteria.
- `docs/planning/architecture.md` - Epic 1 infrastructure decision: local secrets are externalized now; Epic 9 Secrets Manager remains deferred.
- `docs/planning/prds/prd-inex-2026-05-20/prd.md` - FR-SEC-003 and NFR-SEC-3.
- `docs/project-context.md` - secret handling, source-control hygiene, testing, and workflow rules.
- `.env.example` - tracked placeholder template to update.
- `.gitignore` and `.dockerignore` - current exclusion rules for local secrets and generated artifacts.
- `docker-compose.yml`, `docker-compose.override.yml`, `docker-compose.prod.yml` - current environment-variable injection paths.
- `inex/appsettings.json` - tracked empty config baseline.
- `inex/inex.csproj` - `UserSecretsId` for local ASP.NET user-secrets.
- `inex.Services/Extensions/InExServicesExtensions.cs` - option binding and required service configuration.
- `inex.Services/Infrastructure/ExternalClients/ExchangeRate/CurrencyApiSettings.cs` - required currency API key option.
- `inex.Data/InExDbContextFactory.cs` - design-time migration connection string handling.

## Dev Agent Record

### Agent Model Used

TBD by dev agent.

### Debug Log References

### Completion Notes List

- Story context generated from BMAD create-story workflow.
- Ultimate context engine analysis completed - comprehensive developer guide created.
- `docs/implementation/sprint-status.yaml` was read for context only and intentionally not updated because the parent workflow owns status updates.
- `.env` was inspected only by variable names and placeholder/non-placeholder classification; no real secret values were copied into this story.
- Git status/history used `-c safe.directory=D:/work/inex` because normal Git commands reject the sandbox user ownership.
- Web research was not needed; the relevant behavior is defined by local project files and existing .NET 8/ASP.NET Core configuration patterns.

### File List
