# Story 10.3d: Frontend UX - Accounts Design Gap Remediation

Status: review

## Story

As an invited account holder,
I want the Accounts workspace to finish the balance-scanning and workflow details found in the design gap review,
so that account value, currency groups, empty states, and edit flows are trustworthy on desktop and mobile.

## Acceptance Criteria

1. Given populated accounts across multiple currencies, when `/accounts` renders grouped or flat mode, then currency groups and rows are sorted by absolute base-currency value with deterministic tie-breakers, and distribution/group/row surfaces show localized base-currency equivalents alongside native values and percentages.
2. Given active and disabled accounts render, when a user scans the account inventory, then disabled state remains visible, normal active rows do not repeat noisy active badges, and the toolbar shows visible count, total count, and active-only scope summary in EN/RU.
3. Given no accounts exist, when `/accounts` loads successfully, then a focused shared Accounts empty state renders with the add-account primary action and without unavailable hero metrics, inactive filter controls, or dead secondary actions.
4. Given scoped accounts exist but search returns no matches, when filter-empty renders, then hero currency context remains visible and only the list area shows localized filter-empty copy and clear-filter behavior.
5. Given an account row is expanded or the create drawer opens, when edit/create UI renders, then the inline edit panel includes a compact account snapshot where data exists, the create drawer has a localized Cancel action that returns focus, and unsupported design actions are omitted or documented as deferred rather than shown as dead controls.
6. Given the story is complete, when `npm run build`, `npm run lint`, and visual QA run from `inex/ClientApp`, then all pass and screenshots cover grouped, flat, empty, filter-empty, drawer-open, expanded-row, 1440px, 1024px, 390px, and 360px states without overflow, clipped values, or bottom-nav occlusion.

## Tasks / Subtasks

- [x] Implement balance scan fidelity. (AC: 1, 2)
  - [x] Establish one base-currency display source using existing frontend data/contracts; do not fake equivalent values.
  - [x] Sort groups and rows by absolute base-currency value with stable tie-breakers.
  - [x] Add localized equivalent amounts to distribution, group headers, share cells, and balance sublines where data exists.
  - [x] Reduce row status noise so active rows do not all show repeated `Active` chips.
  - [x] Add inventory count and scope summary text.
- [x] Correct empty and filter-empty behavior. (AC: 3, 4)
  - [x] Short-circuit true first-use empty before hero/list chrome.
  - [x] Preserve hero context for filter-empty.
  - [x] Recapture or replace stale filter-empty visual evidence after implementation.
- [x] Finish edit and drawer parity without dead UI. (AC: 5)
  - [x] Add inline edit snapshot metrics that can be sourced from current account data.
  - [x] Add drawer Cancel behavior and focus return.
  - [x] Omit or document unsupported starting balance, update balance, view transactions, and bank-connect actions.
- [x] Validate build, lint, i18n, and visual QA. (AC: 6)
  - [x] Add EN/RU keys for new labels and state copy.
  - [x] Run `npm run build`.
  - [x] Run `npm run lint`.
  - [x] Capture required screenshots at desktop and mobile widths.

### Review Findings

- [x] [Review][Patch] Require complete account summary/base values before rendering net worth and distribution, and reject invalid exchange rates. [`inex/ClientApp/src/pages/Accounts.tsx`, `inex/ClientApp/src/pages/Accounts/accounts-utils.ts`]
- [x] [Review][Patch] Bump the locale resource version so newly added account locale keys are not hidden by cached translation JSON. [`inex/ClientApp/src/i18n.ts`]
- [x] [Post-Merge Review][Patch] Clamp the shared drawer to the viewport and refresh Accounts drawer-open 390px/360px visual QA evidence. [`inex/ClientApp/src/components/primitives/InExDrawer.tsx`, `docs/implementation/visual-qa/10-3d/`]
- [x] [Post-Merge Review][Patch] Show zero percent distribution shares for complete zero-balance currency groups instead of marking equivalents unavailable. [`inex/ClientApp/src/pages/Accounts/accounts-utils.ts`]
- [x] [Post-Merge Review][Patch] Distinguish incomplete equivalent data from complete zero totals so account rows and currency groups do not show false zero shares or unavailable zero-balance rows. [`inex/ClientApp/src/pages/Accounts.tsx`, `inex/ClientApp/src/pages/Accounts/accounts-utils.ts`]
- [x] [Post-Merge Review][Patch] Derive base currency only from profile/rate data so missing currency resolution shows unavailable states instead of inventing USD. [`inex/ClientApp/src/pages/Accounts.tsx`, `inex/ClientApp/src/pages/Accounts/accounts-utils.ts`]
- [x] [Post-Merge Review][Patch] Render complete zero-share currency distribution and group bars at 0% instead of a minimum-width sliver. [`inex/ClientApp/src/pages/Accounts.tsx`]
- [x] [Post-Merge Review][Patch] Keep focus recovery valid when the empty-state Add account opener unmounts after first account creation. [`inex/ClientApp/src/pages/Accounts.tsx`, `inex/ClientApp/src/pages/Accounts.empty-focus.test.tsx`, `docs/implementation/visual-qa/10-3d/qa-summary.json`]

## Dev Notes

### Source Gap Review

- Primary source: `docs/implementation/10-3a-accounts-design-implementation-gap-review.md`.
- Story 10.3a remains the base redesign story; this follow-up remediates accepted residuals from that review.
- MoM historical comparison, starting balance, update balance, view transactions, and bank-connect flows require product/API decisions and should not be invented here.

### Expected Files

