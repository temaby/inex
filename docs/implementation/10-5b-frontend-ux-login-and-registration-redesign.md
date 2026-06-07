# Story 10.5b: Frontend UX - Login And Registration Redesign

Status: ready-for-dev

## Story

As an invited account holder,
I want sign-in and invite registration screens to be clear and password-manager-friendly,
so that authentication feels reliable and consistent with the finance app.

## Acceptance Criteria

1. Given the Auth design reference (`docs/design/Auth.jsx`), when `/login` and `/register` are opened, then they render the `AuthShell` split-screen layout: left brand panel (gradient `--brand-ink` → `#1A2D43`, product tagline, feature bullets) and right form panel (max-width 400px, centered), not the current Card-in-grey-background layout.
2. Given the desktop layout, when `/login` or `/register` is viewed at ≥ 768px, then the two-column `1fr 1fr` grid is visible, the brand panel is shown, and no horizontal overflow exists.
3. Given the mobile layout, when `/login` or `/register` is viewed at < 768px, then the brand panel is hidden, the mobile InEx logo is shown above the form, the form is single-column, no bottom navigation appears, and no horizontal overflow exists at 390px or 360px.
4. Given a password field, when the user opens the login or register form, then each password input uses `Input.Password` (Ant Design built-in toggle), has `autoComplete="current-password"` on login or `autoComplete="new-password"` on register, and has the HTML `name` attribute set appropriately so password managers can recognize and fill the field.
5. Given the login form, when the user submits with an API error (e.g., wrong credentials), then an `ErrorBanner` (expense-colored, icon + text, above the form fields) displays the i18n-translated error message from `auth.error` in Redux; the error clears when the user starts editing any field.
6. Given the register form, when the user submits with an API error, then the same `ErrorBanner` pattern displays the API error message; field-level validation errors from `Form.Item` rules are shown inline below each field.
7. Given authentication forms fail client-side validation, when errors are shown to the user, then every error string is from the EN/RU `translation.json` files via `t()` — no hardcoded English strings appear in the rendered output.
8. Given the invite token field on the register form, when rendered, then it shows a visible hint `t('auth.inviteTokenHint')` ("InEx is invite-only") below the field, uses `autoComplete="off"`, and has `name="invite-token"` so password managers do not save it as a password.
9. Given a form is submitting, when the API call is in flight, then the submit button shows Ant Design's `loading` spinner and is disabled; no double-submit is possible.
10. Given the story is complete, when `npm run build` and `npm run lint` run from `inex/ClientApp`, then both pass with no new `any` usage in touched files.
11. Given desktop and mobile visual QA, when screenshots are taken after completion, then they cover: login (default), login (loading state), login (API error state), register (default), register (validation error state), register (API error state), mobile login, mobile register.

## Tasks / Subtasks

- [ ] Build auth layout route and route integration. (AC: 1, 2, 3)
  - [ ] Create `inex/ClientApp/src/components/AuthShell.tsx` with split-screen desktop and single-column mobile behavior.
  - [ ] Move `/login` and `/register` under `<Route element={<AuthShell />}>` in `inex/ClientApp/src/App.tsx`.
  - [ ] Ensure auth pages stay outside `ProtectedRoute` and do not render app shell or bottom nav.
- [ ] Rebuild `Login.tsx` UX and form behavior. (AC: 1, 4, 5, 7, 9)
  - [ ] Remove Card wrapper and legacy centered layout.
  - [ ] Add heading/subtitle, `ErrorBanner`, localized validation messages, and loading submit state.
  - [ ] Use `Input.Password` with `autoComplete="current-password"` and explicit HTML `name` for password-manager compatibility.
  - [ ] Clear `auth.error` on field edits.
  - [ ] Redirect authenticated/successful login users to `/dashboard`; Story 10.4 must be complete before this story is finalized.
