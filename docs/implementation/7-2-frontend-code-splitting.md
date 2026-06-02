# Story 7.2: Frontend — Route-Based Code Splitting and Vendor Chunks

Status: in-progress

## Story

As a user loading the app for the first time,
I want the initial JavaScript bundle to be small,
So that the app starts quickly even on a slower connection.

## Acceptance Criteria

**AC1** — Eliminate oversized chunk warning:
**Given** the current main production chunk is ~1.9 MB minified (exceeds Vite's 500 KB warning threshold)
**When** this story is complete
**Then** `npm run build` no longer reports the oversized chunk warning for the main entry point

**AC2** — Route-level lazy loading on all top-level pages:
**Given** the major page routes (Reports, Transactions, Budgets, Categories, Accounts, Login, Register, Profile, NotFound)
**When** this story is complete
**Then** each is loaded via `React.lazy` + `Suspense` — route-level lazy loading applied to all top-level pages

> **Note on "Dashboard":** The epics.md AC lists "Dashboard" as a target route. The Dashboard page does not exist yet — it is created in Epic 6 Story 6.1. The existing pages (`Login`, `Register`, `Profile`, `NotFound`) are lazy-loaded instead. When Epic 6 adds the Dashboard, it must be added as a lazy import.

**AC3** — Vendor chunk splitting for large libraries:
**Given** large vendor libraries (`antd`, `recharts`)
**When** the Vite config is updated
**Then** a `manualChunks` configuration splits them into separate named vendor chunks (`vendor-antd`, `vendor-recharts`) and captures their runtime sub-packages

**AC4** — No blank screens during navigation:
**Given** the lazy-loaded routes
**When** a user navigates to any page
**Then** the page loads correctly with no blank screens or chunk fetch errors; a loading fallback (`<Spin>` centered) is shown during chunk fetch

**AC5** — No single chunk exceeds 500 KB:
**Given** `npm run build` after the change
**When** reviewed
**Then** no single chunk exceeds 500 KB (or any exception is documented with justification in a code comment)

## Tasks / Subtasks

- [x] **Task 1: Add `manualChunks` to Vite config** (AC3, AC5)
  - [x] Open `inex/ClientApp/vite.config.ts`
  - [x] Add `rollupOptions.output.manualChunks` inside `build:` config
  - [x] Import `normalizePath` from `vite` and normalize each module id before matching; this repo is developed on Windows and raw Rollup/Vite ids may contain backslashes
  - [x] Define chunk `vendor-antd` capturing `antd`, `@ant-design/*`, `@rc-component/*`, and `rc-*` modules
  - [x] Define chunk `vendor-recharts` capturing `recharts`, `recharts-scale`, `victory-vendor`, and `d3-*` modules
  - [x] Leave other third-party code (react, react-dom, redux, etc.) to be handled by Vite's default automatic chunking
  - [x] Do **not** raise `chunkSizeWarningLimit` to hide the warning; this story must reduce or explicitly justify oversized chunks, not silence Vite

- [x] **Task 2: Convert all page imports in `App.tsx` to `React.lazy`** (AC2, AC4)
  - [x] Replace all static `import PageName from './pages/...'` with `React.lazy(() => import('./pages/...'))`
  - [x] Pages to lazify: `Transactions`, `Accounts`, `Categories`, `Budgets`, `Reports`, `ReportCategory`, `ReportBudgetSpending`, `ReportMonthlyHistory`, `ReportList`, `NotFound`, `Login`, `Register`, `Profile`
  - [x] Declare all `React.lazy` constants at module scope, below static imports and above `App`; do not declare lazy components inside `App`, because React resets lazy component state when the lazy declaration is recreated during render
  - [x] `ProtectedRoute` is a layout component (not a page), keep it as a static import
  - [x] `ConfigProvider` (antd) stays static — it wraps the whole tree and must be available immediately

- [x] **Task 3: Wrap routes with `<Suspense>` fallback** (AC4)
  - [x] Use `<React.Suspense>` (matches the existing `import * as React from 'react'` namespace style in App.tsx — no separate `Suspense` import needed)
  - [x] Create a `PageFallback` constant above the `App` component: a centered `<Spin size="large" />` using antd
  - [x] Wrap the entire `<Routes>` tree with `<React.Suspense fallback={<PageFallback />}>`
  - [x] Confirm `antd`'s `<Spin>` is available at all times (it will be, since `antd` is in a separate chunk loaded eagerly — see Task 1 note below)

- [x] **Task 4: Verify build output** (AC1, AC5)
  - [x] Run `npm run build` from `inex/ClientApp/`
  - [x] Confirm the **main entry chunk** warning is gone (AC1)
  - [x] If Vite still warns only because `vendor-antd` exceeds 500 KB, document the justified exception in `vite.config.ts` and record it in Dev Agent Record (AC5)
  - [x] Record actual chunk sizes (index, vendor-antd, vendor-recharts) in the Dev Agent Record below
  - [x] If any single chunk still exceeds 500 KB, add a comment in `vite.config.ts` explaining why (justified exceptions only)

- [ ] **Task 5: Manual smoke test** (AC4)
  - [ ] Run dev server (`npm start`) and navigate to each route: `/transactions`, `/accounts`, `/categories`, `/budgets`, `/reports`, `/reports/category`, `/reports/budget`, `/reports/history`, `/profile`, `/login`, `/register`, `/does-not-exist`
  - [ ] Confirm no blank screen; loading spinner appears briefly then page renders
  - [ ] Confirm no console errors related to chunk loading

## Dev Notes

### Current State Analysis

**`inex/ClientApp/vite.config.ts` — current full content:**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
```

No `rollupOptions`, no `manualChunks`, no code splitting configured at all. All pages are statically imported in `App.tsx` — everything ends up in one giant main bundle.

**`inex/ClientApp/src/App.tsx` — current static imports (every import that must become lazy):**

```typescript
import Transactions from "./pages/Transactions";
import Accounts from "./pages/Accounts";
import Categories from "./pages/Categories";
import Budgets from "./pages/Budgets";
import Reports from "./pages/Reports";
import ReportCategory from "./pages/Reports/ReportCategory";
import ReportBudgetSpending from "./pages/Reports/ReportBudgetSpending";
import ReportMonthlyHistory from "./pages/Reports/ReportMonthlyHistory";
import ReportList from "./pages/Reports/ReportList";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute"; // ← KEEP STATIC
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
```

**Existing lazy loading:** Zero. No `React.lazy` or `Suspense` usage anywhere in the codebase.

**Large libraries confirmed in `package.json`:**

- `antd`: `^5.29.3` — large design system, primary bundle driver
- `recharts`: `^2.1.9` — charting library, used by report pages only; `package-lock.json` currently resolves it to `2.15.4`
- `vite`: `^6.3.3` in `package.json`; `package-lock.json` currently resolves it to `6.4.2`
- `@types/recharts`: `^1.8.23` (dev only, no runtime impact)

---

### Target Vite Config (`vite.config.ts` after change)

```typescript
import { defineConfig, normalizePath } from 'vite'; // keep defineConfig source; if Story 7.3 is merged, import only normalizePath from 'vite'
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = normalizePath(id);

          // antd and its runtime sub-packages into one vendor chunk.
          if (
            normalizedId.includes('node_modules/antd') ||
            normalizedId.includes('node_modules/@ant-design') ||
            normalizedId.includes('node_modules/@rc-component') ||
            normalizedId.includes('node_modules/rc-')
          ) {
            return 'vendor-antd';
          }

          // recharts and its internal charting dependencies into one chunk.
          if (
            normalizedId.includes('node_modules/recharts') ||
            normalizedId.includes('node_modules/recharts-scale') ||
            normalizedId.includes('node_modules/victory-vendor') ||
            normalizedId.includes('node_modules/d3-')
          ) {
            return 'vendor-recharts';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

If Story 7.3 already changed the first import to `import { defineConfig } from 'vitest/config'`, do not revert it. Add a second import: `import { normalizePath } from 'vite';`.

**Why function form, not object form?** The function form (`manualChunks(id)`) allows pattern matching on resolved `node_modules/` paths. The object form (`{ 'vendor-antd': ['antd'] }`) is less precise for this story because the repo needs separate chunks for package families and transitive runtime dependencies (`@ant-design/*`, `@rc-component/*`, `rc-*`, `victory-vendor`, `d3-*`).

**Windows path note:** Use `normalizePath(id)` before `includes()` checks. Without normalization, a Windows module id such as `node_modules\antd\...` can fail a forward-slash match and leave the library in the main chunk.

**antd v5 note:** antd 5.x uses CSS-in-JS via `@ant-design/cssinjs` and many runtime packages in the `@rc-component/*` and `rc-*` families (`rc-input`, `rc-select`, `rc-table`, etc.). Capture those package families explicitly so they do not fragment into the main bundle or unnamed chunks.

**recharts note:** recharts 2.x depends on `recharts-scale`, `victory-vendor`, and several `d3-*` packages (`d3-shape`, `d3-scale`, `d3-array`, etc.). Including all four patterns (`recharts`, `recharts-scale`, `victory-vendor`, `d3-`) in the recharts chunk prevents them from fragmenting into the main bundle or tiny unnamed chunks.

**Warning policy:** Do not use `chunkSizeWarningLimit` as the primary fix. If `vendor-antd` still exceeds 500 KB after route and vendor splitting, document that exact exception in a nearby `vite.config.ts` comment and in the Dev Agent Record; all other oversized chunks require further splitting or a specific justification.

---

### Target App.tsx Changes

**Lazy import pattern** — replace every static page import with:

```typescript
const Transactions = React.lazy(() => import("./pages/Transactions"));
const Accounts = React.lazy(() => import("./pages/Accounts"));
const Categories = React.lazy(() => import("./pages/Categories"));
const Budgets = React.lazy(() => import("./pages/Budgets"));
const Reports = React.lazy(() => import("./pages/Reports"));
const ReportCategory = React.lazy(
  () => import("./pages/Reports/ReportCategory"),
);
const ReportBudgetSpending = React.lazy(
  () => import("./pages/Reports/ReportBudgetSpending"),
);
const ReportMonthlyHistory = React.lazy(
  () => import("./pages/Reports/ReportMonthlyHistory"),
);
const ReportList = React.lazy(() => import("./pages/Reports/ReportList"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Login = React.lazy(() => import("./pages/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const Profile = React.lazy(() => import("./pages/Profile"));
```

Declare these constants at module scope, not inside `App`.

Keep these as static imports (required before any route renders):

```typescript
import * as React from "react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ConfigProvider, Spin } from "antd"; // add Spin for fallback
import enUS from "antd/locale/en_US";
import ruRU from "antd/locale/ru_RU";
import dayjs from "dayjs";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { restoreSession } from "./store/auth/auth-actions";
import { fetchAccounts } from "./store/accounts/accounts-actions";
import { fetchCategories } from "./store/categories/categories-actions";
import { fetchBudgets } from "./store/budgets/budgets-actions";
import { fetchRatesForDate } from "./store/rates/rates-action";
import "antd/dist/reset.css";
import ProtectedRoute from "./components/ProtectedRoute"; // layout, NOT a page
import { Navigate, Route, Routes } from "react-router-dom";
```

**Loading fallback** — define directly in App.tsx before the component:

```typescript
const PageFallback = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
    </div>
);
```

**Suspense wrapper** — wrap the full `<Routes>` tree with one `<Suspense>`:

```typescript
return (
    <ConfigProvider locale={antdLocale}>
        <React.Suspense fallback={<PageFallback />}>
            <Routes>
                {/* ... all routes unchanged ... */}
            </Routes>
        </React.Suspense>
    </ConfigProvider>
);
```

**Why wrap the whole `<Routes>` tree vs each route individually?** One `<Suspense>` at the tree root is simpler and sufficient. Vite already creates per-page chunks for each `React.lazy()` import. Nested sub-routes (e.g., `/reports/category`) will show the spinner during their chunk load automatically because they share the same Suspense boundary.

---

### antd Chunk Availability for PageFallback

`antd` is in the `vendor-antd` chunk, which is a separate file. However, `<Spin>` inside `PageFallback` is only rendered _while_ a lazy chunk is loading — meaning antd itself must be loaded before the spinner can display. This creates a first-load dependency to verify.

**Solution already handled by Vite:** Vite generates `<link rel="modulepreload">` for all chunks referenced from the entry point. The `vendor-antd` chunk is imported by the entry (via `"antd/dist/reset.css"` and the `Spin` static import), so the browser begins downloading it in parallel with the page chunk. In practice `vendor-antd` loads alongside the entry and the fallback is available by the time any lazy page chunk is needed.

**Do not** make `antd` dynamic/lazy itself. Keep `import "antd/dist/reset.css"` and `import { Spin } from "antd"` as static imports so they are part of the entry bundle graph.

---

### Chunk Size Verification

After `npm run build`, check the terminal output table. Vite prints each generated file with its size. The output directory is `build/` (set by `outDir: 'build'` in `vite.config.ts`). Look for:

```
build/assets/vendor-antd-[hash].js     — expected ~900 KB–1.2 MB (minified, gzip ~200–300 KB)
build/assets/vendor-recharts-[hash].js — expected ~150–300 KB
build/assets/index-[hash].js           — should now be < 500 KB
build/assets/Transactions-[hash].js    — per-route chunk, should be small
build/assets/Reports-[hash].js         — etc.
```

**Vite's warning threshold is 500 KB per chunk (minified, pre-gzip).** AC1 requires resolving the oversized warning for the **main entry chunk**. AC5 requires no chunk over 500 KB unless an exception is explicitly justified in code comments and the Dev Agent Record. The `vendor-antd` chunk may exceed 500 KB and can be accepted only when documented because:

1. antd 5.x with icons is large by design
2. The user only downloads it once (browser cache)
3. It loads in parallel with the entry chunk, not blocking navigation

If `vendor-antd` exceeds 500 KB, add a comment in `vite.config.ts`:

```typescript
// vendor-antd chunk intentionally exceeds 500 KB: antd v5 with icons is ~1 MB minified.
// Mitigated by HTTP/2 parallel loading and long-lived browser caching.
// Tree-shaking via antd's per-component imports is tracked in a future story.
```

Do not add `chunkSizeWarningLimit` to make the build quiet. The build output must still expose any non-antd oversized chunk during verification.

---

### SSR / Hydration Concerns

None. The app is a pure client-side SPA served as static files from ASP.NET Core (`spa.UseProxyToSpaDevelopmentServer` / `spa.UseReactDevelopmentServer` pattern). There is no server-side rendering. `React.lazy` + `Suspense` is fully safe to use.

---

### Files to Modify

| File                            | Change                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `inex/ClientApp/vite.config.ts` | Add `rollupOptions.output.manualChunks`                                                                      |
| `inex/ClientApp/src/App.tsx`    | Replace static page imports with `React.lazy`; add `Suspense`; add `PageFallback`; add `Spin` to antd import |

**No other files need to change.** Page components themselves do not need modification — lazy loading is purely a routing/bundling concern in `App.tsx` and `vite.config.ts`.

---

### Project Structure Notes

- Page files are at `inex/ClientApp/src/pages/PageName.tsx` (flat) OR `inex/ClientApp/src/pages/PageName/index.tsx` (folder). The import path `'./pages/PageName'` works for both — Node resolution handles either `.tsx` file or folder `index.tsx`.
- `ProtectedRoute` lives in `components/`, not `pages/` — keep it static.
- `i18n`, `dayjsSetup`, and Redux store initialization in `index.tsx` are unaffected.
- `tsconfig.json` has `"moduleResolution": "bundler"` (Vite 6 default) — dynamic `import()` is fully supported.

---

### Cross-Story Context (Epic 7)

- **Story 7.1** (typed API models, no `any`): independent of this story. May run before or after. Does not affect bundle structure.
- **Story 7.3** (Vitest): may switch `vite.config.ts` import to `defineConfig` from `vitest/config`. Do not revert that change when implementing this story; add `manualChunks` under the same `build.rollupOptions.output` structure. No conflict expected because Vitest ignores Rollup build chunking.
- **Story 7.4a/b/c** (RTK Query): will add new library dependencies (`@reduxjs/toolkit/query`). Already included in `@reduxjs/toolkit` — no new vendor chunks needed.

### References

- [Source: docs/planning/epics.md#Story 7.2]
- [Source: inex/ClientApp/vite.config.ts] — current Vite config (no manualChunks)
- [Source: inex/ClientApp/src/App.tsx] — all static page imports to be lazified
- [Source: inex/ClientApp/package.json] — antd `^5.29.3`, recharts `^2.1.9`, vite `^6.3.3`
- [Source: inex/ClientApp/package-lock.json] — resolved antd `5.29.3`, recharts `2.15.4`, vite `6.4.2`, Rollup `4.60.2`; confirms `@rc-component/*`, `rc-*`, `victory-vendor`, and `d3-*` runtime dependency families
- [Source: React docs: lazy + Suspense] — lazy declarations should be module-scoped and rendered under a Suspense boundary
- [Source: Vite/Rollup docs] — Vite delegates build chunking to Rollup `manualChunks`; function form receives resolved module ids for custom chunk assignment

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-06-02: `npm run build` from `inex/ClientApp` failed before Vite due existing/concurrent TypeScript errors in `src/pages/Transactions/transaction-filter-url.ts` and `src/pages/Transactions/TransactionFilterForm.tsx`: `TransactionFilter` is not exported from `transactions-slice`.
- 2026-06-02: `.\node_modules\.bin\vite.cmd build` succeeded after escalated filesystem access for Vite build output cleanup. Chunk sizes: `index-CPP7uSeH.js` 169.61 kB (gzip 58.06 kB), `vendor-recharts-BY2pGgBC.js` 416.32 kB (gzip 112.21 kB), `vendor-antd-CNrk1eVr.js` 1,214.97 kB (gzip 383.22 kB). Only `vendor-antd` exceeds 500 kB; exception documented in `vite.config.ts`.
- 2026-06-02: Final `npm run build` from `inex/ClientApp` passed after escalated filesystem access for Vite output cleanup. Final chunk sizes unchanged: `index-CPP7uSeH.js` 169.61 kB, `vendor-recharts-BY2pGgBC.js` 416.32 kB, `vendor-antd-CNrk1eVr.js` 1,214.97 kB.
- 2026-06-02: `npm run lint` from `inex/ClientApp` passed.
- 2026-06-02: `npm start` initially failed on Vite dependency-cache unlink; rerun with escalated filesystem access started the dev server. HTTP route probes returned 200 for `/transactions`, `/accounts`, `/categories`, `/budgets`, `/reports`, `/reports/category`, `/reports/budget`, `/reports/history`, `/profile`, `/login`, `/register`, `/does-not-exist`, plus concurrent routes `/dashboard` and `/reports/heatmap`.
- 2026-06-02: In-app browser smoke test could not be completed because the browser bridge failed twice with `windows sandbox failed: spawn setup refresh`; console chunk-load verification remains blocked.
- 2026-06-02: Final integration retry started Vite on `127.0.0.1:5173`, but the in-app browser bridge failed again with `windows sandbox failed: spawn setup refresh`; browser-console smoke verification remains a real environment blocker.

### Completion Notes List

- Added route-based lazy loading in `App.tsx` for the story pages and preserved/lazified concurrently added `Dashboard` and `ReportSpendingHeatmap` routes.
- Added a centered Ant Design `Spin` page fallback and wrapped the route tree in a single `React.Suspense` boundary.
- Added Vite `manualChunks` for `vendor-antd` and `vendor-recharts`, preserving the concurrent Story 7.3 `defineConfig` import from `vitest/config` and importing `normalizePath` from `vite` separately.
- Did not raise `chunkSizeWarningLimit`; the remaining oversized `vendor-antd` chunk is documented as an accepted exception.
- Story remains `in-progress` because browser-console smoke verification is blocked by the in-app browser bridge failure.

### File List

- `inex/ClientApp/src/App.tsx`
- `inex/ClientApp/vite.config.ts`
- `docs/implementation/7-2-frontend-code-splitting.md`

### Change Log

- 2026-06-02: Implemented route-level lazy loading, Suspense fallback, and vendor manual chunking; recorded chunk sizes and verification blockers.
