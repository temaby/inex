# Investigation: Family statistics scope

## Hand-off Brief

The application already supports one-owner linked viewing and multi-owner monthly PDF aggregation. A family statistics view needs an explicitly authorized multi-owner read scope and agreed aggregation rules. Define the first release around a read-only family dashboard, reusing existing report calculations where their semantics match.

## Case Info

| Field | Value |
| --- | --- |
| Ticket | N/A |
| Date opened | 2026-11-07 |
| Status | Concluded — initial scope assessment |
| Evidence sources | Source code and linked-account specifications; static inspection only |

## Problem Statement

User request: «к существующей возможности просмотра связанных аккаунтов для мастер аккаунта я бы хотел добавить просмотр семейной статистики, где будут отображаться сводные данные со всех аккаунтов. что надо для этого изменения?»

## Evidence Inventory

| Source | Status | Notes |
| --- | --- | --- |
| Linked authorization | Available | Active directed master-to-linked relationship |
| Monthly PDF aggregation | Available | Existing multi-owner report service |
| Runtime and database verification | Missing | Not required for this initial scope assessment; required for implementation validation |
| Product decisions | Partial | Participant membership, category grouping and dashboard scope need agreement |

## Confirmed Findings

### Finding 1: Existing linked read scope resolves one owner

Evidence: `inex.Services/Services/Authorization/LinkedAccountReadScopeResolver.cs:16`, `:24`, `:34`.

The resolver defaults to the authenticated user, validates an active directed relationship for a requested linked user, and returns one owner ID. Unauthorized linked reads return the generic missing-resource path.

### Finding 2: Monthly reports already aggregate selected linked users

Evidence: `inex.Services/Services/ReportService.cs:290`, `:316`, `:435`, `:468`; `docs/implementation/spec-linked-account-monthly-pdf-export.md:18`.

The monthly financial report accepts plural linked-user selection and is used by PDF generation. The specification defines aggregation in the master's reporting currency with eligible active accounts.

### Finding 3: Category identity remains owner-specific

Evidence: `inex.Services/Services/ReportService.cs:499`.

Monthly category summaries group by `(UserId, CategoryId)`. Equal category names do not establish shared family category identity.

### Finding 4: Dashboard and PDF need different presentation contracts

Evidence: `inex/ClientApp/src/pages/Dashboard/useDashboardData.ts:22`, `:49`, `:55`, `:84`; `inex.Services/Models/Records/Report/MonthlyFinancialReport.cs:20`; `inex.Services/Services/ReportService.cs:496`.

Dashboard requests assume one owner and use that owner's base currency. Monthly statistics cover all active financial accounts, while Visual Dashboard balances use accounts shown in overviews. The PDF category output has names and amounts, with small amounts grouped into Other; interactive family drill-down needs stable owner-aware identity and deliberate grouping rules.

### Finding 5: Internal transfer posting is asymmetric until acceptance

Evidence: `inex.Services/Services/InternalTransferRequestService.cs:35`, `:90`, `:96`, `:106`; `inex.Services/Services/ReportService.cs:396`, `:408`, `:528`.

The master's posting is created when requesting a transfer; the linked participant's opposite posting is created on acceptance using the same currency and operation date. Monthly income and expenses exclude system categories and show internal transfers separately. Family balances must reflect actual postings and explain incomplete transfer pairs rather than invent a second posting.

## Deduced Conclusions

The existing relationship model and monthly aggregation are useful foundations. A dashboard family view cannot be implemented solely by adding a selector option because the existing delegated read scope returns one owner. A schema migration is not inherently required for a transient family view; persisted preferences or explicit shared-category mapping would require separate design assessment.

## Hypothesized Paths

### Hypothesis 1: Existing linked-account support can underpin family statistics

Status: Confirmed for relationship authorization and monthly PDF aggregation; suitability of each dashboard calculation must be checked during implementation.

Resolution: Existing source provides both directed access and a multi-owner monthly report path. This confirms reusable foundations, not a complete family dashboard implementation.

## Missing Evidence

| Gap | Impact | How to obtain |
| --- | --- | --- |
| Automatic full family versus selected participants | Defines membership and filters | Product decision |
| Separate versus merged categories | Defines chart identity and drill-down | Product decision |
| Dashboard only versus all reports | Defines delivery size | Product decision |
| All active versus overview-visible financial accounts for balances | Defines the meaning of the combined balance | Product decision |
| Historical membership policy | Current active links versus membership at the report date | Product decision; existing PDF uses current authorization |

## Recommended Next Steps

Create a dedicated feature specification covering a read-only family dashboard, authenticated master plus active direct linked users, a single display currency, eligible account rules, incomplete-rate behavior, and internal transfer states. Keep authorization server-side and recheck links on every request. Preserve per-owner category identities until explicit mapping rules are approved. Include service calculations, API isolation/revocation, stale frontend request protection, real MySQL query verification and responsive visual QA in acceptance criteria.

## Verification Plan

Test multi-participant and multi-currency calculations, inactive financial accounts, category collisions and missing-rate completeness. Cover anonymous access, unrelated/reverse/sibling/pending/revoked links, participant tampering and revocation after a page has loaded. Verify pending, accepted, rejected and cancelled internal transfers against actual posting semantics. Check family/self/individual cache isolation and stale responses, EN/RU and responsive states; use mocked exchange providers and verify provider-dependent queries against MySQL.

## Investigation Backlog

| Item | Status |
| --- | --- |
| Establish existing linked scope and aggregation foundation | Done |
| Agree product decisions and produce implementation spec | Open |
| Implement and verify | Outside this assessment |

## Conclusion

Confidence: High for the existence of reusable authorization and monthly aggregation; medium for final implementation scope until the product decisions are settled. No application code has been changed and no runtime tests have been run for this assessment.

## Follow-up: 2026-11-08

The user selected integration into the existing dashboard rather than a separate page and authorized the first version. Implemented under `spec-family-dashboard.md`: active direct family, all active accounts, master currency, current balances, monthly flows, owner-separated categories and read-only transient context. Specification, implementation, independent review and fixture-based visual QA are complete.
