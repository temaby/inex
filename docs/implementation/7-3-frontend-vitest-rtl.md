# Story 7.3: Frontend — Introduce Vitest and React Testing Library

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a frontend developer,
I want a fast, reliable frontend test runner with React component testing support,
so that I can write and run tests for UI components and Redux logic without a full browser.

## Acceptance Criteria

1. **Given** the frontend currently has no committed test script or test files **When** this story is complete **Then** `vitest`, `@testing-library/react`, `@testing-library/dom`, and `@testing-library/jest-dom` are installed as dev dependencies and a `test` script exists in `package.json`.

2. **Given** the test runner setup **When** `npm test` runs from `inex/ClientApp` **Then** it executes all `*.test.tsx` / `*.test.ts` files and exits 0 when all tests pass.

3. **Given** the new test infrastructure **When** this story is complete **Then** at least two smoke tests exist: one testing a Redux slice reducer directly, one rendering a React component and asserting on visible output.

4. **Given** the Vite configuration **When** Vitest is configured **Then** it shares a single `vite.config.ts` — no separate `vitest.config.ts` created, no build config duplicated.

5. **Given** `npm run build` and `npm test` **When** both run from `inex/ClientApp` **Then** both pass with no conflicts between build and test configurations; `tsc --noEmit` continues to pass.

## Tasks / Subtasks

- [x] Install Vitest and React Testing Library packages. (AC: 1)
  - [x] From `inex/ClientApp/`, run:
    ```
    npm install -D vitest@^3 @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event jsdom@^26
    ```
  - [x] Verify all packages appear under `devDependencies` in `package.json` after install.
  - [x] Do not install unversioned latest `vitest` or `jsdom` unless the repository's Node baseline is intentionally upgraded first. Current Docker builds install Node.js 18; Vitest 4 and jsdom 27 require Node 20+.
  - [x] Install `@vitest/ui@^3` only if you plan to use the optional `test:ui` script.
  - [x] Do NOT install `jest`, `babel-jest`, `ts-jest`, `@jest/globals`, or any CRA jest package — Vitest replaces the jest layer entirely.

- [x] Add `test` script to `package.json`. (AC: 1, 2)
  - [x] Add `"test": "vitest run"` to the `scripts` block. `vitest run` executes once and exits (suitable for CI). Do not remove `start`, `build`, `preview`, or `lint`.
  - [x] Optionally add `"test:watch": "vitest"` for interactive watch mode during development.
  - [x] Optionally add `"test:ui": "vitest --ui"` for the `@vitest/ui` browser reporter only if `@vitest/ui@^3` is installed in the same change.

- [x] Update `vite.config.ts` to include the Vitest `test` block. (AC: 4, 5)
  - [x] Change the top-level import from `import { defineConfig } from 'vite'` to `import { defineConfig } from 'vitest/config'`. This makes the `test` property TypeScript-valid without a triple-slash directive.
  - [x] Add the `test` block inside `defineConfig({...})` alongside the existing `plugins`, `build`, and `server` blocks:
    ```typescript
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
    ```
  - [x] Leave `plugins`, `build.outDir`, `server.port`, and `server.proxy` unchanged.

- [x] Update `tsconfig.json` to include Vitest globals and jest-dom types. (AC: 5)
  - [x] In `compilerOptions.types`, change `["vite/client"]` to:
    ```json
    ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
    ```
  - [x] Do not add or remove anything else from `tsconfig.json`. The existing `"include": ["src", "vite.config.ts"]` already covers test files inside `src/` and the updated config file.
  - [x] Do not create a separate `tsconfig.test.json` — the single tsconfig is sufficient.

- [x] Create `src/test/setup.ts` — the jest-dom setup file. (AC: 3, 5)
  - [x] Create `inex/ClientApp/src/test/setup.ts` with the single line:
    ```typescript
    import "@testing-library/jest-dom/vitest";
    ```
  - [x] This file is referenced by `setupFiles` in `vite.config.ts` and runs before every test. It extends Vitest's `expect` with DOM matchers such as `toBeInTheDocument`, `toHaveTextContent`, `toBeVisible`, and `toBeDisabled`.

