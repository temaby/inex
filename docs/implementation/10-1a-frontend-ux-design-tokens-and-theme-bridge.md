# Story 10-1a: Frontend UX — Design Tokens And Theme Bridge

**Epic:** 10 — Frontend Design System Rebuild  
**Story:** 1a  
**Status:** ready-for-dev  
**Created:** 2026-05-29

---

## Story Statement

As an invited InEx user,  
I want the production app to expose the documented design tokens,  
So that later UI work shares a stable visual foundation.

---

## Context And Motivation

Epic 10 rebuilds the production React app to match the `docs/design` visual system. Story 10.1a is the **foundation layer** — no page redesigns can land until tokens are in place. This story is intentionally narrow: it lays the CSS custom property layer and bridges Ant Design v5's `ConfigProvider` theme. It does **not** rebuild any page, does not touch routing, and does not replace any existing component. Later stories (10.1b → 10.6) build on top of this without re-doing the token work.

**What exists today:**

- `inex/ClientApp/src/App.tsx` — imports `antd/dist/reset.css`; `ConfigProvider` receives only `locale`, no `theme`
- `inex/ClientApp/src/layouts/BasicPage.tsx` — Ant Design Layout shell; uses inline styles
- `inex/ClientApp/src/index.tsx` — no global CSS imports beyond what App.tsx imports
- `inex/ClientApp/src/components/Dropdown.module.css` — the **only** existing CSS file in `src/` (not a global)
- **No** `index.css`, `global.css`, or existing CSS custom property layer

**Design token source:** `docs/design/tokens.css` — full reference file; DO NOT copy verbatim. The production file must omit the Google Fonts `@import`; this story defines font-family stacks only. Explicit Inter / JetBrains Mono font loading is outside 10.1a and 10.1b unless a separate font-loading task is created. Read the full token file before writing; every group must be present.

**Primitives reference:** `docs/design/Primitives.jsx` — component usage examples; shows how tokens are consumed. Not production code; use as behavioral reference only.

---

## Acceptance Criteria

**Given** the design tokens in `docs/design/tokens.css`  
**When** this story is complete  
**Then** `inex/ClientApp/src/styles/tokens.css` exposes equivalent `:root` custom properties covering:

- Brand ink (`--brand-ink`, `--brand-ink-soft`)
- Semantic money colors: income (`--income-*`), expense (`--expense-*`), transfer (`--transfer-*`), warn (`--warn-*`)
- Neutral foregrounds (`--fg-1` through `--fg-on-dark`)
- Surface backgrounds (`--bg-app`, `--bg-surface`, `--bg-raised`, `--bg-muted`, `--bg-stripe`)
- Borders (`--border-1`, `--border-2`, `--border-strong`)
- Elevation shadows (`--shadow-0` through `--shadow-4`, `--focus-ring`, `--focus-ring-error`)
- Border radius (`--radius-1` through `--radius-pill`)
- Spacing scale (`--space-0` through `--space-16`)
- Typography (`--font-sans`, `--font-mono`, `--font-num`, font-size scale `--fs-11` through `--fs-48`, line-height `--lh-*`, font-weight `--fw-*`)
- Motion (`--dur-1` through `--dur-3`, `--ease-*`)

**Given** Ant Design components remain in production  
**When** this story is complete  
**Then** `ConfigProvider` in `inex/ClientApp/src/App.tsx` receives a `theme` prop sourced from `inex/ClientApp/src/styles/antd-theme.ts`, mapping InEx token values into AntD v5 theme tokens for: primary color, error color, warning color, info color, border radius, font family, font size, border colors, text color, link color, and background colors. The `locale` prop on `ConfigProvider` must remain unchanged.

**Given** the story is complete  
**When** `npm run build` and `npm run lint` run from `inex/ClientApp`  
**Then** both pass with no new TypeScript errors and no new `any` usage in touched files.

**Given** the token layer is live  
**When** any existing page renders  
**Then** there are no visible regressions — routing, data loading, auth, localization, and existing Ant Design component appearance must be functionally unchanged.

---

## Tasks / Subtasks

- [ ] Task 1: Establish production token baseline (AC: 1)
  - [ ] Create `inex/ClientApp/src/styles/tokens.css`
  - [ ] Port all token groups from `docs/design/tokens.css` into `:root`
  - [ ] Keep base semantic styles (`html`, `body`, headings, body text, numeric helpers)
  - [ ] Exclude Google Fonts `@import` from production token file
- [ ] Task 2: Bridge InEx tokens into Ant Design theme (AC: 2)
  - [ ] Create `inex/ClientApp/src/styles/antd-theme.ts`
  - [ ] Export `inexTheme` typed as `ThemeConfig`
  - [ ] Map seed token values from InEx palette to AntD token keys
  - [ ] Ensure token values are raw values (no CSS variable references)
- [ ] Task 3: Wire global styles and theme into app entry points (AC: 2)
  - [ ] Import `./styles/tokens.css` in `inex/ClientApp/src/index.tsx`
  - [ ] Import `inexTheme` in `inex/ClientApp/src/App.tsx`
  - [ ] Add `theme={inexTheme}` on `ConfigProvider`
  - [ ] Preserve existing `locale={antdLocale}` and `antd/dist/reset.css`
