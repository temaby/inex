# Story 10.1d: Frontend UX - Shell Locale Fixture And Visual QA Policy

Status: review

## Story

As an invited account holder,
I want the audited Epic 10 pages to share one explicit shell, locale, route, and visual QA data policy,
so that later page-alignment work does not keep re-litigating Dashboard navigation, profile/sign-out controls, language, fixture data, or landing-route behavior.

## Acceptance Criteria

1. Given the audited management-page mockups use five navigation items, when the shell policy is documented and implemented, then the product decision for Dashboard in desktop and mobile authenticated navigation is explicit: either five-item mockup IA or six-item production IA with Dashboard as an accepted deviation.
2. Given the mockup root renders Transactions but production currently redirects `/` to `/dashboard`, when the authenticated landing-route policy is finalized, then `/`, post-login, post-registration, protected-route return behavior, and direct route access have one documented target and regression checklist.
3. Given the mockups show a multicolor InEx mark and a single profile pill while production shows a square mark, profile pill, and sign-out icon, when shell account controls are finalized, then profile access and logout remain keyboard reachable on desktop and mobile, and any visible deviation from the mockup is documented.
4. Given the audited browser session rendered Russian while mockups are English, when visual QA policy is finalized, then acceptance specifies English baseline, user-selected locale, or separate per-locale baselines, including how to reset or force the baseline during visual QA.
5. Given audits compare April 2026 mockup fixtures against live/user data, when data policy is finalized, then visual QA states define whether to use fixed mockup fixtures or live data tolerance for Transactions, Accounts, Categories, and Budgets.
6. Given this story is complete, when `docs/implementation/10-6-frontend-ux-visual-qa-baseline-and-responsive-regression-checklist.md` is reviewed, then it references the chosen shell, locale, route, fixture, and accepted-deviation policies before final QA can start.

## Tasks / Subtasks

- [x] Resolve authenticated shell IA and route policy. (AC: 1, 2)
  - [x] Decide whether Dashboard remains in audited management-page top and bottom nav.
  - [x] Decide whether authenticated `/` continues to redirect to `/dashboard` or follows the mockup's Transactions-first behavior.
  - [x] Document expected post-login and post-registration route behavior for Story 10.5b.
  - [x] Update route/shell acceptance notes without changing implementation in this story if a separate dev story will own code changes.
- [x] Resolve branding and account-control policy. (AC: 3)
  - [x] Decide whether production keeps the separate sign-out icon or moves logout behind the profile pill.
  - [x] Preserve profile access and logout keyboard/mobile reachability in the policy.
  - [x] Document the accepted brand-mark treatment or required shell follow-up.
- [x] Lock visual QA locale baseline. (AC: 4)
  - [x] Choose English-only mockup baseline, user-selected locale baseline, or per-locale baselines.
  - [x] Document how QA agents should set/reset i18n state and Ant Design locale.
  - [x] Add long-label RU verification as a layout stress test even if English is the primary baseline.
- [x] Lock fixture/live-data visual QA policy. (AC: 5)
  - [x] Decide whether page parity uses fixed April 2026 mockup fixtures, seeded test data, or live-data tolerance.
  - [x] Define page-specific route/query/period/currency requirements for Transactions, Accounts, Categories, and Budgets.
  - [x] Record which value differences are allowed and which are visual regressions.
- [x] Update dependent planning references. (AC: 6)
  - [x] Update Story 10.6 prerequisites and policy notes.
  - [x] Add forward references to Story 10.5a and Story 10.5b for profile/sign-out and landing-route dependencies.
  - [x] Keep completed Dev Agent Records unchanged.
- [x] Review Follow-ups (AI): address PR #181 requested changes.
  - [x] Replace missing-evidence risk by restoring the tracked `docs/ui-audit/*` evidence set and sprint-change proposal from supervisor commit `58e5892`.
  - [x] Restore successor story tracking for 10.1e, 10.2b, 10.3g, 10.3h, and 10.3i in implementation docs, sprint status, and Epic 10 planning.
  - [x] Expand route policy for authenticated `/`, post-login, post-registration, protected-route fallback, and direct route access in 10.1d, 10.5b, and 10.6.

