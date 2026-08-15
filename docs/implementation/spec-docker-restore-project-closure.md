---
title: 'Restore the full project closure in the Docker build stage'
type: 'bugfix'
created: '2026-08-15'
status: 'done'
baseline_commit: '1c24b87faf840c2c1aa1da5b2bb70f7b5aaae194'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docker/api/Dockerfile'
---

<frozen-after-approval reason="human-owned intent – do not modify unless human renegotiates">

## Intent

**Problem:** The production Docker build restores only the web host, legacy Services, and Data project files. Since the exchange-rate synchronization work introduced Application, Infrastructure, and Domain projects to the host's project-reference closure, `dotnet restore` runs while those project files are absent. The later `dotnet publish --no-restore` therefore fails on `master` because Application and Infrastructure do not have generated NuGet assets files.

**Approach:** Make the existing cached restore layer include every project file in the web host's transitive project-reference closure before running `dotnet restore`. Keep the existing `publish --no-restore` behavior, Docker stages, Node dependency cache, and runtime image unchanged.

## Boundaries & Constraints

**Always:** Preserve the current multi-stage Docker structure and dependency-cache pattern; restore only the API host project; copy all project files that are required by its direct or transitive project references before restore; use the repository-root Docker build context; verify the full Docker build reaches a successful publish stage.

**Ask First:** Adding, upgrading, or removing NuGet/npm dependencies; changing the publish command's restore behavior; changing deployment workflow, image tags, AWS/ECR configuration, or runtime-container behavior.

**Never:** Merge or alter the parallel legacy/manual exchange-rate paths; remove `--no-restore`; copy test projects or restore the full solution merely to work around this failure; commit generated `bin`, `obj`, frontend build, or image artifacts.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Normal container build | API host references Application, Infrastructure, Services; their dependencies include Domain and Data | All project assets are generated in the cached restore layer and `dotnet publish --no-restore` succeeds | Docker exits successfully |
| Dependency graph changes | A copied project file changes | Docker invalidates the restore layer and restores the updated project closure | Standard restore errors remain visible |
| Source-only change | Source files change while project manifests are unchanged | Restore and npm cache layers remain reusable; source is copied before publish | Standard publish errors remain visible |

</frozen-after-approval>

## Code Map

- `docker/api/Dockerfile` -- multi-stage API image build; its restore layer currently omits project files that are now in the host's dependency closure.
- `inex/inex.csproj` -- web host directly references Application, Infrastructure, and Services.
- `inex.Application/inex.Application.csproj` -- references Domain.
- `inex.Infrastructure/inex.Infrastructure.csproj` -- references Application and Data.
- `inex.Services/inex.Services.csproj` -- references Application and Data.
- `.dockerignore` -- excludes generated assets from the build context, so a correct restore layer must produce fresh assets in the image.

## Tasks & Acceptance

**Execution:**

- [x] `docker/api/Dockerfile` -- added `COPY` instructions for Domain, Application, and Infrastructure project manifests before `dotnet restore` -- ensures every host dependency project participates in restore while preserving manifest-based Docker cache invalidation.
- [x] `docs/implementation/spec-docker-restore-project-closure.md` -- recorded implementation outcome and verification result -- preserves the narrow scope and evidence for the CI repair.

**Acceptance Criteria:**

- Given the repository at the current `master` project-reference graph, when Docker executes the restore layer, then it can resolve `inex`, Services, Data, Application, Infrastructure, and Domain without reporting skipped project files.
- Given the restored Docker build stage, when `dotnet publish inex/inex.csproj -c Release -o /app/publish --no-restore` executes after the source copy, then it completes without NETSDK1004 errors for Application or Infrastructure assets.
- Given an edit to API source code that does not modify project manifests, when the image is rebuilt with cache available, then the manifest restore layout remains independent of the source-copy layer.
- Given the change, when the Dockerfile diff is reviewed, then it contains no deployment configuration, application-code, dependency, or generated-artifact changes.

## Design Notes

The restore layer should mirror the project-reference closure instead of restoring the entire solution. That keeps the scope constrained to the publish target and preserves the cache: changing a `.csproj` invalidates restore; changing a `.cs` file does not. The appropriate order follows dependencies first where practical: Domain, Application, Data/Services, Infrastructure, then the host. Docker does not require this order for correctness as long as all manifests exist before the single restore command.

## Verification

**Commands:**

- `docker build -f docker/api/Dockerfile -t inex-api-restore-closure-check .` -- expected: all build stages finish and `dotnet publish --no-restore` succeeds.
- `git diff --check` -- expected: no whitespace errors.
- `git diff -- docker/api/Dockerfile` -- expected: only the required project-manifest copy instructions are added.

**Results:**

- `docker build --no-cache -f docker/api/Dockerfile -t inex-api-restore-closure-check .` completed successfully. The restore layer restored Domain, Application, Infrastructure, Services, Data, and the API host; the subsequent `dotnet publish --no-restore` completed successfully.
- `git diff --check` completed without whitespace errors.
- The Dockerfile diff contains only the three required manifest-copy instructions.

## Suggested Review Order

- Restore the complete project graph before publish, preserving manifest-based dependency caching.
  [`Dockerfile:14`](../../docker/api/Dockerfile#L14)
