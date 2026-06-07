# Sprint Change Proposal: Epic 10 Mockup Alignment

Date: 2026-06-07

## 1. Issue Summary

The mockup audit roadmap and four page audits found unresolved Epic 10 gaps after the initial redesign and gap-remediation stories were marked done. The trigger is the tracked audit set in `docs/ui-audit/implementation-roadmap.md`, `docs/ui-audit/transactions.md`, `docs/ui-audit/accounts.md`, `docs/ui-audit/categories.md`, and `docs/ui-audit/budgets.md`.

Core problem: final Epic 10 visual QA would currently compare against unclear contracts. The audits show repeated shared mismatches around authenticated shell IA, Dashboard versus five-item mockup navigation, authenticated landing route, profile/sign-out controls, locale baseline, live data versus mockup fixture data, shared toolbar/list/drawer primitives, compact money display, and filter-empty behavior. Page-local mismatches remain for Transactions, Accounts, Categories, and Budgets.

Evidence:

- `docs/ui-audit/implementation-roadmap.md` recommends splitting the work into shared prerequisites, shared primitives, page-local alignment, documentation, and final verification.
- `docs/ui-audit/transactions.md` records 16 confirmed mismatches, including shell/route, KPI scope, drawer/form, toolbar, and no-match state gaps.
- `docs/ui-audit/accounts.md` records 18 confirmed mismatches, including shell/route, locale/data fixture, hero, toolbar labels, headers, compact balances, row density, and state coverage gaps.
- `docs/ui-audit/categories.md` records 20 confirmed mismatches, including shell/route, locale/period/data policy, page-head action placement, panel composition, row density, add drawer, by-spend mode, expanded-row actions, and mobile hierarchy gaps.
- `docs/ui-audit/budgets.md` records 26 confirmed mismatches, including shell/header actions, hero density, currency/fixture policy, list toolbar, view/sort controls, table schema, row density, remaining semantics, and mobile hierarchy gaps.

## 2. Impact Analysis

Epic impact:

- Epic 10 can still be completed, but the execution order needs additional ready-for-dev stories before final QA.
- Completed story history from 10.1a through 10.4 and the done page stories must be preserved. The new stories are additive follow-up planning gates, not rewrites of old Dev Agent Records.
- Story 10.6 remains blocked until these new alignment stories and 10.5a/10.5b are done.

Story impact:

- Add shared prerequisite stories 10.1d and 10.1e.
- Add page-local delta stories 10.2b, 10.3g, 10.3h, and 10.3i.
- Update 10.5a and 10.5b only to reference the shell/profile/login/landing-route decisions introduced by 10.1d.
- Update 10.6 so final QA depends on the new audit-alignment stories and uses the documented locale/fixture/live-data policy.

Artifact conflicts:

- `docs/planning/epics.md` still describes the old Epic 10 sequence and must include the new additive stories and dependency order.
- `docs/implementation/sprint-status.yaml` must track the new stories as `ready-for-dev` and keep 10.6 `blocked`.
- `.gitignore` previously ignored `docs/ui-audit`; the audit source documents need a tracked exception so future agents have stable references.

Technical impact:

- This proposal does not implement UI code.
- Future implementation stories will touch `App.tsx`, `AppShell`, EN/RU locale files, shared primitives, page components, page CSS, and visual QA setup, but those changes are intentionally deferred to later `bmad-dev-story` work.

## 3. Recommended Approach

Recommended path: Direct Adjustment.

Add new stories inside Epic 10 and make them prerequisites for 10.5a/10.5b where shell/auth route behavior can be affected, and for 10.6 as final QA blockers. Do not roll back completed stories. Do not run a broad one-pass UI rewrite.

Rationale:

- The audit findings are concrete and scoped enough for additive story work.
- Rollback would erase useful completed page work and increase merge risk without clarifying the design contract.
- MVP scope does not need reduction; the change is a planning/backlog correction inside the existing Epic 10 UX scope.

