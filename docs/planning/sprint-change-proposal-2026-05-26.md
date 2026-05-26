---
project: inex
date: 2026-05-26
workflow: bmad-correct-course
trigger: docs/planning/implementation-readiness-report-2026-05-26.md
status: approved
mode: batch
scope: moderate
---

# Sprint Change Proposal - Implementation Readiness Cleanup

## 1. Issue Summary

The implementation readiness assessment on 2026-05-26 found that Epic 1 is ready enough to proceed, but the broader roadmap should not be handed to implementation agents without cleanup.

The trigger is not a failed implementation story. It is a planning readiness finding: the PRD, epics, architecture, and UX artifacts are mostly aligned, but several inconsistencies can mislead implementation agents after Epic 1.

Evidence from `docs/planning/implementation-readiness-report-2026-05-26.md`:

- Epic coverage is complete for PRD roadmap FRs: 39 of 39 covered.
- Epic 1 can proceed after story-level review, especially because it addresses production security defects.
- The full roadmap remains `NEEDS WORK` due to stale story references, scoped architecture readiness, technical-value framing, oversized Story 10.5, and divergent `IR-*` requirement IDs.

## 2. Change Analysis Checklist

### 1. Understand The Trigger And Context

- [x] 1.1 Triggering story identified: N/A. The trigger is the implementation readiness report, not a single failed story.
- [x] 1.2 Core problem defined: planning artifacts are close to ready, but roadmap handoff still contains reference drift, architecture-scope ambiguity, and story-sizing risk.
- [x] 1.3 Evidence gathered: readiness report, PRD, epics, architecture, UX index, design update plan, design implementation guide, and project context reviewed.

### 2. Epic Impact Assessment

- [x] 2.1 Current epic impact: Epic 1 remains implementable as planned.
- [x] 2.2 Required epic-level changes: Epics 2, 7, 8, and 9 need stronger outcome framing; Epic 10 needs Story 10.5 split.
- [x] 2.3 Remaining epics reviewed: Epics 6, 7, 9, and 10 have direct cleanup needs.
- [x] 2.4 Invalidated epics/new epics: no epics are obsolete; no new epic is required.
- [x] 2.5 Priority/order: no resequencing required before Epic 1. Architecture expansion is required before Epic 9 and Epic 10 implementation.

### 3. Artifact Conflict And Impact Analysis

- [x] 3.1 PRD conflicts: no MVP conflict. PRD should clarify whether `IR-*` items are implementation requirements or PRD-level requirements.
- [x] 3.2 Architecture conflicts: `architecture.md` is ready for Epic 1 only, but its status can be mistaken as full-roadmap readiness. It also has stale references to later Secrets Manager work as Epic 8 instead of Epic 9.
- [x] 3.3 UI/UX conflicts: UX source is valid but indexed. Implementation agents must load `docs/design/docs/design-implementation-guide.md` and `docs/planning/design-update-plan.md`, not only `ux-design.md`.
- [x] 3.4 Other artifacts: no code or CI changes required by this proposal. `sprint-status.yaml`, if present, should be updated only after this proposal is approved and epics/stories are edited.

### 4. Path Forward Evaluation

- [x] 4.1 Direct Adjustment: viable. Effort low-to-medium. Risk low.
- [x] 4.2 Potential Rollback: not viable. No completed implementation needs rollback.
- [x] 4.3 PRD MVP Review: not required. MVP remains achievable.
- [x] 4.4 Recommended path: Direct Adjustment with a small architecture follow-up before Epic 9 and Epic 10.

### 5. Proposal Components

- [x] 5.1 Issue summary created.
- [x] 5.2 Epic and artifact impact documented.
- [x] 5.3 Recommended path documented.
- [x] 5.4 MVP impact and action plan documented.
- [x] 5.5 Handoff plan documented.

### 6. Final Review And Handoff

- [x] 6.1 Checklist completion reviewed.
- [x] 6.2 Proposal accuracy checked against source artifacts.
- [x] 6.3 User approval received on 2026-05-26.
- [N/A] 6.4 `sprint-status.yaml` update skipped because no sprint status file exists in the workspace.
- [x] 6.5 Next steps and handoff plan defined.

## 3. Impact Analysis

### Epic Impact

Epic 1 remains the first implementation target. No change should delay object-level authorization, refresh-token concurrency, account update regression fix, secret cleanup, or build artifact cleanup.

Epic 2, Epic 7, Epic 8, and Epic 9 need title/goal wording cleanup so implementation agents optimize for outcomes rather than technical categories.

Epic 6 can stay in place, but report data integrity fixes must remain explicit, independently testable stories. They should not be buried inside dashboard feature work.

Epic 10 should split Story 10.5 because profile/settings and auth screens have different shells, state handling, validation surfaces, and QA states.

