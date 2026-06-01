# InEx Design Implementation Guide

Status: baseline documentation for implementing the mockup layouts in a production React app.
Source of truth: the running mockup in this repository, verified in the Codex browser on 2026-05-26.
Planning companion: `docs/planning/design-update-plan.md`.

## 1. Purpose

This document translates the current InEx mockup into implementation guidance for a real React web app. It is not a new design proposal. Use it to preserve layout intent, component behavior, visual hierarchy, responsive behavior, and future rebranding flexibility while rebuilding the UI in production-grade React.

The implementation plan and backlog mapping live in `docs/planning/design-update-plan.md` and `docs/planning/epics.md` (Epic 10). Keep this guide focused on the design contract; use the planning docs for sequencing, story scope, and sprint placement.

The mockup represents a personal finance platform with these product areas:

- Transactions
- Accounts
- Categories
- Budgets
- Reports
- Profile and settings
- Authentication

## 2. Current Mockup Sources

Use these files as the baseline design references:

| Area | File |
| --- | --- |
| App routing and page defaults | `src/main.jsx` |
| Legacy component load order | `src/legacy-loader.jsx` |
| Global design tokens | `tokens.css` |
| Responsive behavior | `responsive.css` |
| Top nav, bottom nav, page header | `Shell.jsx` |
| Shared primitives | `Primitives.jsx` |
| Seed data model | `data.js` |
| Empty states | `EmptyState.jsx` |
| Auth screens | `Auth.jsx` |
| Transactions | `Transactions.jsx` |
| Accounts | `Accounts.jsx` |
| Categories | `Categories.jsx` |
| Budgets | `Budgets.jsx` |
| Reports hub and core reports | `Reports.jsx` |
| Extra report views | `ReportsExtra.jsx` |
| Profile and settings | `Profile.jsx` |

The current mockup uses browser globals through `window.*`. The production app should convert these to explicit React modules, but the visual and interaction contracts below should remain stable unless a product decision changes them.

## 3. Route Map

| Route | Page title | Header subtitle | Primary action |
| --- | --- | --- | --- |
| `#/transactions` | Transactions | Overview | Add transaction |
| `#/accounts` | Accounts | Manage | Add account |
| `#/categories` | Categories | Manage | Add category |
| `#/budgets` | Budgets | Plan | Copy from March, Add budget |
| `#/reports` | Reports | Analyze | Date period, Configure |
| `#/profile` | Profile & Settings | Account | Sign out |
| `#/login` | Sign in to InEx | none | Sign in |
| `#/register` | Create your InEx account | none | Create account |

Production routing should use real React Router or framework routes, but keep the same top-level information architecture unless the product IA is redesigned.

## 4. Brand And Visual Language

### Design Personality

InEx should feel like a quiet finance operations tool: dense, readable, precise, and calm. The interface should not look like a marketing landing page. The strongest visual signals should be financial state, not decoration.

Key traits:

- Dense but not cramped.
- Table-first for operational screens.
- Strong numeric alignment.
- Restrained cards and shadows.
- Semantic color for money movement.
- Minimal decorative imagery outside authentication and empty states.

### Token Contract

The current token file defines the core rebranding surface. In production, these should become design-system tokens, theme variables, or CSS custom properties.

| Token group | Current intent |
| --- | --- |
| `--brand-ink` | Primary brand text, navigation active state, avatar background |
| `--income-*` | Positive money, primary CTA, active indicator |
| `--expense-*` | Negative money, destructive state, expense category emphasis |
| `--transfer-*` | Neutral money movement |
| `--warn-*` | Over-budget or caution state |
| `--fg-*` | Text hierarchy |
| `--bg-*` | App canvas, surfaces, muted fills, stripes |
| `--border-*` | Hairlines, input borders, focus/pressed borders |
| `--shadow-*` | Surface elevation |
| `--radius-*` | Shape scale |
| `--space-*` | 4px spacing scale |
| `--fs-*`, `--fw-*`, `--lh-*` | Type scale |

Current primary colors observed in the browser:

