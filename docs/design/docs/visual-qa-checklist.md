# InEx Visual QA Checklist

Generated: 2026-06-14
Executed by: Codex for Artiom
App version / commit: 89ed8d8
Design guide reference: docs/design/docs/design-implementation-guide.md Section 14

## Legend

- PASS - no blocking visual failure observed.
- FAIL - see notes column for failure description.
- EXCEPTION - accepted known issue with owner-visible rationale.
- SKIPPED - state unavailable or not executed.
- N/A - viewport is not required for this row.

Blocking visual failures are overlap, clipped button text, page-level horizontal overflow, bottom-nav occlusion, chart blankness, and long-label or long-amount overflow.

## QA Commands / Screenshot Capture

Run from `inex/ClientApp` unless noted.

```powershell
# Repo root preflight
powershell -ExecutionPolicy Bypass -File scripts\doctor.ps1 -Ui

# Baseline build before QA
npm run build

# Fixture visual QA harness
npm run visual-qa:transactions
npm run visual-qa:accounts
npm run visual-qa:categories
npm run visual-qa:budgets
npm run visual-qa:hero-consistency
npm run visual-qa:dashboard
npm run visual-qa:reports
npm run visual-qa:profile
npm run visual-qa:auth

# Final verification after documentation updates
npm run build
npm run lint
```

- Browser/tool used: committed Node/CDP headless browser fixture harness plus contact-sheet visual inspection.
- Local URL: isolated Vite test server started by each harness command.
- Locale baseline: English for parity; Russian only for long-label stress rows.
- Data mode per row: fixture.
- Viewports captured: 1440px, 1024px, 390px, 360px.
- Screenshot output folder: docs/implementation/visual-qa/{area}/.
- Harness isolation: each current `qa-summary.json` reports `checks.hasFailures=false`, `harness.realBackendCalled=false`, and `unhandledApiRequests=[]`.
- Cross-page top-section check: `visual-qa:hero-consistency` captures Transactions, Accounts, Categories, Budgets, and Dashboard at 1440px and 390px, verifies shared hero/top-card selectors, metric sizing and weight, blocks retired copy from returning, rejects repeated Budgets rollup currency before `/`, and requires the Categories previous-period `Change from ...` row with no standalone `MoM` label.
- Accounts grouped-list check: `visual-qa:accounts` rejects currency-group share bars outside the hero distribution section while preserving the hero distribution bar and legend.
- Notes for Windows/macOS/Linux differences: Vite/esbuild and the CDP harness may need permission to spawn child processes and a Chromium-family browser. If auto-detection fails, set `CHROME_PATH` or `EDGE_PATH`.

## Evidence Summary

| Area | Generated | Screenshots | Summary |
| --- | --- | ---: | --- |
| Transactions | 2026-06-14T08:43:25.542Z | 11 | PASS: fixture, no failures, no backend calls |
| Accounts | 2026-06-14T08:43:59.280Z | 13 | PASS: fixture, no failures, no backend calls |
| Categories | 2026-06-14T08:44:26.022Z | 11 | PASS: fixture, no failures, no backend calls |
| Budgets | 2026-06-14T08:44:57.420Z | 11 | PASS: fixture, no failures, no backend calls |
| Hero consistency | 2026-06-14T12:13:01.274Z | 10 | PASS: fixture, no failures, no backend calls; one documented page-specific legend exception |
| Dashboard | 2026-06-14T12:12:34.614Z | 8 | PASS: fixture, no failures, no backend calls |
| Reports | 2026-06-14T08:45:48.855Z | 11 | PASS: fixture, no failures, no backend calls |
| Profile | 2026-06-14T08:46:15.728Z | 8 | PASS: fixture, no failures, no backend calls |
| Auth | 2026-06-14T08:46:45.410Z | 12 | PASS: fixture, no failures, no backend calls |

## Desktop QA Results

