# Story 1.5: Remove Tracked Frontend Build Artifacts

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want generated frontend build output excluded from source control,
so that `npm run build` does not produce noisy commit diffs of binary and hashed assets.

## Acceptance Criteria

1. Given the repository state is inspected, when `git -c safe.directory=D:/work/inex ls-files inex/ClientApp/build` is run from the repo root, then it returns no output by the end of the story.
2. Given `inex/ClientApp/build` is already untracked in the current observed parent context, when the dev agent begins implementation, then the dev agent verifies the current state first and does not run `git rm --cached -r inex/ClientApp/build` unless `git ls-files` returns tracked files.
3. Given `.gitignore` already lists `ClientApp/build` and `inex/ClientApp/build`, when `npm run build` runs from `inex/ClientApp`, then generated build output remains ignored and `git status --short -- inex/ClientApp/build` returns no tracked or untracked source-control noise.
4. Given the ASP.NET publish and Docker build paths, when frontend build artifacts are not committed, then `dotnet publish` and `docker build -f docker/api/Dockerfile .` still generate and include the SPA at build/publish time.
5. Given the story is complete, when the dev agent reviews the final diff, then the diff contains only source-control hygiene changes needed for this story and does not include generated files under `inex/ClientApp/build`, `node_modules`, `bin`, `obj`, logs, secrets, or unrelated documentation updates.

## Tasks / Subtasks

- [ ] Verify current repository state before changing anything. (AC: 1, 2)
  - [ ] Run `git -c safe.directory=D:/work/inex ls-files inex/ClientApp/build` from `D:/work/inex`.
  - [ ] If the command returns no output, record that the build artifacts are already absent from the index and skip `git rm --cached`.
  - [ ] If the command returns tracked paths, run `git rm --cached -r -- inex/ClientApp/build` to remove them from the index while leaving any local build output on disk.
- [ ] Confirm ignore rules are present and sufficient. (AC: 3)
  - [ ] Inspect `.gitignore` for both `ClientApp/build` and `inex/ClientApp/build`.
  - [ ] Only edit `.gitignore` if either ignore rule is missing; do not reorder or rewrite unrelated ignore entries.
  - [ ] Do not add broad ignore rules that would hide real source files under `inex/ClientApp/src`, `public`, `package.json`, `package-lock.json`, `.npmrc`, or Vite/TypeScript config files.
- [ ] Verify frontend build output remains ignored. (AC: 3, 5)
  - [ ] From `D:/work/inex/inex/ClientApp`, run `npm run build`.
  - [ ] From repo root, run `git -c safe.directory=D:/work/inex status --short -- inex/ClientApp/build`.
  - [ ] From repo root, run `git -c safe.directory=D:/work/inex ls-files inex/ClientApp/build` again.
  - [ ] If a local build directory exists after verification, leave it untracked and ignored unless the user explicitly asks to delete local generated output.
- [ ] Verify publish/container generation still owns the SPA build. (AC: 4)
  - [ ] Inspect `inex/inex.csproj` and preserve the `PublishRunWebpack` target that runs `npm install` and `npm run build` under `$(SpaRoot)`.
  - [ ] Inspect `docker/api/Dockerfile` and preserve the Node.js install, `npm ci`, and `dotnet publish` flow; do not change Docker just to compensate for removed committed assets.
  - [ ] Run `dotnet build inex.sln` from repo root as the minimum backend/build validation.
  - [ ] If Docker is available, run `docker build -f docker/api/Dockerfile .` from repo root; if unavailable or too expensive locally, document the blocker and rely on the inspected Dockerfile plus CI path.
- [ ] Final hygiene review. (AC: 5)
  - [ ] Run `git -c safe.directory=D:/work/inex status --short`.
  - [ ] Ensure no generated files, secret-like files, dependency folders, or unrelated docs are staged or included.
  - [ ] Record verification commands and any skipped command with reason in completion notes.

## Dev Notes

### Current State Analysis

