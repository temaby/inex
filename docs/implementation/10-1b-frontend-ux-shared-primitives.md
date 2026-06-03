# Story 10.1b: Frontend UX - Shared Primitives

Status: done

## Story

As an invited InEx user,
I want controls and finance values to behave consistently across every route,
so that financial workflows are easier to scan and operate on desktop and mobile.

## Acceptance Criteria

1. Given shared production primitives are introduced, when the primitive modules are imported and rendered in isolation, then buttons, icon buttons, drawers, segmented controls, fields, selects, progress bars, empty states, and money values are created, exported through the primitives barrel, typed without `any`, and behave according to their documented accessibility and interaction contracts. Page adoption is intentionally left to later page and shell stories.
2. Given money movement is rendered, when income, expense, and transfer values appear in shared primitives, then they use the `--font-num` stack with tabular numerics (`fontVariantNumeric: 'tabular-nums'`), explicit signage or accessible text, and do not rely on color alone.
3. Given the current frontend uses React 18, TypeScript strict, Ant Design 5, Redux Toolkit, React Router 6, Axios, i18next, and Recharts, when this story is complete, then existing routing, `ProtectedRoute`, logout, `apiClient`, Redux data loading, and EN/RU localization still work.
4. Given the story is complete, when `npm run build` and `npm run lint` run from `inex/ClientApp`, then both pass with no new `any` usage in touched files.

## Prerequisites

**Story 10.1a must be done before starting this story.** Story 10.1a creates `inex/ClientApp/src/styles/tokens.css` (or equivalent) with all InEx CSS custom properties. The primitives in this story consume those CSS variables (`--income-500`, `--expense-500`, `--font-num`, `--border-2`, `--shadow-4`, etc.) directly. Attempting 10.1b before tokens are in place will produce a build that compiles but has broken visual output.

Check: `inex/ClientApp/src/styles/tokens.css` must exist and be imported into `inex/ClientApp/src/index.tsx` (or `App.tsx`) before implementing this story.

**Story 10.1b must be done before starting Story 10.1c.** This story owns the shared primitive export surface and the `lucide-react` dependency install used by the app shell. Story 10.1c consumes these decisions; it must not reinstall or relocate icon dependency ownership.

## Epic Context

Epic 10 rebuilds the production React app to implement the `docs/design` visual system. The canonical implementation sequence is:

1. **10.1a** — Design tokens and Ant Design theme bridge
2. **10.1b** — Shared primitive components (this story; must complete before 10.1c starts)
3. **10.1c** — App shell and navigation
4. **10.2** — Transactions ledger
5. **10.3a/b/c** — Accounts, Categories, Budgets management pages
6. **10.4** — Reports hub and dashboard
7. **10.5a/b** — Profile/settings and auth pages
8. **10.6** — Visual QA baseline

This story (10.1b) creates the component library that stories 10.1c through 10.5b consume. Do not rebuild any existing page yet — that is out of scope.

**Dependencies from epics.md:**

- Epic 1 must complete before broad UI rollout (auth/data-isolation safety). If `docs/implementation/sprint-status.yaml` still shows Epic 1 work as not `done`, do not treat this prerequisite as satisfied without an explicit delivery decision.
- Epic 4 should complete before the Transactions redesign (not this story).
- Epic 7 Story 7.1 should complete before this story or before the first TypeScript-heavy Epic 10 page rebuild. Regardless of 7.1 status, this story must be `any`-free and must not weaken strict typing.

## Architecture Compliance Guardrails

- `docs/planning/architecture.md` includes the Epic 10 frontend architecture addendum and authorizes the design-system rebuild within its stated constraints: tokens first, shared primitives before consumers, no backend/API contract changes, no RTK Query migration, and continued use of Redux thunks, `apiClient`, Ant Design, React Router, and i18next.
- For this story, architecture authority is combined from that Epic 10 addendum plus `docs/planning/ux-design.md`, `docs/planning/design-update-plan.md`, and `docs/design/docs/design-implementation-guide.md`.
- Keep this story frontend-only. Do not introduce backend/API contract changes, authentication flow changes, route protection changes, or Redux architecture changes.
- Preserve existing integrations end-to-end: `ProtectedRoute`, `apiClient` token/refresh behavior, existing route registration, and EN/RU i18n behavior.

## Design References

All primitive designs live in `docs/design/Primitives.jsx` and `docs/design/EmptyState.jsx`. These are browser-global mockup files and **are not production code**. Read them for visual and behavioral specifications, then implement as typed React modules.