### Story Impact

The following stories need direct edits:

- Story 7.4a: stale dependency reference to Epic 3 / Story 3.2.
- Story 9.3: stale references to Story 8.1 and Story 8.2.
- Story 10.5: split into two stories or explicitly constrain scope.

### Artifact Conflicts

PRD:

- `IR-REPORT-001`, `IR-REPORT-002`, `IR-DTO-001`, and `IR-CODE-001` exist in `epics.md`, but not in the PRD requirement list.
- These can remain valid implementation requirements, but the PRD should define their status so the project does not maintain two competing requirement namespaces.

Architecture:

- `architecture.md` front matter and body clearly scope readiness to Epic 1, but the document status says `READY FOR IMPLEMENTATION`.
- The document says later Secrets Manager work is Epic 8, while current epics assign AWS managed infrastructure and Secrets Manager to Epic 9.
- Additional architecture guidance is needed before Epic 9 infrastructure migration and Epic 10 design-system rollout.

UX:

- `ux-design.md` is an index, not a full UX spec.
- Epic 10 implementers must load the design implementation guide and design update plan.

## 4. Recommended Approach

Use Direct Adjustment.

Rationale:

- The readiness report found no critical sequencing blockers.
- Epic 1 has production-security value and should not wait for roadmap polish.
- Required cleanup is localized to planning artifacts.
- No rollback or MVP redefinition is justified.
- The only architecture expansion needed before implementation applies to later epics, not current Sprint 1 work.

Effort estimate: medium.

Risk level: low if the cleanup is done before creating implementation stories beyond Epic 1; medium if later agents proceed from current artifacts unchanged.

Timeline impact:

- Epic 1: no delay.
- Full roadmap handoff: add a short planning cleanup pass before implementation agents start Epic 2+ stories.
- Epic 9 and Epic 10: require architecture addendum/update before execution.

## 5. Detailed Change Proposals

### Epic Reference Cleanup

#### Story 7.4a - RTK Query Dependency Reference

Current:

```text
Given the typed query params API contract from Epic 3 (Story 3.2)
```

Proposed:

```text
Given the typed query params API contract from Epic 4 (FR-FE-006 / API-001)
```

Rationale: typed transaction filter parameters are tracked in Epic 4, not Epic 3.

#### Story 9.3 - Infrastructure Dependency References

Current:

```text
Then the container runs the image from ECR (Story 8.1), connects to RDS (Story 8.2), and GET /health returns 200
```

Proposed:

```text
Then the container runs the image from ECR (Story 9.1), connects to RDS (Story 9.2), and GET /health returns 200
```

Rationale: ECR and RDS infrastructure stories are now Story 9.1 and Story 9.2.

### Epic Outcome Framing

#### Epic 2

Current title:

```text
Backend Reliability Prerequisites
```

Proposed title:

```text
Safer Data Access And Reliable Time Behavior
```

Proposed goal:

```text
Data access lifetime and timestamp behavior are made safe so later auth, filtering, rate, and reporting work produces reliable results.
```

#### Epic 7

Current title:

```text
Frontend Modernization
```

Proposed title:

```text
Faster, Safer Frontend Evolution
```

Proposed goal:

```text
The frontend becomes easier to change safely through typed models, smaller bundles, RTK Query data ownership, and automated component tests.
```

#### Epic 8

Current title:

```text
Backend Architecture & Code Quality
```

Proposed title:

```text
Maintainable Backend Change And Clean Build Signal
```

Proposed goal:

```text
Backend change becomes safer through a VSA/MediatR spike, clearer contracts, warning cleanup, and removal of small code-quality traps.
```

#### Epic 9

Current title:

```text
AWS Managed Infrastructure
```

Proposed title:

```text
Managed Production Operations On AWS
```

Proposed goal:

```text
Production moves toward managed deploys, backups, secrets, TLS, and observability while the existing EC2 track remains live until cutover is proven.
```

### Story 10.5 Split

Current story:

```text
Story 10.5: Frontend UX - Profile, Settings, And Auth Redesign
```

Proposed replacement:

```text
Story 10.5a: Frontend UX - Profile And Settings Redesign

As an invited account holder,
I want account settings to be clear, responsive, and trustworthy,
So that profile, currency, language, and password changes are easy to complete on desktop and mobile.
```

Acceptance criteria retain the current profile/settings criteria:

- Two-column desktop settings layout.
- Mobile horizontal settings tabs.
- `min-width: 0` protection for grid children.
- Loading, disabled, success, validation error, and API error states.
- Localized EN/RU text.
- 390px mobile screenshot with no horizontal overflow.

```text
Story 10.5b: Frontend UX - Login And Registration Redesign

As an invited account holder,
I want sign-in and invite registration screens to be clear and password-manager-friendly,
So that authentication feels reliable and consistent with the finance app.
```

