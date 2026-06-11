# Exchange-rate cache repair

## Scope

The exchange-rate cache fix promotes past temporary rows during normal rate synchronization when a prior non-temporary rate exists for the same base and target currency. That means most existing rows should self-heal the next time the affected date and target currency are requested.

Manual repair is only needed when operations wants to repair existing past temporary rows before user traffic touches them.

## Verification query

Use a read-only query first and review the result set before any write. Replace `CURRENT_DATE()` with the deployment date if the database session timezone is not UTC.

```sql
SELECT
  created,
  from_code,
  to_code,
  rate,
  is_temporary
FROM exchange_rate
WHERE is_temporary = 1
  AND created < CURRENT_DATE()
ORDER BY created, from_code, to_code;
```

## Safe repair option

For each past temporary row, promote only when a prior non-temporary rate exists for the same `from_code` and `to_code`. This matches the application carry-forward behavior and preserves today's temporary placeholders.

```sql
UPDATE exchange_rate stale
JOIN (
  SELECT
    candidate.exchange_rate_pk,
    prior.rate
  FROM exchange_rate candidate
  JOIN exchange_rate prior
    ON prior.from_code = candidate.from_code
   AND prior.to_code = candidate.to_code
   AND prior.is_temporary = 0
   AND prior.created = (
      SELECT MAX(prior_match.created)
      FROM exchange_rate prior_match
      WHERE prior_match.from_code = candidate.from_code
        AND prior_match.to_code = candidate.to_code
        AND prior_match.is_temporary = 0
        AND prior_match.created < candidate.created
   )
  WHERE candidate.is_temporary = 1
    AND candidate.created < CURRENT_DATE()
) repair
  ON repair.exchange_rate_pk = stale.exchange_rate_pk
SET stale.rate = repair.rate,
    stale.is_temporary = 0
WHERE stale.is_temporary = 1
  AND stale.created < CURRENT_DATE();
```

## Post-repair validation

Run the verification query again. Remaining rows mean there is no prior actual rate to carry forward for that `(created, from_code, to_code)` pair, so the application should resolve them through provider data or leave them unresolved if providers do not cover them.

Do not update rows where `created = CURRENT_DATE()`. Same-day rows are intentionally temporary until historical rates are available.