- Parent-observed current state: `git -c safe.directory=D:/work/inex ls-files inex/ClientApp/build` returned no output before this story was created. Treat the epic text that says "`inex/ClientApp/build` is currently tracked" as a historical condition that may already be resolved. Verify current state and avoid unnecessary `git rm --cached` if there is nothing in the index. [Source: parent context; `docs/planning/epics.md` Story 1.5]
- Local inspection during story creation found no `inex/ClientApp/build` directory under `inex/ClientApp`; only source/config files such as `public`, `src`, `package.json`, `package-lock.json`, `.npmrc`, `tsconfig.json`, and `vite.config.ts` were present. A future `npm run build` may create the directory locally, and that is acceptable as ignored generated output. [Source: local inspection of `inex/ClientApp`]
- `.gitignore` already contains both `ClientApp/build` and `inex/ClientApp/build`, plus generated-output rules for `node_modules`, `bin`, `obj`, logs, and local env files. This story should not need `.gitignore` changes unless the file has changed by implementation time. [Source: `.gitignore`]
- `inex/ClientApp/package.json` has `build` defined as `tsc --noEmit && vite build`; Vite emits the production SPA bundle to `inex/ClientApp/build`. It also has `lint` as `eslint ./src/**/*.ts ./src/**/*.tsx`. [Source: `inex/ClientApp/package.json`]
- `inex/inex.csproj` defines `SpaRoot` as `ClientApp\`, removes SPA source from publish content, and has `PublishRunWebpack` after `ComputeFilesToPublish`. That target runs `npm install`, runs `npm run build`, includes `$(SpaRoot)build\**` as `DistFiles`, and copies those files to publish output. Preserving this target is what makes committed build artifacts unnecessary. [Source: `inex/inex.csproj`]
- `docker/api/Dockerfile` uses `mcr.microsoft.com/dotnet/sdk:8.0` as the build image, installs Node.js 18, copies frontend package manifests, runs `npm ci --silent`, copies the full source tree, and runs `dotnet publish inex/inex.csproj -c Release -o /app/publish --no-restore`. The Dockerfile comments state that `dotnet publish` triggers `PublishRunWebpack`, which builds the React bundle. [Source: `docker/api/Dockerfile`]
- `docker-compose.yml` runs the API from `${ECR_IMAGE_URI}` and does not bind-mount `inex/ClientApp/build`. The deployed API image must contain the published SPA output generated during image build. [Source: `docker-compose.yml`]
- `.github/workflows/dotnet.yml` builds and tests the .NET solution, then on master pushes builds and pushes the Docker image with `docker buildx build --platform linux/arm64 --provenance=false -f docker/api/Dockerfile -t "$IMAGE_URI" --push .`. This supports the intended model: source checkout plus Docker build generates deployable assets; committed `ClientApp/build` is not required. [Source: `.github/workflows/dotnet.yml`]

### Implementation Guardrails

- Do not delete or edit frontend source to make the build directory disappear. The story is about the git index and ignore behavior, not application code.
- Do not remove `PublishRunWebpack`, `SpaRoot`, Docker Node.js installation, `npm ci`, or the `dotnet publish` flow. Those are required to generate the SPA at publish/container build time.
- Do not commit `inex/ClientApp/build` as evidence that `npm run build` passed. Generated build output is disposable and should stay ignored.
- Do not run broad cleanup commands. If local generated output exists, leave it alone unless the user explicitly asks for filesystem cleanup.
- Do not change frontend dependencies or lockfiles unless a verification command itself updates lockfiles unexpectedly; if that happens, inspect and explain before keeping any change.
- Use `git -c safe.directory=D:/work/inex ...` for git inspection commands in this workspace because safe-directory ownership may otherwise block git operations.

### File And Build Guidance

- Likely touched files if implementation is still needed:
  - `.gitignore` only if required ignore entries are missing at implementation time.
  - Git index entries under `inex/ClientApp/build` only if `git ls-files` returns tracked files.
- Files to inspect and preserve:
  - `inex/inex.csproj` for `SpaRoot` and `PublishRunWebpack`.
  - `docker/api/Dockerfile` for Node/npm install and `dotnet publish`.
  - `inex/ClientApp/package.json` for `build` and `lint` scripts.
  - `docker-compose.yml` and `.github/workflows/dotnet.yml` if deployment/build confidence needs to be recorded.
- No backend C# source, frontend application source, API contracts, EF migrations, service tests, or UI tests are expected for this story.

### Verification Commands

Run from repo root unless noted:

```powershell
git -c safe.directory=D:/work/inex ls-files inex/ClientApp/build
```

Expected final output: no output.

```powershell
git -c safe.directory=D:/work/inex check-ignore -v inex/ClientApp/build
git -c safe.directory=D:/work/inex check-ignore -v inex/ClientApp/build/index.html
```

Expected: an ignore rule from `.gitignore` matches the build directory and any file under it. If `index.html` does not exist yet, `check-ignore` can still be used with the path.

```powershell
cd D:/work/inex/inex/ClientApp
npm run build
```

Expected: TypeScript and Vite build succeed. The build may create `inex/ClientApp/build` locally.

```powershell
cd D:/work/inex
git -c safe.directory=D:/work/inex status --short -- inex/ClientApp/build
git -c safe.directory=D:/work/inex ls-files inex/ClientApp/build
```

Expected: no output for both commands after `npm run build`.

```powershell
dotnet build inex.sln
```

Expected: solution builds. This verifies the normal .NET compile path remains intact; it does not prove Docker publish, so keep Docker verification separate when possible.

```powershell
docker build -f docker/api/Dockerfile .
```

Expected if Docker is available: image build succeeds and `dotnet publish` generates the SPA during the build stage. If Docker is unavailable locally, record the blocker in completion notes.

### Previous Story Intelligence

- Story 1.1 established the project style for ready-for-dev stories: current-state analysis, concrete file paths, explicit guardrails, verification commands, and a final completion note section. Match that format rather than copying epic text alone. [Source: `docs/implementation/1-1-enforce-object-level-authorization-in-service-methods.md`]
- Story 1.2 explicitly recorded that `docs/implementation/sprint-status.yaml` was read for context only and not updated because the parent owns status changes. Apply the same rule here. [Source: `docs/implementation/1-2-fix-refresh-token-rotation-race-condition.md`; user instruction]
- Story 1.2 used `git -c safe.directory=D:/work/inex` for git commands. Continue using that exact safe-directory form in verification instructions. [Source: `docs/implementation/1-2-fix-refresh-token-rotation-race-condition.md`]
- Prior story files are context documents only. Do not assume Story 1.1 or Story 1.2 implementation changes exist unless code or diffs prove they were applied.
- Story 1.3 and Story 1.4 are separate ready-for-dev stories. Do not assume their implementation changes exist unless code or diffs prove they were applied.

### Architecture And Project Context Guardrails

- Epic 1 is production hardening. Do not expand this story into frontend modernization, route splitting, RTK Query, test-runner setup, AWS Secrets Manager, or broader Docker/CI redesign. [Source: `docs/planning/architecture.md`; `docs/planning/epics.md`]
- Generated build output, including `inex/ClientApp/build`, is not an implementation artifact and should not be committed. [Source: `docs/project-context.md`; `docs/planning/architecture.md`]
- Frontend uses React 18, TypeScript strict mode, Vite 6, Ant Design 5, Redux Toolkit, React Router 6, Axios, i18next, Day.js, and Recharts. Do not change package versions for this story. [Source: `docs/project-context.md`; `inex/ClientApp/package.json`]
- SPA builds to `inex/ClientApp/build`; build/deployment should generate that folder at build time, not rely on committed assets. [Source: `docs/project-context.md`; `inex/inex.csproj`; `docker/api/Dockerfile`]
- Local generated-output churn from build/test commands must be excluded from source changes. [Source: `docs/project-context.md`]

### References

- `docs/planning/epics.md` - Epic 1 and Story 1.5 acceptance criteria.
- `docs/planning/architecture.md` - Epic 1 architecture mapping for build artifact cleanup and deployment hygiene.
- `docs/planning/prds/prd-inex-2026-05-20/prd.md` - FR-DATA-002 and BUG-010.
- `docs/project-context.md` - stack versions, generated-output rules, and frontend verification expectations.
- `docs/implementation/sprint-status.yaml` - Story 1.5 status read as `backlog`; intentionally not updated by this story-generation task.
- `docs/implementation/1-1-enforce-object-level-authorization-in-service-methods.md` - prior story format and handoff style.
- `docs/implementation/1-2-fix-refresh-token-rotation-race-condition.md` - prior story completion-note pattern and safe-directory git command convention.
- `.gitignore` - current ignore rules for `ClientApp/build` and `inex/ClientApp/build`.
- `inex/ClientApp/package.json` - frontend `build` and `lint` scripts.
- `inex/inex.csproj` - SPA publish target.
- `docker/api/Dockerfile` - Docker multi-stage build and SPA generation path.
- `docker-compose.yml` - production container runtime path.
- `.github/workflows/dotnet.yml` - CI and Docker image build path.

## Dev Agent Record

### Agent Model Used

TBD by dev agent.

### Debug Log References

### Completion Notes List

- Story context generated from BMAD create-story workflow.
- Ultimate context engine analysis completed - comprehensive developer guide created.
- `docs/implementation/sprint-status.yaml` was read for context only and intentionally not updated because the parent workflow owns status updates.
- Parent-observed tracked-state check returned no output for `git -c safe.directory=D:/work/inex ls-files inex/ClientApp/build`; implementation must verify again and avoid unnecessary `git rm --cached` when the path is already untracked.
- Story creation inspected `.gitignore`, `inex/inex.csproj`, `docker/api/Dockerfile`, `docker-compose.yml`, `.github/workflows/dotnet.yml`, and `inex/ClientApp/package.json`.
- Story 1.3 and Story 1.4 were created in parallel with this story; they are planning context only, not evidence of implementation changes.
- No web research was needed because this story depends on repository-specific git/build/deployment behavior, not unstable external API details.

### File List