## Dev Notes

### Audit Evidence

- The roadmap identifies shared shell IA, branding/account controls, locale, and visual QA fixture policy as prerequisites before page-local work. [Source: `docs/ui-audit/implementation-roadmap.md`]
- Transactions finding 1 confirms mockup root/Transactions-first behavior conflicts with production `/dashboard` default and Dashboard nav. [Source: `docs/ui-audit/transactions.md`]
- Accounts findings 1, 2, 3, 4, 11, and 16 confirm Dashboard nav, route model, sign-out/profile controls, locale, fixture data, and mobile bottom-nav mismatch. [Source: `docs/ui-audit/accounts.md`]
- Categories findings C01, C02, C03, C04, C20 confirm route/nav, branding/account controls, locale, period/data, and mobile shell mismatch. [Source: `docs/ui-audit/categories.md`]
- Budgets findings 1, 2, 6, 7, 25, and 26 confirm shell, brand/logout, route/default month, currency/data fixture, locale, and mobile hierarchy mismatch. [Source: `docs/ui-audit/budgets.md`]

### Likely Impacted Source Files For Later Dev Story

- `inex/ClientApp/src/App.tsx`
- `inex/ClientApp/src/layouts/AppShell.tsx`
- `inex/ClientApp/src/layouts/AppShell.css`
- `inex/ClientApp/src/i18n.ts`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`
- Visual QA setup and seeded/mock API fixture setup if adopted

### Dependencies And Sequencing

- Prerequisites: Stories 10.1a, 10.1b, 10.1c, and 10.4 are done in current sprint status.
- Must complete before 10.1e, 10.2b, 10.3g, 10.3h, 10.3i, 10.5a, 10.5b, and 10.6 implementation.
- Story 10.5b depends on this story for final post-login/post-registration redirect target.
- Story 10.5a depends on this story for profile/logout shell control expectations.
- Successor story files restored in this PR from supervisor commit `58e5892`: 10.1e, 10.2b, 10.3g, 10.3h, and 10.3i. These are tracked as `ready-for-dev` in `docs/implementation/sprint-status.yaml`.

### Resolved Policy Decisions

- Dashboard remains in the authenticated desktop and mobile navigation as an accepted production IA deviation from the five-item mockup nav.
- Authenticated `/` redirects to `/dashboard`.
- Successful login lands on `/dashboard`.
- Successful registration must land on `/dashboard`; the current `/transactions` registration redirect is a known mismatch for Story 10.5b to correct.
- Protected-route return behavior remains the current production fallback: unauthenticated direct access to a protected route redirects to `/login` without preserving a return target, and successful auth lands on `/dashboard`. Do not introduce implicit return-to behavior unless a later story explicitly owns route-state/query handling and regression coverage.
- Authenticated direct route access preserves the requested route: direct `/dashboard`, `/transactions`, `/accounts`, `/categories`, `/budgets`, `/reports`, report drill-down routes, and `/profile` render their matched protected route.
- English is the visual parity baseline. RU remains a long-label/responsive stress test, not the primary mockup-comparison baseline.
- Visual QA may use whichever data mode is easier for the implementing agent: fixed fixture data or live seeded user data. Each QA row must label `dataMode: fixture` or `dataMode: live-seed`; exact value parity is required only in fixture mode.
- The separate visible sign-out icon may remain in the app shell as an accepted production deviation, provided profile access and logout stay keyboard reachable on desktop and mobile.
- Mockups are the default source of truth for visual alignment. Any production enhancement that diverges from a mockup must be documented as an accepted deviation before the implementation agent treats it as intentional.

### Guardrails

- Do not implement UI code in this story-prep pass.
- Do not remove or rewrite completed story Dev Agent Records.
- Do not treat Russian copy as a primary parity defect; English is the visual parity baseline and RU is a responsive stress test.
- Do not treat live-data value differences as visual defects unless the QA row is explicitly running in `dataMode: fixture`.
- Do not keep production enhancements that diverge from the mockup unless they are documented as accepted deviations.
- Do not commit credentials, browser storage, or test-account secrets while documenting fixture policy.

### Verification Checklist

- [x] Policy explicitly answers Dashboard in nav: keep, remove, or accepted deviation.
- [x] Policy explicitly answers authenticated `/` and auth-success landing route.
- [x] Policy explicitly answers shell profile/sign-out treatment.
- [x] Policy explicitly answers visual QA locale baseline and RU stress-test handling.
- [x] Policy explicitly answers fixture/live-data baseline for all four audited pages.
- [x] 10.5a, 10.5b, and 10.6 forward references are updated.
- [x] No implementation source files are changed by story prep.

## Open Decisions

- None for shell IA, default route, locale baseline, sign-out placement, data-mode preference, or default mockup authority. Page-local stories may still document accepted deviations where implementing the mockup exactly would be infeasible or harmful.

## References

- `docs/ui-audit/implementation-roadmap.md`
- `docs/ui-audit/transactions.md`
- `docs/ui-audit/accounts.md`
- `docs/ui-audit/categories.md`
- `docs/ui-audit/budgets.md`
- `docs/ui-audit/index.md`
- `docs/planning/sprint-change-proposal-2026-06-07-epic-10-mockup-alignment.md`
- `docs/planning/epics.md`
- `docs/implementation/sprint-status.yaml`
- `docs/implementation/10-1c-frontend-ux-app-shell-and-navigation.md`
- `docs/implementation/10-4-frontend-ux-reports-hub-dashboard-landing-and-drill-down-chrome.md`
- `docs/implementation/10-1e-frontend-ux-shared-mockup-alignment-primitives.md`
- `docs/implementation/10-2b-frontend-ux-transactions-mockup-alignment-delta.md`
- `docs/implementation/10-3g-frontend-ux-accounts-mockup-alignment-delta.md`
- `docs/implementation/10-3h-frontend-ux-categories-mockup-alignment-delta.md`
- `docs/implementation/10-3i-frontend-ux-budgets-mockup-alignment-delta.md`
- `docs/implementation/10-5a-frontend-ux-profile-and-settings-redesign.md`
- `docs/implementation/10-5b-frontend-ux-login-and-registration-redesign.md`
- `docs/implementation/10-6-frontend-ux-visual-qa-baseline-and-responsive-regression-checklist.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-07: Required branch did not contain the 10.1d story file; restored the exact story document content from `docs/epic-10-mockup-alignment-integration` before updating permitted BMad record sections.
- 2026-06-07: PR #181 review identified missing traceability because `docs/ui-audit/*` and the sprint-change proposal were absent from the PR base.
- 2026-06-07: Restored the referenced `docs/ui-audit/*` evidence docs and `docs/planning/sprint-change-proposal-2026-06-07-epic-10-mockup-alignment.md` from supervisor commit `58e5892`.
- 2026-06-07: Restored successor story files 10.1e, 10.2b, 10.3g, 10.3h, and 10.3i from supervisor commit `58e5892` and added corresponding sprint-status entries.
- 2026-06-07: No UI source implementation was performed.
- 2026-06-07: Verification commands run: `git diff --name-only`, `rg -n "10-1d|dataMode|Locale baseline|Shell and accepted-deviation|Story 10.1d" docs/implementation docs/planning/epics.md`, and `git diff --name-only -- inex/ClientApp`.
- 2026-06-07: Regression command run: `dotnet test inex.sln` passed with 172 tests; existing warnings were unrelated XML documentation/interface hiding warnings.
- 2026-06-07: Review-fix verification run: referenced path existence check passed; successor story ID search passed; `git diff --name-only -- inex/ClientApp` returned no files; `dotnet test inex.sln` passed with 172 tests.

