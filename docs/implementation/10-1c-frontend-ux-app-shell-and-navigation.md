# Story 10.1c: Frontend UX — App Shell And Navigation

Status: ready-for-dev

## Story

As an invited InEx user,
I want the app shell and route navigation to match the design guide,
so that desktop and mobile navigation are predictable across authenticated workflows.

## Acceptance Criteria

1. **Given** the current `BasicPage` Ant Design shell **When** the authenticated shell is rebuilt **Then** it provides a sticky desktop top nav (60px, white, `--border-1` bottom), brand mark + wordmark, route tabs (Transactions / Accounts / Categories / Budgets / Reports), active tab with `--brand-ink` text and 2px `--income-500` bottom border, user pill (avatar + username, right side), and no authenticated app footer.

2. **Given** the authenticated shell is rebuilt **When** the user opens the user pill on desktop **Then** it navigates to `/profile` (same behavior as current `BasicPage`); a visible logout affordance exists (icon button or separate link) that calls the existing `logoutUser` thunk — logout behavior is identical to current.

3. **Given** a mobile viewport at 390px **When** a protected app route is opened **Then** top route tabs are hidden (CSS `display: none`), bottom navigation is fixed at the viewport bottom (5 nav items, icon + label, active state with `--brand-ink` and `--income-50` icon background), content body has `padding-bottom: 64px` (plus `env(safe-area-inset-bottom)`), and no page-level horizontal overflow appears.

4. **Given** the bottom navigation on mobile **When** a nav item is tapped **Then** the app navigates to the corresponding route using React Router's `useNavigate` — same routes as desktop tabs.

5. **Given** the story is complete **When** `npm run build` and `npm run lint` run from `inex/ClientApp` **Then** both pass with no new `any` usage in touched files, no route protection regressions, no logout regression, and EN/RU localization for all nav labels still works.

6. **Given** mobile visual QA **When** all five authenticated routes are opened at 390px **Then** screenshots confirm: no horizontal overflow, bottom nav visible, content not obscured by bottom nav, user pill visible (icon only, no name).

## Tasks / Subtasks

- [ ] Replace authenticated shell implementation while preserving route/auth behavior (AC: 1, 2, 4)
  - [ ] Implement `inex/ClientApp/src/layouts/AppShell.tsx` using React Router navigation and existing auth hooks
  - [ ] Keep `currentPage` derivation logic compatible with nested `/reports/*` routes
  - [ ] Ensure logout continues to call `dispatch(logoutUser())`
- [ ] Implement shell styling and responsive contracts (AC: 1, 3)
  - [ ] Create `inex/ClientApp/src/layouts/AppShell.css` with token-driven styles and shell-only responsive rules
  - [ ] Remove authenticated footer and drawer-based mobile nav pattern
  - [ ] Verify fixed mobile bottom nav and content safe-area padding behavior
- [ ] Wire pages to the new shell with minimal blast radius (AC: 1, 4)
  - [ ] Choose either direct import migration or `BasicPage` re-export shim
  - [ ] Update only files that currently import `BasicPage`
  - [ ] Do not modify route definitions; `SignageProvider` is owned by Story 10.1b and must already be present before this story starts
- [ ] Validate localization and quality gates (AC: 5, 6)
  - [ ] Add missing nav keys in EN/RU locale files if needed
  - [ ] Run `npm run build` and `npm run lint` from `inex/ClientApp`
  - [ ] Capture mobile visual QA screenshots across authenticated routes

## Prerequisites

**Story 10.1a must be done before starting this story.** Story 10.1a creates `inex/ClientApp/src/styles/tokens.css` with all InEx CSS custom properties. The shell CSS in this story consumes `--brand-ink`, `--income-500`, `--income-50`, `--income-600`, `--border-1`, `--fg-1`, `--fg-2`, `--fg-3`, `--bg-surface`, `--focus-ring`, and `--font-sans`.

Check: `inex/ClientApp/src/styles/tokens.css` must exist and be imported before starting.

**Story 10.1b must be done before starting this story.** Story 10.1b creates `inex/ClientApp/src/components/primitives/`, owns the shared primitive export surface, and owns the `lucide-react` dependency in both `package.json` and `package-lock.json`. This story consumes that dependency for shell icons; it must not install or modify icon dependencies.

## Epic Context

