---
stepsCompleted: [1, 2, 3, 4]
session_active: false
workflow_completed: true
inputDocuments: []
session_topic: 'DTO naming convention migration (CreateXxxRequest / XxxResponse pattern)'
session_goals: 'Best architectural approach, correct migration steps, verification strategy, produce a plan/vision doc for future implementation'
selected_approach: 'ai-recommended'
techniques_used: ['Assumption Reversal', 'Morphological Analysis', 'Decision Tree Mapping']
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Artiom
**Date:** 2026-05-20

## Session Overview

**Topic:** DTO naming convention migration (`CreateXxxRequest` / `XxxResponse` pattern)
**Goals:** Find the architecturally cleanest migration approach · define safe ordered migration steps · establish a verification strategy · produce a concrete plan/vision document for future implementation

### Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Structured problem-solving for a known-destination migration with unknown optimal path

**Recommended Techniques:**

- **Assumption Reversal:** Surface hidden constraints by challenging what we think is true about the migration before touching anything
- **Morphological Analysis:** Systematically map every migration parameter × options to find the optimal combination
- **Decision Tree Mapping:** Sequence the best strategy into an ordered, branching, executable plan

**AI Rationale:** Goal type is strategic/architectural planning on familiar tech with subtle migration risks. Structured + deep techniques that converge toward decisions are the right fit. Output target is a concrete plan, so each phase builds on the last toward that artifact.

---

## Idea Organization and Prioritization

### Theme 1: Naming Philosophy

The core insight — names must describe *purpose and usage*, not structural role. This shifts the migration from mechanical suffix-stripping to semantic renaming. Every rename requires understanding the call site.

- 9 naming rules locked in (see Phase 1 ruleset above)
- Auth domain as the reference model for "done"
- Response shape philosophy: one shape default, `XxxSummary` opt-in only

### Theme 2: Migration Architecture

Six independent parameters resolved into one coherent strategy — infrastructure-first order, IDE+grep method, domain-sized commits, hard cut, automated verification only.

- No external consumers → zero compatibility shims needed
- Fully static reference graph → full impact of any rename is knowable upfront before touching code

### Theme 3: Edge Cases and Gotchas

- Three files already have clean class names but mismatched file names (`ResponseCreateDTO.cs`, `ResponseDataDTO.cs`, `ResponseDataExDTO.cs`) — file-rename-only work
- `CategoryListDetailsDTO` has a cross-domain dependency in `ReportsController` — must be verified during Categories PR
- `ReportMetadata.FieldsList` uses `nameof` on properties (not the class name) — rename is safe
- Property names containing "DTO" would affect the JSON API contract — mandatory verification gate per domain

**Breakthrough concept:** The pre-flight baseline grep (`grep -r "DTO" inex.Services/Models/Records`) acts as a scoreboard — run before, run after, diff should be zero. Objective completion signal, no manual tracking.

### Prioritization

Single converged plan — prioritization is ordering, not selection:

1. **Infrastructure PR** — unblocks everything, mostly file renames, lowest risk
2. **Auth verification** — zero changes expected, confirms the process works
3. **Core migration** — Accounts → Categories (flag Report cross-dependency) → Budgets → Transactions → Report → ExchangeRate

### Action Plan

**Pre-flight (before first PR):**
1. Add naming ruleset to `CLAUDE.md` under a new "DTO Naming Convention" section
2. Create `docs/implementation/dto-migration-checklist.md` with 8-domain checklist
3. Run baseline: `grep -r "DTO" inex.Services/Models/Records --include="*.cs" -l`
4. Confirm `dotnet test` is green on current branch

**Migration execution:** Follow per-domain loop for each PR in sequence (see Phase 3 decision tree).

**Completion signal:** `grep -r "DTO" inex.Services/Models/Records --include="*.cs"` returns zero hits.

---

## Session Summary

