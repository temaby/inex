---
title: "PRD Quality Review"
prd: "prd-inex-2026-05-20/prd.md"
reviewer: "claude-sonnet-4-6"
date: 2026-05-25
verdict: needs-revision
sources-cross-checked:
  - docs/implementation/deferred-work.md
  - docs/implementation/code-review-findings-user-stories-2026-05-25.md
---

# PRD Quality Review — InEx 2026-05-20

## Verdict: needs-revision

The PRD is structurally sound and largely SDLC-ready. FR IDs are stable, story traceability is consistent, and the P0 security items have enough specificity to act on. Four issues require correction before story creation begins; none require major restructuring.

---

## Findings

### F1 — BUG-003 sprint placement is wrong (severity: high)

BUG-003 ("Frontend `updateAccount` thunk omits `key` field; every account update from the UI returns 422") is classified P1 in Section 7. It is placed in Sprint 2, item 6 — after DEVOPS-001 and the entire SEC-003 rotation cycle.

This bug causes every account update from the UI to fail right now, for every user. It is a complete functional regression on a core CRUD path. DEVOPS-001 (remove tracked build artifacts) and SEC-003 (rotate local secrets) are hygiene items that do not unblock any user. BUG-003 should move to Sprint 1 after the two security bugs, ahead of both.

Leaving it in Sprint 2 risks letting a regression that is live in production sit unaddressed for at least one sprint cycle while lower-impact hygiene work runs.

---

### F2 — Section 7 (Known Active Bugs) is incomplete (severity: medium)

Cross-checking against `deferred-work.md` surfaces three bugs that affect NFRs, user-facing behavior, or runtime safety and are absent from Section 7:

**Missing bug A — `PagedResponse<T,TMeta>.Metadata` null suppressor**
`inex.Services/Models/Records/Data/PagedResponse.cs` uses `default!` on `Metadata`. Any call site that constructs `PagedResponse` without setting `Metadata` gets a null dereference at runtime. No guard exists at the construction site. This is a latent crash risk, not a design smell.

**Missing bug B — Hardcoded Russian string in `ReportService.GetCategoriesReportData`**
The report title `"Расходы по категориям"` bypasses the i18n system entirely. This directly violates NFR-I18N-1 ("all user-visible strings through react-i18next; no hardcoded UI text") and is observable by any EN-locale user. It is a pre-existing defect, not a deferred refactor.

**Missing bug C — Response types inherit request types (Account, Category domains)**
`AccountResponse : UpdateAccountRequest : CreateAccountRequest` and `CategoryResponse : UpdateCategoryRequest` are mentioned in OQ-5 as a deferred question about cleanup scope, but the inheritance hierarchy is a structural defect with concrete consequences: response DTOs expose input-intent properties to API consumers, and any story touching account or category response shapes will have to work around or break this hierarchy. It belongs in Section 7 as a tracked bug, not only in Open Questions.

BUG-004 (two `ExchangeRateResponse` types) is correctly listed and its OQ-5 companion is reasonable. The three items above are not equivalently covered.

---

### F3 — OQ-2 is load-bearing and must be resolved before story creation (severity: medium)

OQ-2 asks: "Are there non-owner users currently active on the production instance?" The assumption applied is "At least one invited user is active."

The consequence of this being true is not stated: **BUG-001 (SEC-001) is a live data exposure in production right now.** Any authenticated user can read, update, or delete another user's accounts, categories, budgets, and transactions by guessing sequential or observable entity IDs. If the assumption holds, this is not a sprint planning priority — it is an active incident.

The PRD correctly marks it P0 but treats it as a normal roadmap item. It should carry an explicit note that if OQ-2 resolves to "yes, non-owner users are active," SEC-001 exits normal sprint flow and must be deployed as an unscheduled hotfix before any other work continues.

---

### F4 — Two NFRs are non-verifiable (severity: low)

**NFR-OBS-2:** "Build warning baseline must be clean enough to surface real issues." This has no pass/fail criterion. The linked story (DX-001) defines concrete acceptance criteria (warning noise removed, baseline documented), but the NFR itself is not independently checkable. Replace with a measurable statement, for example: "Zero CS1591 warnings in default build output after DX-001 is closed."

**NFR-TEST-3:** "EF InMemory must not be the sole coverage for MySQL-specific behavior (migrations, concurrency, constraints)." This is directional but not verifiable as written. There is no threshold (e.g., "at least one integration test per migration," "SEC-002 concurrency test must use a real DB transaction"). Without a metric, any single integration test technically satisfies it.

---

## Items confirmed as correct

- FR-SEC-001 and FR-SEC-002 are specific enough to drive story implementation without further elaboration.
- All FR IDs in Section 5 trace cleanly to story IDs in `code-review-findings-user-stories-2026-05-25.md` or `MASTER_PLAN.md`.
- The ARCH-001 priority discrepancy (P1 in code-review-findings, P2 in PRD) is acceptable — the delivery order position (6th) is consistent between both documents; the label difference will not cause planning confusion.
- Assumption tags are used appropriately throughout. No other assumption beyond OQ-2 is load-bearing enough to block story creation.
- Section 4 (Current Capabilities) is complete relative to CLAUDE.md and MEMORY.md. No implemented features are missing.
- Sprint 1 correctly leads with SEC-001 and SEC-002 before any feature work.

---

## Required changes before story creation

1. Move BUG-003 to Sprint 1, item 3 (after SEC-001, SEC-002; before DEVOPS-001).
2. Add three bugs to Section 7: `PagedResponse` null suppressor, hardcoded Russian report title, response-inherits-request hierarchy.
3. Add a conditional hotfix note to BUG-001/FR-SEC-001: if OQ-2 resolves to active non-owner users, SEC-001 deploys outside sprint flow.
4. Replace NFR-OBS-2 with a measurable criterion tied to DX-001 acceptance criteria.