Epic 10 rebuilds the production React app to implement the `docs/design` visual system. This story (10.1c) replaces `BasicPage` with the InEx shell that downstream page stories (10.2 through 10.5b) will use as their wrapper.

Implementation sequence:

1. **10.1a** — Design tokens + Ant Design theme bridge
2. **10.1b** — Shared primitive components (hard prerequisite for this story)
3. **10.1c** — App shell and navigation ← **this story**
4. **10.2** — Transactions ledger (first consumer of new shell)
5. **10.3a/b/c** — Accounts, Categories, Budgets
6. **10.4** — Reports hub and dashboard
7. **10.5a/b** — Profile/settings and auth pages

**Do not rebuild any page content in this story.** Shell scope = `BasicPage.tsx`, routing structure in `App.tsx`, and the new shell CSS file. Page interiors are 10.2 through 10.5b scope.

Epic 1 must be complete before broad UI rollout. If `docs/implementation/sprint-status.yaml` still shows `epic-1` or any Epic 1 story as not `done`, do not treat this prerequisite as satisfied; either complete Epic 1 first or record the explicit delivery decision before starting this story.

## Design References

| Source                    | Location                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------- |
| Desktop shell structure   | `docs/design/Shell.jsx` — `TopNav`, `Logo`, `PageHeader` components                |
| Mobile shell + bottom nav | `docs/design/Shell.jsx` — `BottomNav` component                                    |
| Responsive CSS rules      | `docs/design/responsive.css` — `.r-topnav`, `.r-bottom-nav`, `.r-bottom-nav__item` |
| Shell spec (text)         | `docs/design/docs/design-implementation-guide.md` section 6 "Application Shell"    |
| Token values              | `docs/design/tokens.css`                                                           |

**These mockup files are browser-global reference code, not production code.** Read them for visual and interaction contracts; implement as typed React modules following existing project conventions.

Key design contracts from `Shell.jsx`:

- Nav items: `transactions`, `accounts`, `categories`, `budgets`, `reports` — in that order.
- Desktop active tab: `color: var(--brand-ink)`, `borderBottom: 2px solid var(--income-500)`.
- Desktop tab height: 60px (`display: flex; align-items: center`).
- User pill: avatar circle (26×26, `--brand-ink` bg, white initials), username text, pill border `--border-1`, pill radius 999.
- Page header: `padding: 28px 40px 20px`, title 28px semibold, subtitle 12px uppercase semibold secondary.
- Mobile top nav: height 56px, padding `0 16px`, nav items hidden.
- Mobile user pill: icon only (name hidden via `r-user-pill-name display: none`).
- Bottom nav: `position: fixed; bottom: 0; left: 0; right: 0; z-index: 25; padding: 6px 4px max(6px, env(safe-area-inset-bottom))`.
- Bottom nav item: flex-col, icon-wrap 38×26 with 14px radius, font-size 10px, active state `color: --brand-ink`, icon-wrap `background: --income-50; color: --income-600`.

## Current Implementation — What Exists and Must Be Preserved

### `inex/ClientApp/src/layouts/BasicPage.tsx` (REPLACE)

Current behavior to understand before replacing:

- Uses `antd` `Layout`, `Header`, `Content`, `Footer`, `Menu`, `Drawer`.
- Desktop: `Menu` mode `"horizontal"` with `selectedKeys={[currentPage]}` where `currentPage = useLocation().pathname.slice(1).split('/', 1)[0]`.
- Mobile: hamburger → `antd.Drawer` with inline menu + logout/profile footer.
- `handleNavSelect` calls `navigate(\`/\${e.key}\`)` + closes drawer.
- `handleLogout` calls `dispatch(logoutUser())` — **preserve this exact behavior**.
- Username from `useAppSelector((s) => s.auth.user?.username)` — **preserve this selector**.
- `useBreakpoint()` from `antd` Grid for mobile detection — **replace with CSS-based approach** (CSS classes, not JS breakpoint).
- Footer renders `"InEx ©2025"` — **remove authenticated app footer** per acceptance criterion 1.
- Props: `props.title`, `props.extra`, `props.children`.

### `inex/ClientApp/src/components/ProtectedRoute.tsx` (DO NOT TOUCH)

`ProtectedRoute` renders `<Outlet />` for authenticated users or `<Navigate to="/login" replace />`. It also handles the `isInitializing` splash screen. **Do not modify `ProtectedRoute.tsx`.**