| Mockup component           | Production primitive | File                              |
| -------------------------- | -------------------- | --------------------------------- |
| `Num`                      | `<Num>`              | `primitives/Num.tsx`              |
| `Button`                   | `<InExButton>`       | `primitives/Button.tsx`           |
| `IconBtn`                  | `<IconBtn>`          | `primitives/IconBtn.tsx`          |
| `Tag`                      | `<Tag>`              | `primitives/Tag.tsx`              |
| `KindChip`                 | `<KindChip>`         | `primitives/Tag.tsx`              |
| `Field`                    | `<Field>`            | `primitives/Field.tsx`            |
| `Input`                    | `<Input>`            | `primitives/Input.tsx`            |
| `Select`                   | `<Select>`           | `primitives/Select.tsx`           |
| `Tabs variant="segmented"` | `<SegmentedControl>` | `primitives/SegmentedControl.tsx` |
| `Drawer`                   | `<InExDrawer>`       | `primitives/InExDrawer.tsx`       |
| `Progress`                 | `<BudgetProgress>`   | `primitives/Progress.tsx`         |
| `EmptyState`               | `<EmptyState>`       | `primitives/EmptyState.tsx`       |
| `FilterEmpty`              | `<FilterEmpty>`      | `primitives/EmptyState.tsx`       |
| (signage global)           | `SignageContext`     | `primitives/SignageContext.tsx`   |

`Sparkline`, `SuggestionList`, and page-specific empty states (`EmptyTransactions`, `EmptyAccounts`, etc.) are **out of scope** — they will be added in the page-specific stories (10.2, 10.3a/b/c, etc.) as needed.

## Key Technical Decisions

### Icons: lucide-react (not `data-lucide` DOM attributes)

The mockup uses `<i data-lucide="..." />` which requires a post-processing DOM scan. Production must use the React package instead. Story 10.1b owns both manifest and lockfile changes for this dependency:

```bash
# Run from inex/ClientApp/
npm install lucide-react
```

Import named icons directly:

```tsx
import { X, Plus, Search, FilterX } from "lucide-react";
```

### Money Signage: React Context (not `window.__INEX_SIGNAGE`)

The mockup uses `window.__INEX_SIGNAGE` with values `'color-only' | 'signed' | 'arrows'`. Production replaces this with a React context that reads from/writes to `localStorage`. This makes signage an accessibility preference, not a page-level tweak.

Create `SignageContext.tsx` with:

- `SignageProvider` — wraps the app (add to `App.tsx`)
- `useSignage()` — hook returning `{ signage, setSignage }`
- Default: `'color-only'`

### Drawer: Wrap Ant Design's Drawer

Do **not** reimplement drawer focus trapping and Escape handling from scratch. Ant Design's `<Drawer>` already handles:

- Focus trap inside panel
- Escape key close
- Screen reader semantics
- Animation

`<InExDrawer>` wraps `antd.Drawer` and applies InEx styling overrides (header layout, 440px default width, brand backdrop color). See implementation spec below.

### Button Naming

The production component is named `InExButton` (not `Button`) to avoid shadowing Ant Design's `Button` import. Import it as `InExButton` and re-export under that name. Files that still use `antd.Button` continue to do so — there is no forced migration in this story.

## File Map

### Files to Create

```
inex/ClientApp/src/components/primitives/
  index.ts                     ← barrel export (all public primitives)
  SignageContext.tsx            ← signage preference context + hook
  Num.tsx                      ← money value display
  Button.tsx                   ← InExButton component
  IconBtn.tsx                  ← icon-only button
  Tag.tsx                      ← Tag + KindChip chips
  Field.tsx                    ← shared field wrapper with label/hint/required
  Input.tsx                    ← tokenized input with optional prefix/suffix addons
  Select.tsx                   ← tokenized select wrapper
  SegmentedControl.tsx         ← segmented scope/view toggle
  InExDrawer.tsx               ← accessible drawer wrapper around antd.Drawer
  Progress.tsx                 ← BudgetProgress bar
  EmptyState.tsx               ← EmptyState + FilterEmpty
```

### Files to Modify

| File                              | Change                                                           |
| --------------------------------- | ---------------------------------------------------------------- |
| `inex/ClientApp/src/App.tsx`      | Wrap app in `<SignageProvider>`                                  |
| `inex/ClientApp/package.json`     | Add `lucide-react` dependency after `npm install`                |
| `inex/ClientApp/package-lock.json` | Include lockfile changes produced by `npm install lucide-react`    |

### Files to NOT Touch

| File                                                      | Reason                                            |
| --------------------------------------------------------- | ------------------------------------------------- |
| `inex/ClientApp/src/components/ProtectedRoute.tsx`        | Auth guard — do not modify                        |
| `inex/ClientApp/src/layouts/BasicPage.tsx`                | Shell rebuild is Story 10.1c                      |
| `inex/ClientApp/src/store/**`                             | Redux state unchanged — this story is pure UI     |
| `inex/ClientApp/src/utils/apiClient.ts`                   | API client unchanged                              |
| `inex/ClientApp/src/pages/**`                             | All pages unchanged — page rebuilds are 10.2–10.5 |
| `inex/ClientApp/src/components/AutoComplete.tsx`          | Existing component — do not modify                |
| `inex/ClientApp/src/components/Dropdown.tsx`              | Existing component — do not modify                |
| `inex/ClientApp/src/components/ExpressionInputNumber.tsx` | Existing component — do not modify                |

## Detailed Implementation Spec

### `SignageContext.tsx`

