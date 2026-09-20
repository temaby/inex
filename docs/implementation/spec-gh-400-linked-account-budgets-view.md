---
title: 'Show linked-account budgets in read-only mode'
type: 'feature'
created: '2026-09-20'
status: 'review'
baseline_commit: '7396d2b0a7e9794bc1d937e45dd77f8f53a9a5b1'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/inex/ClientApp/AGENTS.md'
  - '{project-root}/docs/design/docs/design-implementation-guide.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Budget list and comparison reads are fixed to the authenticated user, so a master selecting an active linked account cannot inspect that user's budget plan and spend while the page still exposes unsafe mutation controls.

**Approach:** Extend only the two budget read contracts with optional linked-user scope resolved on every request, then make the Budgets page use the shared linked-account context and render the selected user's plan, financial setup, and base currency in explicit read-only mode.

## Boundaries & Constraints

**Always:** Resolve delegated reads through `ILinkedAccountReadScopeResolver`; use the resolved user consistently for budgets, categories, transactions, accounts, rates, and calculations; preserve current period, sorting, expansion, loading, empty, error, rounding, and currency semantics; retain authenticated-user ownership on every mutation.

**Ask First:** Any schema, public response-shape, calculation, period-boundary, or shared linked-context change beyond the optional query parameter and existing recovery contract.

**Never:** Permit linked budget mutations; combine users; persist linked selection; call live exchange providers in tests; weaken 404 behavior for pending, rejected, revoked, unrelated, reverse, or sibling links.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Self view | `linkedUserId` omitted | Existing owner budgets and comparison remain unchanged | Existing errors |
| Active delegated view | Active directed master-to-linked relationship | Only linked user's budgets and linked-scoped calculations are returned | N/A |
| Invalid delegated view | Pending/rejected/revoked/unrelated/reverse/sibling relationship | No foreign data is returned | Existing linked-scope 404 problem |
| Revoked during view | Previously selected relationship becomes unavailable | Next request returns 404 and shared frontend recovery clears selection | Return to self context |
| Read-only UI | Linked user selected | Period/sort/expand work; no create/copy/edit/delete entry point is rendered | Localized read-only indicator remains visible |

</frozen-after-approval>

## Code Map

- `inex/Controllers/BudgetsController.cs` -- budget-list read boundary; mutations remain owner-only.
- `inex/Controllers/ReportBudgetController.cs` -- budget-comparison read boundary.
- `inex.Services/Services/BudgetReportService.cs` -- consistently scopes every calculation dependency to its user argument.
- `inex.Tests/Budgets/BudgetsControllerTests.cs` -- integration coverage for delegated authorization and revocation.
- `inex.Services.Tests/Services/BudgetReportServiceTests.cs` -- focused calculation dependency scoping without external providers.
- `inex/ClientApp/src/store/budgets/budgets-api.ts` and `src/store/budgetReport/budgetReport-api.ts` -- optional query arguments and scope-aware cache keys.
- `inex/ClientApp/src/pages/Budgets.tsx` -- linked context, base currency, categories, read-only state, and preserved interaction states.
- `inex/ClientApp/src/pages/Budgets.empty-focus.test.tsx` plus API tests -- linked queries, hidden mutations, period/empty/error/revocation behavior.
- `inex/ClientApp/public/locales/{en,ru}/translation.json` -- localized linked read-only copy.

## Tasks & Acceptance

**Execution:**
- [ ] Add optional linked scope to both GET controllers through the shared resolver without changing mutation signatures.
- [ ] Add focused authorization and service-scoping tests proving every report dependency receives the resolved user.
- [ ] Extend budget API query arguments and cache tags with linked identity.
- [ ] Adapt Budgets page data sources, display currency, categories, actions, and expanded content to linked read-only context.
- [ ] Add localized copy and focused frontend coverage, then capture page-specific responsive evidence when the harness supports linked budgets.

**Acceptance Criteria:**
- Given an active master-to-linked relationship, when budgets and comparison are requested, then every returned budget and computed value belongs to the linked user.
- Given no linked user, when the same requests and UI load, then self-view behavior is unchanged.
- Given invalid or revoked scope, when the next delegated request fails, then no foreign data remains selectable and the frontend recovers to self context.
- Given linked mode, when the Budgets page is used, then period selection, sorting, expansion, loading, empty, and error states remain available without any mutation control.

## Spec Change Log

## Design Notes

The selected linked account already carries `baseCurrency`; resolve it through the existing currency list just as Accounts/Categories do. Keep the shared `axiosBaseQuery` 404 recovery path as the single revocation mechanism. Expanded budget rows should expose planning detail without mounting `BudgetEditForm` in linked mode.

## Verification

**Commands:**
- `dotnet test inex.Services.Tests/ --filter BudgetReportServiceTests` -- focused calculation scoping passes.
- `dotnet test inex.Tests/ --filter BudgetsControllerTests` -- delegated authorization and owner-only behavior pass when integration DB is available.
- `npm test -- --run src/store/budgets/__tests__/budgets-api.test.ts src/store/budgetReport/__tests__/budgetReport-api.test.ts src/pages/Budgets.empty-focus.test.tsx` -- focused frontend contract and page states pass.
- `npm run build` -- TypeScript and production bundle succeed.
- `npm run lint` -- frontend lint succeeds.