- [ ] Rebuild `Register.tsx` UX and form behavior. (AC: 1, 4, 6, 7, 8, 9)
  - [ ] Remove Card wrapper and legacy centered layout.
  - [ ] Add heading/subtitle, `ErrorBanner`, localized validation, invite-token hint, and loading submit state.
  - [ ] Add password strength indicator (0-5 scoring) with localized strength labels.
  - [ ] Use password-manager-friendly `autoComplete` + explicit HTML `name` attributes, including `name="invite-token"`.
  - [ ] Redirect successful registration to `/dashboard`; Story 10.4 must be complete before this story is finalized.
- [ ] Extend localization dictionaries. (AC: 7, 8)
  - [ ] Add required auth keys to `inex/ClientApp/public/locales/en/translation.json`.
  - [ ] Add matching RU keys to `inex/ClientApp/public/locales/ru/translation.json`.
  - [ ] Verify no hardcoded English copy remains in touched auth UI.
- [ ] Validate quality and visual QA deliverables. (AC: 10, 11)
  - [ ] Run `npm run build` in `inex/ClientApp`.
  - [ ] Run `npm run lint` in `inex/ClientApp`.
  - [ ] Capture required desktop/mobile screenshots for login/register states.

## Prerequisites

**Story 10.1a must be done** (creates `inex/ClientApp/src/styles/tokens.css` with all CSS custom properties). The `AuthShell` brand panel uses `var(--brand-ink)`, `var(--income-200)`, `var(--fg-1)`, `var(--fg-3)`, `var(--bg-app)`, `var(--expense-50)`, `var(--expense-100)`, `var(--expense-600)`, `var(--expense-700)` from that file.

**Story 10.1b must be done before starting this story.** Use shared primitives where they fit the auth layout. Do not create auth-local replacements for primitives that already exist, and do not add dependencies in this story.

Story 10.5a (Profile redesign) is a sibling story — no dependency in either direction. Both 10.5a and 10.5b can proceed in parallel if locale-file conflicts are actively managed. Before editing `en/translation.json` or `ru/translation.json`, rebase/merge the latest sibling branch, keep auth keys under `auth.*` and profile/settings-specific keys under their profile/settings namespace, and verify the final dictionaries include both stories' keys before either story is marked done.

Story 10.4 must be done before finalizing auth redirects to `/dashboard`. Do not leave temporary `/transactions` redirects in the completed story.

Story 10.1d finalizes the authenticated landing-route policy for this story: successful login and successful registration must navigate to `/dashboard`; authenticated `/` must continue to resolve to `/dashboard`; direct route access to protected pages must preserve the requested destination when `ProtectedRoute` already supports it, otherwise the fallback target is `/dashboard`. Do not implement Transactions-first auth redirects to match the mockup root behavior.

## Shared Ownership Hotspots

| Hotspot | Rule for this story |
| --- | --- |
| `inex/ClientApp/src/App.tsx` | Own only the auth layout route grouping for `/login` and `/register`; preserve `ProtectedRoute`, 10.4 `/dashboard`, and nested reports routes. |
| Locale files | Add auth keys under `auth.*` in both EN and RU files, and preserve sibling 10.5a profile/settings keys during merges. |
| `package.json` / `package-lock.json` | Do not modify. This story has no dependency ownership. |
| Shared primitives | Consume 10.1b primitives where suitable; do not fork button, error banner, icon, or form-control primitives locally if a shared contract exists. |

## Epic Context

Epic 10 rebuilds the production React app to implement the `docs/design` visual system. Auth pages are the last feature-page conversions before the visual QA story (10.6).

**Implementation sequence:**

1. 10.1a — Design tokens
2. 10.1b — Shared primitives
3. 10.1c — App shell and navigation
4. 10.2 — Transactions ledger
5. 10.3a/b/c — Management pages
6. 10.4 — Reports hub / dashboard
7. **10.5a/b (parallel)** — Profile/settings + Login/Register ← you are here
8. 10.6 — Visual QA baseline

Auth pages are isolated from the app shell by design; they do not render `<AppShell>`, `<ProtectedRoute>`, bottom nav, or page headers. The existing routing in `App.tsx` already keeps `/login` and `/register` outside the `<Route element={<ProtectedRoute />}>` block — preserve this.

## Design References

