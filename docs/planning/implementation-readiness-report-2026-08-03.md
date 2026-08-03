---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - docs/planning/prds/prd-inex-2026-08-03/prd.md
  - docs/planning/prds/prd-inex-2026-08-03/addendum.md
  - docs/planning/transactions-architecture.md
  - docs/planning/architecture.md
  - docs/planning/transactions-ux-design-specification.md
  - docs/planning/ux-design-specification.md
  - docs/planning/epics.md
supportingDocuments:
  - docs/planning/transactions-current-state-functionality.md
  - docs/planning/transactions-current-state-ui-ux.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-08-03
**Project:** inex

## Document Discovery

### Assessment Authority Set

- Primary product requirements: `docs/planning/prds/prd-inex-2026-08-03/prd.md`
- Supporting product decisions: `docs/planning/prds/prd-inex-2026-08-03/addendum.md`
- Transactions-specific architecture: `docs/planning/transactions-architecture.md`
- Repository-wide architecture constraints: `docs/planning/architecture.md`
- Transactions UX behavior: `docs/planning/transactions-ux-design-specification.md`
- Shared UX rules: `docs/planning/ux-design-specification.md`
- Approved epic and story plan: `docs/planning/epics.md`

### Supporting Baselines

- `docs/planning/transactions-current-state-functionality.md`
- `docs/planning/transactions-current-state-ui-ux.md`

### Excluded From This Assessment

- `docs/planning/prds/prd-inex-2026-05-20/prd.md` — superseded for this Transactions enhancement assessment.
- `docs/planning/ux-design.md` — legacy UX candidate.
- `docs/planning/sprint-change-proposal-2026-06-07-epic-10-mockup-alignment.md` — prior unrelated sprint-change proposal.

## PRD Analysis

### Functional Requirements

FR-1: Apply every Server Filter to the authenticated user's complete Selected Period before calculating summary counts or paginating Ledger Rows.

FR-2: Treat Type and Search as Server Filters and remove Amount filtering from Transactions. Type supports All, Income, Expense, and Transfer; Search is case-insensitive across comment, account name, category name/path, account currency, tags, and references, and remains database-side before pagination.

FR-3: Retain applied filters across drawer interactions, restore valid server filters from a stable URL-safe Transactions URL, ignore invalid values independently, provide individual/global clear actions, and reset Clear filters to the current whole month without stale local criteria.

FR-4: Show income-only and expense-only counts in the respective KPI cards and compare Net flow with the immediately preceding comparable period, with distinct non-zero, zero, no-activity, and incomplete-conversion behaviors.

FR-5: Display a visible, accessible Rate Warning and `N/A` whenever a base-currency KPI omits a required native-currency aggregate because a rate is unavailable; continue native-currency ledger rendering without a provider call.

FR-6: Render the desktop ledger as Description, Account, Date, Amount, with Amount final/right-aligned; retain Amount-first mobile Ledger Rows plus semantic amounts, grouping, tags/references, and keyboard activation.

FR-7: Document transferable Transactions visual patterns, separating shared design-system tokens/primitives from route-specific layout rules and covering desktop/mobile accessibility behavior.

FR-8: Provide an explicit Account balances control that lists every Active Account and Native Balance in an optional desktop companion panel or accessible mobile drawer, without a converted cross-account total.

FR-9: Show a selected Active Account's Native Balance below Account selection in new/edit drawers; use Account, Category, Amount, Date, Comment for Expense/Income and retain distinct Transfer source/destination/amount fields.

FR-10: Close the edit drawer after a successful single-record update, refresh ledger/summary data, restore focus predictably, retain actionable failure behavior, and preserve confirmed single-record delete.

**Total FRs: 10**

### Non-Functional Requirements

NFR-1: Every user-owned read, summary, create, update, and delete path derives ownership from the authenticated principal, includes an ownership predicate, and returns not found for cross-user access.

NFR-2: The server rejects omitted or language/runtime-default transaction dates; user-entered dates remain local calendar dates and time-zone modelling is out of scope.