The flow that must be preserved:

1. `App.tsx`: `<Route element={<ProtectedRoute />}>` wraps all authenticated routes.
2. Protected routes render their page component (e.g. `<Transactions />`).
3. Each page component currently renders `<BasicPage>` as its shell.
4. After this story: each page still renders `<AppShell>` (the new component) as its shell — same composition pattern.

### `inex/ClientApp/src/App.tsx` (MINIMAL CHANGE)

Current route structure — **preserve all routes exactly**:

```tsx
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route element={<ProtectedRoute />}>
  <Route path="/" element={<Navigate replace to="/transactions" />} />
  <Route path="/transactions" element={<Transactions />} />
  <Route path="/accounts" element={<Accounts />} />
  <Route path="/categories" element={<Categories />} />
  <Route path="/budgets" element={<Budgets />} />
  <Route path="/profile" element={<Profile />} />
  <Route path="/reports" element={<Reports />}>
    <Route index element={<ReportList />} />
    <Route path="category" element={<ReportCategory />} />
    <Route path="budget" element={<ReportBudgetSpending />} />
    <Route path="history" element={<ReportMonthlyHistory />} />
  </Route>
</Route>
<Route path="*" element={<NotFound />} />
```

The `App.tsx` default redirect `"/" → "/transactions"` is correct for now. Story 10.4 (Reports/Dashboard) introduces the `/dashboard` route and default landing redirect — **do not change the default route in this story**.

**No route changes are needed in App.tsx for this story.** Because Story 10.1b is a hard prerequisite, `SignageProvider` should already be wired before 10.1c starts; do not use this story to finish 10.1b work.

### Store and Auth (DO NOT TOUCH)

- `inex/ClientApp/src/store/auth/auth-actions.ts` — `logoutUser` thunk. Do not modify.
- `inex/ClientApp/src/store/hooks.ts` — `useAppDispatch`, `useAppSelector`. Use as-is.
- `inex/ClientApp/src/utils/apiClient.ts` — Axios instance. Not touched by this story.
- Redux auth slice: `s.auth.accessToken`, `s.auth.user?.username`. These selectors are safe to use.

### i18n (ALL NAV STRINGS MUST USE `useTranslation`)

Current translation keys in use (check `inex/ClientApp/public/locales/<lang>/translation.json`):

- `nav.transactions`, `nav.accounts`, `nav.categories`, `nav.budgets`, `nav.reports` — **must continue to work**.
- `nav.signOut` — used in current `BasicPage` for logout. **Preserve this key**.

If a new key is needed (e.g. `nav.profile`), add it to both `inex/ClientApp/public/locales/en/translation.json` and `inex/ClientApp/public/locales/ru/translation.json`.

## File Map

### Files to Create

```
inex/ClientApp/src/layouts/AppShell.tsx         ← new shell component (replaces BasicPage)
inex/ClientApp/src/layouts/AppShell.css         ← shell-specific styles (import tokens.css)
```

### Files to Modify

```
inex/ClientApp/src/layouts/BasicPage.tsx        ← replace implementation (or delete + update imports)
inex/ClientApp/src/pages/Transactions.tsx       ← update import: BasicPage → AppShell
inex/ClientApp/src/pages/Accounts.tsx          ← update import: BasicPage → AppShell
inex/ClientApp/src/pages/Categories.tsx        ← update import: BasicPage → AppShell
inex/ClientApp/src/pages/Budgets.tsx           ← update import: BasicPage → AppShell
inex/ClientApp/src/pages/Profile.tsx           ← update import: BasicPage → AppShell
inex/ClientApp/src/pages/Reports.tsx            ← update import: BasicPage → AppShell
```

**Check each page first** — not all pages may use `BasicPage` directly. Some may embed it differently. Only update files that actually import `BasicPage`.

> **Strategy choice:** Either (a) keep `BasicPage.tsx` as a re-export shim `export { AppShell as default } from './AppShell'` to avoid touching every page import, or (b) replace `BasicPage.tsx` in place and leave the filename. Both are valid. The re-export shim is lower risk for this story.

### Files NOT to Modify

- `inex/ClientApp/src/components/ProtectedRoute.tsx` — do not touch.
- `inex/ClientApp/src/App.tsx` — do not touch; route structure and `SignageProvider` wiring should already be complete from prerequisite stories.
- `inex/ClientApp/src/store/**` — no changes.
- Any page component interior — only the `BasicPage` → `AppShell` import update.

