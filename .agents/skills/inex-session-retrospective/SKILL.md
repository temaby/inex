---
name: inex-session-retrospective
description: Audits completed InEx AI-assisted sessions and turns repeated friction into durable follow-up prompts. Use when the user asks for a retrospective, a session exceeded 60 minutes, multiple tool or environment blockers occurred, a PR needed repeated review-fix rounds, visual QA could not produce screenshots, or a new durable rule was discovered.
---

# InEx Session Retrospective

## Required Context

Read `AGENTS.md` and `docs/operations/session-retrospective-checklist.md` before producing a retrospective. Also inspect relevant operations docs when the session involved UI/browser setup, DB validation, visual QA, GitHub issues, PRs, or CI:

- `docs/operations/project-doctor.md`
- `docs/operations/codex-mcp.md`
- `docs/operations/github-issue-guidelines.md`
- `docs/operations/agent-prompt-templates.md`

## When To Run

Run the retrospective when any trigger is present:

- Session lasted more than 60 minutes.
- Two or more environment or tool blockers occurred.
- A PR needed multiple review-fix rounds.
- A visual QA task could not produce screenshots.
- A new rule was discovered during implementation.
- User explicitly asks for a retrospective.

## Workflow

1. Collect public-safe evidence: session summary, final report, PR/review notes, CI results, verification summaries, issue thread, or visual QA summary.
2. Answer the checklist questions from `docs/operations/session-retrospective-checklist.md`.
3. Separate repeated friction from one-off notes.
4. Recommend at most three durable follow-ups unless the user asks for a full backlog.
5. Prefer one concrete follow-up per repeated friction pattern.
6. Separate local environment fixes from repository changes.
7. Do not recommend `AGENTS.md` edits for one-off or task-specific discoveries.

## Output Format

Use this structure for each finding:

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

## Guardrails

- Keep GitHub issue or PR recommendations public-safe.
- Use MySQL MCP first when judging DB validation gaps.
- For visual QA, distinguish fixture/live-data problems from implementation defects.
- Recommend scripts for deterministic checks and skills for judgment-heavy workflows.
- Keep one-off issues as notes, not durable rules.
