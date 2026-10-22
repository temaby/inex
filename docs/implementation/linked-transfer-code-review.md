# Linked internal transfer code review — 2026-10-16

Baseline: `7affd95c533bf98ff70c4327a5afd05a537eae52`.

Three independent reviewers examined the tracked and untracked implementation: blind adversarial review, edge-case review, and acceptance audit. Findings were classified as implementation patches within the approved intent; no product decision changed.

| Finding | Resolution | Regression coverage |
| --- | --- | --- |
| Pending master posting could change currency through account update | Serializable owner-scoped pending guard blocks currency changes; metadata remains editable | Pending, resolved, metadata and foreign-owner account updates |
| Identical submission with sub-microsecond date could conflict after MySQL round-trip | Normalize dates to `datetime(6)` precision before persistence and comparison | Pure policy, lifecycle and opt-in MySQL retry |
| Request query cache could display a previous authenticated user's records | Include authenticated user in cache identity; skip anonymous reads and reset pagination | Query cache isolation and user-switch rendering |
| External acceptance updated request status without refreshing financial data | Invalidate ledger and dependent account/report caches when observing resolution | Polling status transition and disappearance after status-based pagination |
| Large page number could overflow the offset | Calculate offset using `long`; return an empty out-of-range page | Extreme page number regression |

The acceptance reviewer rechecked the currency guard and confirmed the original finding resolved. Targeted edge re-review confirmed cache isolation, date precision and offset fixes, and identified the pagination variant of external acceptance; this variant received an additional regression test and passed a final targeted reviewer recheck.

Real MySQL migration, constraints and concurrency verification remains pending separately approved database writes. Passing InMemory tests do not establish those properties. See [the opt-in verification plan](linked-transfer-mysql-verification.md).