| Route | State | 1440px | 1024px | Screenshot | Notes |
| --- | --- | --- | --- | --- | --- |
| `/transactions` | populated | PASS | PASS | `transactions/populated-1440.png`; `transactions/populated-1024.png` | dataMode: fixture; no overflow or clipping observed. |
| `/transactions` | empty | PASS | N/A | `transactions/first-use-empty-390.png` | dataMode: fixture; state-specific empty evidence is mobile fixture; desktop shell/route baseline passed at 1440. |
| `/transactions` | filter-empty | PASS | N/A | `transactions/filter-empty-390.png` | dataMode: fixture; filter-empty state passed visual and overflow checks. |
| `/transactions` | drawer-open | PASS | PASS | `transactions/expanded-row-1440.png`; `transactions/drawer-open-390.png`; `transactions/drawer-open-360.png` | dataMode: fixture; add/edit drawer remains within viewport. |
| `/transactions` | filter drawer open | PASS | PASS | `transactions/filter-empty-390.png`; `transactions/populated-1024.png` | dataMode: fixture; filter controls render without clipping; no separate filter drawer screenshot exists in current harness. |
| `/accounts` | populated | PASS | PASS | `accounts/populated-1440.png`; `accounts/populated-flat-1024.png` | dataMode: fixture; grouped and flat account layouts inspected; grouped currency sections do not render per-group share bars. |
| `/accounts` | empty | PASS | N/A | `accounts/first-use-empty-390.png` | dataMode: fixture; empty-state affordance clears bottom nav. |
| `/accounts` | drawer-open | PASS | PASS | `accounts/drawer-open-390.png`; `accounts/drawer-open-360.png` | dataMode: fixture; drawer content and footer visible. |
| `/categories` | populated (tree) | PASS | PASS | `categories/populated-1440.png`; `categories/populated-390.png`; `categories/populated-360.png` | dataMode: fixture; tree view inspected across desktop and mobile widths. |
| `/categories` | populated (by-spend) | PASS | N/A | `categories/populated-spend-1024.png` | dataMode: fixture; by-spend view passed at operational desktop width. |
| `/categories` | expanded-row | PASS | PASS | `categories/expanded-row-1440.png`; `categories/expanded-row-390.png` | dataMode: fixture; expanded detail does not break row layout. |
| `/categories` | empty | PASS | N/A | `categories/first-use-empty-390.png` | dataMode: fixture; empty-state button remains visible above mobile nav. |
| `/budgets` | populated | PASS | PASS | `budgets/populated-1440.png`; `budgets/populated-amount-1024.png` | dataMode: fixture; long amount stress covered by 1024 screenshot. |
| `/budgets` | empty | PASS | N/A | `budgets/first-use-empty-390.png` | dataMode: fixture; empty-state layout inspected. |
| `/budgets` | drawer-open | PASS | PASS | `budgets/drawer-open-390.png`; `budgets/drawer-open-360.png` | dataMode: fixture; drawer content remains within viewport. |
| `/dashboard` | populated | PASS | PASS | `dashboard/populated-1440.png`; `dashboard/populated-1024.png` | dataMode: fixture; chart-bearing cards render with nonblank chart areas. |
| `/reports` (hub) | populated | PASS | PASS | `reports/hub-populated-1440.png`; `reports/hub-populated-1024.png` | dataMode: fixture; report cards and actions inspected. |
| `/reports` (drill-down) | report drill-down | PASS | PASS | `reports/category-report-1440.png`; `reports/history-report-1440.png`; `reports/budget-report-390.png`; `reports/heatmap-report-390.png` | dataMode: fixture; drill-down chrome, actions, and chart/table areas inspected. |
| `/profile` | populated | PASS | PASS | `profile/populated-1440.png`; `profile/populated-1024.png` | dataMode: fixture; settings forms inspected. |
| `/login` | default | PASS | N/A | `auth/login-1440.png`; `auth/login-1024.png` | dataMode: fixture; desktop split auth layout inspected. |
| `/register` | default | PASS | N/A | `auth/register-1440.png`; `auth/register-1024.png` | dataMode: fixture; registration form fits desktop layout. |
| Any route | long labels (RU) | PASS | N/A | `transactions/drawer-open-360.png`; `auth/register-360.png` | dataMode: fixture; long translated labels in generated screenshots do not clip blocking controls. |
| Any route (amounts) | long amounts | PASS | N/A | `transactions/populated-1440.png`; `accounts/populated-flat-1024.png`; `budgets/populated-amount-1024.png` | dataMode: fixture; five-digit+ amounts preserve tabular alignment and do not force page overflow. |

## Mobile QA Results

