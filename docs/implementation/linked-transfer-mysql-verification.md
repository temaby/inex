# Linked internal transfer MySQL verification

Status: prepared, **not executed**. The user declined test database writes on 2026-10-16; no disposable database was created and the opt-in suite was not run. Production release through PR/merge was separately requested on 2026-10-22. This release authorization does not authorize running the opt-in test database scenario.

The normal `dotnet test` run skips `InternalTransferRequestMySqlTests`. It never reads the application connection configuration. No external exchange provider or application startup is involved.

## Approval scope

Approve a disposable MySQL 8.0 database named `inex_transfer_verify_<suffix>`, its endpoint, and credentials supplied privately through the environment. The suite applies all EF migrations, inserts isolated fixture users/accounts/categories/link/requests/transactions, modifies/revokes one fixture link, and deletes fixture postings/accounts. It retains audit records for inspection and does not drop the database. The operator owns cleanup of the disposable database. Do not use `inex_db`, development, staging, or production data.

After approval, set `INEX_TRANSFER_MYSQL_CONNECTION` privately and `INEX_TRANSFER_MYSQL_APPROVED=1`, then run:

```powershell
dotnet test inex.Tests --filter FullyQualifiedName~InternalTransferRequestMySqlTests --logger "console;verbosity=minimal"
```

The suite verifies migration application, actual unique constraints, same-key retries and concurrent submissions, accept/reject contention, no partial posting, link revocation against acceptance, pending account-cascade guards, and audit survival under posting/account deletion. Independent contexts/connections exercise MySQL rather than EF InMemory. A losing database deadlock/timeout maps to a conflict and can be retried with the original submission key.

Inspect the generated additive migration SQL before approval:

```powershell
# Design-time generation only; use a dummy design-time connection, no DB connection is required.
dotnet ef migrations script AddUserAccountLink AddInternalTransferRequests --project inex.Data --startup-project inex --no-build --output docs/implementation/linked-transfer-migration.sql
```

The checked-in SQL is review evidence only; it is not executed automatically. Report the suite as pending until a real approved run succeeds.
