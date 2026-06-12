# Agent Prompt Templates

Use these copy-paste prompts to start common InEx agent workflows. Keep project rules from `AGENTS.md` in force; use detailed procedures from:

- `docs/operations/github-issue-guidelines.md`
- `docs/operations/project-doctor.md`
- `docs/operations/codex-mcp.md`
- `docs/design/docs/design-implementation-guide.md`

## Starting An Implementation Task

**When to use:** You want the agent to implement a scoped issue, story, bug fix, or small feature.

**Prompt text:**

```text
Implement <task-summary> for InEx.

Inputs:
- Issue: <issue-number or none>
- Story/spec: <story-file or none>
- Area: <backend|frontend|docs|database>
- Files likely involved: <paths or unknown>

Required steps:
1. Read `AGENTS.md`.
2. Read `<story-file>` and directly relevant docs before editing.
3. Check `git status --short --branch` and preserve unrelated changes.
4. Implement the narrowest complete change that matches existing patterns.
5. Run focused verification first, then broader verification when feasible.
6. Report changed files, verification, blockers, and residual risks.

Do not start the app or call live external APIs unless explicitly needed and approved.
```

**Required inputs:** `<task-summary>`, `<issue-number>`, `<story-file>`, `<backend|frontend|docs|database>`.

**Expected output:** Working change, changed-file summary, verification results, remaining risks.

**Verification requirements:** Focused tests for touched area; `dotnet test inex.Services.Tests/` before broader backend tests when backend services change; frontend `npm run lint` or `npm run build` when relevant.

**Stop conditions:** Missing required decision, failing project setup that blocks the task, possible secret exposure, unrelated dirty files that would be overwritten.

## Requesting Investigation Before Coding

**When to use:** You need root-cause analysis or a codepath map before deciding what to change.

**Prompt text:**

```text
Investigate <problem> before coding.

Scope:
- Symptom: <symptom>
- Route/API/domain: <route-or-domain>
- Evidence: <links, issue numbers, logs with secrets removed>

Required steps:
1. Read `AGENTS.md` and relevant docs.
2. Do not edit files unless I explicitly approve implementation.
3. Trace the current behavior through code and tests.
4. Identify likely root cause, affected files, user-data isolation risks, and verification needed.
5. If database inspection is needed, use MySQL MCP first and read-only SQL only.

Return findings ordered by confidence, with file references and recommended next action.
```

**Required inputs:** `<problem>`, `<symptom>`, `<route-or-domain>`, safe evidence.

**Expected output:** Evidence-backed findings, root-cause hypothesis, implementation options, verification plan.

**Verification requirements:** Code references; read-only DB checks through MySQL MCP when DB behavior is involved.

**Stop conditions:** Investigation requires live external API calls, write SQL, app startup, or access to secrets without approval.

## Asking For A Code Review

**When to use:** You want risk-focused review of a diff, branch, PR, or local changes.

**Prompt text:**

```text
Review <branch-or-diff-or-PR> for InEx.

Focus:
- Scope: <expected-change>
- Risk areas: <security|ownership|API contract|frontend UX|database|tests>
- Base: <target-branch>

Required steps:
1. Read `AGENTS.md`.
2. Inspect the diff against `<target-branch>`.
3. Prioritize bugs, regressions, user-data isolation violations, missing tests, and contract breaks.
4. Do not make code changes unless I ask for fixes.
5. Report findings first, ordered by severity, with tight file/line references.

Include open questions and test gaps after findings.
```

**Required inputs:** `<branch-or-diff-or-PR>`, `<expected-change>`, `<target-branch>`.

**Expected output:** Severity-ordered findings, open questions, test gaps, short change summary.

**Verification requirements:** Diff inspection; targeted test assessment; no generic praise-only review.

**Stop conditions:** Base branch unavailable, diff cannot be determined, or review would require unapproved external access.

## Asking For Architecture Critique

**When to use:** You need design pressure-testing before building shared backend, frontend, database, or workflow changes.

**Prompt text:**

```text
Critique this architecture for InEx before implementation.

Proposal:
<proposal>

Context:
- Story/spec: <story-file or none>
- Current code area: <paths>
- Decision needed: <decision>

Required steps:
1. Read `AGENTS.md`, `docs/project-context.md`, and relevant planning/implementation docs.
2. Compare the proposal to current code patterns and accepted BMad decisions.
3. Identify data ownership, API contract, database, frontend migration, and testability risks.
4. Recommend the smallest viable design or explain why a larger change is justified.
5. Do not edit files.

Return concerns, alternatives, recommendation, and verification needed.
```