```tsx
export type Signage = "color-only" | "signed" | "arrows";

interface SignageContextValue {
  signage: Signage;
  setSignage: (s: Signage) => void;
}

export const SignageContext = React.createContext<SignageContextValue>({
  signage: "color-only",
  setSignage: () => undefined,
});

export const SignageProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [signage, setSignageState] = React.useState<Signage>(() => {
    const stored = localStorage.getItem("inex_signage");
    return (stored as Signage) || "color-only";
  });

  const setSignage = React.useCallback((s: Signage) => {
    localStorage.setItem("inex_signage", s);
    setSignageState(s);
  }, []);

  return (
    <SignageContext.Provider value={{ signage, setSignage }}>
      {children}
    </SignageContext.Provider>
  );
};

export const useSignage = () => React.useContext(SignageContext);
```

**Wire up in `App.tsx`:** wrap the outermost `<ConfigProvider>` (or wrap it inside) with `<SignageProvider>`.

### `Num.tsx`

Translates the `Num` + `fmtAmount` mockup logic to TypeScript.

```tsx
export type MoneyKind = "income" | "expense" | "transfer" | "neutral" | "warn";

export interface NumProps {
  value: number;
  currency?: string;
  kind?: MoneyKind;
  bare?: boolean; // omit currency symbol
  compact?: boolean; // compact large number format (e.g. 1.2M)
  size?: string | number; // CSS font-size override
}
```

**Color map** (must consume CSS variables, not hardcoded hex):

```tsx
const colorMap: Record<MoneyKind, string> = {
  income: "var(--income-600)",
  expense: "var(--expense-600)",
  transfer: "var(--transfer-fg)",
  neutral: "var(--fg-1)",
  warn: "var(--warn-fg)",
};
```

**Style requirements** (non-negotiable for AC-2):

- `fontFamily: 'var(--font-num)'`
- `fontVariantNumeric: 'tabular-nums'`
- `fontFeatureSettings: '"tnum" 1'`
- `whiteSpace: 'nowrap'`

**Auto-kind fallback:** if `kind` is not provided, infer from value: `value > 0 → 'income'`, `value < 0 → 'expense'`, `value === 0 → 'neutral'`.

**Signage logic** (consumes `useSignage()`):

- `'color-only'`: prefix `−` only for neutral/transfer negatives
- `'signed'`: prefix `+` for positive, `−` for negative
- `'arrows'`: use `↑ ` / `↓ ` for neutral/transfer movement

**Accessible text:** always render a visually hidden `aria-label` with explicit `Income`, `Expense`, or `Transfer` prefix so color is not the sole meaning:

```tsx
<span aria-label={`${kindLabel}: ${formattedValue} ${currency}`} role="text">
  <span aria-hidden="true">{/* visible styled span */}</span>
</span>
```

### `Button.tsx` (exported as `InExButton`)

```tsx
export type ButtonKind =
  | "primary"
  | "danger"
  | "default"
  | "ghost"
  | "soft"
  | "link";
export type ButtonSize = "sm" | "md" | "lg";

export interface InExButtonProps {
  kind?: ButtonKind;
  size?: ButtonSize;
  icon?: React.ReactNode; // accepts a Lucide icon element, not a string name
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  type?: "button" | "submit" | "reset";
}
```

**Kind → token map** (from `Primitives.jsx`):

- `primary`: `background: var(--income-500)`, `color: #fff`
- `danger`: `background: var(--expense-500)`, `color: #fff`
- `default`: `background: #fff`, `color: var(--fg-1)`, `border: 1px solid var(--border-2)`
- `ghost`: `background: transparent`, `color: var(--fg-2)`, `border: 1px solid var(--border-2)`
- `soft`: `background: var(--bg-muted)`, `color: var(--fg-1)`, `border: 1px solid transparent`
- `link`: `background: transparent`, `color: var(--income-600)`, `border: 1px solid transparent`

**Size:** sm=`6px 12px` / 13px, md=`9px 16px` / 14px, lg=`11px 20px` / 15px. Radius 6px. `fontWeight: 500`.

**Default `type` attribute is `'button'`** to prevent accidental form submission.

### `IconBtn.tsx`

```tsx
export interface IconBtnProps {
  icon: React.ReactNode; // Lucide icon element
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  active?: boolean;
  size?: number; // pixel dimension, default 32
  title: string; // required for accessibility (tooltip + aria-label)
}
```

Always render with `aria-label={title}` and `type="button"`.

### `Tag.tsx` (exports `Tag` and `KindChip`)

**`Tag` props:**

```tsx
export type TagKind =
  | "income"
  | "expense"
  | "transfer"
  | "warn"
  | "neutral"
  | "ink";

export interface TagProps {
  kind?: TagKind;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
}
```

Padding: `2px 8px`, radius: `var(--radius-1)` (4px), fontSize: 10.5px, fontWeight: 600, letterSpacing: `0.04em`.

Clickable tags must render as `<button type="button">` with visible focus styles. Non-clickable tags may render as `<span>`. Do not attach `onClick` to a non-focusable `span`; keyboard activation and focus visibility are part of the shared primitive contract.

**`KindChip` props:**

```tsx
export type TransactionKind = "income" | "expense" | "transfer";

export interface KindChipProps {
  kind: TransactionKind;
}
```

Renders a 6×6px colored dot with `aria-label` = "Income" | "Expense" | "Transfer".

### `Field.tsx`

