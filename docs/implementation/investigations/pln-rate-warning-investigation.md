# Investigation: PLN Rate Warning

## Hand-off Brief

1. **What happened.** The Transactions UI reported a missing PLN rate even though a USD-to-PLN row exists for the same date.
2. **Where the case stands.** Concluded; that row is marked temporary (`is_temporary = 1`) and the cache-only endpoint intentionally omits temporary rows.
3. **What's needed next.** Decide whether same-day temporary rates should be eligible for Transaction KPI conversion; the current behavior matches the cache-only design.

## Case Info

| Field            | Value |
| ---------------- | ----- |
| Ticket           | N/A |
| Date opened      | 2026-08-16 |
| Status           | Concluded |
| System           | InEx local application |
| Evidence sources | User-supplied screenshot; frontend localization; source code |

## Problem Statement

When the Transactions page shows `Rate warning — No cached PLN rate for 2026-08-16 in August 2026`, the user observes that the database contains a 2026-08-16 `USD` to `PLN` rate.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| User screenshot | Available | Shows `USD`, `PLN`, rate `3.7234...`, date `2026-08-16`, temporary flag `1`. |
| Warning copy | Available | `inex/ClientApp/public/locales/en/translation.json:342` confirms the rendered message represents a missing cached rate. |
| Cache-lookup source | Available | Transactions calls the cache-only endpoint, which excludes temporary rates. |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Trace the frontend cache lookup and input rate payload. | High | Done | Cache-only endpoint traced. |
| 2 | Compare the required rate pair with the screenshot's `USD` → `PLN` row. | High | Done | The pair matches; temporary status rejects it. |

## Timeline of Events

| Time | Event | Source | Confidence |
| ---- | ----- | ------ | ---------- |
| 2026-08-16 | Rate-warning message observed for PLN / 2026-08-16. | User report | Confirmed |
| 2026-08-16 09:06:37 | Screenshot shows a `USD` → `PLN` record for 2026-08-16. | User screenshot | Confirmed |

## Confirmed Findings

### Finding 1: The screenshot contains a USD-to-PLN rate, not a PLN-to-USD rate

**Evidence:** User screenshot, row 716197.

**Detail:** The visible columns show `USD` as the base currency and `PLN` as the target currency, with a rate of approximately `3.7234` on 2026-08-16.

### Finding 2: The UI message is intentionally emitted for a cache lookup miss

**Evidence:** `inex/ClientApp/public/locales/en/translation.json:342`.

**Detail:** The translation template is `No cached {{currency}} rate for {{date}} in {{period}}.`

### Finding 3: The supplied row is temporary

**Evidence:** User screenshot, final visible value `1`; `inex.Data/Models/ExchangeRate.cs:29-31` maps that value to `is_temporary`.

**Detail:** The screenshot's final column is the model's `is_temporary` column and has value `1` for the USD-to-PLN row.

### Finding 4: The endpoint used by Transactions excludes temporary rates

**Evidence:** `inex/ClientApp/src/store/rates/rates-action.ts:17-26`; `inex.Services/Services/ExchangeRateService.cs:97-121`.

**Detail:** Transactions requests `/api/exchange/rates/cached`. `GetCached` filters rates with `&& !rate.IsTemporary`, so the temporary USD-to-PLN row is not returned to the browser.

## Deduced Conclusions

### Deduction 1: The temporary PLN row cannot satisfy the Transactions cache lookup

**Based on:** Findings 1, 3, and 4.

**Reasoning:** The row's `is_temporary` value is `1`. The only endpoint used by Transactions returns exclusively `is_temporary = 0` rows. Therefore the browser receives no PLN rate for the date, regardless of the visible row's pair and value.

**Conclusion:** The warning is expected under the current implementation.

## Hypothesized Paths

### Hypothesis 1: The UI expects a different currency pair or direction

**Status:** Refuted

**Theory:** The user's preferred base currency or conversion direction does not match the visible `USD` → `PLN` row.

**Supporting indicators:** Exchange-rate records are pair-specific; the warning does not display the preferred base currency.

**Would confirm:** The lookup source or network payload requires a pair other than `USD` → `PLN`.

**Would refute:** The lookup explicitly uses the 2026-08-16 `USD` → `PLN` row yet reports it absent.

**Resolution:** The visible `USD` → `PLN` orientation is exactly the orientation the Transactions conversion helper requests when USD is the base currency (`inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts:190-205`). The rate is rejected earlier by the endpoint because it is temporary.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ------ | ------------- |
| Live application's exact database connection | The configured connector is a different/stale database | Inspect the application's safe, non-secret environment configuration locally. |

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| Error origin | `inex/ClientApp/public/locales/en/translation.json:342` |
| Trigger | A conversion bucket has no usable cached rate. |
| Condition | A non-zero PLN bucket requires a rate, but `/rates/cached` omitted the temporary source row. |
| Related files | `inex/ClientApp/src/store/rates/rates-action.ts`; `inex.Services/Services/ExchangeRateService.cs`; `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts`. |

## Conclusion

**Confidence:** High

The rate exists but is explicitly marked temporary. Transactions calls the cache-only endpoint, which returns only non-temporary rates; this omission produces the rate warning by design. The database connector available in this session is also a different/stale database: it contains no 2026-08-16 rate rows and its latest rate date is 2026-06-17, so it cannot validate the screenshot's live connection.

## Recommended Next Steps

### Fix direction

If the product should show provisional same-day conversions, change the temporary-rate policy and add coverage. Otherwise, wait for the rate to be finalized by synchronization; no code defect is indicated.

### Diagnostic

Inspect the response from `/api/exchange/rates/cached?startDate=2026-08-01&endDate=2026-08-16`; it will not include the screenshot's temporary PLN row.

## Reproduction Plan

Open the August 2026 Transactions view with a non-zero PLN transaction dated 2026-08-16. With `is_temporary = 1`, the cache endpoint omits the row and the warning appears. After a non-temporary rate exists for the same pair/date, refresh the view; the warning should disappear.

## Follow-up: 2026-08-16

### New Evidence

- `inex/ClientApp/src/store/rates/rates-action.ts:17-26` proves Transactions uses the cache-only endpoint.
- `inex.Services/Services/ExchangeRateService.cs:107-111` proves that endpoint filters out `is_temporary = 1`.
- `inex/ClientApp/src/pages/Transactions/transaction-ledger-utils.ts:190-205` proves `USD` → `PLN` is the expected pair for a PLN bucket when USD is the profile base currency.
- The configured MySQL read-only connector returns no rates dated 2026-08-16 and reports a latest rate date of 2026-06-17; it is not the database shown in the screenshot.

### Updated Conclusion

The warning is caused by the intended exclusion of temporary same-day rates, not a missing USD-to-PLN record or a pair-direction mismatch.