### Implementation Plan

- Record Story 10.1d policy decisions in downstream planning and QA docs instead of changing React source.
- Update Story 10.6 so final visual QA has explicit prerequisites for Dashboard nav, `/dashboard` routing, account controls, English/RU locale handling, fixture/live-seed data mode, and accepted deviations.
- Add forward references in Stories 10.5a and 10.5b so profile/sign-out and auth redirect work follows the resolved policy.
- Update Epic 10 planning so 10.1d appears in sequence and 10.6 depends on the policy baseline.
- Address PR #181 findings by restoring missing evidence/successor docs from `58e5892` and expanding route-policy wording without changing UI source.

### Completion Notes List

- Story created from mockup audit roadmap via BMad create-story workflow.
- Correct-course proposal source: `docs/planning/sprint-change-proposal-2026-06-07-epic-10-mockup-alignment.md`.
- Policy decisions resolved from user input on 2026-06-07: keep Dashboard, use `/dashboard` as authenticated default, use English as visual baseline, allow easiest data mode with explicit labeling, keep visible sign-out icon, and treat mockups as the default source of truth.
- Added Story 10.6 policy gate for Dashboard navigation, `/dashboard` landing behavior, profile/sign-out accepted deviation, English parity baseline, RU stress testing, and `dataMode` row labeling.
- Added 10.5a forward guidance that profile/settings must preserve the accepted profile pill plus separate sign-out shell policy.
- Added 10.5b forward guidance that login and registration success targets are `/dashboard`, not Transactions-first mockup behavior.
- Updated Epic 10 planning to include Story 10.1d in the sequence and Story 10.6 dependency chain.
- Confirmed no `inex/ClientApp` implementation source files were changed.
- Addressed PR #181 P1 by restoring cited audit evidence and sprint proposal docs from supervisor commit `58e5892`, plus `.gitignore` tracking for `docs/ui-audit`.
- Addressed PR #181 P2 successor tracking by restoring 10.1e, 10.2b, 10.3g, 10.3h, and 10.3i story files and sprint-status/planning entries.
- Addressed PR #181 P2 route-policy specificity by documenting authenticated `/`, login, registration, protected-route fallback, and authenticated direct-route behavior.