**Required inputs:** `<proposal>`, `<story-file>`, `<paths>`, `<decision>`.

**Expected output:** Specific critique, alternatives, recommended design, verification matrix.

**Verification requirements:** References to current code/docs; explicit user-data isolation assessment for backend/database designs.

**Stop conditions:** Missing product decision, proposal conflicts with accepted constraints, or insufficient code context.

## Asking For Frontend Visual Work

**When to use:** You want a page, component, layout, or visual parity change.

**Prompt text:**

```text
Implement frontend visual work for `<page>` on `<route>`.

Inputs:
- Target page/component: <page>
- Route: <route>
- Design source: <design-doc-or-screenshot>
- Findings: <finding-list-or-issue-number>

Required steps:
1. Read `AGENTS.md`, `inex/ClientApp/AGENTS.md`, and `docs/design/docs/design-implementation-guide.md`.
2. Run the project doctor before UI/browser work if available.
3. If there are more than 10 findings, classify and group them before coding.
4. Preserve `apiClient`, auth headers, refresh-token behavior, and i18n.
5. Implement the visual change using existing frontend patterns.
6. Produce or refresh visual QA evidence before claiming parity.

Do not start the app unless needed for approved UI verification.
```

**Required inputs:** `<page>`, `<route>`, design source, findings or issue.

**Expected output:** Frontend changes, visual QA evidence summary, build/lint results, unresolved parity gaps.

**Verification requirements:** Project doctor for UI/browser work; visual QA screenshots or documented blocker; frontend lint/build as appropriate.

**Stop conditions:** Missing visual QA tooling for a parity claim, failing doctor check that blocks UI work, unclear fixture/data baseline.

## Asking For GitHub Issue Creation

**When to use:** You want raw findings converted into public-safe GitHub issue drafts or created issues.

**Prompt text:**

```text
Create GitHub issue drafts for these InEx findings.

Inputs:
- Findings: <finding-list>
- Source page/domain: <page-or-domain>
- Evidence: <public-safe-evidence>
- Create issues now: <yes|no>

Required steps:
1. Read `AGENTS.md` and `docs/operations/github-issue-guidelines.md`.
2. Group findings by implementation ownership.
3. Keep shared shell/navigation separate from page-local work.
4. Separate fixture/data/locale decisions from structural defects.
5. Use action-verb titles.
6. Assign exactly one allowed type label and one priority label per open issue.
7. Use repo-relative paths only.
8. Omit local absolute paths, localhost URLs, credentials, tokens, `.env` values, and user-local details.
9. For local screenshots, write: `Screenshot captured during local visual QA; local filesystem path intentionally omitted.`

Return issue drafts first. Create issues only if `<yes|no>` is `yes`.
```

**Required inputs:** `<finding-list>`, `<page-or-domain>`, public-safe evidence, creation approval.

**Expected output:** Scoped issue drafts or created issue links, labels, dependencies, duplicate notes.

**Verification requirements:** Public-safe content check; exactly one type label and one priority label; repo-relative source references.

**Stop conditions:** Evidence contains secrets or local-only details, label taxonomy is ambiguous, issue creation was not approved.

## Asking For Database-Backed Validation

**When to use:** You need schema, query translation, data-shape, migration, or provider-specific validation.

**Prompt text:**

```text
Validate `<behavior>` against the InEx database.

Inputs:
- Behavior/query area: <behavior>
- Tables/entities: <tables-or-entities>
- Expected result: <expected-result>
- Related code: <paths>

Required steps:
1. Read `AGENTS.md` and `docs/operations/codex-mcp.md`.
2. Use MySQL MCP first for database inspection.
3. Use read-only SQL only: `SELECT`, `SHOW`, `DESCRIBE`, or `EXPLAIN`.
4. Do not use Docker, local `mysql`, migrations, app startup, or connection-string fallbacks unless MCP is unavailable or insufficient and you state why.
5. Do not print secrets or connection strings.
6. For user-owned data, verify queries include `UserId` or an equivalent ownership predicate.

Return SQL used, summarized results, conclusion, and any implementation risk.
```

**Required inputs:** `<behavior>`, `<tables-or-entities>`, `<expected-result>`, related code paths.