```tsx
export interface FieldProps {
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}
```

Behavior and visual requirements:

- Layout wraps child controls with a compact label row and optional hint.
- Required marker is visual (`*`) and screen-reader friendly (`aria-hidden` on `*`, label text still complete).
- Spacing follows the mockup: field block bottom gap ~14px, label bottom gap ~6px.
- Typography: label 12px medium, hint 11px regular using `var(--fg-4)`.

### `Input.tsx`

```tsx
export interface InputProps {
  value?: string | number;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
  type?: React.HTMLInputTypeAttribute;
  autoFocus?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
}
```

Requirements:

- Tokenized input surface (`--border-2`, radius 6px, `--font-sans`, 14px).
- Optional prefix/suffix addons are rendered as muted side elements with mono numeric typography support.
- Focus uses tokenized focus ring and border, not browser default outline suppression without replacement.
- Always keep native input semantics for keyboard, form submission, autocomplete, and password manager compatibility.

### `Select.tsx`

```tsx
export interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "onChange"
> {
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  children: React.ReactNode;
}
```

Requirements:

- Native `<select>` semantics with tokenized styling and custom chevron indicator.
- Must remain keyboard accessible (ArrowUp/ArrowDown, Enter, Escape) and screen-reader compatible.
- Do not replace with non-semantic `div`-based dropdown in this story.

### `SegmentedControl.tsx`

```tsx
export interface SegmentedOption {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (key: string) => void;
}
```

Visual: muted background container (`var(--bg-muted)`), 3px inner padding, container radius 8px. Active option: white background, `var(--shadow-1)`, radius 6px, `var(--brand-ink)` text. Inactive: transparent, `var(--fg-3)` text. Transition: `all 120ms ease`.

Each option renders as a `<button type="button" role="tab" aria-selected={active}>`.

### `InExDrawer.tsx`

Wraps `antd.Drawer`. **Do not reimplement focus trap or Escape handling.**

```tsx
export interface InExDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: number;
  children: React.ReactNode;
}
```

Ant Design `<Drawer>` props to pass through:

- `open` → `open`
- `onClose` → `onClose`
- `width` → `width` (default 440, override to `'100%'` at mobile breakpoint using `antd Grid.useBreakpoint()`)
- `title` → custom header JSX (title + subtitle layout from design)
- `closeIcon` → Lucide `<X size={20} />` (styled `color: var(--fg-3)`)
- `styles={{ body: { padding: 24 }, header: { padding: '20px 24px', borderBottom: '1px solid var(--border-1)' } }}`

Mobile behavior: at `screens.md === false`, pass `width="100%"` to the Ant Design Drawer.

The header subtitle renders as:

```tsx
// Inside title prop:
<div>
  <div
    style={{
      fontSize: 17,
      fontWeight: 600,
      letterSpacing: "-0.01em",
      color: "var(--fg-1)",
    }}
  >
    {title}
  </div>
  {subtitle && (
    <div style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 2 }}>
      {subtitle}
    </div>
  )}
</div>
```

### `Progress.tsx`

```tsx
export interface BudgetProgressProps {
  value: number; // spent amount
  max: number; // budget limit
  height?: number; // default 6px
  showLabel?: boolean; // show percentage label
  overBudgetLabel: string; // localized screen-reader label from i18next
}
```

**Color thresholds** (from design guide):

- `value / max < 0.75`: green (`var(--income-500)`)
- `0.75 <= value / max < 1.0`: amber (`var(--warn-500)`)
- `value / max >= 1.0`: red (`var(--expense-500)`)

Track: `var(--bg-muted)`, radius `var(--radius-pill)`. Bar: same radius, transition `width 200ms ease`.

Clamp filled width at 100% (do not overflow bar on over-budget).

When over budget, add an `aria-label` using localized EN/RU copy. Either pass `overBudgetLabel={t("budgets.overBudget")}` from the consumer or add a primitive-level translation key consumed through `react-i18next`; do not hardcode English screen-reader text.

### `EmptyState.tsx` (exports `EmptyState` and `FilterEmpty`)

**`EmptyState` props:**

```tsx
export interface EmptyStateProps {
  iconNode?: React.ReactNode; // preferred: pass <WalletIcon size={26} /> directly
  title: string;
  description: string;
  actions?: React.ReactNode;
  secondary?: React.ReactNode;
}
```

Use `iconNode` for the icon — do not use string-based dynamic icon loading (complicates TypeScript and tree-shaking).

Visual spec from `docs/design/EmptyState.jsx`:

- Container: `background: #fff`, `border: 1px dashed var(--border-2)`, `borderRadius: 14px`, `padding: 64px 32px`, `textAlign: center`
- Decorative dot-grid background via `radial-gradient` with `maskImage` fade (preserve from mockup)
- Icon container: 64×64px, `borderRadius: 16px`, gradient `linear-gradient(135deg, var(--income-50) 0%, var(--bg-stripe) 100%)`, border `1px solid var(--income-100)`, icon color `var(--income-600)`
- Title: 22px, fontWeight 600, `var(--fg-1)`, letterSpacing `-0.015em`
- Description: 14px, lineHeight 1.6, `var(--fg-3)`
- Actions: flex row, gap 10px, centered, wrapped

