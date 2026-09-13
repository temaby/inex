---
title: 'Recover Docker space before production image pulls'
type: 'bugfix'
created: '2026-09-13'
status: 'done'
baseline_commit: '93dc1bb254f856d1e4456d8519b4229853eb1cae'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/E-TRACK-EXPLAINED.md'
  - '{project-root}/.github/workflows/dotnet.yml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The EC2 deployment command cannot pull the current immutable application image because Docker's storage volume has no free space. The failure occurs after ECR authentication and before Compose starts the updated API, leaving production on the prior container state.

**Approach:** Before the existing Compose pull, collect disk and Docker-usage diagnostics, remove only Docker BuildKit cache and images unused by any container, collect the same diagnostics again, then continue the established pull/up deployment. Surface the SSM command's standard output to the GitHub Actions log on success or failure so future capacity failures are directly observable.

## Boundaries & Constraints

**Always:** Run diagnostics before and after cleanup; retain the existing ECR login, secret-loading script, Compose files, environment file, image selection from SSM, and `up -d --remove-orphans` behavior. Make cleanup fail-fast so Compose does not run after a failed cleanup command. Preserve all running and stopped containers, volumes, and networks. Print only disk and Docker summary metrics; never print environment, secret, registry, or credential values.

**Ask First:** Removing stopped containers, volumes, networks, tagged images in use by any container, changing the EC2 volume size, changing Docker's data root, changing SSM/IAM access, modifying Compose runtime configuration, or altering the deployment target.

**Never:** Run `docker system prune`, use a broad filesystem deletion, remove Docker volumes, stop/restart containers outside the existing Compose update, delete ECR images, or weaken immutable-tag deployment behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Routine deployment with adequate space | Docker storage has sufficient capacity | Pre/post diagnostics are logged; cache/image pruning completes; existing Compose pull and update complete. | Existing Compose and SSM errors remain failures. |
| Deployment blocked by stale Docker artifacts | Docker storage lacks room for the new image, but BuildKit cache or images unused by containers exist | Cleanup reclaims available safe space, then Compose pulls the selected image and updates the API. | If cleanup cannot reclaim enough space, Compose reports its original pull failure. |
| No removable cache or unused image exists | Docker storage remains full after permitted cleanup | Diagnostics show no usable recovery; pull fails without touching containers, volumes, or networks. | SSM returns failure with both standard output and standard error available in CI. |
| Cleanup command fails | Docker CLI or storage backend returns an error | The chained SSM command stops before Compose pull. | GitHub Actions fetches the command's standard output and error before failing. |

</frozen-after-approval>

## Code Map

- `.github/workflows/dotnet.yml` -- sends the production shell command through SSM and polls its final status; needs safe cleanup and diagnostic output handling.
- `docker-compose.yml` -- production pull/up target; must remain untouched.
- `docs/E-TRACK-EXPLAINED.md` -- describes the ECR, SSM, and Compose deployment sequence and its least-privilege boundary.

## Tasks & Acceptance

**Execution:**

- [x] `.github/workflows/dotnet.yml` -- add `df -h` and `docker system df` summaries immediately before and after Docker cleanup in the existing SSM command -- records capacity state without exposing secrets.
- [x] `.github/workflows/dotnet.yml` -- run `docker builder prune -af` and `docker image prune -af` before the existing Compose pull -- releases only BuildKit cache and images unused by containers, without removing volumes, networks, or containers.
- [x] `.github/workflows/dotnet.yml` -- retrieve SSM standard output for successful and failed invocations before exiting the GitHub Actions polling step -- makes remote capacity diagnostics visible in the deployment log.

**Acceptance Criteria:**

- Given stale BuildKit cache or unused images consume Docker storage, when deployment starts, then the workflow removes only those artifacts before attempting `docker compose pull`.
- Given the current API container uses the prior image, when cleanup runs, then that running container and its image remain untouched until the existing Compose update replaces it.
- Given no safe cleanup can create enough space, when Compose pull fails, then CI exposes disk/Docker summaries and fails without removing volumes, networks, or containers.
- Given SSM succeeds, when the polling loop reaches `Success`, then GitHub Actions prints the remote diagnostic output before completing.

## Verification

**Commands:**

- `git diff --check` -- expected: no whitespace errors.
- `rg -n -C 4 "docker builder prune|docker image prune|docker system df|StandardOutputContent" .github/workflows/dotnet.yml` -- expected: diagnostics and only the approved cleanup commands precede Compose pull; SSM output is collected on either terminal state.

**Manual checks:**

- Review the SSM command string to confirm `docker system prune`, volume/network pruning, and container removal are absent.
- After merge, inspect the deployment run for pre/post capacity summaries, successful image pull, and completed Compose update.

## Suggested Review Order

1. [SSM cleanup and output handling](../../.github/workflows/dotnet.yml#L113-L155) — verify only the approved Docker artifacts are pruned, diagnostics are sanitized, and terminal SSM results are handled.
2. [Approved recovery specification](spec-ci-ec2-docker-space-recovery.md) — confirm the workflow remains within the frozen operational boundaries.
