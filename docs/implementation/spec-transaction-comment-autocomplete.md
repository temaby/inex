---
title: 'Add inline transaction comment autocomplete'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_commit: 'b2f093413b9f1d43de59342adb57f25910d9c514'
context:
  - 'docs/project-context.md'
  - 'inex/ClientApp/AGENTS.md'
  - 'docs/design/docs/design-implementation-guide.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Transaction creation comments accept #tags and @references but offer no way to reuse existing values. References are arbitrary text markers, not users, contacts or accounts.

**Approach:** Add a bounded authenticated lookup over the existing personal marker catalog and inline autocomplete to the shared creation comment input. Keep the optional comment collapsed by default, its controlled value and existing submission behavior.

## Boundaries & Constraints

**Always:** Preserve comment storage, parsers and marker persistence. Suggest catalog keys as stored. Scope catalog and ranking queries to CurrentUserId. Return five distinct case-insensitive matches maximum: prefixes first, substrings second; break ties by usage count, latest use, then key. Include historical catalog values even when unlinked. Use apiClient/RTK Query, cancellation, EN/RU, existing tokens and Ant infrastructure. Keep UI state local. Cache in memory for 60 seconds after the last subscriber, keyed by authenticated user, type and normalized search; invalidate after successful relevant mutations and reject stale identity/query responses.

**Ask First:** Changing marker semantics, introducing schema migrations or dependencies, or expanding autocomplete into transaction editing and filters.

**Never:** Fetch complete transaction histories for suggestions, expose another user's catalog through linked-user views, change financial payloads, rewrite completed stories, introduce marker management UI, or call exchange-rate providers from development/QA.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Tags/references | `Shopping for #gro` or `Gift for @mar` | Only corresponding marker type; up to five ranked matches | Free text remains editable |
| Empty query | Cursor immediately after # or @ | Usage-ranked values, deterministic fallback | Concise localized empty state |
| Inline replacement | Cursor in `Dinner with @ma yesterday` | Replace entire active token only; preserve suffix; caret immediately after inserted value | Ignore obsolete selections |
| Token semantics | Multiple markers, Cyrillic, punctuation, tabs or spaces | Follow existing literal-space split and Trim rules; punctuation stays part of token; no multiword interpretation | No trigger inside ordinary words/emails |
| Keyboard | Open dropdown with options | Up/Down navigate; Enter accepts; Tab accepts highlighted option; Escape closes without closing drawer | Suppress submission only for handled selection/navigation |
| Pointer/touch | Select compact highlighted row | Commit value without losing input/caret; accessible touch target | Outside click/blur closes |
| Empty/error/loading | No matches, delayed/failed lookup, IME composition | Localized concise status; no unrelated or stale options; composition unaffected | Never block comment input or save |
| Identity/query change | Type switch, changed token, logout/login | Current query only; user-isolated cache; cancel or ignore obsolete responses | No previous user's data flashes |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Transactions/TransactionCreationFields.tsx` — shared creation Input; correction reason remains mandatory and expanded. Editing uses separate `TransactionEditForm.tsx`.
- `inex.Services/Services/TransactionCommentMarkers.cs` and `Models/Records/Transaction/TransactionResponse.cs` — current write catalog and read parsing; preserve both.
- `inex.Data/Models/Tag.cs`, `TagType.cs`, `TransactionTagMap.cs` — existing TAG/REF catalog and auditable usage links.
- `inex/ClientApp/src/components/AutoComplete.tsx` — leading-marker, whole-field Ant autocomplete; insufficient for caret replacement.
- `inex/ClientApp/src/store/transactions/transactions-api.ts` — authenticated RTK queries and mutation invalidation.

## Tasks & Acceptance

