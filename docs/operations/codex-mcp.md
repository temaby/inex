# Codex MCP Setup

This project uses a project-scoped Codex MCP configuration for local database inspection.

## MySQL MCP Server

The MySQL MCP server is configured locally in:

```text
D:\work\inex\.codex\config.toml
```

That file is intentionally ignored by Git because it contains local machine paths and the MySQL password.

The global Codex config should not contain the `mcp_server_mysql` entry. The only global requirement is that this project is trusted:

```toml
[projects."d:\\work\\inex"]
trust_level = "trusted"
```

## Expected Local Configuration

Use this shape in `D:\work\inex\.codex\config.toml`:

```toml
[mcp_servers.mcp_server_mysql]
command = "C:\\Program Files\\nodejs\\node.exe"
args = ["D:\\work\\inex\\.mcp-local\\mysql\\node_modules\\@benborla29\\mcp-server-mysql\\dist\\index.js"]

[mcp_servers.mcp_server_mysql.env]
ALLOW_DELETE_OPERATION = "false"
ALLOW_INSERT_OPERATION = "false"
ALLOW_UPDATE_OPERATION = "false"
MYSQL_DB = "inex_db"
MYSQL_HOST = "127.0.0.1"
MYSQL_PASS = "<local password>"
MYSQL_PORT = "3306"
MYSQL_QUERY_TIMEOUT = "10000"
MYSQL_RATE_LIMIT = "30"
MYSQL_USER = "codex"
npm_config_cache = "D:\\work\\inex\\.mcp-npm-cache"
```

The expected package is:

```text
@benborla29/mcp-server-mysql@2.0.8
```

## Safety Defaults

The MCP server should use the dedicated low-privilege MySQL user:

```text
codex
```

Mutation operations should remain disabled by default:

```toml
ALLOW_UPDATE_OPERATION = "false"
ALLOW_INSERT_OPERATION = "false"
ALLOW_DELETE_OPERATION = "false"
```

Enable write operations only for a specific maintenance task, then disable them again after verification.

## Ignored Local Files

These paths are local runtime/config artifacts and should stay ignored:

```gitignore
.codex/config.toml
.mcp-local/
.mcp-npm-cache/
.tmp-npm-cache/
```

## Verification

After changing MCP configuration, restart Codex Desktop or start a fresh Codex session from `D:\work\inex`.

Run a read query:

```sql
SELECT 1 AS ok
```

Expected result:

```json
[{ "ok": 1 }]
```

Confirm write protection with a no-op update:

```sql
UPDATE exchange_rate SET rate = rate WHERE 1 = 0
```

Expected result:

```text
UPDATE operations are not allowed for schema 'inex_db'
```

Also verify that `mcp_server_mysql` is not available from unrelated project directories.
