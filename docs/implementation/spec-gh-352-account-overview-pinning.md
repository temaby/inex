---
title: 'Configure and pin the transaction account overview'
type: 'feature'
created: '2026-09-06'
status: 'done'
baseline_commit: '853edb71d19e9026c7b5389a3e0af9adf79a5f3c'
context:
  - 'AGENTS.md'
  - 'inex/ClientApp/AGENTS.md'
  - 'docs/project-context.md'
  - 'docs/planning/transactions-ux-design-specification.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Users cannot choose which accounts appear in the Transactions account overview, cannot see a trustworthy total for that selected set, and cannot keep the overview visible alongside their desktop ledger.

**Approach:** Persist an account-level visibility setting through the Accounts API, show only enabled and visible accounts in the overview and its total, and persist a per-browser pin preference that produces one responsive overview presentation.

## Boundaries & Constraints

**Always:** Preserve account ownership enforcement and existing Accounts API compatibility. Add the new account field end-to-end with a migration whose default preserves visibility for existing accounts. Derive displayed accounts by `isEnabled` and the new persisted setting before querying or totaling balances. Keep every new string localized in English and Russian. Preserve authenticated `apiClient`/RTK Query behavior, native balance display, accessible keyboard controls, and transparent missing-rate treatment; never call an external rate provider. Persist only the presentation pin preference locally and safely tolerate unavailable or malformed browser storage.

**Ask First:** Changing the account visibility default for existing accounts, moving the pin preference to server storage, changing account ownership/authorization semantics, or changing transaction URL filter semantics.

**Never:** Do not use the Transactions filter drawer to configure overview membership, show hidden accounts in a query or total, present a partial currency conversion as complete, duplicate the expanded account list while the desktop rail is shown, or introduce page-level mobile overflow or bottom-navigation occlusion.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Account visibility | Account is created or edited with overview visibility on/off | Setting is persisted and subsequent Transactions loads include/exclude that enabled account | Existing validation and ownership paths apply |
| Existing account | Migration is applied to rows without the new field | Account remains visible by default | Migration default is explicit |
| Pinned desktop | Pin preference is true at a desktop rail viewport | Exactly one expanded sticky right rail is shown with an Accounts link | No inline duplicate |
| Pinned mobile | Pin preference is true below the rail breakpoint | Expanded inline overview appears above the ledger and may be collapsed | No desktop rail |
| Total conversion | Visible accounts contain a non-base balance without a cached usable rate | Total is unavailable rather than partial; native balances remain usable | Explain the unavailable conversion accessibly |
| Stale preference | Browser storage is missing, malformed, or unavailable | Pin defaults safely and the current session remains usable | No render failure |

</frozen-after-approval>

## Code Map

- `inex.Data/Models/Account.cs`, `inex.Data/Configurations/AccountConfiguration.cs`, and `inex.Data/Migrations/*` -- persist the visibility flag and preserve existing records through an explicit migration default.
- `inex.Services/Models/Records/Account/*`, `inex.Services/Models/Mappers/AccountMapper.cs`, and account service/API tests -- carry the field through create, update, and response contracts without weakening ownership boundaries.
- `inex/ClientApp/src/store/accounts/accounts-api.ts` -- model the added account field and preserve account-query invalidation.
- `inex/ClientApp/src/pages/Accounts/AccountCreateForm.tsx` and `AccountEditForm.tsx` -- expose the localized setting in both account flows.
- `inex/ClientApp/src/pages/Transactions.tsx` and `Transactions/AccountBalancesCompanion.tsx` -- filter the overview source, retain a safe pin preference, and select inline or desktop-rail presentation.
- `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts` and tests -- calculate an all-or-unavailable base-currency total from the visible accounts and cached rates.
- `inex/ClientApp/src/pages/Transactions/transactions-ledger.css`, locale files, route/component tests, and `visual-qa/transactions.mjs` -- preserve accessibility, responsive layout, and fixture visual evidence.

## Tasks & Acceptance