| Role | Value |
| --- | --- |
| App background | `#F5F7FA` |
| Brand ink | `#0F1E2E` |
| Income primary | `#2F8F82` |
| Expense primary | `#C35A4A` |
| Default border | `#E5EAF1` |
| Standard panel radius | `10px` token, often implemented as `8px` in page cards |

### Rebranding Rule

Future rebrands should change tokens first, then component variants, then page-specific layouts. Avoid page-level one-off colors unless they encode product meaning that cannot be expressed through tokens.

## 5. Typography And Numerics

Current fonts:

- UI: Inter
- Numerics: JetBrains Mono

Production requirements:

- Use tabular numerals for every amount, balance, percentage, count, and chart axis label.
- Keep money values visually stable across sorting, filtering, and live updates.
- Use compact type in tables and controls. Reserve larger headings for page titles and hero metrics.
- Current page title size is 28px desktop and 22px mobile.
- Current body default is 14px.
- Avoid negative letter spacing in compact controls and dense panels.

Numeric signage is configurable in the mockup through `window.__INEX_SIGNAGE`:

| Mode | Meaning |
| --- | --- |
| `color-only` | Use color for income/expense distinction |
| `signed` | Prefix positive and negative amounts |
| `arrows` | Use directional cues for neutral movement |

Production should make signage an accessibility/user preference, not a page-local tweak.

## 6. Application Shell

### Desktop Shell

Observed desktop viewport: 1740 x 1270.

The shell consists of:

- Sticky top navigation, 60px high.
- White nav background.
- 40px horizontal nav padding.
- Brand mark and wordmark on the left.
- Main sections as horizontal nav tabs.
- Active tab uses brand ink text and a 2px income-green bottom border.
- User pill on the right.
- Page header below nav with 40px gutters.
- Main page content with 40px gutters.

### Page Header

Desktop:

- Padding: `28px 40px 20px`
- Layout: flex row, title block left, actions right.
- Header aligns to bottom.
- Subtitle: uppercase, 12px, semibold, secondary text, letter spacing.
- Title: 28px, semibold, tight line-height.

Mobile:

- Padding: `20px 16px 12px`
- Direction: column.
- Actions wrap and may fill available width.
- Title: 22px.

### Mobile Shell

Breakpoint: `max-width: 768px`.

Observed mobile viewport: 390 x 844.

Mobile shell behavior:

- Top nav remains sticky but hides horizontal nav items.
- Top nav height becomes 56px.
- Page gutters become 16px.
- Bottom nav appears fixed at the bottom.
- Content gets bottom padding, typically 96px, to avoid bottom nav overlap.
- User name hides inside the user pill.

## 7. Shared Components

### Buttons

Current variants:

- `primary`: income-green background, white text.
- `danger`: expense-red background, white text.
- `default`: white background, border.
- `ghost`: transparent background, border.
- `soft`: muted background.
- `link`: text-style green action.

Button implementation requirements:

- Radius: 6px.
- Use inline icon plus label where the action is not obvious.
- Primary action per page should be green unless destructive.
- Do not overuse primary buttons in toolbars.
- Disabled state should reduce opacity and remove pointer affordance.

### Icon Buttons

Use icon-only buttons for compact row actions, disclosure, settings, close, and utility controls. Icons are currently Lucide via `data-lucide`. Production should use the real React icon package, not DOM post-processing.

### Tags And Chips

Use small chips for status, scope, and category metadata.

Current visual contract:

- Tight padding: `2px 8px`.
- Radius: 4px or pill for compact status.
- Uppercase or semibold compact labels.
- Color maps to semantic role.

### Segmented Controls

Segmented controls are used for scopes and view modes:

- Active/All
- Tree/By spend
- By currency/Flat list
- Month chips
- Report intervals

Current pattern:

- Muted container.
- 3px inner padding.
- Active item white with subtle `shadow-1`.
- Radius: container 8px, active item 6px.

### Inputs And Selects

Current controls:

- Border: `--border-2`.
- Radius: 6px.
- Focus: income-green focus ring.
- Selects use a custom chevron background.
- Addons use muted fill and mono text for currency or units.

Production should use accessible native controls or design-system controls with equivalent keyboard and screen-reader behavior.

### Drawers

Drawers are used for create/edit flows and advanced filters.

Current behavior:

- Fixed overlay with navy translucent backdrop.
- Panel slides in from right.
- Default width: 440px.
- Header includes title, optional subtitle, and close icon.
- Mobile breakpoint makes drawer full width.

Production requirements:

- Trap focus inside drawer.
- Close on Escape.
- Return focus to triggering control.
- Preserve scroll inside drawer body.

### Progress And Distribution Bars

Use progress bars for budgets, burn rate, and category distribution.

Current behavior:

- Green under normal use.
- Amber when approaching threshold.
- Red when over limit.
- Bars use pill radius and muted track.

## 8. Page Layout Specifications

### Transactions

Purpose: operational ledger and short-term financial overview.

Desktop layout:

- KPI strip at top with three equal columns.
- Main content uses a table-like ledger.
- Content padding: `0 40px 20px` for KPI strip, then `0 40px 32px`.
- Ledger grid columns: `1.8fr 1fr 1fr 180px`.
- Day headers separate groups.
- Row density supports compact and comfortable modes.
- Filters and type tabs sit above the ledger.

Mobile behavior:

- KPI strip collapses to one column.
- Ledger header hides.
- Ledger rows stack into one-column card-like blocks.
- Amount moves above supporting metadata.
- No horizontal overflow observed at 390px.

Implementation notes:

- Keep transaction amount right-aligned on desktop.
- Use tabular numerics for all amount cells.
- Preserve income, expense, and transfer distinction.
- Filtering should keep visible counts in the control labels.

### Accounts

Purpose: account inventory, balances, and currency grouping.

Desktop layout:

- Workspace padding: `0 40px 32px`.
- Hero card uses two-column layout: `320px 1fr`.
- Hero includes net worth summary and supporting account metrics.
- Account rows use grid: `1.8fr 100px 130px 130px 28px`.
- Grouping supports currency groups and flat list.

Mobile behavior:

- Workspace padding: `0 16px 96px`.
- Hero stacks.
- Rows stack into one-column blocks.
- Toolbar and filter bar stack.
- No horizontal overflow observed at 390px.

Implementation notes:

- Currency badges should remain deterministic and compact.
- Liability/credit account values must use negative or semantic styling consistently.
- Expanded inline edit should remain visually attached to the row.

### Categories

Purpose: category management, hierarchy, and spend signal.

Desktop layout:

- Workspace padding: `0 40px 32px`.
- Hero card uses `320px 1fr`.
- Summary contains April spend, active category count, budgeted categories, top category, and distribution cue.
- Category rows use grid: `minmax(260px, 1fr) 150px 130px 34px`.
- Parent and child categories have distinct row treatment.
- Tree and By spend views are available.

Mobile behavior:

- Hero compresses, then metric grid becomes smaller.
- Category rows use two columns: main content plus compact amount/action area.
- Chevron becomes absolute on the right.
- Parent rows get a left accent rail.
- Inline edit becomes one column.
- No horizontal overflow observed at 390px.

Implementation notes:

- Preserve ancestor visibility when search matches a child.
- Parent rows should be scannable as group headers without becoming separate cards.
- Child indentation must not create mobile overflow.

### Budgets

Purpose: monthly budget planning and burn-rate tracking.

Desktop layout:

- Workspace padding: `0 40px 32px`.
- Hero card uses `340px 1fr`.
- Burn list rows use `110px 1fr 90px`.
- Budget table uses `1.8fr 1.5fr 1.6fr 110px 110px 28px`.
- Header actions include Copy from March and Add budget.
- Month switcher is prominent in the toolbar.

Mobile behavior:

- Hero stacks.
- Month switcher scrolls horizontally.
- Filter bar wraps.
- Budget rows stack into one-column blocks.
- Burn rows compress to `90px 1fr 60px`.
- No horizontal overflow observed at 390px.

Implementation notes:

- Burn rate and remaining amounts should be the strongest scan targets.
- Over-budget state must use expense red and should not rely on color alone.
- Copy-from-previous-month action should remain secondary to creating a budget.

### Reports

Purpose: analytical hub and drill-down report views.

Desktop layout:

