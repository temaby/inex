# AI Session Effectiveness Implementation Prompts

This document turns the session-effectiveness audit into implementation-agent prompts. Use the stages in order unless a later stage is explicitly independent.

## Stage Order

1. **Stage 0 - Intake and branch hygiene**
2. **Stage 1 - Project doctor helper**
3. **Stage 2 - AGENTS.md and instruction updates**
4. **Stage 3 - Issue-shaper skill/checklist**
5. **Stage 4 - Visual QA harness**
6. **Stage 5 - BMAD delivery orchestrator skill**
7. **Stage 6 - Prompt template library**
8. **Stage 7 - Retrospective loop and maintenance automation**

Stages 1 and 2 are prerequisites for the rest. Stage 3 can run after Stage 2. Stage 4 can run after Stage 1. Stage 5 should run after Stages 2 and 3. Stages 6 and 7 can be implemented after Stage 2.

## Global Implementation Rules

Every implementation agent must follow these rules:

- Read `AGENTS.md`, `inex/ClientApp/AGENTS.md` when touching frontend, and directly relevant docs under `docs/operations`.
- Preserve unrelated worktree changes.
- Do not start the app or call live external APIs unless the task explicitly requires and allows it.
- Use MySQL MCP for read-only DB validation before Docker, local `mysql`, or app startup.
- Keep docs public-safe: no local absolute paths, localhost evidence URLs, credentials, tokens, or secrets.
- Use semantic branch names if creating branches: `feature/`, `fix/`, `refactor/`, or `docs/`.
- For docs-only changes, do not run full tests unless the task changes executable scripts or validation commands.

## Stage 0 - Intake And Branch Hygiene

Goal: make every implementation session start from a known state without losing user work.

### Prompt

```text
You are implementing the AI session effectiveness setup for InEx.

Stage: 0 - Intake and branch hygiene.

Objective:
Inspect the current repository state and prepare a safe implementation path without modifying unrelated files.

Required steps:
1. Read `AGENTS.md`.
2. Run `git status --short --branch`.
3. If the worktree is dirty, inspect changed paths and classify them:
   - related to this stage
   - unrelated user work
   - generated/local artifacts
   - possible secrets or local-only files
4. Do not revert or delete unrelated changes.
5. Recommend a branch name for the stage if branch creation is requested.
6. Produce a short implementation note that names:
   - current branch
   - dirty files
   - files this stage is allowed to touch
   - verification commands to run

Allowed files for this stage:
- Documentation only, unless explicitly asked to create helper scripts.

Acceptance criteria:
- No unrelated files are changed.
- The user can see what will be touched before implementation starts.
- Any secret-bearing or local-only files are identified without printing secret values.
```

## Stage 1 - Project Doctor Helper

Goal: prevent UI/browser/database sessions from being derailed by missing Vite shims, locked backend DLLs, port conflicts, GitHub auth issues, or unavailable MySQL MCP.

Recommended artifact:

- `scripts/doctor.ps1`
- Optional docs: `docs/operations/project-doctor.md`

### Prompt

```text
You are implementing Stage 1 - Project doctor helper.

Objective:
Create a non-destructive PowerShell project doctor that checks local development readiness before UI, browser, DB, or GitHub work.

Read first:
- `AGENTS.md`
- `docs/operations/codex-mcp.md`
- `inex/ClientApp/AGENTS.md`

Create:
- `scripts/doctor.ps1`
- `docs/operations/project-doctor.md` if usage needs documentation

Doctor requirements:
1. Do not print secrets, connection strings, tokens, `.env` contents, or user-secrets values.
2. Support switches:
   - `-Ui`
   - `-Db`
   - `-GitHub`
   - `-All`
3. UI checks:
   - `inex/ClientApp/package.json` exists.
   - `node_modules/.bin/vite.cmd` exists on Windows.
   - `npm` is available.
   - frontend scripts include `start`, `build`, and `lint`.
   - report whether common frontend ports are listening: `3000`, `5173`, `5177`.
4. Backend checks:
   - `dotnet` is available.
   - solution file exists.
   - report if port `5000` is listening.
   - detect likely locked build outputs by checking for running `inex` processes, but do not kill them.
5. DB checks:
   - Check whether MySQL MCP is available if callable from this environment.
   - If MCP is not callable from a script, document that Codex agents must run `SELECT 1 AS ok` through MCP.
   - Do not use Docker or local MySQL as the first path.
6. GitHub checks:
   - `gh` is available.
   - `gh auth status` succeeds, without printing tokens.
7. Output:
   - A compact table of checks.
   - Clear remediation hints.
   - Exit code `0` when all selected checks pass.
   - Non-zero exit code when selected checks fail.

Implementation details:
- Use native PowerShell.
- Avoid destructive commands.
- Avoid reading `.env` values.
- Keep functions small: `Test-Ui`, `Test-Backend`, `Test-Db`, `Test-GitHub`, `Write-Check`.
- Use `Get-Command`, `Test-Path`, `Get-NetTCPConnection` or a safe fallback if unavailable.

Verification:
- Run `powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1 -All`.
- Run individual switches.
- Confirm no secrets are printed.

Acceptance criteria:
- The script identifies missing frontend command shims before `npm start`.
- The script identifies occupied app ports.
- The script identifies missing `gh` auth.
- The script is safe to run in normal investigation sessions.
```