**Key achievements:**
- Complete naming convention ruleset defined and locked — covers all patterns present in InEx
- Full rename inventory produced for all 8 domains (30 class renames + 6 file-only renames)
- Cross-domain dependency identified (CategoryListDetailsDTO → ReportsController)
- Verification strategy is fully automated — no manual smoke testing required
- Migration is de-risked: domain-by-domain, hard cut, atomic commits, objective completion signal

**What made this session effective:**
- Challenging assumptions first prevented committing to the wrong scope or approach
- Looking at the actual file inventory mid-session revealed the partial migration already done in Auth and Data folders — avoided duplicate work
- Morphological Analysis surfaced the infrastructure-first ordering insight, which wasn't obvious at the start

---

## Phase 1: Assumption Reversal — Findings

### Naming Ruleset (locked)

| Pattern | Convention |
|---|---|
| Inbound create | `CreateXxxRequest` |
| Inbound update | `UpdateXxxRequest` |
| Inbound delete (with body) | `DeleteXxxRequest` |
| Standard response | `XxxResponse` |
| Reduced list projection (opt-in) | `XxxSummary` |
| Internal service objects | `XxxData` or plain descriptive name |
| Generic named-entity lookup | `NamedResponse` |
| Pagination wrapper | `PaginationMetadata` |
| Report metadata | `ReportMetadata` |
| Already clean (Auth, ListResponse, PagedResponse, CreatedResponse) | Leave class unchanged, rename file if needed |
| Verification gate | Flag any **property names** containing "DTO" |

### Key Decisions

- **Naming philosophy:** Names describe purpose and usage, not structural role. "DTO" suffix stays only if it genuinely describes purpose.
- **Filters:** Dictionary-based, no filter DTOs exist — out of scope.
- **Response shapes:** Single `XxxResponse` as default; `XxxSummary` opt-in only when a list endpoint provably omits significant fields. No `XxxDetail`.
- **Auth domain:** Already fully migrated — reference model for "done".
- **Base types in scope:** `NamedDTO`, `PaginationMetadataDTO`, `ReportMetadataDTO` need class + file renames. `ResponseCreateDTO`, `ResponseDataDTO`, `ResponseDataExDTO` need file renames only (classes already clean).
- **Transfer internals:** `TransferFromCreateDTO` and `TransferToCreateDTO` are service-internal only — become `TransferFromData` and `TransferToData`.
- **API contract safety:** No external consumers, no generated clients. Class renames do not affect JSON field names or API contract.

---

## Phase 2: Morphological Analysis — Parameter Decisions

| Parameter | Decision |
|---|---|
| **Execution order** | Infrastructure first → Auth (verify only) → Accounts → Categories → Budgets → Transactions → Report → ExchangeRate |
| **Rename method** | IDE refactor (F2) + grep verification pass |
| **Commit granularity** | One commit per domain |
| **Backward compatibility** | Hard cut — no shims, no `[Obsolete]` |
| **Verification** | Build → test → grep old name → grep "DTO" in property names |
| **Documentation** | Naming ruleset → CLAUDE.md permanently; tracking checklist for migration sprint only |

---

## Phase 3: Decision Tree — Execution Plan

### Pre-flight (once, before any domain work)

1. Add naming ruleset to CLAUDE.md
2. Create `docs/implementation/dto-migration-checklist.md`
3. Run `grep -r "DTO" inex.Services/Models/Records --include="*.cs" -l` — save baseline list
4. Confirm `dotnet test` passes on current branch — fix if red before starting

### Per-domain execution loop

```
START DOMAIN
    │
    ▼
[Step 1] IDE rename (F2) each class in domain
    │
    ▼
[Step 2] Update file names to match new class names
    │
    ▼
[Step 3] dotnet build
    ├── FAILS → fix compile errors → back to Step 3
    └── PASSES ▼
[Step 4] dotnet test
    ├── FAILS → fix broken tests → back to Step 3
    └── PASSES ▼
[Step 5] grep -r "OldName" . --include="*.cs"
    ├── HITS FOUND → fix remaining references → back to Step 3
    └── CLEAN ▼
[Step 6] grep -r "DTO" . --include="*.cs" (property names only)
    ├── HITS FOUND → evaluate: rename property or document exception
    └── CLEAN ▼
[Step 7] git commit -m "refactor(dtos): rename [Domain] DTOs to convention"
    │
    ▼
DOMAIN COMPLETE → update checklist → next domain
```