### File List

- `.gitignore`
- `docs/implementation/10-1d-frontend-ux-shell-locale-fixture-and-visual-qa-policy.md`
- `docs/implementation/10-1e-frontend-ux-shared-mockup-alignment-primitives.md`
- `docs/implementation/10-2b-frontend-ux-transactions-mockup-alignment-delta.md`
- `docs/implementation/10-3g-frontend-ux-accounts-mockup-alignment-delta.md`
- `docs/implementation/10-3h-frontend-ux-categories-mockup-alignment-delta.md`
- `docs/implementation/10-3i-frontend-ux-budgets-mockup-alignment-delta.md`
- `docs/implementation/10-5a-frontend-ux-profile-and-settings-redesign.md`
- `docs/implementation/10-5b-frontend-ux-login-and-registration-redesign.md`
- `docs/implementation/10-6-frontend-ux-visual-qa-baseline-and-responsive-regression-checklist.md`
- `docs/implementation/sprint-status.yaml`
- `docs/planning/epics.md`
- `docs/planning/sprint-change-proposal-2026-06-07-epic-10-mockup-alignment.md`
- `docs/ui-audit/accounts.md`
- `docs/ui-audit/budgets.md`
- `docs/ui-audit/categories.md`
- `docs/ui-audit/implementation-roadmap.md`
- `docs/ui-audit/index.md`
- `docs/ui-audit/transactions.md`

## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-06-07 | 1.0 | Completed policy documentation, downstream story references, Epic 10 planning updates, verification notes, and sprint status for Story 10.1d. | GPT-5 Codex |
| 2026-06-07 | 1.1 | Addressed PR #181 requested changes for traceability, successor story tracking, and explicit route-policy coverage. | GPT-5 Codex |