- [x] Write the Redux reducer smoke test. (AC: 3)
  - [x] Create `inex/ClientApp/src/store/categories/categories-slice.test.ts`.
  - [x] Test the `setIsLoading` and `setCategories` reducers using `categoriesSlice.reducer(initialState, action)` — pure synchronous state transitions, no async, no API calls.
  - [x] See the **Reducer Smoke Test** code block in Dev Notes for the complete test.

- [x] Write the React component render smoke test. (AC: 3)
  - [x] Create `inex/ClientApp/src/components/ProtectedRoute.test.tsx`.
  - [x] Assert two behaviors: authenticated user sees child route content; unauthenticated user is redirected to `/login`.
  - [x] Build a minimal store using `configureStore` from `@reduxjs/toolkit` with only the `auth` reducer — do not import the full app store from `store/index.ts`.
  - [x] See the **Component Render Smoke Test** code block in Dev Notes for the complete test.

- [x] Verify `npm test` and `npm run build` both pass. (AC: 5)
  - [x] From `inex/ClientApp/`: run `npm test` — exit code must be 0, both smoke tests pass.
  - [x] From `inex/ClientApp/`: run `npm run build` — `tsc --noEmit && vite build` must succeed with no new errors.
  - [x] From `inex/ClientApp/`: run `npm run lint` — must not introduce new lint errors in the added files.

---

## Dev Notes

### Current State — No Frontend Tests Exist

Confirmed from `inex/ClientApp/package.json`:

- No `test` script in `scripts`. Scripts present: `start`, `build`, `preview`, `lint`.
- No test-related packages in `devDependencies`. Present: `@vitejs/plugin-react`, `eslint`, `typescript`, `vite`, and `@types/*`.
- No test files anywhere under `inex/ClientApp/src/`.

The build tool is Vite 6.3.3 (`"vite": "^6.3.3"`), with `package-lock.json` currently resolving Vite to 6.4.2. Use Vitest 3.x for this story because the repo's Docker build image installs Node.js 18 and official Vitest 4 requires Node 20+. Use `jsdom@^26` for the same reason: jsdom 27 requires Node 20+. Do not introduce a Node baseline upgrade in this story.

React Testing Library 16+ expects `@testing-library/dom` as a peer dependency. Install it explicitly instead of relying on transitive dependency behavior.