## Stage 2 - AGENTS.md And Instruction Updates

Goal: encode durable session workflow rules without bloating the agent file.

Recommended artifacts:

- Root `AGENTS.md`
- `inex/ClientApp/AGENTS.md` only if frontend-specific rules change
- Optional docs under `docs/operations`

### Prompt

```text
You are implementing Stage 2 - AGENTS.md and instruction updates.

Objective:
Add concise durable rules that prevent repeated session friction, without duplicating long operational docs.

Read first:
- `AGENTS.md`
- `inex/ClientApp/AGENTS.md`
- `docs/operations/codex-mcp.md`
- `docs/operations/github-issue-guidelines.md`

Required AGENTS.md additions or validation:
1. Add a `Session Workflow` section if absent:
   - Before UI/browser work, run the project doctor if available; if it fails, report setup blockers before continuing.
   - For frontend visual changes, produce or update visual QA evidence before code review. Missing visual QA tooling is a blocker for visual-parity claims.
   - When given more than 10 UI findings, classify and group them into implementation-owned issues before coding.
   - After sessions with repeated environment/tool friction, propose one durable doc, script, or skill update.
2. Add or confirm `Tool Priority` rules:
   - Use MySQL MCP for read-only DB inspection before Docker, app startup, local mysql CLI, or connection-string fallbacks.
   - Use GitHub connector for issue/PR operations when available; use `gh` only for connector gaps.
3. Keep the root file concise:
   - Do not paste long issue templates into AGENTS.md.
   - Link to `docs/operations/github-issue-guidelines.md` for details.
   - Link to `docs/operations/project-doctor.md` if created.

Implementation details:
- Preserve existing branch naming, security, ownership, testing, and frontend rules.
- Do not rewrite completed story history.
- If rules already exist, refine instead of duplicating.
- Keep wording actionable and short.

Verification:
- Search for duplicate/conflicting rules around MySQL MCP, GitHub issues, visual QA, and frontend commands.
- Confirm `AGENTS.md` remains within a compact guardrail size.

Acceptance criteria:
- Agents have a clear preflight rule for UI/browser work.
- Agents have a clear grouping rule for large UI finding lists.
- AGENTS.md points to detailed docs instead of embedding long procedures.
```

## Stage 3 - Issue-Shaper Skill Or Checklist

Goal: convert raw findings into public-safe, implementation-owned GitHub issues and PR groups.

Recommended artifacts:

- Skill: local skill directory if skill creation is desired.
- Fallback: `docs/operations/issue-shaper-checklist.md`

### Prompt