- [ ] Task 4: Validate no regressions and no typing quality drop (AC: 3, 4)
  - [ ] Run `npm run build` in `inex/ClientApp`
  - [ ] Run `npm run lint` in `inex/ClientApp`
  - [ ] Verify no new `any` in touched `.ts/.tsx` files
  - [ ] Smoke-check route rendering and localization behavior

---

## Implementation

### Files To Create

#### `inex/ClientApp/src/styles/tokens.css`

Create this directory and file. Place **all** `:root` token definitions here. Omit the Google Fonts `@import` from `docs/design/tokens.css` — fonts are loaded separately (out of scope for this story). The `:root` block should include every token group from `docs/design/tokens.css`. After the `:root` block, include the base element styles (the `html, body`, `h1`–`h5`, `p`, `.body-sm`, `.eyebrow`, and any other utility classes that appear at the bottom of the reference file).

Key values to get right (verify against `docs/design/tokens.css`):

```css
--brand-ink: #0f1e2e;
--income-500: #2f8f82; /* teal — primary CTA, income, active indicator */
--expense-500: #c35a4a; /* terracotta — destructive, expense */
--transfer-500: #4b6a8c; /* slate */
--warn-500: #d98a1b; /* amber */
--fg-1: #0f1e2e;
--bg-app: #f5f7fa;
--bg-surface: #ffffff;
--border-1: #e5eaf1;
--border-2: #d4dbe5;
--radius-2: 6px; /* inputs, buttons */
--radius-3: 10px; /* cards, panels */
--font-sans:
  "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-num: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
--fs-14: 14px; /* body default */
```

#### `inex/ClientApp/src/styles/antd-theme.ts`

Export a single `inexTheme` constant typed as `import type { ThemeConfig } from 'antd'`. This object is passed directly to `ConfigProvider`'s `theme` prop.

Ant Design v5 `theme.token` mappings (all values must come from the CSS token values — hard-code the same hex values, not CSS variable references, because AntD JS theme does not read CSS vars):

```typescript
import type { ThemeConfig } from "antd";

export const inexTheme: ThemeConfig = {
  token: {
    colorPrimary: "#2F8F82", // --income-500
    colorError: "#C35A4A", // --expense-500
    colorWarning: "#D98A1B", // --warn-500
    colorInfo: "#4B6A8C", // --transfer-500
    colorTextBase: "#0F1E2E", // --fg-1
    colorBgBase: "#FFFFFF", // --bg-surface
    colorBgLayout: "#F5F7FA", // --bg-app
    colorBorder: "#E5EAF1", // --border-1
    colorBorderSecondary: "#D4DBE5", // --border-2
    colorLink: "#267468", // --income-600
    borderRadius: 6, // --radius-2
    borderRadiusLG: 10, // --radius-3
    borderRadiusSM: 4, // --radius-1
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14, // --fs-14
    boxShadow: "0 1px 2px rgba(15,30,46,0.04), 0 1px 1px rgba(15,30,46,0.03)", // --shadow-1
    boxShadowSecondary:
      "0 2px 6px rgba(15,30,46,0.06), 0 1px 2px rgba(15,30,46,0.04)", // --shadow-2
  },
};
```

**Critical:** Do NOT use CSS variable references like `'var(--income-500)'` — Ant Design v5 design tokens require actual values, not CSS custom properties. Keep AntD's internal token computation working correctly.

### Files To Modify

#### `inex/ClientApp/src/index.tsx`

Add one import line. The final file should look exactly like the current file with one new import inserted after `"./i18n"`:

```typescript
import "./styles/tokens.css";
```

Full import block after change:

```typescript
import "./dayjsSetup";
import App from "./App";
import store from "./store";
import "./i18n";
import "./styles/tokens.css";
```

Order matters minimally here, but keep `tokens.css` after `i18n` and before the render call.

#### `inex/ClientApp/src/App.tsx`

Two changes:

1. Add import: `import { inexTheme } from './styles/antd-theme';`
2. Add `theme={inexTheme}` to `<ConfigProvider>`: `<ConfigProvider locale={antdLocale} theme={inexTheme}>`

The `locale` prop must remain — do not remove it. The existing `antd/dist/reset.css` import must remain. Everything else in `App.tsx` stays identical.

**Before:**

```tsx
import { ConfigProvider } from "antd";
// ...
return (
    <ConfigProvider locale={antdLocale}>
```

**After:**

```tsx
import { ConfigProvider } from "antd";
import { inexTheme } from './styles/antd-theme';
// ...
return (
    <ConfigProvider locale={antdLocale} theme={inexTheme}>
```

---

## What NOT To Change