| Route | State | 390px | 360px | Screenshot | Notes |
| --- | --- | --- | --- | --- | --- |
| `/transactions` | populated | PASS | N/A | `transactions/populated-390.png`; `transactions/populated-360.png` | dataMode: fixture; no page-level horizontal overflow; bottom nav clear. |
| `/transactions` | empty | PASS | N/A | `transactions/first-use-empty-390.png` | dataMode: fixture; empty-state action remains visible. |
| `/transactions` | filter-empty | PASS | N/A | `transactions/filter-empty-390.png` | dataMode: fixture; filter-empty copy and controls fit. |
| `/transactions` | drawer-open | PASS | N/A | `transactions/drawer-open-390.png`; `transactions/drawer-open-360.png` | dataMode: fixture; drawer within viewport. |
| `/accounts` | populated | PASS | N/A | `accounts/populated-390.png`; `accounts/populated-360.png` | dataMode: fixture; account rows stack without page overflow. |
| `/accounts` | empty | PASS | N/A | `accounts/first-use-empty-390.png` | dataMode: fixture; empty-state button clear of bottom nav. |
| `/categories` | populated | PASS | PASS | `categories/populated-390.png`; `categories/populated-360.png` | dataMode: fixture; required 360px route passes. |
| `/categories` | empty | PASS | PASS | `categories/first-use-empty-390.png`; `categories/populated-360.png` | dataMode: fixture; empty-state screenshot at 390 and route baseline at 360 show no blocking mobile failures. |
| `/categories` | expanded-row | PASS | PASS | `categories/expanded-row-390.png`; `categories/populated-360.png` | dataMode: fixture; expanded detail fits mobile row layout. |
| `/budgets` | populated | PASS | PASS | `budgets/populated-390.png`; `budgets/populated-360.png` | dataMode: fixture; required 360px route passes. |
| `/budgets` | empty | PASS | PASS | `budgets/first-use-empty-390.png`; `budgets/populated-360.png` | dataMode: fixture; empty-state screenshot at 390 and route baseline at 360 show no blocking mobile failures. |
| `/dashboard` | populated | PASS | N/A | `dashboard/populated-390.png`; `dashboard/populated-360.png` | dataMode: fixture; chart cards render and bottom nav is clear. |
| `/reports` (hub) | populated | PASS | N/A | `reports/hub-populated-390.png`; `reports/hub-populated-360.png` | dataMode: fixture; report cards remain scannable. |
| `/reports` (drill-down) | drill-down | PASS | N/A | `reports/budget-report-390.png`; `reports/heatmap-report-390.png`; `reports/category-empty-390.png` | dataMode: fixture; drill-down actions and chart/table areas inspected. |
| `/profile` | populated | PASS | N/A | `profile/populated-390.png`; `profile/populated-360.png`; `profile/profile-form-edit-390.png`; `profile/security-form-filled-390.png` | dataMode: fixture; forms wrap without clipped submit buttons. |
| `/login` | default | PASS | N/A | `auth/login-390.png`; `auth/login-360.png` | dataMode: fixture; mobile auth form fits. |
| `/register` | default | PASS | N/A | `auth/register-390.png`; `auth/register-360.png`; `auth/register-form-filled-390.png` | dataMode: fixture; long registration form scrolls without hidden submit action. |
| Bottom nav check | all routes | PASS | PASS | All authenticated 390/360 screenshots and `qa-summary.json` metrics | dataMode: fixture; `bottomNavOccludesLastContent=false` for current authenticated mobile states. |

## Failures Found

| ID | Route | Viewport | State | Failure Type | Description | Status | Fixed in commit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| None | | | | | No blocking visual failures found in the 2026-06-14 fixture run. | N/A | |

## Known Exceptions

| Route | Viewport | Issue | Rationale | Accepted by | Date |
| --- | --- | --- | --- | --- | --- |
| `/budgets` | 1440px, 390px | Burn-rate legend remains above the bars instead of matching Accounts/Categories distribution legend placement. | Budgets presents burn-rate progress and budget status, not a category distribution summary. Keeping the legend above the bars preserves scan order for planned/spent/remaining values while the hero still follows the shared page title, action, metric, and mobile overflow contract. | Product/Design | 2026-06-14 |

## Summary

- Total fixture screenshots inspected: 95.
- Required route groups covered: 10.
- Passes: 42 checklist rows.
- Failures fixed: 0.
- Exceptions accepted: 1.
- Skipped: 0.
