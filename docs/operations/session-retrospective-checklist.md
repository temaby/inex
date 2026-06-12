# Session Retrospective Checklist

Use this workflow to audit completed AI-assisted InEx sessions and turn repeated friction into durable follow-up work. Keep one-off observations as notes; do not promote them into `AGENTS.md`, scripts, skills, or permanent docs unless the same pattern is likely to recur.

## When To Run

Run a retrospective when any condition is true:

- The session lasted more than 60 minutes.
- Two or more environment or tool blockers occurred.
- A PR needed multiple review-fix rounds.
- A visual QA task could not produce screenshots.
- A new rule was discovered during implementation.
- The user explicitly asks for a retrospective.

## Inputs

Collect only public-safe and relevant evidence:

- Session summary, final report, PR description, review comments, CI results, or issue thread.
- Verification output summaries, not secrets or raw local config.
- Visual QA summaries such as `docs/implementation/visual-qa/**/qa-summary.json`.
- Relevant operations docs: `docs/operations/project-doctor.md`, `docs/operations/codex-mcp.md`, and `docs/operations/github-issue-guidelines.md`.

Do not include local absolute paths, localhost evidence URLs, credentials, tokens, `.env` contents, browser storage, or user-local details in any proposed GitHub issue or durable doc.

## Audit Questions

Answer these before proposing fixes:

1. What caused time loss?
2. Was the task scoped correctly?
3. Did the agent use the strongest available tool?
4. Were docs or `AGENTS.md` missing a durable rule?
5. Was verification sufficient and early enough?
6. Did visual QA use fixture or live data correctly?
7. Did DB validation use MySQL MCP first?
8. Were GitHub issues public-safe and correctly labeled?
9. What should be automated?
10. What should not be added because it is too task-specific?

## Recommendation Rules

- Prefer one concrete follow-up per repeated friction pattern.
- Separate local environment fixes from repository changes.
- Recommend `AGENTS.md` edits only for durable, cross-session rules.
- Recommend docs for repeatable judgment workflows or project-specific procedures.
- Recommend scripts for deterministic checks, generation, formatting, or validation.
- Recommend skills for reusable agent workflows that require judgment across evidence sources.
- Recommend MCP or plugin work only when the missing capability blocks repeated work and cannot be solved with a repo script.
- Do not recommend a permanent artifact for one-off ambiguity, temporary outage, or task-specific discovery.
- Cap the main recommendation list at three follow-ups unless the user asks for a full maintenance backlog.

## Output Format

Use this format for each finding:

````md
### <Finding title>

Finding:
Evidence:
Durable fix:
Recommended artifact: `AGENTS|doc|script|skill|MCP|plugin|none`
Priority: `critical|high|medium|low`
Exact follow-up prompt:
```text
<copy-pasteable prompt for the next agent>
```
````

End with:

```md
One-off notes:
- <items intentionally not promoted to durable changes>

Safety check:
- Local environment fixes separated from repo changes: <yes/no>
- No local absolute paths, localhost URLs, credentials, or secrets included: <yes/no>
- Every durable fix is tied to repeated or likely-recurring evidence: <yes/no>
```

## Priority Guide

- `critical`: data isolation, data loss, secret exposure, or destructive workflow risk.
- `high`: repeated blocker that prevents verification, review, CI, issue hygiene, or delivery.
- `medium`: repeatable inefficiency with a clear script, doc, or skill fix.
- `low`: clarity improvement, minor prompt refinement, or optional cleanup.

## Artifact Selection

Use this table to avoid overfitting:

| Pattern | Recommended artifact |
| --- | --- |
| Same rule must guide every future agent | `AGENTS.md` |
| Repeatable human checklist or workflow | operations doc |
| Deterministic local readiness or validation check | script |
| Judgment-heavy recurring workflow | skill |
| Repeated DB/tool access gap | MCP |
| Repeated missing external integration capability | plugin |
| One-off issue or task-specific nuance | none |

## Verification Example

Source artifact reviewed: `docs/implementation/visual-qa/stage-4-accounts/qa-summary.json`.

### Preserve CDP visual QA fallback as documented behavior

Finding:
The completed Accounts visual QA run produced screenshots and structured checks even though Playwright was not installed. The harness used Chrome DevTools Protocol with request interception, fixture data, and explicit API isolation.

Evidence:
The QA summary reports `playwrightInstalled: false`, `runner: Node CDP headless browser`, `dataMode: fixture`, `realBackendCalled: false`, generated screenshot names, no unhandled API requests, and passing mobile overflow/bottom-nav checks.

Durable fix:
No new repository change is required from this example because `docs/operations/ai-session-effectiveness-implementation-prompts.md` already says Playwright should be added in a dedicated dependency PR if desired, and the QA summary records the fallback behavior. Treat this as a successful pattern to reuse, not as a new rule.

Recommended artifact: `none`

Priority: `low`

Exact follow-up prompt:
```text
Review the existing Accounts visual QA CDP harness and decide whether a dedicated Playwright dependency PR is justified. Use `docs/implementation/visual-qa/stage-4-accounts/qa-summary.json` as evidence, compare maintainability against current CDP coverage, and recommend either no change or a scoped dependency PR. Do not edit files unless the recommendation is explicitly approved.
```

One-off notes:
- React Router future-flag console warnings appeared in the captured QA summary, but they did not block screenshots, API isolation, or visual checks. Do not create a durable rule from this single occurrence.
- The PNG dimensions differ from viewport widths because of capture mechanics; no follow-up is warranted without repeated evidence of reviewer confusion or bad screenshots.

Safety check:
- Local environment fixes separated from repo changes: yes
- No local absolute paths, localhost URLs, credentials, or secrets included: yes
- Every durable fix is tied to repeated or likely-recurring evidence: yes