**Execution:**
- [x] `inex.Services/Models/Records/Transaction/TransactionCommentSuggestionsResponse.cs`, `inex.Services/Services/Base/ITransactionService.cs`, `inex.Services/Services/TransactionService.cs` — implement bounded cancellable catalog query, matching, usage ranking and owner predicates; keep filtering/ranking database-side.
- [x] `inex/Controllers/TransactionsController.cs` — add authenticated GET `comment-suggestions?type=tag|ref&query=...`, typed response and validated inputs; derive ownership from principal.
- [x] `inex/ClientApp/src/store/transactions/transactions-api.ts` — add typed owner-keyed query, retention and mutation invalidation; debounce lookup by approximately 200ms without delaying input.
- [x] `inex/ClientApp/src/pages/Transactions/comment-autocomplete.ts`, `TransactionCommentInput.tsx`, `TransactionCreationFields.tsx`, `transaction-creation.css` — implement token replacement, accessible popup, composition handling, cancellation and focus; preserve controlled onChange consumers.
- [x] `inex/ClientApp/public/locales/en/translation.json` and `ru/translation.json` — add suggestion list, loading, unavailable and empty copy.
- [x] `inex.Tests/Transactions/TransactionCommentSuggestionsTests.cs`, frontend helper/component tests and store query tests — cover matrix, auth/ownership, ranking, limits, stale results, caching and invalidation.
- [x] `inex/ClientApp/visual-qa/transaction-comment-autocomplete.mjs`, feature evidence and `docs/design/docs/visual-qa-checklist.md` — fixture captures at 1440/1024/390/360px, Russian mobile, empty state, footer positioning and touch selection before review.

**Acceptance Criteria:**
- Given an optional comment, when a creation drawer opens, then it remains collapsed until expanded and saving retains the existing payload.
- Given any supported creation mode, when a marker is typed and selected, then the shared input inserts it without submitting or closing the drawer.
- Given users A and B, when either requests suggestions or changes session, then only that authenticated user's values can appear.
- Given a slow or unavailable lookup, when the user continues typing or saves, then entered text and form usability remain intact.
- Given supported desktop/mobile widths and EN/RU, when suggestions open, then rows remain reachable and readable without clipping or overflow.

## Spec Change Log

- 2026-11-07: Independent review identified Shift+Tab interception, unbounded popup height and historical uppercase-key reuse failure. Patched keyboard modifiers/refocus/highlight bounds, available-space scrolling, and existing-key matching without changing parser/storage semantics. Added create/replacement, IME, navigation, short-viewport and actual saved-comment regressions. Preserve owner predicates, five-result ranking and free-text behavior.

## Design Notes

Writes persist lowercased keys and links despite older parse-on-read documentation. Reuse this model without changing it. Links provide ranking signals, not comment semantics. No catalog read API exists. Inspect installed AutoComplete/Mentions APIs; use a controlled popup if required to preserve caret and literal-space semantics.

## Verification

- `dotnet test inex.Services.Tests/`, then focused endpoint tests and `dotnet test inex.sln`; `dotnet build inex.sln`.
- Verify generated EF SQL/translation and EXPLAIN through read-only MySQL MCP; no writes or migrations.
- Frontend focused tests, full `npm test`, `npm run build`, `npm run lint`.
- Run feature visual QA, inspect screenshots, verify its summary and run `npm run visual-qa:verify`; distinguish unrelated stale baseline failures.
- `git diff --check` and independent review of resulting diff after visual evidence exists.


## Implementation Verification