Effort estimate: medium-high.

Risk level: medium. The highest risk is shared-file contention across `App.tsx`, `AppShell`, locale files, shared primitives, and page CSS. The new story split reduces that risk by sequencing shell/policy and primitive stories before page-local deltas.

Resolved policy decisions from 2026-06-07:

- Keep Dashboard in authenticated desktop and mobile navigation as an accepted production IA deviation.
- Keep `/dashboard` as the authenticated default after `/`, login, and registration.
- Use English as the visual parity baseline; use RU only as a responsive long-label stress test.
- Allow whichever data mode is easiest for implementation/QA, but label each row as `dataMode: fixture` or `dataMode: live-seed`; require exact value parity only in fixture mode.
- Keep the visible shell sign-out icon as an accepted production deviation.
- Treat mockups as the default source of truth; document any other production enhancement that diverges from a mockup as an accepted deviation before implementation or QA treats it as intentional.

## 4. Detailed Change Proposals

Stories to add:

- `10-1d-frontend-ux-shell-locale-fixture-and-visual-qa-policy.md`: shell IA, Dashboard versus five-item mockup nav, authenticated landing route, profile/sign-out controls, locale baseline, and mockup fixture/live-data policy.
- `10-1e-frontend-ux-shared-mockup-alignment-primitives.md`: labeled segmented controls, compact search fields, list/table panel composition, column headers, compact money display, drawer/form conventions, and split filter-empty versus rich empty/error states.
- `10-2b-frontend-ux-transactions-mockup-alignment-delta.md`: unresolved Transactions mismatches from the Transactions audit and roadmap section 3.1.
- `10-3g-frontend-ux-accounts-mockup-alignment-delta.md`: unresolved Accounts mismatches from the Accounts audit and roadmap section 3.2.
- `10-3h-frontend-ux-categories-mockup-alignment-delta.md`: unresolved Categories mismatches from the Categories audit and roadmap section 3.3.
- `10-3i-frontend-ux-budgets-mockup-alignment-delta.md`: unresolved Budgets mismatches from the Budgets audit and roadmap section 3.4.

Shared planning updates:

- Update `docs/planning/epics.md` to add the new story summaries and revise the Epic 10 execution order.
- Update `docs/implementation/sprint-status.yaml` to mark the new story files `ready-for-dev`.
- Update `docs/implementation/10-5a-frontend-ux-profile-and-settings-redesign.md` and `docs/implementation/10-5b-frontend-ux-login-and-registration-redesign.md` with forward dependencies on 10.1d where shell/profile/logout/login landing decisions are involved.
- Update `docs/implementation/10-6-frontend-ux-visual-qa-baseline-and-responsive-regression-checklist.md` with the new prerequisite list and audit baseline policy requirements.
- Track the audit docs under `docs/ui-audit`.

## 5. Implementation Handoff

Change scope classification: Moderate backlog reorganization.

Handoff:

- Story prep agents create the six story documents with implementation-ready acceptance criteria, tasks, likely impacted files, dependencies, guardrails, verification checklists, open decisions, and source references.
- Orchestrator integrates story docs, sprint status, epics, selected 10.5a/10.5b/10.6 forward references, and durable audit docs.
- Later `bmad-dev-story` agents should implement stories in this order:
  1. 10.1d
  2. 10.1e
  3. 10.2b, 10.3g, 10.3h, and 10.3i after shared decisions/primitives are done; page stories may run in parallel only if locale/shared primitive/page CSS ownership is coordinated
  4. 10.5a and 10.5b after shell/login/profile route decisions are resolved
  5. 10.6 after all new alignment stories plus 10.5a/10.5b are done

Success criteria:

- New stories are `ready-for-dev`.
- Audit docs are durable tracked planning artifacts.
- Sprint status reflects the new blockers.
- Existing completed story history is preserved.
- No UI implementation code is changed by this planning pass.