### Shared Ownership Hotspots

| Hotspot | Rule for this story |
| --- | --- |
| `inex/ClientApp/src/App.tsx` | Preserve existing routes, `ProtectedRoute`, public auth routes, Ant Design locale/theme wiring from 10.1a, and `SignageProvider` from 10.1b. Do not add `/dashboard`; 10.4 owns that route change. |
| Locale files | Add only shell/navigation keys needed by this story, to both EN and RU files. Do not edit page-specific copy owned by 10.2 through 10.5b. |
| `package.json` / `package-lock.json` | Do not modify. `lucide-react` is owned by 10.1b. |
| Shared primitives | Consume exports from 10.1b; do not create shell-local duplicates of `IconBtn`, signage, or drawer primitives. |

## Implementation Spec

### `AppShell.tsx` Component Interface

```tsx
interface AppShellProps {
  title: string;
  subtitle?: string; // page subtitle (uppercase label above title)
  extra?: React.ReactNode; // right-side page header actions
  children: React.ReactNode;
}
```

Preserve the existing `props.title` and `props.extra` contract so page files need only an import update, not prop changes.

`subtitle` is new — pages that don't pass it get no subtitle line. This is backward-compatible.

### Desktop Shell Structure

```tsx
<div className="inex-shell">
  {/* Sticky top nav */}
  <header className="inex-topnav r-topnav">
    <div className="inex-topnav__brand r-topnav-brand">
      <Logo />
    </div>
    <nav
      className="inex-topnav__items r-topnav-items"
      aria-label={t("nav.mainNav")}
    >
      {NAV_ITEMS.map((item) => (
        <NavTab key={item.key} item={item} active={currentPage === item.key} />
      ))}
    </nav>
    <div className="inex-topnav__actions r-topnav-actions">
      <UserPill
        username={username}
        onProfileClick={() => navigate("/profile")}
      />
      <button
        className="inex-logout r-hide-mobile"
        aria-label={t("nav.signOut")}
        onClick={handleLogout}
      >
        <LogOut size={16} />
      </button>
    </div>
  </header>

  {/* Page header */}
  <div className="inex-page-head r-page-head">...title + extra...</div>

  {/* Page content */}
  <main className="inex-page-body r-page-body">{children}</main>

  {/* Mobile bottom nav */}
  <nav className="r-bottom-nav" aria-label={t("nav.mainNav")}>
    {NAV_ITEMS.map((item) => (
      <BottomNavItem
        key={item.key}
        item={item}
        active={currentPage === item.key}
      />
    ))}
  </nav>
</div>
```

### `Logo` Component

```tsx
// Uses CSS vars from tokens.css (10.1a)
// The brand mark SVG: check if public/assets/mark.svg exists.
// If not, render text-only: "InEx" in --brand-ink with fw-800 and ls -0.04em.
// Do NOT add a new SVG asset if it doesn't already exist in production.
```

Check `inex/ClientApp/public/` for existing brand mark assets before implementing.

### Nav Icons

Use `lucide-react` installed by Story 10.1b:

| Nav item     | Lucide icon      |
| ------------ | ---------------- |
| transactions | `ArrowLeftRight` |
| accounts     | `Wallet`         |
| categories   | `Tag`            |
| budgets      | `Target`         |
| reports      | `BarChart3`      |

### `currentPage` Detection

```tsx
const currentPage = useLocation().pathname.slice(1).split("/", 1)[0];
// '/transactions' → 'transactions'
// '/reports/category' → 'reports'   ← nested report routes highlight Reports tab
// '/' → ''   ← no tab active (only happens on default redirect in flight)
```

This is identical to the current `BasicPage` logic — preserve it.

### Mobile Detection Strategy

**Do NOT use `antd.Grid.useBreakpoint()` in `AppShell`** — the new shell uses CSS classes for responsive behavior, matching the `docs/design/responsive.css` contract.

The `r-topnav-items` class is hidden by CSS at ≤768px (see `responsive.css`). The `r-bottom-nav` is hidden at >768px. No JS breakpoint check is needed in the new shell component.

