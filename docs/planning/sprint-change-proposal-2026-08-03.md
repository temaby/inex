---
date: 2026-08-03
project: inex
status: approved-for-implementation
trigger: implementation-readiness-report-2026-08-03
scope: moderate
---

# Sprint Change Proposal: Transactions Enhancement Readiness Corrections

## 1. Issue summary

The readiness assessment found plan drift, not a change to the Transactions MVP. The approved transaction-date KPI conversion policy, Transfer-only KPI behavior, a MySQL performance gate, and implementation sequencing were missing or contradicted by active planning artifacts. Legacy Epic 10 Amount-filter language could reintroduce an explicitly removed feature.

Evidence: [implementation-readiness-report-2026-08-03.md](implementation-readiness-report-2026-08-03.md), findings 1--5 and recommendations 1--5.

## 2. Impact analysis

| Area | Impact | Resolution |
| --- | --- | --- |
| Epic 10 | Stories 10.2/10.2a still specified Amount filtering. | Mark the statements superseded and remove the conflicting wording. |
| Epic 11 | Story 11.1 mixed query scope with validation/security; Story 11.3 lacked the approved conversion contract; Story 11.4 claimed future drawer evidence. | Add 11.1a, revise 11.1/11.3/11.4, and add verification ownership. |
| Epic 12 | Account-summary ownership was a hidden prerequisite; companion states and feature-owned evidence were incomplete. | Make 12.1 an explicit prerequisite; add companion states and per-story verification. |
| Architecture and UX | Aggregate-per-currency conversion did not match the approved transaction-date policy. | Define preferred-base, date-and-currency buckets, effective-date cache use, no-provider rule, and Transfer-only zero cards. |
| Delivery status | Epic 11/12 were absent from sprint status and the enhancement workflow was unfinished. | Add backlog entries and complete the planning-validation state. |

The current PRD MVP remains intact. No completed implementation work needs rollback, no new epic is required, and no external provider, infrastructure, or dependency change is authorized.

## 3. Recommended approach

**Direct adjustment — approved.** Update the affected planning artifacts within Epics 10--12 and preserve the current product scope.

- Effort: medium planning rework; no code change in this proposal.
- Risk: medium if MySQL performance or existing rate-cache effective-date data fails verification; the new gates make that evidence a condition of implementation acceptance.
- Timeline: add 11.1a and the explicit 12.1 prerequisite before feature UI work. The remaining work remains inside the existing Epic 11/12 plan.

Alternatives rejected: rollback does not address documentation drift, and an MVP reduction would discard approved user value without a technical constraint requiring it.

## 4. Detailed change proposals

### Story plan

| Story | Before | After | Rationale |
| --- | --- | --- | --- |
| 10.2, 10.2a | Amount filter/Amount equivalent remained actionable. | Explicit supersession notices; Amount wording removed. | Prevents direct conflict with FR-2. |
| 11.1 | Combined canonical filtering with mutation date and ownership hardening. | New prerequisite Story 11.1a owns date validation and cross-resource ownership; 11.1 owns filtering/Search and the 50k/≤1s MySQL gate. | Creates independently completable, testable work. |
| 11.2 | Could append a late progressive response after state changed. | Reject obsolete filter-key/unexpected-page responses. | Protects the canonical ledger result set. |
| 11.3 | Period-wide native aggregates and generic missing-rate evidence. | Preferred-base date-and-currency buckets; effective-date cache rules; currency/date/period evidence; Transfer-only zero cards. | Records the approved conversion contract. |
| 11.4 / 12.2--12.5 | Story 11.4 claimed drawer evidence; companion states were undefined. | 11.4 owns ledger/harness only; Epic 12 stories own companion, form, and edit-return evidence. | Removes forward dependencies and closes visual-QA ownership gaps. |

### Architecture and UX

The Transactions architecture and UX now define the same conversion contract: one authenticated preferred base currency, per-local-date bucket conversion, only recorded effective-date cache use on weekends/holidays, and `N/A` evidence without provider activity. They also define Transfer-only zero cards, companion loading/empty/error behavior, stale progressive-response protection, and MySQL performance evidence.

## 5. Implementation handoff

**Scope classification:** Moderate — backlog reorganization and developer delivery coordination.

1. Product Owner / planning owner: Treat [epics.md](epics.md) and this proposal as the approved backlog order; do not select legacy Epic 10 Amount-filter requirements.
2. Developer: Complete 11.1a, 11.1, and 12.1 before UI work; collect MySQL `EXPLAIN` and timing evidence for the 50,000-transaction gate; add an index only when evidence requires it.
3. Developer: Implement the 11.3 summary contract before Story 12.4 consumes the shared conversion helper.
4. QA / developer: Keep Story 11.4 visual evidence to ledger states. Attach companion, drawer, and edit-return evidence to Stories 12.2--12.5 respectively.

Success criteria: all Epic 11/12 acceptance criteria and Verification sections pass; the 50,000-transaction MySQL gate has recorded evidence; no live rate provider is invoked; and a repeated readiness assessment finds no conflict between the PRD, architecture, UX, epics, and sprint status.

## Checklist record

- [x] 1.1--1.3 Trigger, problem, and report evidence identified.
- [x] 2.1--2.5 Epic impact and sequencing assessed; no new epic or rollback needed.
- [x] 3.1--3.4 PRD, architecture, UX, testing, and delivery artifacts reconciled.
- [x] 4.1 Direct adjustment selected; rollback and MVP reduction rejected.
- [x] 5.1--5.5 Proposal, actions, MVP impact, and handoff documented.
- [x] 6.1--6.5 Proposal reviewed, approved by the implementation request, sprint status updated, and handoff defined.
