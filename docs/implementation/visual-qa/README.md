# Visual QA Harness

Visual QA uses page-scoped fixture harnesses. Each harness serves the production React route through Vite in `test` mode, then intercepts every browser `/api/*` request and fulfills it from page-specific fixture data under `inex/ClientApp/src/test/fixtures/`.

Shared CDP browser control, Vite startup, screenshot capture, request interception, and common summary checks live in `inex/ClientApp/visual-qa/harness.mjs`. Page scripts should keep only their fixture route handlers, state matrix, interactions, page-specific metrics, and summary metadata.

Run from `inex/ClientApp`:

```powershell
npm run visual-qa:accounts
npm run visual-qa:auth
npm run visual-qa:budgets
npm run visual-qa:categories
npm run visual-qa:dashboard
npm run visual-qa:hero-consistency
npm run visual-qa:profile
npm run visual-qa:reports
npm run visual-qa:transactions
npm run visual-qa:verify
```

Output is refreshed under:

- `docs/implementation/visual-qa/accounts/`
- `docs/implementation/visual-qa/auth/`
- `docs/implementation/visual-qa/budgets/`
- `docs/implementation/visual-qa/categories/`
- `docs/implementation/visual-qa/dashboard/`
- `docs/implementation/visual-qa/hero-consistency/`
- `docs/implementation/visual-qa/profile/`
- `docs/implementation/visual-qa/reports/`
- `docs/implementation/visual-qa/transactions/`

Each output folder contains:

- screenshots for the page-specific populated, mobile, filter-empty, first-use empty, drawer/row interaction, and load-error states
- `qa-summary.json` with viewport metrics, overflow checks, mobile bottom-nav checks, request logs, and `dataMode: fixture`

The command does not require a real user password and does not call the real backend. Any unhandled `/api` request is failed by the harness with HTTP 502 and recorded in `qa-summary.json`.

After refreshing the full suite, run:

```powershell
npm run visual-qa:all
npm run visual-qa:verify
```

`visual-qa:verify` reads only the canonical summary folders listed above. It checks required route coverage, `dataMode: fixture`, `checks.hasFailures: false`, `harness.realBackendCalled: false`, `unhandledApiRequests: []`, required screenshot entries/files, and `generatedAt` freshness. The default freshness window is 24 hours; for local diagnostics against older captured evidence, pass an explicit window:

```powershell
npm run visual-qa:verify -- --max-age-hours=72
```

Playwright is not currently installed in `inex/ClientApp/package.json`. This first harness uses Chrome DevTools Protocol with a local headless Chrome or Edge executable. If no browser is detected, set `CHROME_PATH` or `EDGE_PATH`; adding Playwright should be handled in a dedicated dependency PR.

Auth coverage currently includes:

- login view at 1440px, 1024px, 390px, and 360px
- register view at 1440px, 1024px, 390px, and 360px
- controlled invalid-credentials login error at 390px
- filled register form with password strength meter at 390px
- controlled invalid invite-token register error at 390px
- controlled register currency-load error at 390px
- filter-empty, first-use empty, drawer-open, expanded-row, collapsed-group, and mobile bottom-nav marked not applicable for public auth routes

Transactions coverage currently includes:

- populated desktop at 1440px and 1024px
- populated mobile at 390px and 360px
- filter-empty at 390px
- first-use empty at 390px
- add drawer open at 390px and 360px
- row edit drawer opened from the ledger row at 1440px and 390px
- controlled load-error at 390px

Categories coverage currently includes:

- populated tree view at 1440px, 390px, and 360px
- populated by-spend view at 1024px
- filter-empty at 390px
- first-use empty at 390px
- add drawer open at 390px and 360px
- inline edit opened from a category row at 1440px and 390px
- controlled load-error at 390px

Budgets coverage currently includes:

- populated budget planning view at 1440px, 390px, and 360px
- populated amount-sorted view at 1024px
- filter-empty at 390px
- first-use empty at 390px
- add drawer open at 390px and 360px
- inline budget edit expanded from a budget row at 1440px and 390px
- controlled load-error at 390px

Reports coverage currently includes:

- populated hub at 1440px, 1024px, 390px, and 360px
- populated category drill-down at 1440px
- empty category drill-down at 390px
- populated budget drill-down at 390px
- controlled budget report load-error at 390px
- populated cash-flow history chart at 1440px
- populated heatmap drill-down at 390px
- controlled heatmap load-error at 390px

Dashboard coverage currently includes:

- populated dashboard at 1440px, 1024px, 390px, and 360px
- first-use empty dashboard at 390px
- controlled month-summary load-error at 390px
- controlled net-worth load-error at 390px
- controlled heatmap load-error at 390px

Hero consistency coverage currently includes:

- Transactions, Accounts, Categories, Budgets, and Dashboard at 1440px and 390px
- shared page title, eyebrow, primary action where present, hero/top-card label, value, split-currency, and secondary text selectors
- page-specific distribution or burn-rate treatment for Accounts, Categories, and Budgets
- Dashboard summary-card copy removal checks for the retired intro sentence and card period text
- horizontal overflow, mobile bottom-nav clearance, unhandled API request, and backend-isolation checks

Profile & Settings coverage currently includes:

- populated profile/settings view at 1440px, 1024px, 390px, and 360px
- profile form edited state at 390px
- security form filled state at 390px
- controlled currency-load error at 390px
- controlled profile-update error at 390px
- filter-empty, first-use empty, drawer-open, expanded-row, and collapsed-group marked not applicable for this route