**Expected output:** Read-only SQL, summarized DB evidence, validation conclusion, gaps.

**Verification requirements:** MySQL MCP first; no write SQL; ownership predicate check for user-owned data.

**Stop conditions:** MCP unavailable and fallback is not approved, validation requires write SQL, query would expose sensitive data.

## Asking For Session Retrospective

**When to use:** A session had repeated friction, slow review loops, blocked visual QA, or a new durable rule emerged.

**Prompt text:**

```text
Run a retrospective for this InEx session.

Inputs:
- Session summary: <summary>
- PR/issues: <links-or-numbers>
- Friction points: <tooling|environment|scope|review|visual QA|DB validation>

Required steps:
1. Read `AGENTS.md` and relevant operations docs.
2. Identify what caused time loss or quality risk.
3. Separate one-off notes from durable improvements.
4. Recommend at most three follow-ups.
5. For each follow-up, name the artifact type: AGENTS rule, operations doc, script, skill, test, or issue.
6. Include an exact follow-up prompt for each recommended change.

Do not edit files unless I explicitly ask you to implement the follow-ups.
```

**Required inputs:** `<summary>`, PR/issues, friction categories.

**Expected output:** Findings, evidence, durable fixes, priority, follow-up prompts.

**Verification requirements:** Each recommendation tied to session evidence; no AGENTS bloat for one-off problems.

**Stop conditions:** Not enough session evidence, requested follow-up would expose local or secret details.

## Asking For BMAD Delivery

**When to use:** You want issue-driven delivery from intake through implementation, verification, review, PR, and merge planning.

**Prompt text:**

```text
Run BMAD delivery for InEx issue `<issue-number>`.

Inputs:
- Issue: <issue-number>
- Story/spec: <story-file or none>
- Target branch: <target-branch>
- Merge allowed: <yes|no>

Required steps:
1. Use the `inex-bmad-delivery-orchestrator` skill if available.
2. Read `AGENTS.md`, the issue, and relevant story/spec docs.
3. Check worktree state and preserve unrelated changes.
4. Plan branch name using `feature/`, `fix/`, `refactor/`, or `docs/`.
5. Implement narrowly, run focused verification, and broaden verification as needed.
6. Run review layers before PR: Blind Hunter, Edge Case Hunter, Acceptance Auditor.
7. Use GitHub connector for issue/PR operations where available.
8. Open a PR with linked issue, tests, risks, and visual QA or DB evidence when relevant.
9. Merge only if `<yes|no>` is `yes` and checks/review requirements pass.

Report issues, branch, PR URL, verification, review findings, and remaining risks.
```

**Required inputs:** `<issue-number>`, `<story-file>`, `<target-branch>`, merge approval.

**Expected output:** Delivery plan, implemented change, review results, PR details, merge status if allowed.

**Verification requirements:** Focused tests first; visual QA for visual work; MySQL MCP for DB-backed validation; CI status before merge.

**Stop conditions:** Unclear PR grouping, failing required checks, unresolved high/medium review findings, merge not approved.

## Asking For Visual QA Evidence Refresh

**When to use:** You need screenshots and QA summaries refreshed after frontend changes or before visual review.

**Prompt text:**

```text
Refresh visual QA evidence for `<page>` on `<route>`.

Inputs:
- Page: <page>
- Route: <route>
- Fixture or baseline: <fixture-or-baseline-doc>
- Output location: <docs/implementation/visual-qa/...>

Required steps:
1. Read `AGENTS.md`, `inex/ClientApp/AGENTS.md`, `docs/operations/project-doctor.md`, and the relevant visual QA docs.
2. Run the project doctor before browser/UI work if available.
3. Use fixture mode when the task is visual parity.
4. Capture required desktop and mobile states.
5. Check for horizontal overflow and mobile nav occlusion.
6. Produce or update screenshots and `qa-summary.json`.
7. Do not claim parity if tooling, fixtures, or browser verification are blocked.

Return evidence location, states captured, failures, and gaps.
```

**Required inputs:** `<page>`, `<route>`, fixture/baseline doc, output location.

**Expected output:** Refreshed screenshots, `qa-summary.json`, capture summary, blockers or gaps.

**Verification requirements:** Doctor run; fixture mode for parity; desktop/mobile captures; overflow and occlusion checks.

**Stop conditions:** Visual QA tooling missing, fixture baseline undecided, app/browser setup blocked, live data would make parity evidence non-deterministic.