[Source: `inex/ClientApp/package.json`]
[Source: `inex/ClientApp/package-lock.json`]
[Source: `docker/api/Dockerfile`]
[Source: Vitest migration guide, 2026-05-31 check: https://vitest.dev/guide/migration]
[Source: Testing Library React setup docs, 2026-05-31 check: https://testing-library.com/docs/react-testing-library/intro]
[Source: jsdom 27 release notes, 2026-05-31 check: https://github.com/jsdom/jsdom/releases/tag/27.0.0]

### Why `vitest/config` Import vs. Triple-Slash Directive

Two common patterns exist for adding Vitest to an existing Vite project:

**Pattern A — triple-slash (old, Vitest 1/2 era):**

```typescript
/// <reference types="vitest" />
import { defineConfig } from "vite";
```

**Pattern B — recommended for Vitest 3.x and newer:**

```typescript
import { defineConfig } from "vitest/config";
```

Pattern B is preferred because `vitest/config` re-exports all Vite config types plus the `test` property without needing a side-effect import. It correctly resolves Vite plugins (including `@vitejs/plugin-react`), so no functionality is lost. The existing `import react from '@vitejs/plugin-react'` line is unchanged.

### Exact `vite.config.ts` After This Story

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "build",
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
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

**Critical: `globals: true` means** `describe`, `it`, `expect`, `beforeEach`, `afterEach`, `vi` are available in test files without explicit import. The `"vitest/globals"` entry in `tsconfig.compilerOptions.types` provides the TypeScript declarations for these globals. Without it, `tsc --noEmit` will error on undeclared `describe`/`expect` globals even though tests run fine.

**`environment: 'jsdom'` requires** the `jsdom` package to be installed (`npm install -D jsdom@^26`). Vitest 3.x does NOT bundle jsdom — it must be in `devDependencies`. If jsdom is missing, running `npm test` will print: `"Error: Cannot find module 'jsdom'"`. Do not install jsdom 27 while Docker remains on Node.js 18.

**`setupFiles`** runs once per test file before the test suite starts. The path `./src/test/setup.ts` is relative to the Vite project root (`inex/ClientApp/`).

### Exact `tsconfig.json` `types` Line After This Story

Before:

```json
"types": ["vite/client"]
```

After:

```json
"types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
```

These entries:

- `vite/client` — already present; provides `import.meta.env`, `import.meta.hot`, etc.
- `vitest/globals` — provides `describe`, `it`, `expect`, `vi`, etc. as ambient globals
- `@testing-library/jest-dom` — provides TypeScript signatures for custom matchers: `toBeInTheDocument()`, `toHaveTextContent()`, `toBeVisible()`, etc.

### Exact `package.json` Scripts After This Story

Before (relevant section):

```json
"scripts": {
  "start": "vite",
  "build": "tsc --noEmit && vite build",
  "preview": "vite preview",
  "lint": "eslint ./src/**/*.ts ./src/**/*.tsx"
}
```

After:

```json
"scripts": {
  "start": "vite",
  "build": "tsc --noEmit && vite build",
  "preview": "vite preview",
  "lint": "eslint ./src/**/*.ts ./src/**/*.tsx",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

`vitest run` is the required AC-satisfying script — runs all tests once and exits with code 0 (pass) or 1 (fail). `test:watch` is a convenience alias and does not affect AC verification. Add `test:ui` only if `@vitest/ui@^3` is installed; otherwise the script is broken by design.

### Reducer Smoke Test

**File:** `inex/ClientApp/src/store/categories/categories-slice.test.ts`

```typescript
import categoriesSlice, { categoriesActions } from "./categories-slice";
import { createCategoryDetails } from "../../model/Category/CategoryDetails";

describe("categoriesSlice", () => {
  describe("setIsLoading", () => {
    it("sets isLoading to true", () => {
      const state = categoriesSlice.reducer(
        undefined,
        categoriesActions.setIsLoading({ isLoading: true }),
      );
      expect(state.isLoading).toBe(true);
    });

    it("sets isLoading to false", () => {
      const withLoading = categoriesSlice.reducer(
        undefined,
        categoriesActions.setIsLoading({ isLoading: true }),
      );
      const state = categoriesSlice.reducer(
        withLoading,
        categoriesActions.setIsLoading({ isLoading: false }),
      );
      expect(state.isLoading).toBe(false);
    });
  });

  describe("setCategories", () => {
    it("replaces the items array with the provided payload", () => {
      // Use the factory exported from the model to avoid missing-field TypeScript errors.
      // CategoryDetails requires: id, key, name, description, isEnabled, isSystem,
      // systemCode, children (required non-optional), plus parentId?: number (optional).
      const mockCategories = [
        createCategoryDetails({
          id: 1,
          key: "food",
          name: "Food",
          isEnabled: true,
        }),
      ];

      const state = categoriesSlice.reducer(
        undefined,
        categoriesActions.setCategories({ items: mockCategories }),
      );

      expect(state.items).toHaveLength(1);
      expect(state.items[0].key).toBe("food");
    });

    it("initial state has empty items array", () => {
      const state = categoriesSlice.reducer(undefined, { type: "@@INIT" });
      expect(state.items).toEqual([]);
    });
  });
});
```

**What this tests:** Pure reducer state transitions — no side effects, no API calls, no DOM. Passing `undefined` as state causes the reducer to use `initialState`. This is the canonical Redux unit test pattern.

**Import note:** Use `createCategoryDetails` (named export, same file as the interface) to construct mock objects — it pre-fills all required fields (`isSystem`, `systemCode`, `children`, etc.) and accepts a `Partial<CategoryDetails>` override. Do NOT construct the object literal directly: `CategoryDetails` has required fields beyond the obvious ones (`isSystem: boolean`, `systemCode: string`, `children: CategoryDetails[]`), and `parentId` is `number | undefined` — not nullable — so `parentId: null` would be a type error.

[Source: `inex/ClientApp/src/store/categories/categories-slice.ts`]

### Component Render Smoke Test

**File:** `inex/ClientApp/src/components/ProtectedRoute.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authSlice from '../store/auth/auth-slice';
import ProtectedRoute from './ProtectedRoute';

/**
 * Build a minimal Redux store containing only the auth slice.
 * ProtectedRoute only reads s.auth.isInitializing and s.auth.accessToken,
 * so all other slices are omitted.
 */
const makeStore = (
  isInitializing: boolean,
  accessToken: string | null,
) =>
  configureStore({
    reducer: { auth: authSlice.reducer },
    preloadedState: {
      auth: {
        accessToken,
        expiresAt: accessToken ? Date.now() + 3_600_000 : null,
        user: null,
        isInitializing,
        error: null,
      },
    },
  });

describe('ProtectedRoute', () => {
  it('renders child route when the user is authenticated', () => {
    const store = makeStore(false, 'mock-access-token');

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login', () => {
    const store = makeStore(false, null);

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Protected Content</div>} />
            </Route>
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows a spinner while auth is initializing', () => {
    const store = makeStore(true, null);

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    // During initialization, neither protected content nor login is shown.
    // Ant Design Spin renders a div with role="img" for the loading icon.
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
```

**What this tests:** The routing logic inside `ProtectedRoute` — the component with non-trivial conditional rendering behavior. The three cases cover the full decision tree: authenticated, unauthenticated, initializing.

**Ant Design + jsdom note:** `Spin` from `antd` renders SVG and Ant Design CSS-in-JS tokens. The `isInitializing` test does not assert on the spinner's DOM details (which may vary by antd version) — it asserts only that protected content is NOT shown, which is the behavioral requirement. If antd requires a global `matchMedia` mock, add it to `src/test/setup.ts`:

```typescript
// Append to src/test/setup.ts if antd throws on matchMedia:
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
```

**Auth state shape** comes from `AuthState` in `inex/ClientApp/src/store/auth/auth-slice.ts`:

```typescript
interface AuthState {
  accessToken: string | null;
  expiresAt: number | null;
  user: AuthUser | null;
  isInitializing: boolean;
  error: string | null;
}
```

The `preloadedState.auth` object in `makeStore` must satisfy this full interface because `configureStore` uses the real `authSlice.reducer` which validates the shape.

[Source: `inex/ClientApp/src/components/ProtectedRoute.tsx`; `inex/ClientApp/src/store/auth/auth-slice.ts`]

### Build vs. Test Conflict Prevention

The Vitest `test` block is processed only by `vitest` — the `vite build` command ignores the `test` key entirely. This is the design of the shared config. No build-time conflicts arise from adding `test: { ... }` to `vite.config.ts`.

The `tsc --noEmit` step in `npm run build` reads `tsconfig.json`. After adding `"vitest/globals"` and `"@testing-library/jest-dom"` to `types`, `tsc` will resolve those type declarations and make the global Vitest API available during type-checking. This does not affect emitted output (there is none — `noEmit: true`).

Test files themselves (`.test.ts`, `.test.tsx`) are included by `"include": ["src"]` in `tsconfig.json`. TypeScript will type-check them as part of `tsc --noEmit`. This is intentional — it catches type errors in test utilities and mock shapes.

### New File List

| File                                                           | Action                                                                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `inex/ClientApp/vite.config.ts`                                | Modify: change import to `vitest/config`; add `test` block                                                       |
| `inex/ClientApp/tsconfig.json`                                 | Modify: add `vitest/globals` and `@testing-library/jest-dom` to types                                            |
| `inex/ClientApp/package.json`                                  | Modify: add required test devDependencies; add `test` and optional `test:watch` scripts; add `test:ui` only with `@vitest/ui@^3` |
| `inex/ClientApp/src/test/setup.ts`                             | Create: single import of `@testing-library/jest-dom/vitest`                                                      |
| `inex/ClientApp/src/store/categories/categories-slice.test.ts` | Create: reducer smoke test (4 assertions)                                                                        |
| `inex/ClientApp/src/components/ProtectedRoute.test.tsx`        | Create: component render smoke test (3 cases)                                                                    |

### Epic 7 Context

This story is Story 7.3 within Epic 7 (Faster, Safer Frontend Evolution). It is independent of Stories 7.1 (typed models) and 7.2 (code splitting) — no ordering dependency. Stories 7.4a-c (RTK Query) depend on this story having established the test runner: each RTK Query migration story requires `npm test` to pass endpoint coverage tests.

[Source: `docs/planning/epics.md#Epic-7`]

### References

- Story AC source: `docs/planning/epics.md`, Story 7.3 section
- Current `vite.config.ts`: `inex/ClientApp/vite.config.ts`
- Current `tsconfig.json`: `inex/ClientApp/tsconfig.json`
- Current `package.json`: `inex/ClientApp/package.json`
- Current `package-lock.json`: `inex/ClientApp/package-lock.json`
- Docker Node baseline: `docker/api/Dockerfile`
- Categories slice (reducer smoke test target): `inex/ClientApp/src/store/categories/categories-slice.ts`
- CategoryDetails model + `createCategoryDetails` factory: `inex/ClientApp/src/model/Category/CategoryDetails.ts`
- Auth slice (component test setup): `inex/ClientApp/src/store/auth/auth-slice.ts`
- ProtectedRoute component (component smoke test target): `inex/ClientApp/src/components/ProtectedRoute.tsx`
- Store index (reducer registration reference): `inex/ClientApp/src/store/index.ts`
- Prior story example (frontend story format): `docs/implementation/4-3-frontend-active-filter-indicator-on-transaction-list.md`
- Vitest official migration guide: https://vitest.dev/guide/migration — Vitest 4 requires Vite >=6 and Node >=20
- Testing Library React docs: https://testing-library.com/docs/react-testing-library/intro — install `@testing-library/react` with peer dependency `@testing-library/dom`
- jsdom release notes: https://github.com/jsdom/jsdom/releases/tag/27.0.0 — jsdom 27 requires Node 20+

---

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

- 2026-06-02: `npm install -D vitest@^3 @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event jsdom@^26` completed; first sandboxed attempt timed out before writing manifests, escalated rerun succeeded.
- 2026-06-02: `npm test` passed: 2 test files, 7 tests.
- 2026-06-02: `npm run lint` passed.
- 2026-06-02: `npm run build` first failed with `EPERM` while cleaning `build/assets`; escalated rerun passed.

### Implementation Plan

- Add Vitest 3.x, jsdom 26.x, React Testing Library, DOM, jest-dom, and user-event dev dependencies without adding Jest packages.
- Use the existing Vite config as the single test/build config, preserving the concurrent manual chunk configuration while importing `defineConfig` from `vitest/config`.
- Add Vitest/Jest DOM ambient types through the existing `tsconfig.json` `types` array only.
- Add one pure Redux reducer smoke test and one ProtectedRoute render smoke test using a minimal auth-only Redux store.

### Completion Notes List

- Added `test` and `test:watch` scripts; `test` runs `vitest run` for CI-style execution.
- Added `src/test/setup.ts` with the jest-dom Vitest setup import.
- Added `categories-slice.test.ts` covering `setIsLoading`, `setCategories`, and initial items state.
- Added `ProtectedRoute.test.tsx` covering authenticated render, unauthenticated redirect, and initializing state behavior.
- Verified `npm test`, `npm run lint`, and `npm run build` pass from `inex/ClientApp`.
- Left `@vitest/ui` and `test:ui` out because the story made them optional and no UI runner was needed.
- Did not update `docs/implementation/sprint-status.yaml`; it is outside the requested write scope and still lists Story 7.3 as backlog.

### File List

- `inex/ClientApp/package.json`
- `inex/ClientApp/package-lock.json`
- `inex/ClientApp/vite.config.ts`
- `inex/ClientApp/tsconfig.json`
- `inex/ClientApp/src/test/setup.ts`
- `inex/ClientApp/src/store/categories/categories-slice.test.ts`
- `inex/ClientApp/src/components/ProtectedRoute.test.tsx`
- `docs/implementation/7-3-frontend-vitest-rtl.md`

### Change Log

- 2026-06-02: Installed frontend test dependencies, configured Vitest/RTL, added smoke tests, and marked Story 7.3 ready for review.