**`FilterEmpty` props:**

```tsx
export interface FilterEmptyProps {
  title?: string;
  description?: string;
  onClear?: () => void;
}
```

Smaller inline variant. Padding `48px 24px`. SearchX icon (40×40px container, `var(--bg-stripe)` fill). Uses `InExButton kind="ghost" size="sm"` with a Lucide `<X>` icon for the clear action.

### Responsive Primitive Ownership

Story 10.1b owns shared responsive helpers that page stories can reuse without creating page-local design-system replacements. Add these exports under `src/components/primitives`:

- `PageSection` or equivalent spacing wrapper for tokenized vertical rhythm.
- `ResponsiveStack` for row-to-column collapse using the Epic 10 breakpoints.
- `ResponsiveGrid` for repeatable card/list layouts with stable gaps.

Story 10.1c owns shell-level responsive behavior, including top navigation, bottom navigation, safe-area padding, and route chrome. Page stories may add page-specific CSS, but must consume 10.1b/10.1c responsive contracts instead of inventing alternate shared layout primitives.

## i18n Keys Required

Add these keys to both `inex/ClientApp/public/locales/en/translation.json` and `inex/ClientApp/public/locales/ru/translation.json`:

**English (`en/translation.json`):**

```json
{
  "primitives": {
    "signage": {
      "colorOnly": "Color only",
      "signed": "Signed (+/−)",
      "arrows": "Arrows"
    },
    "filterEmpty": {
      "title": "No results match these filters",
      "description": "Try widening the date range, clearing tags, or resetting the search.",
      "clearFilters": "Clear filters"
    },
    "kindLabel": {
      "income": "Income",
      "expense": "Expense",
      "transfer": "Transfer",
      "neutral": "Amount",
      "warn": "Warning amount"
    },
    "progress": {
      "overBudget": "Over budget"
    }
  }
}
```

**Russian (`ru/translation.json`):** add equivalent keys with Russian translations.

**Important:** `Num` uses `t('primitives.kindLabel.income')` etc. for `aria-label` text. `FilterEmpty` uses `t('primitives.filterEmpty.*')` for its text. `BudgetProgress` uses localized over-budget copy either from `t('primitives.progress.overBudget')` or a required `overBudgetLabel` prop. Other primitives use prop-driven strings so callers provide translated text.

## Barrel Export (`index.ts`)

```ts
export { SignageProvider, useSignage } from "./SignageContext";
export type { Signage } from "./SignageContext";
export { Num } from "./Num";
export type { NumProps, MoneyKind } from "./Num";
export { InExButton } from "./Button";
export type { InExButtonProps, ButtonKind, ButtonSize } from "./Button";
export { IconBtn } from "./IconBtn";
export type { IconBtnProps } from "./IconBtn";
export { Tag, KindChip } from "./Tag";
export type { TagProps, TagKind, KindChipProps, TransactionKind } from "./Tag";
export { Field } from "./Field";
export type { FieldProps } from "./Field";
export { Input } from "./Input";
export type { InputProps } from "./Input";
export { Select } from "./Select";
export type { SelectProps } from "./Select";
export { SegmentedControl } from "./SegmentedControl";
export type {
  SegmentedControlProps,
  SegmentedOption,
} from "./SegmentedControl";
export { InExDrawer } from "./InExDrawer";
export type { InExDrawerProps } from "./InExDrawer";
export { BudgetProgress } from "./Progress";
export type { BudgetProgressProps } from "./Progress";
export { EmptyState, FilterEmpty } from "./EmptyState";
export type { EmptyStateProps, FilterEmptyProps } from "./EmptyState";
```

## `App.tsx` Change

Wrap `<ConfigProvider>` (or its parent) with `<SignageProvider>` from the new primitives:

```tsx
import { SignageProvider } from './components/primitives';

// Inside App component render:
return (
  <SignageProvider>
    <ConfigProvider locale={antdLocale} ...>
      {/* existing content unchanged */}
    </ConfigProvider>
  </SignageProvider>
);
```

This is the **only** change to `App.tsx`. Do not touch routing, session restore, data fetching, or Ant Design theme configuration.

## TypeScript Guardrails

- TypeScript strict mode is enforced — zero `any` allowed in new files.
- Do not use `any` in event handlers. Use `React.MouseEventHandler<HTMLButtonElement>` etc.
- Do not use `any` for `children` — use `React.ReactNode`.
- Do not use `any` for style objects — use `React.CSSProperties`.
- CSS-in-JS (inline `style` objects) is acceptable for primitives since the design system is token-based CSS variables. Do not introduce new CSS Modules files unless a component needs them.
- Import React explicitly: `import * as React from 'react';` to match the existing codebase pattern.

## Regression Guardrails

**Do not break these existing behaviors:**

- `ProtectedRoute` auth flow (session restore → Spin → Outlet or redirect to /login)
- `apiClient` token attach and 401 refresh retry
- Redux store initialization (accounts, categories, budgets loaded on `accessToken` change)
- EN/RU language switch via `i18n.changeLanguage()` persisted to `localStorage`
- All existing Ant Design `Drawer` usages in pages (e.g., `Transactions.tsx` add/filter drawers) are unchanged; only new code uses `InExDrawer`
- `npm run build` must not regress on bundle size warning threshold