- Hub content padding: `0 40px 40px`.
- Report hub uses auto-fill cards with `minmax(280px, 1fr)`.
- Cards use white surface, border, 12px radius, and `shadow-1`.
- Header actions are date period and Configure on hub.
- Drill-down reports replace subtitle with an All reports back affordance.
- Drill-down actions are Share, Export, Print.

Mobile behavior:

- Report hub becomes one column.
- Stat rows become two columns.
- Bottom nav remains visible.
- No horizontal overflow observed at 390px for hub.

Implementation notes:

- Report cards should read as launch points, not dashboard widgets.
- Heavy chart views need responsive chart containers and accessible data summaries.
- Keep export/print actions out of the hub unless a specific report is open.

### Profile And Settings

Purpose: user profile, preferences, account configuration.

Desktop layout:

- Settings container padding: `0 40px 40px`.
- Grid: `240px 1fr`.
- Sidebar is sticky under the top nav.
- Main content uses two-column cards where appropriate.
- Cards use 12px radius and `shadow-1`.

Mobile behavior:

- Intended behavior: settings grid collapses to one column.
- Sidebar becomes horizontal scroll tabs.
- Internal settings grids collapse to one column.
- Content receives bottom nav padding.

Observed issue:

- At 390px, the profile page currently has horizontal overflow. The computed settings grid was wider than the viewport. Treat this as a production fix requirement.

Implementation notes:

- Make settings sidebar scroll horizontally without forcing page width.
- Apply `min-width: 0` to grid children.
- Audit all two-column inner grids and wide form controls at mobile widths.

### Authentication

Purpose: sign in and account creation.

Desktop layout:

- Full-height two-column grid: `1fr 1fr`.
- Left brand panel carries product positioning.
- Right panel contains the form.
- Social auth buttons appear on login.
- Register form focuses on account creation.

Mobile behavior:

- Brand panel hides.
- Single-column form.
- Mobile logo appears.
- No bottom nav.
- No horizontal overflow observed at 390px.

Implementation notes:

- Keep auth separate from the app shell.
- Production forms need validation, error summaries, loading state, and password-manager-friendly fields.
- Avoid rebuilding the auth screen as a marketing page.

## 9. Empty And Filter-Empty States

Empty states exist for:

- Transactions
- Accounts
- Categories
- Budgets
- Reports

Current pattern:

- White surface.
- Dashed border.
- 14px radius.
- Large centered icon tile.
- 22px title.
- Descriptive 14px copy.
- Primary and secondary actions.
- Optional suggestion list.

Production requirements:

- Empty states should explain the next useful action.
- Filter-empty states should be smaller and preserve page context.
- Empty copy should be product-specific, not generic system copy.

## 10. Responsive Rules

Use `768px` as the first production breakpoint unless the real product has stronger device analytics.

Current mobile transformations:

| Component | Desktop | Mobile |
| --- | --- | --- |
| Top nav | horizontal section tabs | tabs hidden |
| Bottom nav | hidden | fixed bottom nav |
| Page header | row | column |
| Gutters | 40px | 16px |
| Workspace | wide content | one column, 96px bottom padding |
| Ledger header | visible | hidden |
| Ledger row | multi-column grid | stacked block |
| KPI strip | multi-column | one column |
| Hero two-column | side-by-side | stacked |
| Auth | two-column | single-column |
| Settings sidebar | sticky side nav | horizontal scroll nav |
| Drawer | fixed right width | full width |

Mobile QA checklist:

- No horizontal overflow at 390px.
- Bottom nav does not cover the final row or footer.
- Header actions wrap without overlapping title.
- Long amounts keep tabular alignment but do not force overflow.
- Search inputs can shrink with `min-width: 0`.
- Horizontal controls such as month switchers scroll internally, not at page level.

## 11. Production React Architecture Recommendation

The mockup should be migrated from browser globals to explicit modules.

Recommended structure:

```text
src/
  app/
    routes/
    AppShell.tsx
    routeConfig.ts
  design-system/
    tokens.css
    Button.tsx
    IconButton.tsx
    Field.tsx
    Select.tsx
    Tabs.tsx
    Drawer.tsx
    EmptyState.tsx
    Money.tsx
    Progress.tsx
  features/
    transactions/
    accounts/
    categories/
    budgets/
    reports/
    profile/
    auth/
  data/
    fixtures.ts
    types.ts
```