### Domain sequence with full rename map

**PR #1 — Infrastructure** *(unblocks all others)*

| File | Class change | File rename? |
|---|---|---|
| `NamedDTO.cs` | `NamedDTO` → `NamedResponse` | Yes → `NamedResponse.cs` |
| `PaginationMetadataDTO.cs` | `PaginationMetadataDTO` → `PaginationMetadata` | Yes → `PaginationMetadata.cs` |
| `ReportMetadataDTO.cs` | `ReportMetadataDTO` → `ReportMetadata` | Yes → `ReportMetadata.cs` |
| `ResponseCreateDTO.cs` | class already `CreatedResponse` ✓ | Yes → `CreatedResponse.cs` |
| `ResponseDataDTO.cs` | class already `ListResponse<T>` ✓ | Yes → `ListResponse.cs` |
| `ResponseDataExDTO.cs` | class already `PagedResponse<T,TMeta>` ✓ | Yes → `PagedResponse.cs` |

**PR #2 — Auth** *(verify only — already clean)*
Run grep audit. If zero `DTO` occurrences — mark done, no changes needed.

**PR #3 — Accounts**

| Old | New |
|---|---|
| `AccountCreateDTO` | `CreateAccountRequest` |
| `AccountUpdateDTO` | `UpdateAccountRequest` |
| `AccountDetailsDTO` | `AccountResponse` |
| `AccountListDetailsDTO` | `AccountSummary` |

**PR #4 — Categories** ⚠️ *cross-domain flag*

| Old | New |
|---|---|
| `CategoryCreateDTO` | `CreateCategoryRequest` |
| `CategoryUpdateDTO` | `UpdateCategoryRequest` |
| `CategoryDetailsDTO` | `CategoryResponse` |
| `CategoryListDetailsDTO` | `CategorySummary` |

⚠️ `CategoryListDetailsDTO` is used in `ReportsController` and `ReportService`. IDE rename handles it automatically — verify Report layer compiles and tests pass as part of this PR's verification gate.

**PR #5 — Budgets**

| Old | New |
|---|---|
| `BudgetCreateDTO` | `CreateBudgetRequest` |
| `BudgetUpdateDTO` | `UpdateBudgetRequest` |
| `BudgetDetailsDTO` | `BudgetResponse` |

**PR #6 — Transactions** *(largest domain)*

| Old | New | Note |
|---|---|---|
| `TransactionCreateDTO` | `CreateTransactionRequest` | |
| `TransactionUpdateDTO` | `UpdateTransactionRequest` | |
| `TransactionDetailsDTO` | `TransactionResponse` | |
| `TransferCreateDTO` | `CreateTransferRequest` | Controller-facing |
| `TransferFromCreateDTO` | `TransferFromData` | Internal service only |
| `TransferToCreateDTO` | `TransferToData` | Internal service only |
| `ResponseTransferDTO` | `TransferResponse` | |

**PR #7 — Report**

| Old | New |
|---|---|
| `BudgetComparisonDTO` | `BudgetComparisonResponse` |
| `MonthlyHistoryDTO` | `MonthlyHistoryResponse` |

**PR #8 — ExchangeRate**

| Old | New |
|---|---|
| `ExchangeRateDTO` | `ExchangeRateResponse` |

### Post-migration (after all PRs merged)

1. `grep -r "DTO" inex.Services/Models/Records --include="*.cs"` → zero hits expected
2. Delete `docs/implementation/dto-migration-checklist.md`
3. Confirm CLAUDE.md naming ruleset is accurate and complete