**Test manually before marking story done:**

1. Open `/login` → log in → confirm app loads and all routes work
2. Open DevTools, confirm no new TypeScript/lint errors in console
3. Open `/transactions` → add a transaction → confirm Ant Design drawer still opens and works
4. Import `Num`, `InExButton`, `EmptyState` in a scratch component and confirm render

## Tasks / Subtasks

- [x] **Install lucide-react** (AC: 1)
  - [x] Run `npm install lucide-react` from `inex/ClientApp/`
  - [x] Verify `lucide-react` appears in `package.json` dependencies
  - [x] Verify `inex/ClientApp/package-lock.json` includes the resolved `lucide-react` package entry
  - [x] Commit both `package.json` and `package-lock.json`; do not leave manifest/lockfile drift
  - [x] Confirm TypeScript recognizes Lucide icon imports (no `@types` needed — lucide-react ships types)

- [x] **Create `SignageContext.tsx`** (AC: 2)
  - [x] Implement `Signage` type, `SignageProvider`, and `useSignage` hook
  - [x] Reads initial value from `localStorage.getItem('inex_signage')`, defaults to `'color-only'`
  - [x] `setSignage` writes to `localStorage` and updates state

- [x] **Wire `SignageProvider` into `App.tsx`** (AC: 2, 3)
  - [x] Import `SignageProvider` from `./components/primitives`
  - [x] Wrap outer JSX with `<SignageProvider>` — only this one line change; do not touch anything else in App.tsx

- [x] **Create `Num.tsx`** (AC: 1, 2)
  - [x] Implement `NumProps` interface — zero `any`
  - [x] `autoKind` fallback: `value > 0 → 'income'`, `value < 0 → 'expense'`, else `'neutral'`
  - [x] Consume `useSignage()` to determine prefix character
  - [x] Apply tabular-nums styles from spec (non-negotiable for AC-2)
  - [x] Render accessible `aria-label` using `t('primitives.kindLabel.*')` — not color-only
  - [x] Compact format: `>=1_000_000 → xM`, `>=100_000 → integer`, else 2 decimals

- [x] **Create `Button.tsx`** (AC: 1)
  - [x] Named export `InExButton` (not `Button` to avoid Ant Design naming clash)
  - [x] Implement all 6 kind variants using CSS token variables
  - [x] `type` prop defaults to `'button'` (not 'submit')
  - [x] `icon` prop accepts `React.ReactNode` (pass `<Plus size={15} />` from lucide-react)
  - [x] Disabled state: `opacity: 0.5`, `cursor: not-allowed`, no pointer events

- [x] **Create `IconBtn.tsx`** (AC: 1)
  - [x] `title` prop is required — renders as both `title` attr and `aria-label`
  - [x] `icon` accepts `React.ReactNode`
  - [x] `type="button"` always

- [x] **Create `Tag.tsx`** (exports `Tag` and `KindChip`) (AC: 1, 2)
  - [x] `Tag`: all 6 kind variants from spec, uses CSS token variables
  - [x] `KindChip`: 6×6px colored dot with `aria-label` for screen readers

- [x] **Create `Field.tsx`** (AC: 1)
  - [x] Implement required label row with optional hint and required marker
  - [x] Keep spacing/typography aligned to `docs/design/Primitives.jsx`

- [x] **Create `Input.tsx`** (AC: 1)
  - [x] Implement tokenized input with optional prefix/suffix addons
  - [x] Keep native `<input>` semantics and typed event handlers (no `any`)
  - [x] Include disabled and focus states using CSS token variables

- [x] **Create `Select.tsx`** (AC: 1)
  - [x] Implement tokenized native `<select>` wrapper with custom chevron style
  - [x] Keep keyboard and screen-reader behavior intact

- [x] **Create `SegmentedControl.tsx`** (AC: 1)
  - [x] `options` array with `key`, `label`, optional `icon: React.ReactNode`
  - [x] Each option renders as `<button type="button" role="tab" aria-selected={active}>` for a11y
  - [x] Container uses `role="tablist"` wrapper for semantic correctness

- [x] **Create `InExDrawer.tsx`** (AC: 1, 3)
  - [x] Wrap `antd.Drawer` — do NOT reinvent focus trap or Escape handling
  - [x] Mobile: detect `screens.md === false` via `antd.Grid.useBreakpoint()`, set `width="100%"`
  - [x] Custom header with `title` + optional `subtitle` layout
  - [x] Close icon: Lucide `<X size={20} color="var(--fg-3)" />`
  - [x] `styles` prop: `{ body: { padding: 24 }, header: { padding: '20px 24px', borderBottom: '1px solid var(--border-1)' } }`

- [x] **Create `Progress.tsx`** (AC: 1)
  - [x] Three color thresholds: green/amber/red based on `value / max` ratio
  - [x] Bar width clamped at 100% for over-budget state
  - [x] `aria-label` uses localized EN/RU over-budget text when `value >= max`; do not hardcode English screen-reader text
  - [x] Track + fill use pill radius (`var(--radius-pill)`)

