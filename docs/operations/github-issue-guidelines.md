# GitHub Issue Guidelines

Use these rules when creating, editing, triaging, or consolidating GitHub issues for InEx.

## Public-Safe Content

Issue content must be safe to publish in the repository.

Do not include:

- Local absolute paths such as `C:\Users\artio\...`, `/c/Users/artio/...`, `D:\work\inex\...`, or `AppData\Local\Temp\...`.
- Local-only evidence URLs such as `http://localhost:3000/...`.
- Credentials, tokens, connection strings, `.env` values, browser storage, or user-local details.

Prefer repo-relative paths:

```text
inex/ClientApp/src/pages/Accounts.tsx
```

For screenshots captured locally, write:

```text
Screenshot captured during local visual QA; local filesystem path intentionally omitted.
```

## Titles

Issue titles should start with an action verb.

Good examples:

- Fix transfer ownership enforcement when creating transfers
- Define Accounts visual QA fixture and default expanded groups
- Align Transactions toolbar and action layout
- Tighten Budgets row density and expand affordance
- Split AccountResponse from account request inheritance
- Rename frontend report DTO interfaces

Avoid:

- Prefixes like `fix(...)`, `refactor(...)`, or `docs(...)`.
- Prefixes like `[Feature]`.
- Vague nouns without an action.

## Labels

Keep issue classification simple: one type label plus one priority label.

Allowed non-priority labels:

- `bug`
- `enhancement`
- `documentation`
- `refactor`
- `duplicate`
- `question`

Every open issue should have exactly one priority label:

- `priority:critical`
- `priority:high`
- `priority:medium`
- `priority:low`

Priority meanings:

- `priority:critical`: security, data isolation, data loss, or production outage risk.
- `priority:high`: user-visible correctness issue, blocking product/API/UX decision, or important shared architecture/API contract problem.
- `priority:medium`: normal planned implementation, visual parity, contract hardening, or meaningful UX/product quality work.
- `priority:low`: documentation, naming cleanup, small refactor, or low-risk maintenance.

Do not attach custom taxonomy labels to open issues unless the project explicitly changes the issue taxonomy.

Avoid labels such as:

- `area:*`
- `domain:*`
- `kind:*`
- `source:*`
- old `priority:p1`, `priority:p2`, or `priority:p3`

## Type Label Selection

Use `question` for issues that primarily require a product, QA, or architecture decision before implementation.

Examples:

- visual QA fixture baseline
- locale/period/data baseline decision
- navigation/shell policy
- API/reporting contract decision

Use `enhancement` for visual alignment and product improvement work unless it is a clear defect.

Examples:

- Align Categories hero spend and distribution with mockup
- Tighten Accounts table rows and replace row-level share bars

Use `bug` for incorrect behavior, security/correctness risks, broken calculations, wrong currency handling, or regressions.

Examples:

- hardcoded currency
- missing ownership enforcement
- incorrect response date mapping
- broken metadata initialization

Use `refactor` for internal structure, naming, inheritance cleanup, code organization, or non-behavioral technical debt.

Examples:

- DTO/interface renames
- response/request inheritance split
- mapping simplification
- naming collision cleanup

Use `documentation` for docs, client regeneration, or checklist work where implementation behavior does not change.

Use `duplicate` only when closing or marking an issue that is superseded by another canonical issue.

## Duplicate And Intersecting Issues

- Consolidate true duplicates into one canonical issue.
- Close duplicates with the `duplicate` label if appropriate.
- Add a short comment explaining which issue supersedes the duplicate.
- If issues are similar but intentionally separate, clarify scope in each issue instead of closing.

Example: Accounts and Categories request/response inheritance cleanup can remain separate if each issue explicitly says it is domain-specific.

## Shared Shell And Cross-Page UI Findings

- Do not create one duplicate shell issue per page.
- Create or keep one shared issue for global shell, navigation, header, logo, logout, or app-wide chrome concerns.
- Page-specific issues should focus only on page content: cards, toolbar, table, rows, charts, forms, and page-local states.

## Visual QA Issues

- Separate structural/layout defects from fixture, data, date, and locale differences.
- Do not report raw value, name, or date differences as bugs when screenshots use different datasets or periods.
- Create a `question` issue for fixture or baseline decisions when needed.
- For local screenshots, omit local filesystem paths and use the approved local visual QA wording.

Visual QA issues should include:

- Expected behavior.
- Actual behavior.
- Repo-relative source references.
- Scope.
- Acceptance criteria.
- Blockers or decisions, if applicable.

## Evidence

- Keep useful source references.
- Use repo-relative paths with line hints where possible.
- Avoid environment-specific paths.
- Avoid sensitive or user-local details unless they are essential and safe.

## Open Issue Hygiene

Each issue should be uniquely scoped and have:

- An action-title.
- One allowed type label.
- One priority label.
- Clear expected/actual/follow-up details or acceptance criteria.

Avoid mixing decision work, implementation work, and test-only work in one issue unless intentionally grouped.
