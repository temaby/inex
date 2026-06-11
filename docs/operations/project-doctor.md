# Project Doctor

`scripts/doctor.ps1` is a non-destructive readiness check for local investigation and implementation sessions. It does not start the app, run Docker, call external APIs, read `.env` files, or print secrets.

Run from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1 -All
```

Focused checks:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1 -Ui
powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1 -Backend
powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1 -Db
powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1 -GitHub
```

No switch defaults to `-All`.

## Result States

- `PASS`: required local prerequisite is present.
- `FAIL`: selected check is not ready; the script exits non-zero.
- `WARN`: investigate before proceeding, but the script does not fail on this row.
- `INFO`: reported state only.

Occupied ports are warnings because an existing dev server may be intentional. Confirm the listener is expected before starting another UI or backend process.

## DB MCP Verification

PowerShell cannot call Codex MCP tools directly. The DB check confirms that the project-local MCP files exist without reading their contents, then reminds Codex agents to verify the server through MCP before DB work:

```sql
SELECT 1 AS ok
```

Run that query through `mcp_server_mysql.mysql_query` or `mysql_query` from the Codex MCP environment. Do not use Docker, local `mysql`, migrations, or application startup as the first DB verification path.