- **Do NOT modify** `inex/ClientApp/src/layouts/BasicPage.tsx` — that is Story 10.1c scope
- **Do NOT modify** any page component under `inex/ClientApp/src/pages/`
- **Do NOT modify** `inex/ClientApp/src/store/` files — no Redux changes in this story
- **Do NOT modify** `inex/ClientApp/vite.config.ts` — Vite config is untouched
- **Do NOT remove** `"antd/dist/reset.css"` import from `App.tsx` — it remains required
- **Do NOT add** Google Fonts loading — 10.1a and 10.1b use CSS font-family stacks and fallbacks only; explicit Inter / JetBrains Mono loading requires a separate task
- **Do NOT introduce** any new npm dependencies — this story uses only existing packages
- **Do NOT use** CSS variable references as Ant Design token values — AntD v5 needs raw values
- **Do NOT break** the existing `anytype` behavior or introduce `@ts-ignore` suppressors

---

## Cross-Story Dependencies

| Dependency                                    | Direction                       | Notes                                                       |
| --------------------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| Epic 7 Story 7.1 (Typed API models, no `any`) | Should precede or run alongside | This story must not introduce `any` in new TypeScript files |
| Story 10.1b (Shared Primitives)               | Follows this story              | Primitives consume the CSS custom properties added here     |
| Story 10.1c (App Shell & Navigation)          | Follows this story              | Shell uses tokens for nav colors, spacing, shadows          |
| Stories 10.2–10.6 (page redesigns)            | Follow this story               | All page redesigns consume the token layer                  |

This story is the **first** in Epic 10 and has no Epic 10 prerequisites. Epic 1 must be complete (security hardening) before broad UI rollout, but the token layer itself does not introduce new API surface or authorization concerns.

---

## Validation Checklist

Before marking this story complete:

- [ ] `inex/ClientApp/src/styles/tokens.css` exists and defines all token groups from reference
- [ ] `inex/ClientApp/src/styles/antd-theme.ts` exists and exports `inexTheme: ThemeConfig`
- [ ] `index.tsx` imports `./styles/tokens.css`
- [ ] `App.tsx` passes `theme={inexTheme}` to `ConfigProvider` alongside `locale`
- [ ] `npm run build` passes (runs `tsc --noEmit && vite build`) from `inex/ClientApp`
- [ ] `npm run lint` passes from `inex/ClientApp`
- [ ] No new `any` types introduced in any touched `.ts` or `.tsx` file
- [ ] All existing routes (`/transactions`, `/accounts`, `/categories`, `/budgets`, `/reports`, `/profile`, `/login`, `/register`) load without visual breakage
- [ ] CSS custom properties are visible in browser DevTools `:root` computed styles

---

## Dev Notes

**AntD v5 theming model (brief):** Unlike AntD v4 which used Less variables, AntD v5 uses a JS-based design token system. `ConfigProvider theme.token` sets "seed tokens" that AntD uses to derive a full palette. Setting `colorPrimary` automatically derives `colorPrimaryHover`, `colorPrimaryActive`, etc. Setting `colorError` drives error/danger states. This means the 10 or so mappings in `antd-theme.ts` will propagate to all AntD components automatically — you do not need to map every derived color.

**CSS custom properties are separate:** The CSS layer (`tokens.css`) and the AntD theme layer (`antd-theme.ts`) serve different consumers. CSS custom properties are for custom HTML/JSX, InEx-specific components, and non-AntD layout. AntD theme tokens control AntD components (Button, Input, Form, Table, etc.). Both must be present.

**TypeScript:** `ThemeConfig` is exported from `'antd'` — import it as a type. The `inexTheme` constant should satisfy TypeScript strict mode without any type assertions.

**Import location:** Importing `tokens.css` in `index.tsx` (rather than `App.tsx`) ensures it loads before React renders anything, including the AntD reset. This is the correct placement for a global CSS baseline.

**No visual regression expected:** The AntD theme change will shift primary button color from AntD's default blue (`#1677ff`) to InEx income-teal (`#2F8F82`). This is intentional and correct. All other AntD component colors (error red, warning amber) will also align with InEx semantics. This is a visual improvement, not a regression.

### Source References

- `docs/planning/epics.md` (Epic 10, Story 10.1a acceptance criteria and sequencing)
- `docs/planning/design-update-plan.md` (design-track principles, token-first migration, AntD theme bridging direction)
- `docs/planning/ux-design.md` (UX source index and planning linkage)
- `docs/planning/architecture.md` (project architecture constraints and compatibility guardrails)
- `docs/planning/prds/prd-inex-2026-05-20/prd.md` (FR-UX and NFR-UX requirements context)
- `docs/design/tokens.css` (canonical token values and base type/utility styles)
- `docs/design/Primitives.jsx` (token consumption patterns and money semantics expectations)
- `docs/design/docs/design-implementation-guide.md` (token contract, shell/mobile constraints, migration and QA expectations)
- `inex/ClientApp/src/App.tsx` (current `ConfigProvider` usage and route stability baseline)
- `inex/ClientApp/src/index.tsx` (global style entrypoint baseline)

---

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- N/A

### Completion Notes List

- Story context generated from planning and design artifacts with implementation guardrails.
- Checklist validation pass applied to add explicit task plan, source traceability, and agent record sections.

### File List

- `docs/implementation/10-1a-frontend-ux-design-tokens-and-theme-bridge.md`
