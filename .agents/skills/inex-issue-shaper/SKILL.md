---
name: inex-issue-shaper
description: Turn raw InEx audits, screenshot mismatch lists, code review findings, or issue lists into public-safe scoped GitHub issue drafts and PR grouping advice. Use when the user says "verify these issues", "convert findings into GitHub issues", "suggest PR grouping", or "audit screenshot mismatch list".
---

# InEx Issue Shaper

## Required Context

Read [GitHub issue guidelines](../../../docs/operations/github-issue-guidelines.md) before drafting issues. For UI audit work, also inspect the relevant source under `docs/ui-audit/` and identify the route, page, or domain each finding came from.

## Intake

Accept raw findings, screenshots, mismatch lists, review comments, or audit docs. Normalize each finding into:

- Source: route, page, feature domain, or component.
- Evidence: repo-relative source paths, safe screenshot wording, or audit doc reference.
- Owner: shared shell/navigation, page-local UI, data/fixture/locale, backend/API, tests, docs, or product decision.
- Status: one of the classification values below.

Never include local absolute paths, localhost URLs, credentials, tokens, `.env` values, browser storage, or test account secrets. For screenshots, write exactly: `Screenshot captured during local visual QA; local filesystem path intentionally omitted.`

## Classification

Use exactly one classification per finding:

- `Confirmed`: current behavior is verified and implementation-owned.
- `Partial`: some evidence is current, but scope or reproduction is incomplete.
- `Not current`: the finding no longer reproduces or has already been addressed.
- `Product decision`: the right behavior requires product, UX, QA, or architecture direction.
- `Fixture/data/locale`: difference is driven by seed data, visual QA baseline, period, currency, or language.
- `Blocked`: cannot classify or scope without missing evidence, environment access, or an external decision.

## Grouping Rules

Group by implementation ownership, not by visual symptom. Separate shared shell/navigation from page-local work. Keep fixture, data, period, currency, and locale decisions out of structural UI bugs. Do not create one issue per pixel difference or per repeated occurrence of the same shared component defect.

Target 3-7 issue drafts for a 25-30 item UI list. Fewer is acceptable when findings collapse into shared ownership; more needs a clear ownership or dependency reason.

## Issue Draft Template

```md
### <Action-verb title>

Labels: `<type label>`, `<priority label>`
Classification: `Confirmed|Partial|Not current|Product decision|Fixture/data/locale|Blocked`

Problem:
Expected behavior:
Current behavior:
Evidence:
- <repo-relative path, audit doc section, or approved screenshot wording>
Scope:
Acceptance criteria:
- <observable outcome>
Blockers/decisions:
- <none, or explicit decision needed>
```

Use exactly one type label from `bug`, `enhancement`, `documentation`, `refactor`, `duplicate`, or `question`, and exactly one priority label from `priority:critical`, `priority:high`, `priority:medium`, or `priority:low`. Titles must start with an action verb and must not use prefixes such as `fix(...)`, `refactor(...)`, `docs(...)`, or `[Feature]`.

## PR Grouping Output

After issue drafts, include compact PR grouping:

```md
PR grouping:
- `<branch-name>`: <issue titles>; dependencies: <none or issue/decision>; parallel: <yes/no>; conflict risks: <shared files>
```

Branch names must use `feature/`, `fix/`, `refactor/`, or `docs/`; never use `codex/`. Identify dependencies, work that can run in parallel, and likely shared-file conflicts such as `AppShell`, locale files, shared primitives, CSS modules, API clients, or fixtures.

## Compact Output Format

When the user asks for a concise pass, output only:

1. `Classification summary`: counts by classification.
2. `Issue drafts`: grouped drafts using the template.
3. `Not filed`: findings marked `Not current`, duplicate, or intentionally absorbed into another draft.
4. `PR grouping`: branch names, dependencies, parallelization, and conflict risks.
5. `Safety check`: confirm no local absolute paths, localhost URLs, credentials, or screenshot paths are present.

## Final Checks

Before returning issue drafts, confirm:

- The number of issue drafts is lower than the raw finding count unless every finding is uniquely owned.
- Shared shell/navigation appears in one shared issue, not repeated page tickets.
- Product, fixture, data, and locale decisions are `question` issues unless implementation is already decided.
- Evidence uses repo-relative paths or approved screenshot wording only.
- Each open issue has one allowed type label and one priority label.