NFR-3: Controls, filter state, drawers, warnings, and monetary direction remain keyboard-operable and screen-reader understandable; colour alone conveys neither monetary direction nor incomplete-rate status.

NFR-4: All additions are translated into supported locales; English is the visual baseline and Russian is a long-label responsive test.

NFR-5: The route has no page-level horizontal overflow, clipped controls, or bottom-navigation occlusion at 390px and 360px.

NFR-6: Tests and exploratory work never invoke a live exchange-rate provider.

**Total NFRs: 6**

### Additional Requirements

- The implementation preserves existing authenticated API-client, i18n, drawer, transaction-ownership, and local-calendar-date boundaries.
- Transfers remain independently editable/deletable; bulk actions, linked-transfer management, a converted account-balance total, Amount filtering, time-zone settings/conversion, and automated-feed dates are out of scope.
- Current PRD decisions require Clear filters to restore the current whole month and require no new rate-provider calls.
- The addendum defines every-active-account Native Balance context, including zero-balance accounts, as progressive disclosure.
- The decision log and release outcomes require full-period pagination regression evidence, Rate Warning evidence, account-balance UX evidence, and responsive guardrails.

### PRD Completeness Assessment

The PRD is a final, decision-complete product specification with ten contiguous FRs and six explicit delivery constraints. It defines the user outcomes, scope boundaries, and observable behavior required for traceability. The readiness review will assess whether architecture and stories preserve those requirements and whether later confirmed rate-conversion/performance decisions have been recorded in the authoritative artifacts.

## Epic Coverage Validation

### Coverage Matrix

| PRD FR | Requirement | Epic and story coverage | Status |
| --- | --- | --- | --- |
| FR-1 | Full-period filtering before pagination/summaries | Epic 11, Story 11.1; Story 11.2 reset behavior | Covered |
| FR-2 | Server Type/Search and Amount removal | Epic 11, Stories 11.1–11.2 | Covered |
| FR-3 | URL restoration, retained state, safe invalid values, clear actions | Epic 11, Story 11.2 | Covered |
| FR-4 | Full-scope counts and comparable Net flow | Epic 11, Story 11.3 | Covered |
| FR-5 | `N/A` and accessible Rate Warning | Epic 11, Story 11.3 | Covered |
| FR-6 | Desktop Amount-last/mobile Amount-first ledger | Epic 12, Story 12.4 | Covered |
| FR-7 | Transferable visual patterns | Epic 11, Story 11.4 | Covered |
| FR-8 | On-demand active-account Native Balances | Epic 12, Stories 12.1–12.2 | Covered |
| FR-9 | Selected-account balance and form ordering | Epic 12, Story 12.3 | Covered |
| FR-10 | Successful edit close, refresh, focus, and delete | Epic 12, Story 12.5 | Covered |

### Missing Requirements

No PRD functional requirement is missing from Epic 11 or Epic 12. The subsequent architecture/story-quality review will assess whether the newly confirmed transaction-date conversion, Transfer-only KPI, and MySQL performance decisions are represented precisely enough in those stories.

### Coverage Statistics

- Total PRD FRs: 10
- FRs covered in epics: 10
- Coverage percentage: 100%

## UX Alignment Assessment

### UX Document Status

Found. `transactions-ux-design-specification.md` is the page-level authority and explicitly defers shared frame, token, typography, and primitive rules to `ux-design-specification.md`. It aligns with the PRD's manual-ledger journeys, filter scope, `N/A` rate-warning treatment, desktop/mobile ledger order, Native Balance context, drawer behavior, internationalisation, and visual-QA requirements.

### Alignment Findings

1. **Blocking documentation conflict — legacy Amount filtering remains in the older Epic 10 Transactions stories.** `epics.md` Story 10.2 and Story 10.2a still mention Amount filtering/Amount equivalent, whereas the current PRD, Transactions UX specification, Transactions architecture, and Epic 11 Story 11.2 explicitly remove Amount filtering. The legacy requirements need an explicit superseded marker or a targeted edit so implementation agents do not reintroduce it.

