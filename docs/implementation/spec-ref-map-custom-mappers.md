---
status: in-review
created: 2026-05-23
plan_item: Ref-Map
branch: refactor/ref-map-custom-mappers
---

# Ref-Map: Custom Mapper Migration

## Selected Plan Item

`Ref-Map` from `docs/MASTER_PLAN.md`: replace AutoMapper with explicit, compile-time-visible mapping.

The master plan recommends Mapperly, but this implementation intentionally uses custom C# mappers instead. The project mappings are currently small, explicit, and domain-oriented; removing the runtime mapping package gives the intended safety benefit without introducing source-generator build complexity.

## Scope

This PR removes AutoMapper from the service layer and replaces it with dedicated mapper extension classes under `inex.Services/Models/Mappers`.

Included domains:

- Account
- Budget
- Category
- Currency
- ExchangeRate
- Transaction and transfer helper records

Out of scope:

- DTO inheritance redesign, such as `AccountResponse : UpdateAccountRequest`.
- Existing report title i18n issues.
- Existing transaction tag/ref SQL translation issue.
- Business behavior changes in create/update flows.

## Implementation Notes

- `Service` and `InExService` no longer accept or store `IMapper`.
- Shared response helpers now accept a `Func<T, K>` mapper delegate.
- Each service calls explicit mapper methods such as `AccountMapper.ToResponse` or `UpdateBudgetRequest.ApplyTo`.
- The AutoMapper package reference and profile classes were removed.
- Dependency injection no longer registers AutoMapper.
- Exchange-rate service tests no longer create an unused `IMapper` mock.

## Behavior Preservation

The custom mappers preserve the previous profile-level mappings:

- `ExchangeRate.Created` still maps to `ExchangeRateResponse.Date`.
- `Transaction.Value` still maps to `TransactionResponse.Amount`.
- Transfer-from values still become negative transactions.
- Category update still leaves parent, key, system flag, and system code unchanged.
- Budget response still derives `CategoryIds` from `BudgetCategories`.
- Account summary still leaves `Value` and `ThisMonthNet` for `AccountService.GetDetails` enrichment.

## Validation

Completed locally:

```powershell
dotnet build
dotnet test
```

Both commands passed on 2026-05-23.