- `inex/ClientApp/src/pages/Accounts.tsx`
- `inex/ClientApp/src/pages/Accounts/AccountCreateForm.tsx`
- `inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx`
- `inex/ClientApp/src/pages/Accounts/accounts.css`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`

### Guardrails

- Keep account API payloads unchanged.
- Do not add a backend endpoint for equivalent balances or starting balances in this story.
- Do not show dead controls. If a design action lacks a real target workflow, omit it or document it as deferred.
- Coordinate locale-file edits with Stories 10.3e, 10.3f, 10.5a, and 10.5b.

## References

- `docs/planning/epics.md`
- `docs/implementation/10-3a-frontend-ux-accounts-management-redesign.md`
- `docs/implementation/10-3a-accounts-design-implementation-gap-review.md`
- `docs/design/Accounts.jsx`
- `docs/design/docs/design-implementation-guide.md`
- `docs/implementation/visual-qa/10-3a/`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex with BMad dev-story Worker A (Accounts), integrated BMad code-review layers, and round-5 post-merge review follow-up.

### Debug Log References

- 2026-06-05: Story created from BMad design-gap review and dedicated subagent synthesis.
- 2026-06-05: `npm run build` passed from `inex/ClientApp` after Windows sandbox `spawn EPERM` rerun with escalation.
- 2026-06-05: `npm run lint` passed from `inex/ClientApp`.
- 2026-06-05: `npm run test` passed from `inex/ClientApp` with 12 files and 50 tests.
- 2026-06-05: Targeted visual QA refreshed in `docs/implementation/visual-qa/10-3d/qa-summary.json`; no horizontal overflow in grouped, flat, expanded, empty, filter-empty, drawer-open, 390px, and 360px states.
- 2026-06-05: BMad integrated code review completed; actionable Accounts findings fixed.
- 2026-06-05: Post-merge BMad review found the mobile drawer screenshot captured an offscreen transition state; shared drawer width was clamped and Accounts drawer-open 390px/360px evidence was refreshed with `drawerWithinViewport: true`.
- 2026-06-05: Second post-merge BMad edge-case review found complete zero-balance currency groups rendered unavailable shares; utility logic now returns `0` shares with focused Vitest coverage.
- 2026-06-05: Third post-merge BMad review found zero-balance row shares and incomplete equivalent data could be confused; row and group share inputs now use `null` only for incomplete data and `0` for complete zero totals.
- 2026-06-05: Round-3 route smoke confirmed `/accounts` renders Cash wallet, PLN base equivalents, no horizontal overflow, and updated evidence in `docs/implementation/visual-qa/10-3d/qa-summary.json`.
- 2026-06-05: Fourth post-merge BMad review found profile/rate lookup failures could still imply a USD base and complete zero-share bars rendered visible slivers; fixes were applied with focused Vitest and route smoke evidence.
- 2026-06-06: Fifth post-merge BMad review found first account creation from the empty state could unmount the stored focus target; focus recovery now falls back to the mounted Add account trigger, with round-5 390px route-smoke evidence and executable RTL coverage recorded.

### Completion Notes List

- Added base-currency account display helpers, deterministic sorting, currency grouping, base equivalents, and complete-data guards.
- Updated Accounts hero/list empty handling so true first-use empty skips unavailable metrics while filter-empty keeps the hero context visible.
- Added inline account snapshot metrics and create-drawer Cancel/focus-return behavior while omitting unsupported dead actions.
- Added EN/RU locale copy and visual QA evidence for required desktop/mobile states.
- Follow-up fixed shared drawer viewport clamping and refreshed Accounts drawer-open visual QA at 390px and 360px.
- Second follow-up fixed zero-balance currency group share handling.
- Third follow-up fixed zero-balance row shares while preventing false zero shares when any scoped account lacks summary/rate data.
- Accounts QA summary now includes round-3 smoke evidence for complete versus incomplete equivalent share handling.
- Fourth follow-up removes the final USD fallback path for Accounts base currency and renders complete zero-balance distribution/group bars at true 0% width.
- Accounts QA summary now includes round-4 smoke evidence for missing base-currency unavailable states and zero-width zero-share bars.
- Fifth follow-up keeps focus recovery valid after creating the first account from the empty state, records round-5 no-overflow smoke evidence, and adds executable RTL coverage for the unmounted empty-state opener path.

### File List

- `inex/ClientApp/src/pages/Accounts.tsx`
- `inex/ClientApp/src/pages/Accounts.empty-focus.test.tsx`
- `inex/ClientApp/src/pages/Accounts/AccountCreateForm.tsx`
- `inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx`
- `inex/ClientApp/src/pages/Accounts/accounts.css`
- `inex/ClientApp/src/pages/Accounts/accounts-utils.ts`
- `inex/ClientApp/src/pages/Accounts/accounts-utils.test.ts`
- `inex/ClientApp/src/components/primitives/InExDrawer.tsx`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`
- `inex/ClientApp/src/i18n.ts`
- `docs/implementation/visual-qa/10-3d/`

### Change Log

- 2026-06-05: Created ready-for-dev follow-up story.
- 2026-06-05: Implemented Accounts design gap remediation, review fixes, tests, locale updates, and refreshed visual QA evidence.
- 2026-06-05: Applied post-merge drawer viewport fix and refreshed Accounts drawer visual QA evidence.
- 2026-06-05: Applied second post-merge zero-balance share fix with focused utility test coverage.
- 2026-06-05: Applied third post-merge account row/group share distinction with focused utility test coverage.
- 2026-06-05: Added round-3 Accounts route-smoke evidence.
- 2026-06-05: Applied fourth post-merge Accounts base-currency fallback and zero-share bar fixes with focused utility tests and route smoke.
- 2026-06-06: Applied fifth post-merge Accounts empty-state create focus fallback with route-smoke evidence and executable focus regression coverage.
