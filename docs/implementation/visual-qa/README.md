# Visual QA Harness

Stage 4 starts with Accounts only. The harness in `inex/ClientApp/visual-qa/accounts.mjs` uses the production React route served by Vite in `test` mode, then intercepts every browser `/api/*` request and fulfills it from `inex/ClientApp/src/test/fixtures/accountsVisualFixture.ts`.

Run from `inex/ClientApp`:

```powershell
npm run visual-qa:accounts
```

Output is refreshed under `docs/implementation/visual-qa/stage-4-accounts/`:

- screenshots for populated, mobile, filter-empty, first-use empty, drawer-open, expanded-row, collapsed-group, and load-error states
- `qa-summary.json` with viewport metrics, overflow checks, mobile bottom-nav checks, request logs, and `dataMode: fixture`

The command does not require a real user password and does not call the real backend. Any unhandled `/api` request is failed by the harness and recorded in `qa-summary.json`.

Playwright is not currently installed in `inex/ClientApp/package.json`. This first harness uses Chrome DevTools Protocol with a local headless Chrome or Edge executable. If no browser is detected, set `CHROME_PATH` or `EDGE_PATH`; adding Playwright should be handled in a dedicated dependency PR.