2. **Blocking unrecorded conversion decision.** The user confirmed preferred-currency, transaction-date KPI conversion. The current UX and Transactions architecture instead describe aggregate-per-currency conversion and do not define a date-and-currency summary payload, effective-rate behavior, or missing-date evidence. Record the approved conversion-ready summary contract before implementation.

3. **Blocking unrecorded Transfer-only KPI behavior.** The user confirmed that Transfer-only filtering keeps all three KPI cards visible at zero. Add this to the Transactions UX, architecture, and Story 11.3 so it is not inferred inconsistently.

4. **Important architecture dependency ambiguity.** The root architecture keeps RTK Query migration in Epic 7, while the Transactions architecture assumes an RTK Query API/cache pattern. The delivery plan must state whether Epic 7.4a is a prerequisite or whether the Transactions scope intentionally establishes/extends that pattern.

5. **Important visual-QA sequencing issue.** Story 11.4 establishes fixture-backed ledger QA but describes drawer states owned by Epic 12. Treat Story 11.4 as the baseline/harness and require Stories 12.2–12.5 to extend evidence for their own companion, form, and edit-return states.

### Supported UX/Architecture Boundaries

- The Management frame, 1360px desktop cap, Amount-final desktop table, Amount-first mobile stack, no-overflow limits, and shared drawer contract are consistently supported.
- The architecture supports full-scope filtering, normalized URL state, current/previous summary scopes, no provider call during rendering, Native Balance reuse, and ownership-first querying.
- Shared UX and page-level UX correctly distinguish primitives/tokens from Transactions-specific layout.

### Warnings

- The current documentation does not define account-balance companion loading, empty, and error states separately from ledger states.
- Existing rate-cache behavior for weekends/holidays must be explicitly specified for the chosen transaction-date conversion policy; a cache miss must remain `N/A` and must not trigger a provider request.

## Epic Quality Review

### Epic Structure Assessment

Epic 11 and Epic 12 are user-value-focused and logically ordered: reliable discovery/truthful summaries precede balance-assisted entry and correction. They are not technical-layer epics. Epic 12 can build on Epic 11's stable filter/summary contracts and continues to deliver distinct user value.

### Critical Violations

1. **Story 11.3 no longer contains the approved KPI conversion decision.** It specifies aggregate-per-currency conversion, while the approved policy requires user-preferred base currency and transaction-date conversion. This is an implementation-blocking contract gap: the story must require date-and-currency cash-flow buckets for current and previous scopes, cache-effective-date behavior, missing-bucket evidence, and Transfer-only zero-card behavior.

2. **Conflicting legacy Stories 10.2/10.2a remain actionable in the same epic artifact.** Their Amount-filter wording conflicts with Epic 11 Story 11.2 and the current PRD. Mark those clauses superseded or amend them before implementation agents select Transactions work.

### Major Issues

1. **Story 11.1 is oversized.** It combines canonical filtering/search, ownership/query safety, default-date validation across three mutation types, MySQL query-plan verification, and potential indexing. Split date validation/security hardening into a prerequisite story or explicitly owned subtask with distinct tests; leave Story 11.1 focused on full-period filtering/search.

2. **Story 11.4 is not independently completable as written.** It requests visual QA for drawer-adjacent states that Stories 12.2–12.5 introduce later. Retain its ledger-state and fixture-harness work, then move feature-specific drawer evidence to the owning Epic 12 stories and make final visual closure follow Epic 12.

3. **Story 12.4 needs an explicit dependency on the shared conversion helper.** Its optional base-currency row equivalent must consume Story 11.3's helper/result contract; it must not calculate conversion independently.

4. **Story 12.1 is a security prerequisite disguised as UI preparation.** The account-summary `Transaction.UserId` correction needs MySQL-backed ownership verification before balance UI work. Make it an explicit prerequisite/security subtask and schedule it immediately after the canonical server-scope work.