Migration priorities:

1. Extract tokens unchanged.
2. Convert primitives to typed React components.
3. Convert shell and route config.
4. Convert one feature page at a time.
5. Replace inline styles with component props, CSS modules, or theme-aware styling.
6. Add visual regression coverage after each page is converted.

## 12. Rebranding Workflow

Use this order for future rebranding work:

1. Define brand goals and constraints.
2. Update token palette, typography, logo assets, and icon rules.
3. Verify money semantics remain accessible and unambiguous.
4. Update shared primitives.
5. Review shell, auth, and empty states.
6. Review each feature page.
7. Run responsive and visual regression checks.
8. Document before/after token decisions.

Do not start rebranding by editing individual page cards. That creates drift and makes future rebrands expensive.

## 13. Accessibility Requirements

Production implementation must add accessibility behavior that the mockup only approximates:

- Real buttons for clickable controls.
- Real links for navigation.
- Keyboard support for all segmented controls and tabs.
- Focus states matching `--focus-ring`.
- Drawer focus trap and Escape close.
- Screen-reader labels for icon-only actions.
- Color-independent income/expense signage option.
- Proper headings hierarchy per route.
- Form labels connected to inputs.
- Error messages associated with fields.
- Chart data available as text or table summaries.

## 14. Visual Regression Coverage

Minimum screenshot set for future implementation:

Desktop widths:

- 1440px: all top-level pages.
- 1024px: operational pages with tables.

Mobile widths:

- 390px: all top-level pages.
- 360px: categories and budgets.

States:

- Default populated data.
- Empty mode via `?empty=1`.
- Filter-empty state.
- Drawer open.
- Expanded row.
- Report drill-down.
- Long translated labels and long amounts.

## 15. Known Implementation Risks

| Risk | Impact | Recommendation |
| --- | --- | --- |
| Inline styles dominate page code | Harder theming and rebranding | Move repeated patterns into shared components and CSS tokens |
| Browser globals | Hard to test and type | Convert to module exports |
| Icon rendering via DOM scan | Fragile in React updates | Use React Lucide components |
| Mobile profile overflow | Broken mobile settings page | Fix grid min-width and sidebar overflow during migration |
| Color-only money semantics | Accessibility risk | Support signed or icon-assisted mode |
| Charts are visual-first | Accessibility and export risk | Provide tabular summaries and export-ready data |
| Mock forms lack production validation | Runtime errors and weak UX | Add schema validation, loading, disabled, and error states |

## 16. Acceptance Criteria For Production Rebuild

A production implementation preserves the mockup when:

- Top-level routes match the route map.
- Desktop shell, page header, gutters, and nav behavior match the baseline.
- Mobile shell hides top tabs, shows bottom nav, and uses 16px gutters.
- Core token roles are implemented through theme variables.
- Money values use tabular numerics and semantic styling.
- Operational pages retain table-like scanning on desktop and stacked rows on mobile.
- Drawers, filters, expanded rows, empty states, and report drill-downs are implemented.
- Pages pass visual checks at 1440px and 390px.
- Future brand changes can be made primarily through tokens and shared primitives.

## 17. Migration Notes For The Current App

The current production frontend under `inex/ClientApp/src` already has the correct product routes and data-loading shape, but it is still mostly Ant Design layout and table chrome. The design update should bridge from the existing app rather than replacing the app wholesale.

Recommended migration order:

1. Add token CSS and shared design-system components without changing feature behavior.
2. Replace `BasicPage` with the new shell/page-header contract, preserving route protection and logout behavior.
3. Convert Transactions first to validate ledger density, filter chips, drawer behavior, amount formatting, and mobile navigation.
4. Convert Accounts, Categories, and Budgets using the same management-page primitives.
5. Convert Reports/Dashboard after the route IA decision is implemented.
6. Convert Profile and Auth, including mobile overflow and form-state fixes.

During migration, keep authenticated API calls on the existing `apiClient`, keep Redux data ownership unchanged until the RTK Query story, and put every new visible string into the EN/RU locale files.