- [x] **Create `EmptyState.tsx`** (AC: 1)
  - [x] `EmptyState`: full spec from design (dot-grid backdrop, icon container, title, description, actions, secondary)
  - [x] `FilterEmpty`: compact variant with SearchX icon and `onClear` button using `InExButton`
  - [x] `iconNode: React.ReactNode` for the icon (not string-based dynamic import)
  - [x] All user-visible strings via `children` props or `useTranslation()` — no hardcoded English

- [x] **Create `index.ts` barrel export** (AC: 1)
  - [x] Export all public component types and components listed in the barrel spec above
  - [x] No default exports — named only for consistent import patterns

- [x] **Add i18n keys** (AC: 2, 3)
  - [x] Add `primitives.*` keys to `en/translation.json` per spec
  - [x] Add Russian equivalents to `ru/translation.json`

- [x] **Verify build and lint** (AC: 4)
  - [x] Run `npm run build` from `inex/ClientApp/` — must pass with no new TypeScript errors
  - [x] Run `npm run lint` from `inex/ClientApp/` — must pass with no new `any` violations
  - [x] Confirm no bundle size regressions and no new `any` in touched TypeScript files; TypeScript/lint should catch typing regressions, while Vite should only be treated as a bundle/build signal
  - [ ] Verify Ant Design drawer in Transactions page still opens correctly

- [ ] **Manual smoke tests** (AC: 3)
  - [ ] Log in → confirm session restore still works
  - [ ] Navigate all routes → confirm no crashes
  - [ ] Open add-transaction drawer in Transactions page → confirm it still works
  - [ ] Confirm EN/RU language switch still works
  - [ ] Confirm Redux state (accounts, categories) still loads

## Definition of Done

- [ ] All tasks above checked off
- [x] `npm run build` passes from `inex/ClientApp/`
- [x] `npm run lint` passes from `inex/ClientApp/` with no new `any`
- [x] All listed primitive files exist under `inex/ClientApp/src/components/primitives/`
- [x] Barrel export `index.ts` exports all public APIs
- [x] `SignageProvider` is wired into `App.tsx`
- [x] `lucide-react` is in `package.json` and the resolved dependency is locked in `package-lock.json`
- [x] i18n keys added to both `en` and `ru` translation files
- [ ] No existing page, route, auth flow, or Redux slice is broken
- [ ] Story status updated to `done` in `docs/implementation/sprint-status.yaml`

## Out of Scope

The following are explicitly excluded from this story:

- **Page rebuilds** — Transactions, Accounts, Categories, Budgets, Reports, Profile, Auth pages are unchanged. Those are stories 10.2 through 10.5b.
- **App shell/navigation** — `BasicPage.tsx` replacement is Story 10.1c.
- **`Sparkline`** — mini trend chart used in account rows; added in Story 10.3a.
- **`SuggestionList`** — secondary content for empty states; added in 10.2 or 10.3a.
- **Page-specific empty states** (`EmptyTransactions`, `EmptyAccounts`, etc.) — these use `EmptyState` and `FilterEmpty` from this story; created inside their respective page stories.
- **Storybook or visual regression tests** — out of scope for Epic 10 (no Storybook is installed).
- **RTK Query migration** — that is Epic 7.
- **`Tabs` (line variant)** — the tabbed navigation header variant; used in shell (10.1c) or page-specific scenarios.

## Previous Story Intelligence (10.1a)

- Story 10.1a already defines the token contract and Ant Design bridge through `src/styles/tokens.css` and `src/styles/antd-theme.ts`; this story must consume those tokens instead of introducing new color/radius constants.
- `App.tsx` currently wraps routes in `ConfigProvider` and has critical bootstrap effects (session restore + initial data fetches). Only the `SignageProvider` wrapper is allowed here; all auth/data effects must remain untouched.
- Story 10.1a intentionally avoided new dependencies. Story 10.1b may add only `lucide-react`, must include the matching `package-lock.json` update, and should avoid any additional package churn.

## Git Intelligence Summary

- Recent commits are backend/security focused (stories 1.1-1.5) and do not introduce frontend design-system scaffolding beyond planning artifacts.
- There is no established `src/components/primitives` production folder yet; this story should create it as a clean, typed surface for later Epic 10 pages.
- Keep frontend changes isolated and reversible: avoid touching existing page implementations in this story.

## Notes and Warnings

1. **Font loading ownership** — Story 10.1a defines `--font-sans`, `--font-mono`, and `--font-num` stacks and imports the token file. Story 10.1b only consumes those CSS variables and keeps fallback families intact; it does **not** add Google Fonts, self-host font files, `<link>` tags, or Vite font assets. If explicit Inter / JetBrains Mono loading is required beyond the CSS fallback stack, create a separate font-loading task before visual QA.

2. **`lucide-react` tree-shaking** — Vite handles this automatically with named imports (`import { X } from 'lucide-react'`). Do not use barrel imports like `import * as Icons from 'lucide-react'`.

3. **Ant Design theme overrides** — The primitives use CSS custom properties directly (not Ant Design tokens). `InExDrawer` wraps Ant Design's Drawer but uses the `styles` prop for overrides, not `className` or global CSS. This keeps Ant Design's component internals stable.