- Added authenticated owner-only, cancellable `GET /api/transactions/comment-suggestions?type=tag|ref&query=...`. The catalog query keeps filtering, case-insensitive distinct grouping, prefix/substring ranking, usage/latest-use/key ordering and five-result limit in MySQL. Historical catalog keys remain eligible; malformed foreign-owner links do not rank results. Existing comment parsing, persistence and financial payloads are unchanged.
- Shared creation comment supports caret-aware whole-token replacement, both marker types, preserved surrounding text, Cyrillic/punctuation/literal-space semantics, 200ms debounce, localized loading/empty/unavailable states, IME composition, keyboard Enter/Tab/arrows/Escape and pointer/touch selection. Correction reasons preserve their 255-character limit; overlong replacements are excluded. Editing and filters remain unchanged.
- RTK Query cache keys include authenticated user, marker type and normalized search. Cache retention is 60 seconds after the last subscriber; successful transaction-dependent mutations invalidate suggestions. Identity checks before/after transport and current-query-only rendering exclude obsolete responses.
- Backend: focused endpoint tests PASS7; service tests PASS149; full `dotnet test inex.sln --no-restore` PASS375 with one existing opt-in MySQL test skipped; `dotnet build inex.sln --no-restore` PASS, zero warnings/errors on final build. Integration endpoint tests use EF InMemory and do not prove MySQL.
- MySQL: provider `ToQueryString()` translation, read-only SELECT and EXPLAIN passed against owner ID zero; existing owner indexes were selected. Four SELECT-only synthetic CTE fixture checks verified prefix/usage/latest ordering, owner/type isolation, historical keys, empty search and preserved uppercase keys. No DB writes or migrations. The MCP SQL parser needed extra parentheses around the first boolean ORDER BY expression in the submitted equivalent SQL. These checks do not establish performance at production scale.
- Frontend: final full suite PASS53 files/445 tests, including nine real autocomplete component tests. Build/typecheck and lint PASS. Existing Vite CJS/chunk-size, Ant addon, Router future-flag and jsdom pseudo-element warnings remain unrelated.
- Feature fixture QA PASS12/12, all API calls intercepted: 1440/1024/390/360px tag popup, Russian 360px references, empty/error states, keyboard and physical CDP touch selection, correction reason, 45-character markers at 360x480, keyboard scrolling and actual selected-comment save payload. Footer presence/clearance and popup dismissal are asserted. Inspected desktop, narrow Russian, 390px, touch, empty and correction screenshots. Summary: `docs/implementation/visual-qa/transaction-comment-autocomplete/qa-summary.json`. No overflow, clipped options, lost focus, drawer-close Escape or footer occlusion.
- Aggregate `npm run visual-qa:verify`: FAIL only because all ten unrelated canonical summaries exceed 24 hours; the feature summary has zero failures. `git diff --check` passes. Three independent reviewers completed; confirmed findings were patched. Acceptance follow-up found no remaining concrete blockers.
- Tooling follow-up proposed: document that browser `--version` doctor checks do not prove a headless CDP launch in the sandbox, and use CDP `Input.insertText` for selection-sensitive fixture interactions. Sandbox browser subprocesses failed before CDP; the authorized escalated isolated fixture run succeeded. Synthetic value setters changed text without reliable caret events, so the feature harness now uses native browser input.

## Suggested Review Order

- Follow the shared caret-aware field and keyboard boundaries.
  [TransactionCommentInput.tsx:8](../../inex/ClientApp/src/pages/Transactions/TransactionCommentInput.tsx#L8)

- Check token boundaries against existing literal-space parsing.
  [comment-autocomplete.ts:10](../../inex/ClientApp/src/pages/Transactions/comment-autocomplete.ts#L10)

- Verify owner-only catalog access, ranking and bounded results.
  [TransactionCommentSuggestions.cs:7](../../inex.Services/Helpers/TransactionCommentSuggestions.cs#L7)

- Preserve historical catalog keys when saving selected values.
  [TransactionCommentMarkers.cs:48](../../inex.Services/Services/TransactionCommentMarkers.cs#L48)

- Check authenticated transport, user isolation and cache lifetime.
  [transactions-api.ts:219](../../inex/ClientApp/src/store/transactions/transactions-api.ts#L219)

- Review create-and-replace regressions for uppercase tags and references.
  [TransactionCommentSuggestionsTests.cs:81](../../inex.Tests/Transactions/TransactionCommentSuggestionsTests.cs#L81)

- Inspect trusted input, reduced viewport, touch and saved-payload verification.
  [transaction-comment-autocomplete.mjs:34](../../inex/ClientApp/visual-qa/transaction-comment-autocomplete.mjs#L34)
