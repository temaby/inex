---
title: Transactions dependency-sequence correction
date: 2026-08-03
status: approved-for-implementation
scope: minor-direct-adjustment
approval_basis: User-directed repair in the current Correct Course task
---

# Transactions Dependency-Sequence Correction

## 1. Trigger and classification

The implementation-readiness rerun identified a forward cross-epic dependency: the Epic 11 delivery order required Story 12.1 before Stories 11.2--11.4. This violates epic independence because a later epic must not block delivery of the earlier one.

Classification: **minor direct adjustment**. The correction changes delivery sequencing only; it adds no scope, contract, architecture, UX, or implementation work.

## 2. Impact assessment

| Area | Impact | Required action |
| --- | --- | --- |
| PRD, UX, architecture | None | No change; the intended technical dependencies remain valid. |
| Epic 11 | Delivery order | Remove Story 12.1 as a blocker for Stories 11.2--11.4. |
| Epic 12 | Dependency clarification | Keep Story 12.1 as the security prerequisite for Epic 12 UI; keep Story 12.4 dependent on Story 11.3. |
| Sprint tracking | Sequencing visibility | Record the corrected relationship beside development status. |
| Existing implementation | None | No code change or rework. |

## 3. Approved correction

Replace the invalid sequence:

```text
7.4a -> 11.1a -> 11.1 -> 12.1 -> 11.2 -> 11.3 -> 11.4
```

with this dependency-safe sequence:

```text
7.4a -> 11.1a -> 11.1 -> 11.2 -> 11.3 -> 11.4
                         \-> 12.1 -> Epic 12 UI
                              12.4 additionally waits for 11.3
```

Story 12.1 may start once Story 11.1 is complete, but it is a prerequisite only for Epic 12 account-context UI and does not block the remaining Epic 11 stories.

## 4. Artifact updates

1. Update `docs/planning/epics.md` with the corrected order and explicit non-blocking relationship.
2. Update `docs/implementation/sprint-status.yaml` with the same sequencing note.
3. Preserve the readiness report as assessment history; validate the correction in the next readiness rerun.

## 5. Handoff and verification

- Do not begin Story 11.1a until Story 7.4a is formally `done` or recorded as an explicit external blocker.
- Implement Epic 11 without waiting for Story 12.1 after Story 11.1 completes.
- Do not begin Epic 12 UI stories until Story 12.1 is complete; do not begin Story 12.4 until Story 11.3 is complete.
- Rerun implementation-readiness after Story 7.4a is formally complete to confirm that no forward cross-epic dependency remains.

## 6. Correct Course checklist

- [x] Trigger identified from the implementation-readiness report.
- [x] Impact reviewed across planning, architecture, UX, epics, and sprint tracking.
- [x] Change classified as a minor direct adjustment.
- [x] Current and corrected sequences documented.
- [x] User authorization recorded.
- [x] Epics and sprint tracking updated.
- [x] No code, migration, test, or rollback work required.