4. **`ProtectedRoute` must not be touched** — It reads `s.auth.isInitializing` and `s.auth.accessToken` from the Redux store. The `SignageProvider` wraps the app outside this guard, which is correct — signage is a display preference, not an auth-gated feature.

5. **Do not add `'use client'` directives** — This is a Vite React app, not Next.js. React server components are not in use.

## Source References

- `docs/planning/epics.md` (Epic 10, Story 10.1b acceptance criteria and sequencing)
- `docs/planning/prds/prd-inex-2026-05-20/prd.md` (FR-UX-002 and UX-001b traceability for shared primitives)
- `docs/planning/ux-design.md` (required UX source index for frontend design-system stories)
- `docs/planning/design-update-plan.md` (design-track sequence, accessibility direction, and acceptance gate)
- `docs/design/docs/design-implementation-guide.md` (production behavior targets for primitives and responsive contracts)
- `docs/design/Primitives.jsx` and `docs/design/EmptyState.jsx` (visual and behavioral reference contracts)
- `docs/planning/architecture.md` (scope constraint note: Epic 1-ready only)
- `docs/project-context.md` (repository-level implementation and regression guardrails)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `git log --oneline -5`
- `npm install lucide-react`
- `npm run build` from `inex/ClientApp` - passed on 2026-06-03
- `npm run lint` from `inex/ClientApp` - passed on 2026-06-03
- `rg -n "\bany\b" inex\ClientApp\src\components\primitives inex\ClientApp\src\App.tsx` - no matches
- Browser plugin setup failed twice with a local runtime setup error, so authenticated smoke checks were not executed in this pass.

### Completion Notes List

- Added explicit architecture-scope guardrails so Epic 10 work is anchored to the UX/design planning stack rather than Epic 1-only architecture readiness text.
- Added direct traceability to PRD requirement `FR-UX-002` and story marker `UX-001b`.
- Added source reference section so implementation details are citable.
- Installed `lucide-react` and added the shared primitive surface under `src/components/primitives`.
- Added `SignageProvider` and wrapped `App.tsx` without changing routes, auth guards, data loading, Redux, or API behavior.
- Added typed primitives for money values, buttons, icon buttons, chips, fields, inputs, selects, segmented controls, drawer wrapper, progress, empty/filter-empty states, and responsive layout helpers.
- Added EN/RU `primitives.*` locale keys for signage, filter-empty copy, money kind labels, and progress over-budget text.
- Build and lint pass; no `any` usage was introduced in touched TypeScript files.
- Authenticated browser smoke tests remain unexecuted because the in-app browser runtime failed during setup; story is marked `done` after merged PR #148.

### Change Log

- 2026-06-03: Implemented shared primitives, lucide-react dependency, signage provider wiring, locale keys, and static verification; story marked ready for review with browser smoke limitation recorded.
- 2026-06-03: Marked story done after merged PR #148.

### File List

- `docs/implementation/10-1b-frontend-ux-shared-primitives.md`
- `docs/implementation/sprint-status.yaml`
- `inex/ClientApp/package.json`
- `inex/ClientApp/package-lock.json`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`
- `inex/ClientApp/src/App.tsx`
- `inex/ClientApp/src/components/primitives/Button.tsx`
- `inex/ClientApp/src/components/primitives/EmptyState.tsx`
- `inex/ClientApp/src/components/primitives/Field.tsx`
- `inex/ClientApp/src/components/primitives/IconBtn.tsx`
- `inex/ClientApp/src/components/primitives/InExDrawer.tsx`
- `inex/ClientApp/src/components/primitives/Input.tsx`
- `inex/ClientApp/src/components/primitives/Layout.tsx`
- `inex/ClientApp/src/components/primitives/Num.tsx`
- `inex/ClientApp/src/components/primitives/Progress.tsx`
- `inex/ClientApp/src/components/primitives/SegmentedControl.tsx`
- `inex/ClientApp/src/components/primitives/Select.tsx`
- `inex/ClientApp/src/components/primitives/SignageContext.tsx`
- `inex/ClientApp/src/components/primitives/Tag.tsx`
- `inex/ClientApp/src/components/primitives/index.ts`

## Senior Developer Review (AI)

### Review Outcome

Approve with verification limitation.

### Review Summary

- Confirmed story scope stayed in shared primitives, `App.tsx` provider wiring, dependency metadata, and locale files.
- Confirmed no page rebuilds, shell/navigation replacement, Redux/API/client/auth guard changes, or backend changes were introduced.
- Found and fixed two review findings before completion: duplicate empty-state heading IDs and unstable responsive media-query object creation.
- Confirmed `npm run build`, `npm run lint`, and no-`any` search pass after review fixes.

### Action Items

- [x] Replace fixed EmptyState heading id with `React.useId()` to avoid duplicate IDs when multiple empty states render.
- [x] Stabilize `ResponsiveStack` media query setup so it does not create a fresh `MediaQueryList` object during every render.
- [ ] Execute authenticated manual smoke tests once a working browser/runtime and local login path are available.


