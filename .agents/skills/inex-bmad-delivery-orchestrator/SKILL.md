---
name: inex-bmad-delivery-orchestrator
description: Orchestrates InEx issue-driven BMAD delivery from GitHub issue intake through branch planning, implementation, verification, review, PR, CI, and merge. Use when the user says "fix issue #215 using BMAD", "run BMAD delivery for these GitHub issues", "implement, review, create PR, and merge", or "orchestrate fresh-context subagents".
---

# InEx BMAD Delivery Orchestrator

## Purpose
Run a complete issue-driven delivery loop while preserving InEx project rules. The orchestrator owns delivery, integration, repository mutation, PRs, CI, and merge decisions. Subagents may review or, when explicitly assigned isolated packets, implement scoped changes.

## Required Context
Before planning, read:
- `AGENTS.md`
- `.agents/skills` names and any directly relevant BMAD skill instructions
- `docs/implementation/sprint-status.yaml`
- `docs/operations/github-issue-guidelines.md`
- Active story/spec and relevant `docs/planning` or `docs/operations` docs when the issue maps to planned work
- `docs/project-context.md` for architecture, security, testing, frontend migration, or database behavior
- `inex/ClientApp/AGENTS.md` and design docs for frontend UI

## Compact Default Prompt
Use this prompt when launching the workflow from a terse user request:

```text
Run InEx BMAD delivery for the referenced GitHub issue(s). Intake issues and relevant BMAD/project docs, inspect worktree state, choose branch/PR grouping, decide whether the orchestrator or isolated implementation subagents should code, preserve unrelated changes, verify with focused tests before broad checks, run visual QA for visual work, use MySQL MCP for DB-backed validation, open PR(s) with linked issues/tests/risks, wait for fresh CI, merge only when checks and review requirements pass, and finish with issues, branches, PR URLs, tests, review findings, merge result, and remaining risks.
```

## Workflow
### 1. Intake
- Read GitHub issue(s) with the GitHub connector when available; use `gh` only for connector gaps.
- Check `git status --short`; identify unrelated user changes and avoid reverting them.
- Read applicable story/spec and docs.
- Classify scope: backend, frontend, database, visual, tests, docs, CI, or product decision.
- Identify branch name using `feature/`, `fix/`, `refactor/`, or `docs/`; never use `codex/`.
- Identify whether issues ship together or separately.

### 2. Planning
- Decide one PR, stacked PRs, parallel PRs, or issue-only/no-code disposition.
- Choose orchestrator vs implementation subagents by complexity, not issue count. Five small independent issues can stay with the orchestrator; two noisy cross-cutting issues may need subagent packets or separate PRs.
- Use implementation subagents when issue slices are isolated, have clear acceptance criteria, materially reduce context load, or improve review isolation.
- Keep orchestrator implementation when the PR is small, touches shared files heavily, depends on one unsettled decision, or needs one coherent refactor.
- Write a verification matrix with focused tests, broader tests/build/lint, DB validation, visual QA, and CI checks.
- Identify blocked decisions before coding; use `question` issue handling when implementation depends on product, UX, QA, or architecture direction.
- Keep public GitHub issue and PR content free of local absolute paths, localhost URLs, credentials, tokens, `.env` values, and user-local details.

### 3. Implementation
- The orchestrator may implement directly or assign implementation packets to subagents. The orchestrator always integrates, reviews, stages, commits, pushes, opens PRs, interprets CI, and merges.
- Use implementation subagents only for explicit issue packets with assigned branch/worktree, scope, likely files, relevant docs, acceptance criteria, non-goals, verification, security/ownership constraints, and required output.
- Do not run concurrent implementation subagents in the same working tree. Use separate worktrees/branches or run them sequentially.
- Subagents must not stage, commit, push, merge, perform destructive commands, resolve cross-issue conflicts independently, or inspect secrets.
- Subagent output must include result, files changed, behavior changed, tests run, tests not run, review notes, risks, and items needing orchestrator attention.
- Follow existing code patterns and narrow the change to the issue scope.
- Preserve API routes, response shapes, status codes, enum values, validation keys, i18n behavior, and user data isolation unless an accepted story changes them.
- Never query or mutate user-owned data by entity ID alone; require `UserId` or equivalent ownership predicates.

### 4. Verification
- Run focused tests first, then broader checks as risk requires.
- Backend service changes: run `dotnet test inex.Services.Tests/` before broader `dotnet test` or `dotnet build`.
- Frontend changes: run relevant tests, `npm run lint`, and `npm run build` from `inex/ClientApp/` as applicable.
- DB/schema/provider/concurrency changes: use MySQL MCP for read-only validation before Docker, local MySQL, migrations, or connection-string fallbacks.
- Visual work: run project doctor before UI/browser work if available, capture visual QA evidence, and do not claim visual verification without evidence.
- Do not start the application or call live external/paid providers unless explicitly approved.
- If app setup fails, run the project doctor and report setup blockers before continuing.

### 5. Review
- Run three review passes before PR: Blind Hunter, Edge Case Hunter, and Acceptance Auditor.
- Prefer fresh-context subagents for reviews when available; otherwise perform the passes manually.
- Triage findings as high, medium, low, or accepted risk.
- Route high/medium findings back to the same implementation subagent only when the packet remains isolated; otherwise the orchestrator fixes them.
- Fix high/medium findings before PR unless explicitly deferred with rationale, then re-run impacted verification.

### 6. GitHub And CI
- Push the branch and open a PR with summary, linked issues, tests run, review findings, risks, and screenshots/evidence wording when relevant.
- Wait for fresh checks on the pushed commit. Do not rely on stale CI from a previous commit.
- Merge only when required checks and review requirements pass and no blocking review findings remain.
- If checks fail, inspect logs, fix the cause, push again, and wait for fresh CI.

## Stacked PR Rules
- Base the first PR on the target branch.
- Stack dependent PRs only when review isolation is valuable or a single PR would hide independent risk.
- Clearly mark dependency order and retarget each dependent PR to the preceding branch.
- After a dependency merges, retarget/rebase the next PR onto the target branch.
- Wait for fresh CI on every retargeted or rebased PR before merge.
- Merge from the bottom of the dependency chain upward only after each PR is green and review requirements pass.

## Dry-Run Mode
When asked to dry-run or when validating this skill, do not edit files, create branches, push, or open PRs. Produce issue intake summary, proposed branch and PR grouping, blocked decisions, verification matrix, review plan, GitHub/CI/merge plan, and remaining risks.

## Final Report
End every run with issues handled, branches used, PR URLs, tests and verification run, review findings and fixes, CI status, merge result, and remaining risks or blockers.