5. **The approved story workflow remains unclosed.** `transactionsEnhancementStepsCompleted` in `epics.md` is `[1, 2]`, although stories were appended. Complete its final validation/approval state only after the above corrections are incorporated.

### Minor Concerns

- Add a compact Verification section to every Transactions story naming test layer and minimum critical cases; generic build/test statements are insufficient for query translation, cache/rate behavior, and focus restoration.
- Define loading, empty, and failure states for the Account balances companion.
- Define stale-response protection: a progressive page response for an obsolete normalized filter key must not append to the current result set.

### Dependency Assessment

Recommended order: canonical filter/search contract and transfer/mutation ownership hardening; account-summary ownership correction; URL/cache/result-navigation state; date-and-currency summary conversion; ledger baseline states; responsive ledger layout; balance companion; form balance context; edit-focus behavior; final visual-QA closure. This avoids an Epic 11 visual gate that depends on future Epic 12 UI work.

### Best-Practice Checklist

| Check | Epic 11 | Epic 12 |
| --- | --- | --- |
| Delivers user value | Pass | Pass |
| Logical epic dependency direction | Pass | Pass, after Epic 11 contracts |
| Stories sized for one agent | Needs Story 11.1 split | Needs Story 12.1 security prerequisite clarity |
| No forward dependency | Needs Story 11.4 QA scope correction | Pass after Story 11.3 helper is explicit |
| Clear, testable ACs | Needs approved conversion details | Needs shared-helper and companion-state details |
| PRD traceability | Pass | Pass |

## Summary and Recommendations

### Overall Readiness Status

**NEEDS WORK**

The scope is strong: all ten current PRD FRs map to Epic 11/12, UX documentation exists, and the two-epic sequence is user-value-oriented. Implementation should not start until the conflicting and unrecorded decisions below are incorporated into the authoritative planning artifacts.

### Critical Issues Requiring Immediate Action

1. Record the approved KPI conversion policy: base currency derives from the authenticated user's preference; each transaction is converted at its local transaction date; current and previous summary scopes return date-and-currency cash-flow buckets; cache-effective-date and missing-rate evidence are explicit; no cache miss calls a provider.
2. Record the approved Transfer-only Type behavior: retain all KPI cards at zero, retain Transfer count, and perform no rate lookup or Rate Warning solely for Transfer-only scope.
3. Remove or mark as superseded the legacy Amount-filter requirements in `epics.md` Stories 10.2 and 10.2a. They directly contradict the current PRD, UX, Transactions architecture, and Story 11.2.
4. Record the 50,000-transactions-per-user and at-most-one-second MySQL list/summary Search verification gate, including evidence-backed conditional indexing.

### Recommended Next Steps

1. Update the Transactions architecture, UX specification, and Story 11.3 with the conversion-ready summary contract and Transfer-only behavior; update Story 12.4 to reuse that shared conversion helper.
2. Correct legacy Epic 10 Amount-filter wording and make its supersession status unambiguous to future implementation agents.
3. Split or explicitly subtask Story 11.1's default-date validation and cross-resource ownership hardening; promote Story 12.1's account-summary ownership fix to a prerequisite verified against MySQL.
4. Re-sequence Story 11.4 as ledger-state/fixture-baseline work, put balance/edit visual evidence in Stories 12.2–12.5, and reserve final visual-QA closure until all affected states exist.
5. Add per-story verification sections, stale progressive-response protection, and Account balances companion loading/empty/error states; then complete the Transactions epics workflow final-validation state.
6. Re-run this implementation-readiness assessment after the artifacts are reconciled.

### Assessment Record

- Assessor: Codex
- Date: 2026-08-03
- Issues requiring attention: 4 critical, 5 major, 3 minor
- Categories: cross-document consistency, API/summary contract, security/dependency sequencing, story sizing, verification ownership

### Final Note

The product direction is not the blocker. The blocker is document drift: newer approved decisions and the older Epic 10 Transactions wording describe incompatible implementation paths. Resolve the listed items before implementation so the team has one unambiguous contract.