```text
You are implementing Stage 3 - issue-shaper skill/checklist.

Objective:
Create a reusable workflow that turns raw audits, screenshot mismatch lists, or code review findings into scoped GitHub issues and PR grouping.

Read first:
- `docs/operations/github-issue-guidelines.md`
- `AGENTS.md`
- Existing UI audit docs under `docs/ui-audit` for examples

Create one of these, based on project preference:
- Preferred: a Codex skill named `inex-issue-shaper`
- Minimum: `docs/operations/issue-shaper-checklist.md`

Workflow requirements:
1. Intake:
   - Accept raw findings, screenshots, issue lists, or audit docs.
   - Identify source route/page/domain.
2. Classification:
   - `Confirmed`
   - `Partial`
   - `Not current`
   - `Product decision`
   - `Fixture/data/locale`
   - `Blocked`
3. Grouping:
   - Group by implementation ownership, not visual symptom.
   - Separate shared shell/navigation from page-local changes.
   - Separate fixture/data decisions from structural UI bugs.
   - Avoid one ticket per pixel difference.
4. Issue template:
   - Action-verb title.
   - One type label.
   - One priority label.
   - Problem.
   - Expected behavior.
   - Current behavior.
   - Evidence with repo-relative paths only.
   - Scope.
   - Acceptance criteria.
   - Blockers/decisions.
5. PR grouping:
   - Recommend branch names.
   - Identify dependencies.
   - Identify what can run in parallel.
   - Identify shared-file conflict risks.
6. Safety:
   - No local absolute paths.
   - No localhost URLs.
   - No credentials or test account secrets.
   - For screenshots, use: `Screenshot captured during local visual QA; local filesystem path intentionally omitted.`

Implementation details for a skill:
- Create `SKILL.md` with trigger examples:
  - "verify these issues"
  - "convert findings into GitHub issues"
  - "suggest PR grouping"
  - "audit screenshot mismatch list"
- Include a compact output format.
- Link to `docs/operations/github-issue-guidelines.md`.

Verification:
- Run the checklist manually against an existing audit such as `docs/ui-audit/accounts.md`.
- Confirm output creates fewer grouped issues than raw findings.

Acceptance criteria:
- A future agent can take a 25-30 item UI list and produce 3-7 scoped issue drafts.
- Output follows the project label and public-safe rules.
- PR grouping includes dependencies and parallelization advice.
```

## Stage 4 - Visual QA Harness

Goal: make fixture visual QA repeatable and stop relying on ad hoc screenshots.

Recommended artifacts:

- `inex/ClientApp/scripts/visual-qa/`
- npm scripts such as `qa:visual` and `qa:visual:accounts`
- Output under `docs/implementation/visual-qa/<story-or-page>/`

### Prompt

