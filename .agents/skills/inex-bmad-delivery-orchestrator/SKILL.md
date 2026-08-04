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

## GitHub Connector Notes
- Use the GitHub connector before `gh` for issue operations when the needed operation is exposed.
- Available connector issue operations include recent issue discovery via `_list_recent_issues`, issue creation via `_create_issue`, issue updates via `_update_issue`, additive labeling via `_add_issue_labels`, and single-label removal via `_remove_issue_label`.
- Known connector gap: there is no direct repository-scoped issue read equivalent to `gh issue view <number>` and no repository label-list operation exposed in the current tool set.
- For direct issue intake by number, state the connector gap and use the approved fallback:

```powershell
gh issue view <number> --repo <owner>/<repo> --json number,title,body,state,labels,assignees,milestone,comments,url
```

- For repository issue searches or label taxonomy inspection that cannot be satisfied by `_list_recent_issues` or issue mutation results, state the connector gap before using the narrowest applicable `gh issue list` or `gh label list` fallback.

## Compact Default Prompt
Use this prompt when launching the workflow from a terse user request:

```text
Run InEx BMAD delivery for the referenced GitHub issue(s). Intake issues and relevant BMAD/project docs, inspect worktree state, choose branch/PR grouping, decide whether the orchestrator or isolated implementation subagents should code, preserve unrelated changes, verify with focused tests before broad checks, run visual QA for visual work, use MySQL MCP for DB-backed validation, open PR(s) with linked issues/tests/risks, wait for fresh CI, merge only when checks and review requirements pass, and finish with issues, branches, PR URLs, tests, review findings, merge result, and remaining risks.
```

## Workflow
### 1. Intake
- Read GitHub issue(s) with the GitHub connector when available; for direct issue reads by number, use the documented `gh issue view` fallback because the connector currently lacks repository-scoped issue view.
- Use connector issue label operations for add/remove/replace label mutations before falling back to `gh`.
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
- After `npm run visual-qa:all`, run `npm run visual-qa:verify` from `inex/ClientApp/` and include its concise PASS/FAIL result in the verification report. If only a page-specific harness ran, state that the full-suite verifier was not applicable.
- Do not start the application or call live external/paid providers unless explicitly approved.
- If app setup fails, run the project doctor and report setup blockers before continuing.

### 5. Review
- Build a concise review packet before launching any reviewer. Include only the issue acceptance criteria, changed-file list, focused diff, affected contracts or invariants, tests/verification run and results, known risks, and the specific review remit. Do not send full planning history, unrelated issue context, or full project documentation unless the risk classification requires it.
- Classify review risk before selecting reviewers:
  - **High:** any user-data ownership or authorization path; transfers, balances, transaction integrity, or other financial calculations; database schema, migration, provider-specific query, transaction, or concurrency work; public API/auth contract change; security-sensitive configuration; a cross-cutting refactor; or incomplete focused verification.
  - **Standard:** production-code change outside the high-risk criteria, a multi-file behavior change, or any change whose edge cases cannot be fully covered by one focused test path.
  - **Low:** isolated, small, non-sensitive change with clear acceptance criteria, focused verification passing, no public-contract or persistence change, and no authentication, ownership, financial, or visual-parity impact.
- Use independent fresh-context reviewers when available; otherwise perform the same named remits manually. Reviewers must inspect the packet first, then only the changed files, directly affected call sites, and relevant tests. Broaden inspection only when evidence in those materials warrants it.
- Select review passes by risk:
  - **High:** run all three independent passes before PR: Blind Hunter, Edge Case Hunter, and Acceptance Auditor. This is the non-negotiable default for the sensitive InEx paths listed above.
  - **Standard:** run two independent passes: Acceptance Auditor and Edge Case Hunter. Add Blind Hunter only when either reviewer identifies an architectural, regression, security, ownership, or test-gap concern that needs an independent second look.
  - **Low:** run one independent Focused Reviewer combining acceptance and regression checks. Escalate immediately to the Standard passes for any uncertain ownership, contract, persistence, validation, or edge-case behavior.
- Keep review output compact and actionable: findings with severity, evidence, impact, and proposed verification. Do not produce a narrative restatement of the packet or a review of another reviewer's output.
- Triage findings as high, medium, low, or accepted risk.
- Route high/medium findings back to the same implementation subagent only when the packet remains isolated; otherwise the orchestrator fixes them.
- Fix high/medium findings before PR unless explicitly deferred with rationale, then re-run impacted verification.

### 6. GitHub, PR Review, And CI
- Push the branch and open a ready-for-review PR by default with summary, linked issues, tests run, review findings, risks, and screenshots/evidence wording when relevant.
- Do not stop after creating the PR. PR creation is an intermediate step, not the delivery endpoint.
- Create a draft PR only when explicitly requested, local verification is incomplete, blockers remain, or the PR is intentionally being used for early CI.
- If the PR tool creates a draft by default and no blocker justifies draft state, state the tool limitation and mark the PR ready before final CI/review handling.
- Wait for fresh checks and required GitHub reviews on the pushed commit. Do not rely on stale CI from a previous commit.
- Inspect requested changes, unresolved review threads, and actionable inline comments; fix blocking feedback, re-run impacted verification, push again, and wait for fresh CI.
- Merge only when required checks pass, required reviews approve, and no blocking review threads remain.

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