| Source                                     | Path                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| Auth screen mockup                         | `docs/design/Auth.jsx` — `AuthShell`, `LoginForm`, `RegisterForm`, `ErrorBanner` |
| Design implementation guide (auth section) | `docs/design/docs/design-implementation-guide.md` §8 "Authentication"            |
| Design tokens                              | `docs/design/tokens.css`                                                         |
| Responsive rules                           | `docs/design/docs/design-implementation-guide.md` §10                            |
| Responsive CSS                             | `docs/design/responsive.css`                                                     |

**Key points from the design spec (§8):**

- Desktop: full-height `1fr 1fr` grid, left brand panel, right form panel, no horizontal overflow.
- Mobile: brand panel hidden, single-column form, mobile logo appears, no bottom nav, no horizontal overflow at 390px.
- Keep auth **separate from the app shell** — no `<AppShell>` wrapper, no main navigation.
- Production forms need validation, error summaries, loading state, and password-manager-friendly fields.
- Do not rebuild as a marketing page.
- Social auth buttons (`Google`, `GitHub`) appear in the mockup — **omit them**. InEx is a private self-hosted app; OAuth is not wired up on the backend.
- The "Forgot password?" link in the mockup — **omit it**. Password reset is not implemented (Epic 3 handles email-confirmed auth in the future).
- The "Keep me signed in" checkbox — **omit it**. Session lifetime is controlled by the backend's refresh token; there is no separate remember-me mechanism exposed on the frontend.

## Files To Create

### `inex/ClientApp/src/components/AuthShell.tsx`

A React Router v6 layout route component (renders `<Outlet />`).

```tsx
// Responsibilities:
// - Renders the split-screen two-column grid (desktop) / single-column (mobile)
// - Left: brand panel (gradient, logo, tagline, feature bullets)
// - Right: form panel (mobile logo, <Outlet />, footer nav link)
// - Uses useLocation() to determine which footer link to show
//   ("/login" → "Don't have an account? Register")
//   ("/register" → "Already have an account? Sign in")
// - Uses useTranslation() for all visible strings
// - No bottom nav, no AppShell, no ProtectedRoute inside
```

**Brand panel content (from `Auth.jsx`):**