```text
You are implementing Stage 4 - visual QA harness.

Objective:
Create a repeatable frontend visual QA command that can capture fixture-backed page states and produce screenshots plus `qa-summary.json`.

Read first:
- `AGENTS.md`
- `inex/ClientApp/AGENTS.md`
- `docs/design/docs/design-implementation-guide.md`
- `docs/implementation/visual-qa/accounts-fixture-baseline.md`
- Existing `docs/implementation/visual-qa/*/qa-summary.json` files

Initial scope:
Start with one page, preferably Accounts or Transactions. Do not attempt all pages in the first PR.

Harness requirements:
1. Use fixture mode as source of truth for mockup parity.
2. Do not hardcode fixture data into production runtime paths.
3. Support states:
   - populated desktop
   - populated 390px
   - populated 360px
   - filter-empty
   - first-use empty
   - drawer-open
   - expanded-row or collapsed-group where applicable
   - error state where feasible
4. Support viewport widths:
   - 1440
   - 1024
   - 390
   - 360
5. Produce:
   - screenshots
   - `qa-summary.json`
   - overflow checks
   - bottom nav visibility/occlusion checks on mobile
   - data mode labels: `fixture` or `live-seed`
6. Avoid live external provider calls.
7. Do not require a real user password for fixture mode.

Implementation options to evaluate:
1. Playwright request interception against Vite dev server.
2. A test-only mock service worker route.
3. A dedicated fixture route guarded behind dev/test build flags.
4. Component-level Playwright/RTL rendering if full app routing is too costly.

Preferred implementation:
- Use Playwright if package/runtime is available and stable.
- If Playwright is not installed, propose a dedicated story/PR to add it deliberately.
- Do not silently rely on the in-app browser if it lacks request interception.

Implementation details:
- Add a script that starts or expects Vite in test mode.
- Avoid port `5000` collisions with the real backend by intercepting `/api` or using a test-only proxy target.
- Keep output deterministic.
- Include a README section explaining how to run the harness locally.

Verification:
- Run the new visual QA command for the selected page.
- Confirm screenshots and `qa-summary.json` are generated.
- Confirm no horizontal overflow at 390px and 360px.
- Confirm fixture mode does not call real backend APIs.

Acceptance criteria:
- One command refreshes visual QA evidence for the selected page.
- A PR reviewer can inspect screenshots and JSON without rerunning the app manually.
- The harness failure mode is explicit when dependencies are missing.
```

## Stage 5 - BMAD Delivery Orchestrator Skill

Goal: stop rewriting long orchestrator prompts for issue-to-production delivery.

Recommended artifact:

- Skill: `inex-bmad-delivery-orchestrator`

### Prompt

```text
You are implementing Stage 5 - BMAD delivery orchestrator skill.

Objective:
Create a reusable local skill for issue-driven implementation from GitHub issue intake through branch, code, tests, review, PR, CI, and merge.

Read first:
- `AGENTS.md`
- BMAD skills available in `.agents/skills`
- `docs/implementation/sprint-status.yaml`
- `docs/operations/github-issue-guidelines.md`

Create:
- A skill named `inex-bmad-delivery-orchestrator`, or update an existing local skill if the project already has one for this purpose.

Skill trigger examples:
- "fix issue #215 using BMAD"
- "run BMAD delivery for these GitHub issues"
- "implement, review, create PR, and merge"
- "orchestrate fresh-context subagents"

Skill workflow:
1. Intake:
   - Read issue(s), AGENTS, active story/spec if relevant.
   - Check worktree state.
   - Identify branch naming and PR grouping.
2. Planning:
   - Decide if work is one PR, stacked PRs, or issue-only.
   - Identify verification matrix.
   - Identify blocked decisions.
3. Implementation:
   - Orchestrator edits files.
   - Subagents, if available, only analyze/review and return findings.
   - Preserve unrelated changes.
4. Verification:
   - Run focused tests first.
   - Run broader tests/build/lint as required.
   - Run visual QA for visual work.
   - Use MySQL MCP for DB-backed validation.
5. Review:
   - Blind Hunter.
   - Edge Case Hunter.
   - Acceptance Auditor.
   - Fix high/medium findings before PR.
6. GitHub:
   - Push branch.
   - Open PR with summary, linked issues, tests, risks.
   - Wait for checks.
   - Merge only if checks and review requirements pass.
7. Final report:
   - Issues.
   - Branches.
   - PR URLs.
   - Tests run.
   - Review findings.
   - Merge result.
   - Remaining risks.

Implementation details:
- Include a compact default prompt inside the skill.
- Include rules for stacked PRs:
  - base first PR on target branch
  - stack dependent PRs only when review isolation is valuable
  - retarget/rebase each PR after dependency merge
  - wait for fresh CI before merge
- Include environment-friction behavior:
  - if app setup fails, run project doctor
  - do not continue claiming visual verification without visual QA evidence

Verification:
- Dry-run the skill against a completed issue without editing files.
- Confirm it produces the expected plan and verification matrix.

Acceptance criteria:
- Future agents no longer need custom long orchestration prompts.
- The skill preserves the project branch, review, and CI rules.
- The skill distinguishes analysis subagents from the editing orchestrator.
```

## Stage 6 - Prompt Template Library

Goal: make good prompts reusable without requiring the user to recreate them.

Recommended artifact:

- `docs/operations/agent-prompt-templates.md`

### Prompt

```text
You are implementing Stage 6 - prompt template library.

Objective:
Create a compact prompt-template document for recurring InEx agent workflows.

Read first:
- `AGENTS.md`
- `docs/operations/github-issue-guidelines.md`
- This document

Create:
- `docs/operations/agent-prompt-templates.md`

Templates to include:
1. Starting an implementation task.
2. Requesting investigation before coding.
3. Asking for a code review.
4. Asking for architecture critique.
5. Asking for frontend visual work.
6. Asking for GitHub issue creation.
7. Asking for database-backed validation.
8. Asking for session retrospective.
9. Asking for BMAD delivery.
10. Asking for visual QA evidence refresh.

For each template include:
- When to use.
- Prompt text.
- Required inputs.
- Expected output.
- Verification requirements.
- Stop conditions.

Implementation details:
- Keep templates concrete and copy-pasteable.
- Include placeholders such as `<issue-number>`, `<story-file>`, `<route>`, `<page>`.
- Avoid long explanations.
- Link to detailed docs instead of duplicating them.

Verification:
- Confirm templates do not conflict with AGENTS rules.
- Confirm GitHub issue template is public-safe.
- Confirm DB validation template says MySQL MCP first.

Acceptance criteria:
- A user can start common workflows by copying one prompt.
- The prompts encode the audit improvements.
- The document stays short enough to scan quickly.
```

## Stage 7 - Retrospective Loop And Maintenance Automation

Goal: turn repeated friction into durable improvements rather than one-off memory.

Recommended artifacts:

- Skill or checklist: `inex-session-retrospective`
- Optional doc: `docs/operations/session-retrospective-checklist.md`

### Prompt

```text
You are implementing Stage 7 - session retrospective loop.

Objective:
Create a lightweight retrospective workflow that audits completed AI-assisted sessions and proposes durable improvements.

Read first:
- `AGENTS.md`
- Existing operations docs
- Recent examples of completed session artifacts if available

Create one of:
- Skill: `inex-session-retrospective`
- Minimum doc: `docs/operations/session-retrospective-checklist.md`

Trigger conditions:
- Session lasted more than 60 minutes.
- Two or more environment/tool blockers occurred.
- A PR needed multiple review-fix rounds.
- A visual QA task could not produce screenshots.
- A new rule was discovered during implementation.
- User explicitly asks for a retrospective.

Checklist:
1. What caused time loss?
2. Was the task scoped correctly?
3. Did the agent use the strongest available tool?
4. Were docs or AGENTS missing a durable rule?
5. Was verification sufficient and early enough?
6. Did visual QA use fixture/live data correctly?
7. Did DB validation use MySQL MCP first?
8. Were GitHub issues public-safe and correctly labeled?
9. What should be automated?
10. What should not be added because it is too task-specific?

Output format:
- Findings.
- Evidence.
- Durable fix.
- Recommended artifact: AGENTS/doc/script/skill/MCP/plugin.
- Priority.
- Exact follow-up prompt.

Implementation details:
- Prefer one concrete follow-up per repeated friction pattern.
- Do not suggest AGENTS bloat for one-off issues.
- Separate local environment fixes from repo changes.

Verification:
- Run the checklist against one completed thread summary.
- Confirm it produces actionable follow-up work, not a generic essay.

Acceptance criteria:
- A future agent can run a retrospective and produce implementation-ready follow-up prompts.
- Repeated issues become scripts, skills, or docs.
- One-off issues remain notes, not permanent rules.
```

## Recommended Delivery Plan

### PR 1 - `feature/project-doctor-and-agent-rules`

Includes:
- Stage 1
- Stage 2

Why first:
- Prevents immediate environment and tool-use friction.
- Establishes rules that later agents follow.

Verification:
- Run project doctor.
- Docs review only for AGENTS changes.

### PR 2 - `docs/issue-shaper-and-prompt-templates`

Includes:
- Stage 3 checklist or skill
- Stage 6 prompt template library

Why second:
- Improves issue quality before more implementation work starts.

Verification:
- Dry-run issue shaping against an existing UI audit.

### PR 3 - `feature/frontend-visual-qa-harness`

Includes:
- Stage 4 for one page only

Why third:
- Highest-value but most implementation-heavy.
- Benefits from the doctor and prompt templates.

Verification:
- Run visual QA command.
- Confirm screenshots and `qa-summary.json`.

### PR 4 - `feature/bmad-delivery-orchestrator`

Includes:
- Stage 5

Why fourth:
- Depends on issue shaping and verification rules.

Verification:
- Dry-run against a completed issue.

### PR 5 - `docs/session-retrospective-loop`

Includes:
- Stage 7

Why last:
- Retrospective workflow should reference the other new artifacts.

Verification:
- Run against one representative completed session.

## Prompt For A Full Agent Team

Use this only after deciding to implement all stages:

```text
Run a staged implementation of `docs/operations/ai-session-effectiveness-implementation-prompts.md`.

Rules:
- Follow the stage order.
- Keep PRs grouped as recommended in the Delivery Plan.
- Do not start with the visual QA harness until the project doctor and AGENTS rules are done.
- Preserve unrelated worktree changes.
- Use MySQL MCP first for read-only DB checks.
- Use GitHub connector for issue/PR operations where available.
- For each stage, report:
  - files changed
  - verification run
  - blockers
  - whether the next stage can start

Begin with Stage 0 and PR 1 only. Stop after PR 1 unless explicitly told to continue.
```