**Execution:**
- [x] Account entity, configuration, migration, request/response records, mapper, and backend tests -- add an explicit visibility field with default `true`, preserve the current-user ownership path, and verify the serialized contract.
- [x] Account RTK Query model and create/edit forms with focused tests -- submit, hydrate, modify, and localize the visibility setting without regressing existing account updates.
- [x] Transactions route and balance companion with focused tests -- query and render only enabled visible accounts; restore keyboard-accessible Pin/Unpin, safe local preference persistence, collapse state, desktop sticky rail, mobile inline state, and Accounts link.
- [x] Conversion helper and tests -- total exactly the rendered account set only when all required cached conversions are usable; otherwise render the accessible unavailable state.
- [x] Styles, EN/RU resources, and fixture visual QA -- verify long names and amounts at 1440px, 1024px, 390px, and 360px with no overflow, clipping, rail duplication, or mobile-navigation occlusion.

**Acceptance Criteria:**
- Given an account is created or edited, when its Transactions visibility is saved, then a later Transactions load includes it only when it is enabled and visibility is true.
- Given visible accounts have complete cached conversions, when their overview renders, then `TOTAL` is the base-currency sum of all and only those visible accounts.
- Given the pin action is used by keyboard or pointer, when its state changes, then its accessible name and pressed state describe Pin or Unpin and the preference survives a reload when storage is available.
- Given a pinned overview at desktop width, when the ledger scrolls, then exactly one expanded sticky right rail remains visible and contains a link to Accounts.
- Given a pinned overview at mobile width, when the route renders, then no rail exists, the overview appears expanded above the ledger, and its collapse action remains usable.

## Design Notes

The account visibility setting is account data and belongs in the account contract; the pin state is a browser-specific presentation preference. The overview is a single component rendered either inline or in the rail, never both. Its total is intentionally all-or-unavailable so users cannot mistake a partial converted total for a complete account position.

## Verification

**Commands:**
- `dotnet test inex.Services.Tests/` -- expected: account contract/mapping coverage passes before broader backend checks.
- `dotnet build inex.sln` and `dotnet test inex.sln` -- expected: solution builds and backend/integration suites pass.
- `npm test -- --run src/pages/Accounts src/pages/Transactions` (from `inex/ClientApp`) -- expected: relevant form, overview, conversion, and accessibility coverage passes.
- `npm run lint` and `npm run build` (from `inex/ClientApp`) -- expected: lint, strict TypeScript, and production build pass.
- `npm run visual-qa:transactions` then `npm run visual-qa:verify` (from `inex/ClientApp`) -- expected: refreshed fixture evidence and PASS summary for desktop/mobile overview states.

## Suggested Review Order

**Transaction overview composition**

- Start with the route-level filtering, pin persistence, and responsive presentation.
  [`Transactions.tsx:118`](../../inex/ClientApp/src/pages/Transactions.tsx#L118)

- Inspect the single inline/rail companion and its accessible controls and states.
  [`AccountBalancesCompanion.tsx:10`](../../inex/ClientApp/src/pages/Transactions/AccountBalancesCompanion.tsx#L10)

- Verify all-or-unavailable conversion behavior for the rendered account set.
  [`transaction-ledger-utils.ts:228`](../../inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts#L228)

**Account contract and persistence**

- Review the explicit MySQL-safe default that preserves existing account visibility.
  [`20260906163000_AddAccountTransactionsOverviewVisibility.cs:10`](../../inex.Data/Migrations/20260906163000_AddAccountTransactionsOverviewVisibility.cs#L10)

- Check create/update mapping, including legacy updates that omit the new field.
  [`AccountMapper.cs:8`](../../inex.Services/Models/Mappers/AccountMapper.cs#L8)

- Confirm the edit flow labels, hydrates, and submits the account setting.
  [`AccountEditForm.tsx:202`](../../inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx#L202)

**Evidence and regression coverage**

- Use the focused form and overview tests to verify behavior and accessible names.
  [`AccountVisibilityForms.test.tsx:64`](../../inex/ClientApp/src/pages/Accounts/AccountVisibilityForms.test.tsx#L64)

- Review responsive fixture states, hidden-account query exclusion, and no-overflow checks.
  [`transactions.mjs:193`](../../inex/ClientApp/visual-qa/transactions.mjs#L193)