Acceptance criteria retain the current auth criteria:

- Separate auth layout.
- Password-manager-friendly inputs.
- Connected labels.
- Validation summaries.
- Loading and API error states.
- Invite-token registration treatment.
- No user-visible hardcoded strings bypassing i18next.

Rationale: profile/settings are authenticated app-shell routes; login/register are unauthenticated auth-layout routes. Splitting reduces review size and improves visual QA precision.

### Epic 6 Report Integrity Guardrail

Current Epic 6 framing is acceptable, but implementation handoff should explicitly preserve separate verification for:

- `IR-REPORT-001`: inactive-category category report data gap and `TotalIncome`/`TotalOutcome` population.
- `IR-REPORT-002`: hardcoded report title i18n fix.

Proposed addition to Epic 6 delivery note:

```text
Report data integrity fixes must remain independently testable. Dashboard and historical chart work must not be accepted as complete unless IR-REPORT-001 and IR-REPORT-002 have explicit service/API coverage and localized UI behavior where applicable.
```

### PRD Requirement Namespace Cleanup

Proposed PRD addition after the roadmap FR tables:

```text
### Implementation Requirements

The following `IR-*` items are implementation requirements derived from known bugs or technical debt. They are not product feature requirements, but they are tracked in epics because they affect correctness, maintainability, or implementation safety.

| ID | Requirement | Source |
|---|---|---|
| IR-REPORT-001 | Category spending report includes transactions for all user-owned categories; inactive categories are not silently excluded; TotalIncome and TotalOutcome are populated. | BUG-005, BUG-006 |
| IR-REPORT-002 | Hardcoded report title text in ReportService is removed or localized so services do not emit user-visible hardcoded language strings. | BUG-007, NFR-I18N-1 |
| IR-DTO-001 | Remaining DTO naming and response/request hierarchy issues are cleaned up without changing serialized API contracts unless explicitly planned. | BUG-009 |
| IR-CODE-001 | Minor service/model quality traps are cleaned up, including PagedResponse metadata safety, service helper visibility, and validator naming alignment. | BUG-008 and code-quality notes |
```

Rationale: this keeps `IR-*` IDs legitimate without pretending they are product-facing FRs.

### Architecture Scope Cleanup

Proposed architecture front matter/body clarification:

```text
status: ready-for-epic-1
inputScope:
  epics: "Epic 1: Security & Production Hygiene"
```

Proposed addition near the readiness assessment:

```text
This architecture document is ready for Epic 1 implementation only. It does not authorize implementation of Epic 9 managed infrastructure or Epic 10 frontend design-system rebuild without additional architecture guidance.
```

Proposed stale reference fix:

```text
AWS Secrets Manager remains the later Epic 9 production target.
```

Rationale: prevents agents from treating Epic 1 architecture as full-roadmap architecture.

### Future Architecture Addenda

Before Epic 9:

- Add infrastructure architecture for ECS Fargate, RDS, ALB/ACM, Route 53, Secrets Manager, CloudWatch alarms, deploy pipeline, rollback, and cutover from EC2.

Before Epic 10:

- Add frontend architecture for design-system module boundaries, token/theme bridge, shell migration sequence, primitive ownership, accessibility contracts, visual QA tooling, and how it coexists with Redux/Axios until RTK Query stories complete.

## 6. Implementation Handoff

Scope classification: moderate.

Reason: no product strategy pivot or epic replacement is required, but multiple planning artifacts need coordinated updates before broad implementation handoff.

Handoff recipients:

- Product Owner / Developer: apply `epics.md` reference cleanup, epic framing edits, Story 10.5 split, and Epic 6 guardrail.
- Product Manager: approve PRD `IR-*` requirement taxonomy and confirm OQ-2 handling.
- Architect: update `architecture.md` scope wording and create architecture addenda before Epic 9 and Epic 10.
- Developer agent: proceed with Epic 1 story-level implementation only after normal story review; do not wait for later-roadmap cleanup unless the active story depends on it.

Success criteria:

- Story 7.4a references Epic 4 / FR-FE-006 / API-001.
- Story 9.3 references Story 9.1 and Story 9.2.
- Epics 2, 7, 8, and 9 frame outcomes rather than only implementation categories.
- Story 10.5 is split into profile/settings and auth-screen stories, or explicitly constrained before implementation.
- PRD defines `IR-*` as implementation requirements or removes them from epic FR coverage.
- Architecture status cannot be mistaken for full-roadmap readiness.
- Epic 9 and Epic 10 have architecture guidance before implementation starts.

## 7. Approval

This proposal was approved by Artiom on 2026-05-26.

Approved decision: Direct Adjustment. Apply the planning edits before any implementation handoff beyond Epic 1.