- Logo: `<img src="/assets/mark.svg" height="40" />` + "InEx" wordmark (font: `var(--font-sans)`, weight 800, size 24px, letter-spacing -0.04em, color #fff)
- Tagline h1 (38px, weight 600, -0.02em, color #fff, line-height 1.15):
  ```
  Every penny.
  Every account.
  "One picture." ← this span uses color: var(--income-200)
  ```
- Subtitle (16px, rgba(255,255,255,0.7)): "Personal finance for people with multiple accounts, multiple currencies, and a strong opinion about where their money goes."
- Feature bullet list:
  | Icon | Title | Sub |
  |---|---|---|
  | `wallet` (lucide-react) | Multi-currency, multi-account | Track PLN, USD, EUR, UZS and more — all reconciled into one net worth. |
  | `target` | Budgets that actually work | Set monthly caps per category. See burn rate and projected overruns in real time. |
  | `bar-chart-3` (maps to `BarChart3` in lucide-react) | Reports built for reflection | Cashflow, net worth, and trends — without spreadsheet maintenance. |
- Footer: `© InEx 2026 · Self-hosted, single-user · Your data stays yours` (12px, rgba(255,255,255,0.45))
- Decorative SVG watermark (bottom-right, 0.04 opacity) — copy the path from `Auth.jsx` verbatim

**Responsive breakpoint (< 768px):**

```css
/* In a <style> tag or CSS module: */
@media (max-width: 768px) {
  .r-auth-shell {
    grid-template-columns: 1fr !important;
  }
  .r-auth-brand {
    display: none !important;
  }
  .r-auth-mobile-logo {
    display: flex !important;
  }
  .r-auth-form-wrap {
    padding: 32px 20px !important;
    align-items: flex-start !important;
  }
}
```

Implement the responsive styles using a `<style>` JSX injection, a CSS module, or Vite's CSS-in-JS approach — pick whatever is consistent with how 10.1c (`AppShell.tsx`) handles its responsive breakpoints. **Do not use inline `style` prop for media queries.**

**Mobile logo (inside form panel, hidden on desktop):**

```tsx
// Hidden by default (display: none), shown at < 768px via the media query
<div
  className="r-auth-mobile-logo"
  style={{ display: "none", alignItems: "center", gap: 8, marginBottom: 24 }}
>
  <img src="/assets/mark.svg" height="26" alt="" />
  <span
    style={{
      fontFamily: "var(--font-sans)",
      fontWeight: 800,
      fontSize: 20,
      letterSpacing: "-0.04em",
      color: "var(--fg-1)",
    }}
  >
    <span style={{ color: "var(--income-600)" }}>In</span>Ex
  </span>
</div>
```

**Footer link (bottom of form panel, outside `<Outlet />`):**

```tsx
const { pathname } = useLocation();
const isLogin = pathname === "/login";

// Below the Outlet:
<div
  style={{
    marginTop: 28,
    textAlign: "center",
    fontSize: 13,
    color: "var(--fg-3)",
  }}
>
  {isLogin ? (
    <>
      {t("auth.dontHaveAccount")}{" "}
      <Link
        to="/register"
        style={{ color: "var(--income-600)", fontWeight: 500 }}
      >
        {t("auth.register")}
      </Link>
    </>
  ) : (
    <>
      {t("auth.alreadyHaveAccount")}{" "}
      <Link to="/login" style={{ color: "var(--income-600)", fontWeight: 500 }}>
        {t("auth.signIn")}
      </Link>
    </>
  )}
</div>;
```

## Files To Modify

### `inex/ClientApp/src/App.tsx`

**Add import:**

```tsx
import AuthShell from "./components/AuthShell";
```

**Replace the two public routes:**

```tsx
// BEFORE:
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />

// AFTER:
<Route element={<AuthShell />}>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
</Route>
```

No other changes to `App.tsx`.

---

### `inex/ClientApp/src/pages/Login.tsx`

**Full rebuild.** The old Card-in-grey layout is replaced by a form that renders directly inside `AuthShell`'s right panel via `<Outlet />`.

Remove: the outer `<div style={{ display: 'flex', justifyContent: 'center', ... }}>` and `<Card>` wrapper.

**New structure:**

```tsx
// No outer layout wrapper — AuthShell provides the chrome.
// The component renders only the form heading + ErrorBanner + <Form>.

return (
  <>
    {/* Form heading */}
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--fg-3)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
        }}
      >
        {t("auth.welcomeBack")}
      </div>
      <h2
        style={{
          fontSize: 26,
          fontWeight: 600,
          color: "var(--fg-1)",
          letterSpacing: "-0.02em",
          margin: 0,
        }}
      >
        {t("auth.signInTitle")}
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "var(--fg-3)",
          marginTop: 6,
          marginBottom: 0,
        }}
      >
        {t("auth.signInSubtitle")}
      </p>
    </div>

    <ErrorBanner message={authError} />

    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      onValuesChange={onValuesChange}
    >
      <Form.Item
        name="email"
        label={t("auth.email")}
        rules={[
          { required: true, message: t("errors.email.required") },
          { type: "email", message: t("errors.email.invalid_format") },
        ]}
      >
        <Input
          size="large"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          autoFocus
        />
      </Form.Item>

      <Form.Item
        name="password"
        label={t("auth.password")}
        rules={[{ required: true, message: t("errors.password.required") }]}
      >
        <Input.Password
          size="large"
          placeholder={t("auth.password")}
          autoComplete="current-password"
          name="password"
        />
      </Form.Item>

      <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={isSubmitting}
          block
        >
          {t("auth.signIn")}
        </Button>
      </Form.Item>
    </Form>
  </>
);
```

**`ErrorBanner` component (define at the top of Login.tsx, or extract to `components/ErrorBanner.tsx`):**

```tsx
const ErrorBanner = ({ message }: { message: string | null }) => {
  if (!message) return null;
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "var(--expense-50)",
        border: "1px solid var(--expense-100)",
        borderRadius: 8,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 20,
      }}
    >
      <AlertCircle
        size={16}
        style={{ color: "var(--expense-600)", flexShrink: 0, marginTop: 1 }}
      />
      <div
        style={{ fontSize: 13, color: "var(--expense-700)", lineHeight: 1.5 }}
      >
        {message}
      </div>
    </div>
  );
};
```

Import `AlertCircle` from `lucide-react` (added in story 10.1b):

```tsx
import { AlertCircle } from "lucide-react";
```

**Keep from the existing Login.tsx:**

- `useAppDispatch`, `useAppSelector`, `loginUser`, `setAuthError` imports
- `const authError = useAppSelector((s) => s.auth.error);`
- `useEffect` that redirects authenticated users; update the target to `/dashboard` once Story 10.4 is in the branch, and do not leave `/transactions` as the final post-auth landing route for Epic 10
- Story 10.1d has finalized `/dashboard` as the post-login target; treat `/transactions` as incorrect for the completed story.
- `onValuesChange` that clears `authError`
- `onFinish` handler (no change)
- `isSubmitting` local state
- `Form.useForm<LoginFormValues>()`

**Remove from the existing Login.tsx:**

- `Card`, `Typography`, `Alert` from antd imports (Alert is replaced by `ErrorBanner`)
- Outer centering wrapper div
- `<Title level={3}>` and `<Text>` (replaced by form heading)
- The old `<Alert message={authError} type="error">` (replaced by `ErrorBanner`)
- Hardcoded `"Sign In"`, `"Email"`, `"Password"` strings (replaced by `t()`)
- Navigation link to `/register` (moved to `AuthShell` footer)

---

### `inex/ClientApp/src/pages/Register.tsx`

**Full rebuild.** Same approach as Login — remove outer Card wrapper, form renders inside `AuthShell`.

**Password strength indicator** (from `Auth.jsx` — implement this):

```tsx
// Derived from the `password` field value via Form.useWatch or local state
// Score: 0-5, increments for: length ≥ 8, has uppercase, has digit, has special char, length ≥ 12
// Render 5 colored segments below the password field
// Colors: ≤2 → var(--expense-500), ≤3 → var(--warn-500), ≥4 → var(--income-500)
// Labels (via t()): weak, ok, good, strong
```

**Form.Item name attributes for password manager compatibility:**

```tsx
// Username field:
<Form.Item name="username" label={t('auth.username')}>
  <Input size="large" autoComplete="username" name="username" placeholder={t('auth.usernamePlaceholder')} />
</Form.Item>

// Email field:
<Form.Item name="email" label={t('auth.email')}>
  <Input size="large" type="email" autoComplete="email" name="email" placeholder="you@example.com" />
</Form.Item>

// Password field:
<Form.Item name="password" label={t('auth.password')}>
  <Input.Password size="large" autoComplete="new-password" name="new-password" />
</Form.Item>

// Confirm password field:
<Form.Item name="confirmPassword" label={t('auth.confirmPassword')}>
  <Input.Password size="large" autoComplete="new-password" name="new-password-confirm" />
</Form.Item>

// Currency field: (no autoComplete change needed)
<Form.Item name="currencyId" label={t('common.currency')}>
  <Select ... />
</Form.Item>

// Language field:
<Form.Item name="languageCode" label={t('auth.language')}>
  <Select ... onChange={handleLanguageChange} />
</Form.Item>

// Invite token — must NOT be autocompleted by password managers:
<Form.Item
  name="inviteToken"
  label={t('auth.inviteToken')}
  help={t('auth.inviteTokenHint')}
  rules={[{ required: true, message: t('errors.invite_token.required') }]}
>
  <Input size="large" autoComplete="off" name="invite-token" />
</Form.Item>
```

**Note on `name` attribute:** keep `Form.Item name="inviteToken"` for form-state mapping, and set explicit HTML input names via `Input` props (`name="invite-token"`, `name="password"`, etc.) to satisfy password-manager heuristics and AC #8.

**Form heading for register:**

```tsx
<div style={{ marginBottom: 24 }}>
  <div
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: 8,
    }}
  >
    {t("auth.getStarted")}
  </div>
  <h2
    style={{
      fontSize: 26,
      fontWeight: 600,
      color: "var(--fg-1)",
      letterSpacing: "-0.02em",
      margin: 0,
    }}
  >
    {t("auth.registerTitle")}
  </h2>
  <p
    style={{
      fontSize: 14,
      color: "var(--fg-3)",
      marginTop: 6,
      marginBottom: 0,
    }}
  >
    {t("auth.registerSubtitle")}
  </p>
</div>
```

**Keep from the existing Register.tsx:**

- All Redux imports (`registerUser`, `setAuthError`)
- `useEffect` redirect on `accessToken`, with the final Epic 10 redirect target aligned to `/dashboard` after Story 10.4
- Story 10.1d has finalized `/dashboard` as the post-registration target; treat `/transactions` as incorrect for the completed story.
- `useEffect` that fetches currencies and pre-selects EUR
- `handleLanguageChange` function (changes `i18n.language` and `localStorage`)
- `onValuesChange` that clears `authError`
- `onFinish` handler (no change)
- `isSubmitting` local state
- All validation rules

**Remove from existing Register.tsx:**

- `Card`, `Typography`, `Alert` from antd
- Outer centering wrapper div
- `<Title level={3}>` / `<Text>` (replaced by form heading)
- The old `<Alert message={authError}>` (replaced by `ErrorBanner`)
- Navigation link to `/login` (moved to `AuthShell` footer)

---

### `inex/ClientApp/public/locales/en/translation.json`

**Add these keys inside the `"auth"` object:**

The auth story must also add EN/RU keys for every visible `AuthShell` string, not only form headings. Required coverage includes:

- Brand panel copy: tagline, highlighted phrase, and any supporting microcopy.
- Feature bullets: title and description for multi-currency/accounts, privacy/invite-only access, and reports/reflection.
- Footer copy and auth route links.
- Placeholders, including username and email placeholder text. If `you@example.com` is kept as an email-format example, document it as an intentional placeholder exception; otherwise localize it.
- API/banner error mappings: invalid credentials, generic login failure, generic registration failure, duplicate email, invalid/expired invite token, and unknown fallback error.

```json
"welcomeBack": "Welcome back",
"signInTitle": "Sign in to InEx",
"signInSubtitle": "Use your account credentials to access your dashboard.",
"getStarted": "Get started",
"registerTitle": "Create your InEx account",
"registerSubtitle": "Bring your accounts together in one private dashboard.",
"dontHaveAccount": "Don't have an account?",
"register": "Register",
"inviteTokenHint": "InEx is invite-only",
"usernamePlaceholder": "e.g. ada.lovelace",
"passwordStrengthWeak": "Weak",
"passwordStrengthOk": "OK",
"passwordStrengthGood": "Good",
"passwordStrengthStrong": "Strong"
```

**Do NOT remove existing keys** — `alreadyHaveAccount`, `signIn`, `createAccount`, `inviteToken`, etc. are still used by existing code or will be used by the rebuilt forms.

---

### `inex/ClientApp/public/locales/ru/translation.json`

**Add the matching Russian keys inside `"auth"`**, including the full AuthShell, footer, placeholder, and API/banner error mapping coverage listed above. Do not add English-only screen text and do not rely on backend English messages for known auth errors.

```json
"welcomeBack": "С возвращением",
"signInTitle": "Войдите в InEx",
"signInSubtitle": "Используйте данные вашего аккаунта для входа.",
"getStarted": "Начало работы",
"registerTitle": "Создайте аккаунт InEx",
"registerSubtitle": "Объедините все счета в одном личном дашборде.",
"dontHaveAccount": "Нет аккаунта?",
"register": "Зарегистрироваться",
"inviteTokenHint": "InEx работает только по приглашениям",
"usernamePlaceholder": "напр. ada.lovelace",
"passwordStrengthWeak": "Слабый",
"passwordStrengthOk": "Нормальный",
"passwordStrengthGood": "Хороший",
"passwordStrengthStrong": "Надёжный"
```

---

## Key Technical Decisions

### Layout Route — AuthShell as React Router v6 `<Route element={<AuthShell />}>`

The design spec requires auth pages to be "separate from the app shell." The existing `App.tsx` already achieves this (Login/Register are outside the `<ProtectedRoute>` wrapper). This story upgrades the visual layout by wrapping both routes under a new `AuthShell` layout route that provides the split-screen shell via `<Outlet />`.

**Why not embed the shell inside each page component?** The layout route pattern avoids duplicate brand panel markup and ensures the footer nav link ("Don't have an account? Register") is rendered by the shell, not by the form — consistent with React Router v6 intent.

### `ErrorBanner` — Standalone Component, Not Ant Design `<Alert>`

The design spec defines a specific styled banner (expense-50 background, expense-100 border, AlertCircle icon, expense-700 text). The current code uses `<Alert type="error">` from Ant Design, which has a different visual. Implement the design-spec banner.

**Option A: Define `ErrorBanner` inside Login.tsx and Register.tsx** (simpler, self-contained)
**Option B: Extract to `inex/ClientApp/src/components/ErrorBanner.tsx`** (reusable, cleaner)

Prefer Option B if `ErrorBanner` might also be used in other error contexts. At minimum, if you define it in Login.tsx you must define the same component separately in Register.tsx — duplicate is acceptable here, but extraction is cleaner.

### API Error Localization

The auth thunks currently store `error.response?.data?.detail ?? error.message ?? "Login failed"/"Registration failed"` in `auth.error`. Preserve the auth slice/action ownership: do not replace `auth.error` with a new state shape, and do not move API parsing into the pages.

Resolve the localized-error requirement at the display boundary:

- Add a small mapper near the auth form/ErrorBanner layer that receives `auth.error` and `t`.
- If `auth.error` matches a known backend detail or fallback string, render the mapped locale key (for example invalid credentials, invite token invalid/expired, duplicate email, generic login failure, generic registration failure). These known cases must never display raw English backend/fallback text.
- If the backend detail is unknown and user-actionable, display the backend detail verbatim only after the mapper fails to classify it; this is an intentional diagnostics fallback, not the normal localization path.
- If there is no usable backend detail, render localized fallback copy from `translation.json`.
- Keep field-level `Form.Item` validation messages fully localized via `t()` and separate from API/banner errors.

### Password Visibility Toggle — Use `Input.Password`, Not Custom Button

The mockup implements a manual eye/eye-off toggle with a positioned button. **Do not replicate this.** Ant Design's `Input.Password` provides a built-in show/hide toggle with proper accessibility. Use it.

### Icons — lucide-react

Story 10.1b installs and establishes `lucide-react` as the icon library. Use named imports:

```tsx
import { AlertCircle, Wallet, Target, BarChart3 } from "lucide-react";
```

If Story 10.1b is not done or `lucide-react` is not installed, block this story and complete/fix Story 10.1b first. This story must not run `npm install`, edit `package.json`, or edit `package-lock.json`.

Do **not** use `<i data-lucide="..." />` DOM attribute syntax — that requires a global DOM scan and is a mockup-only pattern.

### Brand Assets

The brand panel uses `<img src="/assets/mark.svg" height="40" />`. Verify this path exists at `inex/ClientApp/public/assets/mark.svg`. If the asset is at a different path (e.g., `/logo.svg`), adjust accordingly. Check what path the existing header/shell currently uses for the brand mark — use that same path.

To verify:

```bash
# From inex/ClientApp/public/
ls assets/
```

If no `mark.svg` exists, use a simple text-only wordmark until the asset is confirmed. Do not block the story on a missing SVG — just render the wordmark text `InEx` with appropriate styling.

### Password Strength Indicator

Implement a simple five-segment bar derived from a `useWatch` or `useState` tracking the `password` field value. Do NOT add a third-party password strength library — the inline scoring function from `Auth.jsx` is sufficient:

```tsx
const pwdStrength = (pwd: string): number => {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (pwd.length >= 12) score++;
  return score; // 0-5
};
```

Use `Form.useWatch('password', form)` to read the live password value without adding a separate state variable.

### TypeScript Strict Mode

All new files must compile without `any`. Specific types to use:

- `AuthShell` props: none (it's a layout route — no props needed)
- `ErrorBanner` props: `{ message: string | null }`
- Strength function: `(pwd: string): number`
- All `t()` calls: no type workarounds needed (react-i18next handles inference)

### No Regression on Existing Auth State

Do NOT change:

- `inex/ClientApp/src/store/auth/auth-slice.ts` — no changes
- `inex/ClientApp/src/store/auth/auth-actions.ts` — no changes
- `inex/ClientApp/src/components/ProtectedRoute.tsx` — no changes
- `inex/ClientApp/src/App.tsx` data-fetching `useEffect` blocks — no changes

The only change to `App.tsx` is adding the `<Route element={<AuthShell />}>` wrapper around the two public routes.

## Latest Library Notes (2026-05)

- React Router: nested layout routes with `<Route element={<AuthLayout />}>` + child `/login` and `/register` routes is a first-class documented pattern, matching this story's `AuthShell` + `<Outlet />` approach.
- Ant Design: `Form.Item` + `Input.Password` is the standard login/register pattern, and submit buttons with `loading` should be used to prevent duplicate submits during in-flight requests.
- Keep this story on the currently installed project stack (React Router 6 + Ant Design 5). Do not introduce route data APIs or form libraries as part of this redesign.

## Regression Checklist

Before marking this story done, verify:

- [ ] `npm run build` passes from `inex/ClientApp/`
- [ ] `npm run lint` passes with no new `any` in touched files
- [ ] Navigating to `/` redirects according to Story 10.1d: authenticated default target is `/dashboard`; `/transactions` is not acceptable in the completed story
- [ ] `ProtectedRoute` still shows a spinner while `isInitializing` is true
- [ ] Logging in successfully navigates to `/dashboard` after 10.4 is present
- [ ] Registering successfully navigates to `/dashboard` after 10.4 is present
- [ ] Page reload restores session (refresh token cookie flow) — no flash-of-login-page for authenticated users
- [ ] Switching language on the register form still updates `i18n.language` and `localStorage`
- [ ] Currency dropdown on register still pre-selects EUR from the API response
- [ ] EN ↔ RU locale switch shows all new `auth.*` keys in both languages (no missing translation fallback to key names)
- [ ] At 390px: no horizontal overflow, brand panel hidden, mobile logo visible, form accessible
- [ ] At 360px: no horizontal overflow, brand panel hidden, mobile logo visible, form accessible
- [ ] At 1440px: two-column grid renders, brand panel visible

## Visual QA Spec

| Screenshot                 | Viewport | State                                                                  |
| -------------------------- | -------- | ---------------------------------------------------------------------- |
| login-default              | 1440px   | Email/password empty, no error                                         |
| login-loading              | 1440px   | Submit clicked, button in loading state                                |
| login-api-error            | 1440px   | ErrorBanner showing "Invalid credentials" (or equivalent)              |
| register-default           | 1440px   | All fields empty                                                       |
| register-validation-errors | 1440px   | Submit attempted with empty required fields — per-field errors visible |
| register-api-error         | 1440px   | ErrorBanner showing API error (e.g., duplicate email)                  |
| login-mobile               | 390px    | Default state, brand panel hidden, mobile logo visible                 |
| register-mobile            | 390px    | Default state, single-column                                           |
| login-mobile-narrow        | 360px    | Default state, no horizontal overflow                                  |
| register-mobile-narrow     | 360px    | Default state, no horizontal overflow                                  |

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

### Completion Notes List

- Story context updated via bmad-create-story workflow for key `10-5b-frontend-ux-login-and-registration-redesign`.
- Checklist validation applied: added executable task breakdown, resolved password-manager `name` attribute ambiguity, added latest-library guidance, and appended implementation record metadata.
- Story status remains `ready-for-dev` in this file.
- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- docs/implementation/10-5b-frontend-ux-login-and-registration-redesign.md
