# Visual QA Harness

Stage 4 uses page-scoped fixture harnesses. Each harness serves the production React route through Vite in `test` mode, then intercepts every browser `/api/*` request and fulfills it from page-specific fixture data under `inex/ClientApp/src/test/fixtures/`.

Run from `inex/ClientApp`:

```powershell
npm run visual-qa:accounts
npm run visual-qa:transactions
```

Output is refreshed under:

- `docs/implementation/visual-qa/stage-4-accounts/`
- `docs/implementation/visual-qa/stage-4-transactions/`

Each output folder contains:

- screenshots for the page-specific populated, mobile, filter-empty, first-use empty, drawer/row interaction, and load-error states
- `qa-summary.json` with viewport metrics, overflow checks, mobile bottom-nav checks, request logs, and `dataMode: fixture`

The command does not require a real user password and does not call the real backend. Any unhandled `/api` request is failed by the harness and recorded in `qa-summary.json`.

Playwright is not currently installed in `inex/ClientApp/package.json`. This first harness uses Chrome DevTools Protocol with a local headless Chrome or Edge executable. If no browser is detected, set `CHROME_PATH` or `EDGE_PATH`; adding Playwright should be handled in a dedicated dependency PR.

Transactions coverage currently includes:

- populated desktop at 1440px and 1024px
- populated mobile at 390px and 360px
- filter-empty at 390px
- first-use empty at 390px
- add drawer open at 390px and 360px
- row edit drawer opened from the ledger row at 1440px and 390px
- controlled load-error at 390px