The `isMobile` JS check in the current `BasicPage` can be removed from the new shell. If any page component currently reads `isMobile` from `BasicPage` props, that is not possible (it's not a prop), so no adjustment needed.

### Logout Affordance

The current `BasicPage` desktop puts logout in the nav header. The current mobile puts it in the slide-in drawer.

In the new shell:

- **Desktop**: `LogOut` icon button in the top nav actions area (after user pill), labelled `nav.signOut`, calls `dispatch(logoutUser())`.
- **Mobile**: The user pill icon (visible at mobile) links to `/profile`. Profile page (10.5a scope) will add mobile logout from settings. For this story, add a logout option inside a mobile-only dropdown or simply put a logout icon button next to the user pill icon on mobile. The simplest correct option: show a logout icon next to the user pill avatar on mobile (both are visible). Either approach is acceptable — **pick the simpler one**.

The key invariant: **`logoutUser()` thunk must be callable from the shell on both desktop and mobile**.

### CSS File: `AppShell.css`

Create `inex/ClientApp/src/layouts/AppShell.css` with:

1. **Import tokens**: `@import '../styles/tokens.css';`
2. **Shell layout** (wraps the full viewport):
   ```css
   .inex-shell {
     display: flex;
     flex-direction: column;
     min-height: 100vh;
     background: var(--bg-app);
   }
   ```
3. **Top nav** (copy from `docs/design/Shell.jsx` + `responsive.css` — translate inline styles to classes):
   ```css
   .inex-topnav {
     height: 60px;
     background: var(--bg-surface);
     border-bottom: 1px solid var(--border-1);
     display: flex;
     align-items: center;
     padding: 0 40px;
     position: sticky;
     top: 0;
     z-index: 20;
   }
   ```
4. **Nav tab**:
   ```css
   .inex-nav-tab {
     padding: 0 14px;
     height: 60px;
     display: flex;
     align-items: center;
     gap: 7px;
     font-size: 13.5px;
     font-weight: 500;
     color: var(--fg-2);
     border-bottom: 2px solid transparent;
     cursor: pointer;
     text-decoration: none;
     transition: color 120ms ease;
   }
   .inex-nav-tab.is-active {
     font-weight: 600;
     color: var(--brand-ink);
     border-bottom-color: var(--income-500);
   }
   ```
5. **User pill** (copy from `Shell.jsx`):
   ```css
   .inex-user-pill {
     display: flex;
     align-items: center;
     gap: 10px;
     padding: 4px 12px 4px 4px;
     border: 1px solid var(--border-1);
     border-radius: 999px;
     cursor: pointer;
     text-decoration: none;
   }
   .inex-user-pill__avatar {
     width: 26px;
     height: 26px;
     border-radius: 50%;
     background: var(--brand-ink);
     color: #fff;
     display: inline-flex;
     align-items: center;
     justify-content: center;
     font-size: 11px;
     font-weight: 600;
   }
   .inex-user-pill__name {
     font-size: 13px;
     font-weight: 500;
     color: var(--fg-1);
   }
   ```
6. **Page header** (from `Shell.jsx` `PageHeader` + `responsive.css` `.r-page-head`):
   ```css
   .inex-page-head {
     padding: 28px 40px 20px;
     display: flex;
     align-items: flex-end;
     justify-content: space-between;
     gap: 24px;
     flex-wrap: wrap;
   }
   .inex-page-head__subtitle {
     font-size: 12px;
     font-weight: 600;
     text-transform: uppercase;
     letter-spacing: 0.08em;
     color: var(--fg-3);
     margin-bottom: 6px;
   }
   .inex-page-head__title {
     font-size: 28px;
     font-weight: 600;
     letter-spacing: -0.02em;
     color: var(--fg-1);
     line-height: 1.1;
   }
   ```
7. **Body** (page content area):
   ```css
   .inex-page-body {
     flex: 1;
     padding: 0 40px 32px;
   }
   ```
8. **Include the `r-*` responsive rules** from `docs/design/responsive.css` that apply to the shell. Do NOT copy the entire `responsive.css` verbatim — copy only the rules for `.r-topnav`, `.r-topnav-brand`, `.r-topnav-items`, `.r-topnav-actions`, `.r-user-pill`, `.r-user-pill-name`, `.r-page-head`, `.r-page-head-title`, `.r-page-head-right`, `.r-page-body`, `.r-bottom-nav`, `.r-bottom-nav__item`, `.r-bottom-nav__icon-wrap`, `.r-mobile-only`, `.r-desktop-only`, the `body { padding-bottom: 64px }` mobile rule, and the `>768px` `.r-bottom-nav { display: none }` rule.

> **Important:** The full `responsive.css` from `docs/design` covers all pages (accounts, categories, budgets, etc.). In this story, only copy the shell-relevant rules. Page-specific responsive rules (`.r-workspace`, `.r-ledger-row`, etc.) will be added in their respective page stories (10.2, 10.3a/b/c).

### Removing the Authenticated Footer

Current `BasicPage.tsx` renders:

```tsx
<Footer style={{ textAlign: "center" }}>InEx ©2025</Footer>
```

**Remove this footer from `AppShell`.** The design guide has no authenticated app footer. The mobile bottom nav is a fixed overlay, not a footer.

### Ant Design Imports in AppShell

The new `AppShell` should **not** use `antd.Layout`, `antd.Header`, `antd.Content`, `antd.Footer`, or `antd.Menu`. These are replaced by the custom CSS layout.

The `antd.Drawer` mobile menu is replaced by the bottom nav pattern — **no hamburger drawer in the new shell**.

You may still use `antd` utilities in `AppShell.tsx` if needed (e.g. `antd.Typography` for text, though CSS is preferred). Keep Ant Design to an absolute minimum in the new shell.

## Navigation Items

```tsx
const NAV_ITEMS = [
  { key: "transactions", labelKey: "nav.transactions", icon: ArrowLeftRight },
  { key: "accounts", labelKey: "nav.accounts", icon: Wallet },
  { key: "categories", labelKey: "nav.categories", icon: Tag },
  { key: "budgets", labelKey: "nav.budgets", icon: Target },
  { key: "reports", labelKey: "nav.reports", icon: BarChart3 },
] as const;
```

These match the current `BasicPage` nav items exactly. Do not add or reorder nav items in this story.

## i18n Requirements

Check `inex/ClientApp/public/locales/en/translation.json` and `inex/ClientApp/public/locales/ru/translation.json` for existing keys before adding any new key.

Keys that MUST exist:

- `nav.transactions` ✓ (existing)
- `nav.accounts` ✓ (existing)
- `nav.categories` ✓ (existing)
- `nav.budgets` ✓ (existing)
- `nav.reports` ✓ (existing)
- `nav.signOut` ✓ (existing)

Keys to add if missing:

- `nav.mainNav` — ARIA label for `<nav>` elements. Add `"Main navigation"` / `"Основная навигация"`.
- `nav.profile` — if needed for user pill aria-label. Add `"Profile"` / `"Профиль"`.

Current baseline check: `nav.mainNav` and `nav.profile` are not present in locale files and should be added in this story if used.

No hardcoded UI text in `AppShell.tsx`. Use `t('...')` for everything visible.

## What "Done" Looks Like

The story is done when:

1. `BasicPage.tsx` is replaced (or re-exports `AppShell`).
2. All authenticated pages that used `BasicPage` now render `AppShell` with identical visual structure.
3. Desktop: sticky top nav with brand mark, 5 nav tabs, user pill, logout affordance.
4. Mobile 390px: top nav without tabs, bottom nav fixed, content padded.
5. Active tab highlights correctly on all 5 routes including nested report routes.
6. Logout works on both desktop and mobile.
7. Profile navigation works (user pill → `/profile`).
8. `npm run build` passes.
9. `npm run lint` passes with no new `any`.
10. Screenshots captured: desktop populated shell, mobile shell at 390px.

## Anti-Patterns — Do NOT Do This

- ❌ Do not add a mobile hamburger drawer. Mobile navigation uses bottom nav only.
- ❌ Do not use `antd.Menu` for the desktop nav tabs. Custom CSS nav tabs are required.
- ❌ Do not use `useBreakpoint()` for responsive behavior. Use CSS classes.
- ❌ Do not add the `data-lucide` attribute pattern from the mockup. Use `lucide-react` React components.
- ❌ Do not hard-code nav labels. Use `t('nav.xxx')`.
- ❌ Do not modify `ProtectedRoute.tsx`.
- ❌ Do not add routes or change the default redirect (that is 10.4 scope).
- ❌ Do not add page-level responsive CSS for page interiors (ledger rows, workspace grids, etc.) — those belong in their page stories.
- ❌ Do not break `isMobile` pass-through if any page currently uses a prop from `BasicPage` — it doesn't (verify first).
- ❌ Do not keep the footer `"InEx ©2025"` inside the authenticated shell.
- ❌ Do not call `logoutUser()` without `dispatch()`.

## Testing Checklist

Before marking done, verify manually:

- [ ] Visit `/transactions` → Transactions tab active
- [ ] Visit `/accounts` → Accounts tab active
- [ ] Visit `/categories` → Categories tab active
- [ ] Visit `/budgets` → Budgets tab active
- [ ] Visit `/reports`, `/reports/category`, `/reports/budget`, `/reports/history` → Reports tab active
- [ ] Visit `/profile` → No nav tab active (profile is not in nav)
- [ ] Desktop logout → calls `logoutUser()` → redirects to `/login`
- [ ] User pill → navigates to `/profile`
- [ ] EN/RU language switch → all nav labels update
- [ ] Resize to 390px → nav tabs hidden, bottom nav visible, content padded
- [ ] Resize to 390px → tap each bottom nav item → navigates correctly
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

## Latest Tech Notes (Web-Verified)

- React Router: prefer `useNavigate` for imperative tab and bottom-nav clicks; use `useLocation` to derive current route segment and keep nested `/reports/*` mapped to the `reports` nav item.
- React Router: `NavLink` supports active-state class/style callbacks; if used, keep active-state styling in CSS classes aligned with token rules.
- Ant Design v5: `Drawer` supports `open` (not `visible`), `keyboard` defaults to `true` (Escape close), and `maskClosable` defaults to `true`; this is relevant only for residual drawers in page content, not shell navigation.
- Ant Design v5: `destroyOnHidden` is the non-deprecated lifecycle prop replacing `destroyOnClose`; avoid introducing deprecated Drawer APIs in touched files.

Source notes: Context7 docs for `/remix-run/react-router` and `/ant-design/ant-design/5.26.2` were used for this section.

## Dev Notes

- The `antd.Drawer` used in the current mobile hamburger is replaced entirely by the fixed bottom nav. This is a complete UX pattern change, not a style tweak.
- The `isMobile` state variable and `useBreakpoint` import in `BasicPage.tsx` are **completely removed** in `AppShell.tsx`. CSS handles responsiveness.
- The `Flex`, `Space`, `Typography.Title` Ant Design components used in `BasicPage` for the page header are replaced by the InEx CSS-class-based page header. This reduces Ant Design coupling in the shell.
- `lucide-react` is provided by Story 10.1b. Do not run `npm install` or edit `package.json` / `package-lock.json` in this story.
- The `r-page-body` class should apply `padding: 0 40px 32px` on desktop and `padding: 0 16px 96px` on mobile (the 96px is for bottom nav clearance). Alternatively use `0 40px 32px` desktop / `0 16px` mobile for the content area, and rely on `body { padding-bottom: 64px }` for bottom nav clearance. Either approach is acceptable — **be consistent with what `responsive.css` shows** (`body { padding-bottom: 64px }` on mobile and `.r-workspace { padding: 0 16px 96px }` for page content areas).
- The `docs/design/Shell.jsx` mockup's `PageHeader` component is implemented as part of `AppShell` — not as a separate component for this story. It can be extracted later if needed.

### Source References

- `docs/planning/epics.md` (Epic 10, Story 10.1c)
- `docs/planning/design-update-plan.md` (shell migration principles and responsive gates)
- `docs/planning/ux-design.md` (UX source index)
- `docs/design/docs/design-implementation-guide.md` (application shell and responsive contract)
- `inex/ClientApp/src/layouts/BasicPage.tsx` (current shell behavior baseline)
- `inex/ClientApp/src/App.tsx` (route and protected-route composition baseline)
- `inex/ClientApp/src/pages/Transactions.tsx`
- `inex/ClientApp/src/pages/Accounts.tsx`
- `inex/ClientApp/src/pages/Categories.tsx`
- `inex/ClientApp/src/pages/Budgets.tsx`
- `inex/ClientApp/src/pages/Profile.tsx`
- `inex/ClientApp/src/pages/Reports.tsx`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Completion Notes List

- Story context validated against current repository paths and implementation baselines.
- Checklist gaps fixed: task breakdown, file-path corrections, locale-path corrections, and latest-tech guardrails.
- Story remains in `ready-for-dev` state and is now aligned with sprint status.

### File List

- `docs/implementation/10-1c-frontend-ux-app-shell-and-navigation.md`
