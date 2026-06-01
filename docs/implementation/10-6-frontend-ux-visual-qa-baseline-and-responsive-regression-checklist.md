# Story 10.6: Frontend UX - Visual QA Baseline And Responsive Regression Checklist

Status: ready-for-dev

## Story

As a developer,
I want a repeatable visual QA process for the redesigned UI,
so that responsive and layout regressions are caught before production.

## Acceptance Criteria

1. **Given** the visual regression coverage list in `docs/design/docs/design-implementation-guide.md` (Section 14), **when** this story is complete, **then** the repo contains the documented manual and Playwright-assisted screenshot commands for 1440px, 1024px, 390px, and 360px checks in `docs/design/docs/visual-qa-checklist.md`.

2. **Given** all top-level routes, **when** the visual QA checklist is executed, **then** it covers: Transactions, Accounts, Categories, Budgets, Dashboard (home landing), Reports hub, a report drill-down, Profile, Login, and Register — ten routes in total.

3. **Given** important UI states, **when** the visual QA checklist is executed, **then** it covers: populated (real seed data), empty (no records), filter-empty (filter active, zero results), drawer-open (create/edit drawer visible), expanded-row (detail row expanded), report drill-down, long translated labels (switch to RU locale), and long amounts (five-digit+ amounts).

4. **Given** a screenshot reveals overlap, clipped button text, page-level horizontal overflow, bottom-nav occlusion, or chart blankness, **when** the story is reviewed, **then** the regression is treated as a **failed acceptance criterion** — not a cosmetic follow-up — and must be fixed before this story is marked done.

5. **Given** the story is complete, **when** `docs/design/docs/design-implementation-guide.md` is updated, **then** it records the current QA workflow in a new **Section 18: Visual QA Workflow** and lists any known exceptions with owner-visible rationale and the date the exception was accepted.

## Prerequisites

This is the capstone story for Epic 10. **All of the following stories must reach `done` before starting the QA run:**

| Story | Scope                                                                     |
| ----- | ------------------------------------------------------------------------- |
| 10.1a | Design tokens and Ant Design theme bridge                                 |
| 10.1b | Shared primitives (`Num`, `InExButton`, `InExDrawer`, `EmptyState`, etc.) |
| 10.1c | App shell and navigation (desktop top nav + mobile bottom nav)            |
| 10.2  | Transactions ledger redesign                                              |
| 10.3a | Accounts management redesign                                              |
| 10.3b | Categories management redesign                                            |
| 10.3c | Budgets management redesign                                               |
| 10.4  | Reports hub, dashboard landing, and drill-down chrome                     |
| 10.5a | Profile and settings redesign                                             |
| 10.5b | Login and registration redesign                                           |

**Check before starting:** every story above must be status `done` in `docs/implementation/sprint-status.yaml`. If any story is not `done`, do not start the final Epic 10 QA gate; send the incomplete story back to its owner first. Subset QA is allowed only as story-level evidence for an individual route story, not as completion evidence for Story 10.6.

**Dev server must be running** with populated data. Use `./start-project.ps1` or run backend (`dotnet watch run --project inex`) and frontend (`npm start` from `inex/ClientApp/`) separately. Confirm `http://localhost:3000` loads and you can log in.

**Test account setup:** log in with a test user that has at least:

- 3 accounts in different currencies (e.g., USD, EUR, BYN)
- 10+ transactions across multiple months with tags and refs
- 5+ categories (mix of active and inactive, with parent/child)
- 3+ budgets for the current month
- At least one report result accessible from the Reports hub

## Epic Context

Epic 10 rebuilds the production React app to implement the `docs/design` visual system. Story 10.6 is the final story and acts as the acceptance gate for the entire epic. The acceptance gate is defined in `docs/planning/design-update-plan.md` (Acceptance Gate For The Design Track section):

- The production app shell, tokens, core primitives, and all top-level routes match the documented visual and responsive contracts.
- Mobile navigation uses the bottom nav pattern and pages have no horizontal overflow at 390px or 360px.
- Every converted route passes documented visual checks.

**FR covered:** FR-UX-007 — Converted pages pass the documented visual QA matrix at 1440px, 1024px, 390px, and 360px.

**NFR covered:**

- `NFR-UX-2`: Authenticated app routes have no horizontal overflow at 390px or 360px mobile widths.
- `NFR-UX-3`: Drawers, segmented controls, tabs, icon buttons, and navigation are keyboard accessible and screen-reader labeled.
- `NFR-I18N-1`: All user-visible strings through `react-i18next`; no hardcoded UI text.

**Epic 10 sequence:**

```
10.1a → 10.1b → 10.1c → 10.2 → 10.3a/b/c → 10.4 → 10.5a/b → 10.6 (this story)
```

**Dashboard route:** QA verifies `/dashboard` as delivered by Story 10.4 on top of completed Epic 6 dashboard/report data work. `/` may redirect there, but QA must capture `/dashboard` directly so the baseline matches the implemented landing route. Story 10.6 must not implement or duplicate Epic 6 dashboard/report data or API behavior.

**Dependencies from epics.md:**

- Epic 1 must be complete before broad UI rollout. If `docs/implementation/sprint-status.yaml` still shows `epic-1` or any Epic 1 story as not `done`, record that as a preflight blocker or obtain an explicit delivery decision before running the final Epic 10 QA gate.
- Epic 4 should be done before Transactions QA (filter chips bind to database-side filtering).
- This story has no backend changes. All work is documentation, visual inspection, and regression fixes.

**Final-gate rule:** Story 10.6 is the only Epic 10-wide visual QA acceptance gate. It cannot be marked `done` until every required route/state/viewport cell is either passing or recorded as an explicitly accepted exception with owner, rationale, and date.

## Design References

All visual contracts are defined in `docs/design/docs/design-implementation-guide.md`. The specific sections relevant to QA coverage:

| Section    | Content                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| Section 6  | Application shell — desktop and mobile shell dimensions and behavior                                       |
| Section 8  | Page layout specifications per route (Transactions, Accounts, Categories, Budgets, Reports, Profile, Auth) |
| Section 9  | Empty and filter-empty state patterns                                                                      |
| Section 10 | Responsive rules and mobile QA checklist                                                                   |
| Section 14 | **Visual regression coverage** — the minimum screenshot matrix (PRIMARY REFERENCE)                         |
| Section 16 | Acceptance criteria for production rebuild                                                                 |

Also review `docs/planning/design-update-plan.md` — the Acceptance Gate section for the full epic definition of done.

**Section 14 (Visual Regression Coverage) excerpted verbatim as the QA contract:**

```
Desktop widths:
- 1440px: all top-level pages
- 1024px: operational pages with tables

Mobile widths:
- 390px: all top-level pages
- 360px: categories and budgets

States:
- Default populated data
- Empty mode via ?empty=1
- Filter-empty state
- Drawer open
- Expanded row
- Report drill-down
- Long translated labels and long amounts
```

**Section 10 mobile QA checklist (must pass at 390px):**

- No horizontal overflow at 390px.
- Bottom nav does not cover the final row or footer.
- Header actions wrap without overlapping title.
- Long amounts keep tabular alignment but do not force overflow.
- Search inputs can shrink with `min-width: 0`.
- Horizontal controls such as month switchers scroll internally, not at page level.

## What This Story Produces

This story has **two concrete deliverables**:

### Deliverable 1: `docs/design/docs/visual-qa-checklist.md`

A new Markdown file containing the completed QA matrix. Format: one row per (route × viewport × state) combination, with pass/fail, screenshot filename, and notes. Template is specified in [QA Checklist Template](#qa-checklist-template) below.

### Deliverable 2: Updated `docs/design/docs/design-implementation-guide.md`

A new **Section 18: Visual QA Workflow** appended to the guide. Content is specified in [Design Guide Update](#design-guide-update) below.

### Optional: `docs/design/docs/screenshots/` directory

Screenshots may be committed alongside the checklist. If committed, use the naming convention `{viewport}_{route}_{state}.png` (e.g., `1440_transactions_populated.png`, `390_accounts_drawer-open.png`).

Screenshots are **optional as committed artifacts** but **required as part of the QA process** — you must look at them, even if you discard them afterward.

## QA Matrix

The required QA coverage. Every cell marked ✓ must be inspected. Cells marked `—` are not applicable for that viewport.

### Desktop Viewport Coverage

| Route                   | State                       | 1440px | 1024px |
| ----------------------- | --------------------------- | ------ | ------ |
| `/transactions`         | populated                   | ✓      | ✓      |
| `/transactions`         | empty                       | ✓      | —      |
| `/transactions`         | filter-empty                | ✓      | —      |
| `/transactions`         | drawer-open (add/edit)      | ✓      | ✓      |
| `/transactions`         | filter drawer open          | ✓      | ✓      |
| `/accounts`             | populated                   | ✓      | ✓      |
| `/accounts`             | empty                       | ✓      | —      |
| `/accounts`             | drawer-open (add/edit)      | ✓      | ✓      |
| `/categories`           | populated (tree view)       | ✓      | ✓      |
| `/categories`           | populated (by-spend view)   | ✓      | —      |
| `/categories`           | expanded-row                | ✓      | ✓      |
| `/categories`           | empty                       | ✓      | —      |
| `/budgets`              | populated                   | ✓      | ✓      |
| `/budgets`              | empty                       | ✓      | —      |
| `/budgets`              | drawer-open (add budget)    | ✓      | ✓      |
| `/dashboard`             | populated (month cards)     | ✓      | ✓      |
| `/reports` (hub)        | populated                   | ✓      | ✓      |
| `/reports` (drill-down) | report drill-down           | ✓      | ✓      |
| `/profile`              | populated                   | ✓      | ✓      |
| `/login`                | default                     | ✓      | —      |
| `/register`             | default                     | ✓      | —      |
| Any route               | long translated labels (RU) | ✓      | —      |
| Any route (amounts)     | long amounts (5+ digit)     | ✓      | —      |

### Mobile Viewport Coverage

| Route                   | State                      | 390px | 360px |
| ----------------------- | -------------------------- | ----- | ----- |
| `/transactions`         | populated                  | ✓     | —     |
| `/transactions`         | empty                      | ✓     | —     |
| `/transactions`         | filter-empty               | ✓     | —     |
| `/transactions`         | drawer-open                | ✓     | —     |
| `/accounts`             | populated                  | ✓     | —     |
| `/accounts`             | empty                      | ✓     | —     |
| `/categories`           | populated                  | ✓     | ✓     |
| `/categories`           | empty                      | ✓     | ✓     |
| `/categories`           | expanded-row               | ✓     | ✓     |
| `/budgets`              | populated                  | ✓     | ✓     |
| `/budgets`              | empty                      | ✓     | ✓     |
| `/dashboard`             | populated                  | ✓     | —     |
| `/reports` (hub)        | populated                  | ✓     | —     |
| `/reports` (drill-down) | report drill-down          | ✓     | —     |
| `/profile`              | populated                  | ✓     | —     |
| `/login`                | default                    | ✓     | —     |
| `/register`             | default                    | ✓     | —     |
| Any route               | bottom-nav occlusion check | ✓     | ✓     |

**Total required inspections: ~50 combinations.**

## Failure Criteria (Must Fix Before Done)

Any of the following conditions in a screenshot is a **failed AC**, not a cosmetic issue. The story cannot be marked `done` while any of these are present:

| Failure                            | Description                                                                                                              | Example                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **Overlap**                        | UI elements sit on top of each other, making content unreadable                                                          | Drawer backdrop covers focusable action button; KPI strip overlaps toolbar           |
| **Clipped button text**            | A button label is cut off by `overflow: hidden` or truncation                                                            | "Add transaction" shows "Add transac..."                                             |
| **Page-level horizontal overflow** | The `<body>` or root `<div>` is wider than the viewport, causing a horizontal scrollbar                                  | At 390px, scrolling right reveals empty space or clipped content                     |
| **Bottom-nav occlusion**           | The fixed bottom nav at 390px/360px covers the final table row, empty-state action, drawer footer, or pagination control | User cannot tap "Load more" because bottom nav sits on top of it                     |
| **Chart blankness**                | A chart renders but its content area is blank, zero-height, or invisible                                                 | Recharts `<BarChart>` renders with height 0 because container has no explicit height |
| **Long label overflow**            | Russian locale labels or five-digit+ amounts break out of their container or force horizontal page scroll                | Amount cell in table forces table wider than viewport                                |

If a failure is found and is a known limitation with an accepted trade-off, document it in `docs/design/docs/visual-qa-checklist.md` with:

- The exact viewport and route
- Why it is accepted
- The owner accepting it and the date

## Setting Up Viewports

### Option A: Browser DevTools (Manual — Recommended)

1. Open Chrome or Edge DevTools (`F12` or `Ctrl+Shift+I`).
2. Click the **Toggle Device Toolbar** icon (or press `Ctrl+Shift+M`).
3. Select **Responsive** mode.
4. Enter the target width in the dimension input at the top:
   - `1440` → width 1440, height 900
   - `1024` → width 1024, height 768
   - `390` → width 390, height 844 (iPhone 14 Pro viewport)
   - `360` → width 360, height 800 (Android reference viewport)
5. **Important:** after resizing, **hard reload** the page (`Ctrl+Shift+R`) so CSS media queries re-evaluate correctly.
6. To take a screenshot of the full page: in DevTools `...` menu → **Run command** → type `Capture full size screenshot`. This captures scrollable content, not just the visible viewport.

### Option B: Playwright CLI (Automated — Optional but Recommended for Documentation)

The project does not yet have a Playwright configuration. Install Playwright as a dev dependency without affecting the test suite:

```bash
# Run from inex/ClientApp/
npm install --save-dev playwright
npx playwright install chromium --with-deps
```

Then use inline script (no config file needed):

```bash
# Capture Transactions populated at 1440px desktop
npx playwright screenshot \
  --browser chromium \
  --viewport-size 1440,900 \
  --full-page \
  http://localhost:3000/transactions \
  docs/design/docs/screenshots/1440_transactions_populated.png
```

```bash
# Capture Accounts populated at 390px mobile
npx playwright screenshot \
  --browser chromium \
  --viewport-size 390,844 \
  --full-page \
  http://localhost:3000/accounts \
  docs/design/docs/screenshots/390_accounts_populated.png
```

**Note:** Playwright CLI screenshots will land on the login page if you are not authenticated. For authenticated routes, use a helper script (see below) or use Option A (browser DevTools) while logged in.

### Option C: Playwright Script for Authenticated Routes

Create a temporary helper script at `inex/ClientApp/qa-screenshots.mjs` (do not commit unless the team decides to keep it):

```js
// qa-screenshots.mjs — run with: node qa-screenshots.mjs
// Requires: npx playwright install chromium
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE_URL = "http://localhost:3000";
const EMAIL = "your-test-user@example.com"; // replace with real test account
const PASSWORD = "your-test-password"; // replace with real test account password
const OUT_DIR = "docs/design/docs/screenshots";

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "390", width: 390, height: 844 },
  { name: "360", width: 360, height: 800 },
];

const ROUTES = [
  { path: "/dashboard", name: "dashboard" },
  { path: "/transactions", name: "transactions" },
  { path: "/accounts", name: "accounts" },
  { path: "/categories", name: "categories" },
  { path: "/budgets", name: "budgets" },
  { path: "/reports", name: "reports-hub" },
  { path: "/profile", name: "profile" },
];

mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    // Log in once per viewport context
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.toString().includes("/login"));

    for (const route of ROUTES) {
      await page.goto(`${BASE_URL}${route.path}`);
      await page.waitForLoadState("networkidle");
      const filename = `${OUT_DIR}/${vp.name}_${route.name}_populated.png`;
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`Saved: ${filename}`);
    }

    await context.close();
  }

  // Capture login and register at 1440 and 390 without login
  for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    for (const route of ["/login", "/register"]) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState("networkidle");
      const name = route.replace("/", "");
      const filename = `${OUT_DIR}/${vp.name}_${name}_default.png`;
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`Saved: ${filename}`);
    }
    await context.close();
  }

  await browser.close();
  console.log("Done. Check docs/design/docs/screenshots/");
})();
```

**Run with:**

```bash
cd inex/ClientApp
node qa-screenshots.mjs
```

**Do not commit this script** unless the team decides to formalize it as a permanent QA tool. The script is a helper for this story's QA run.

**Add to `.gitignore`** before running to prevent accidental commit:

```
# in inex/ClientApp/.gitignore or root .gitignore:
qa-screenshots.mjs
```

## How to Check Each State

### populated

Navigate to the route while logged in with the test account containing seed data. Verify the page renders content.

### empty

Navigate to the route with a test account that has no records, OR clear all items through the UI, OR check if the route accepts a `?empty=1` query param (if implemented by the page story). If no test account with empty data is available, document the state as "not tested — no empty account available" in the checklist.

### filter-empty

On Transactions or Accounts/Categories: apply a filter that returns no results (e.g., filter by a tag that exists nowhere). Verify the filter-empty component renders correctly.

### drawer-open

Click "Add transaction" / "Add account" / "Add category" / "Add budget" to open the creation drawer. Do not dismiss it. Take the screenshot with the drawer open and the page still visible behind the backdrop.

### expanded-row

On Categories: click the expand chevron on a parent category row. On Transactions with expanded detail (if implemented): expand a row. Verify the expanded content does not cause layout issues.

### report drill-down

From the Reports hub, open any specific report (e.g., category spending, net worth). Verify the drill-down chrome renders correctly (back affordance, Share/Export/Print actions, chart area).

### long translated labels (RU locale)

Switch the app locale to Russian (via the language toggle in Profile/Settings or by changing `i18n.changeLanguage('ru')` in browser console). Navigate to pages with labels and verify buttons, table headers, and chips do not clip or overflow.

```js
// Switch to Russian in browser console:
localStorage.setItem("i18nextLng", "ru");
location.reload();
```

### long amounts

Ensure the test account has transactions or balances with amounts ≥ 10,000 (five digits). This stress-tests amount column alignment and tabular numeric behavior. If no such amounts exist, use browser devtools to artificially widen the numbers in the DOM for visual verification only.

## QA Checklist Template

Create `docs/design/docs/visual-qa-checklist.md` using this template:

```markdown
# InEx Visual QA Checklist

Generated: {date}
Executed by: {name}
App version / commit: {git commit SHA}
Design guide reference: docs/design/docs/design-implementation-guide.md Section 14

## Legend

- ✅ PASS — no failures observed
- ❌ FAIL — see notes column for failure description
- ⚠️ EXCEPTION — accepted known issue with rationale
- ➖ SKIPPED — story not done yet or state unavailable

## QA Commands / Screenshot Capture

Record the exact commands and workflow used for this run. Include both manual browser steps and any Playwright-assisted commands.

```bash
# Example only; replace with the actual commands used for this run.
npm run build
npm run lint
node qa-screenshots.mjs
```

- Browser/tool used:
- Local URL:
- Viewports captured: 1440px, 1024px, 390px, 360px
- Screenshot output folder:
- Notes for Windows/macOS/Linux differences:

## Desktop QA Results

| Route                   | State                | 1440px | 1024px | Screenshot | Notes |
| ----------------------- | -------------------- | ------ | ------ | ---------- | ----- |
| `/transactions`         | populated            |        |        |            |       |
| `/transactions`         | empty                |        | —      |            |       |
| `/transactions`         | filter-empty         |        | —      |            |       |
| `/transactions`         | drawer-open          |        |        |            |       |
| `/transactions`         | filter drawer open   |        |        |            |       |
| `/accounts`             | populated            |        |        |            |       |
| `/accounts`             | empty                |        | —      |            |       |
| `/accounts`             | drawer-open          |        |        |            |       |
| `/categories`           | populated (tree)     |        |        |            |       |
| `/categories`           | populated (by-spend) |        | —      |            |       |
| `/categories`           | expanded-row         |        |        |            |       |
| `/categories`           | empty                |        | —      |            |       |
| `/budgets`              | populated            |        |        |            |       |
| `/budgets`              | empty                |        | —      |            |       |
| `/budgets`              | drawer-open          |        |        |            |       |
| `/dashboard`             | populated            |        |        |            |       |
| `/reports` (hub)        | populated            |        |        |            |       |
| `/reports` (drill-down) | report drill-down    |        |        |            |       |
| `/profile`              | populated            |        |        |            |       |
| `/login`                | default              |        | —      |            |       |
| `/register`             | default              |        | —      |            |       |
| Any route               | long labels (RU)     |        | —      |            |       |
| Any route               | long amounts         |        | —      |            |       |

## Mobile QA Results

| Route                   | State        | 390px | 360px | Screenshot | Notes |
| ----------------------- | ------------ | ----- | ----- | ---------- | ----- |
| `/transactions`         | populated    |       | —     |            |       |
| `/transactions`         | empty        |       | —     |            |       |
| `/transactions`         | filter-empty |       | —     |            |       |
| `/transactions`         | drawer-open  |       | —     |            |       |
| `/accounts`             | populated    |       | —     |            |       |
| `/accounts`             | empty        |       | —     |            |       |
| `/categories`           | populated    |       |       |            |       |
| `/categories`           | empty        |       |       |            |       |
| `/categories`           | expanded-row |       |       |            |       |
| `/budgets`              | populated    |       |       |            |       |
| `/budgets`              | empty        |       |       |            |       |
| `/dashboard`             | populated    |       | —     |            |       |
| `/reports` (hub)        | populated    |       | —     |            |       |
| `/reports` (drill-down) | drill-down   |       | —     |            |       |
| `/profile`              | populated    |       | —     |            |       |
| `/login`                | default      |       | —     |            |       |
| `/register`             | default      |       | —     |            |       |
| Bottom nav check        | all routes   |       |       |            |       |

## Failures Found

List each failure and its resolution:

| ID     | Route | Viewport | State | Failure Type | Description | Status | Fixed in commit |
| ------ | ----- | -------- | ----- | ------------ | ----------- | ------ | --------------- |
| QA-001 |       |          |       |              |             |        |                 |

## Known Exceptions

List any known issues accepted as exceptions (must have owner + rationale + date):

| Route | Viewport | Issue | Rationale | Accepted by | Date |
| ----- | -------- | ----- | --------- | ----------- | ---- |
|       |          |       |           |             |      |

## Summary

- Total inspections required: ~50
- Total inspections completed: {n}
- Passes: {n}
- Failures fixed: {n}
- Exceptions accepted: {n}
- Skipped (story not done): {n}
```

## File Map

### Files to Create

```
docs/design/docs/visual-qa-checklist.md   ← REQUIRED deliverable (completed checklist)
docs/design/docs/screenshots/             ← OPTIONAL: committed screenshots
  {viewport}_{route}_{state}.png          ← naming convention
inex/ClientApp/qa-screenshots.mjs         ← OPTIONAL: Playwright helper (do not commit unless formalized)
```

### Files to Modify

| File                                              | Change                                    |
| ------------------------------------------------- | ----------------------------------------- |
| `docs/design/docs/design-implementation-guide.md` | Append **Section 18: Visual QA Workflow** |
| Any page component found to have a regression     | Fix the regression                        |

### Files to NOT Touch

| File                                        | Reason                                     |
| ------------------------------------------- | ------------------------------------------ |
| `inex/ClientApp/src/store/**`               | Redux state is not in scope for QA story   |
| `inex/ClientApp/src/utils/apiClient.ts`     | API client unchanged                       |
| `docs/planning/epics.md`                    | Epics file is read-only reference          |
| `docs/implementation/sprint-status.yaml`    | Updated as part of the normal workflow     |
| Any story file under `docs/implementation/` | Story files are read-only after completion |

## Design Guide Update

Append the following section to `docs/design/docs/design-implementation-guide.md`:

```markdown
## 18. Visual QA Workflow

This section documents how the visual QA checklist in `docs/design/docs/visual-qa-checklist.md` was created and how to re-run it for future changes.

### QA Execution Method

The baseline QA (established in Epic 10, Story 10.6) used Chrome DevTools Responsive Mode with the following viewport presets:

| Preset     | Width  | Height | Purpose                                       |
| ---------- | ------ | ------ | --------------------------------------------- |
| Desktop-XL | 1440px | 900px  | All top-level pages                           |
| Desktop-M  | 1024px | 768px  | Operational pages with tables                 |
| Mobile-L   | 390px  | 844px  | All top-level pages (iPhone 14 Pro reference) |
| Mobile-S   | 360px  | 800px  | Categories and Budgets (Android reference)    |

Screenshots were captured using Chrome DevTools **Capture full size screenshot** (DevTools → `...` → Run command → Capture full size screenshot).

### Re-Running QA After Changes

When a page component is changed, re-run the relevant rows of the checklist:

1. Open the page at each applicable viewport using Chrome DevTools Responsive Mode.
2. Hard reload after each viewport change (`Ctrl+Shift+R`).
3. Check the page for the six failure types listed in the checklist (overlap, clipped text, horizontal overflow, bottom-nav occlusion, chart blankness, long label overflow).
4. Update `docs/design/docs/visual-qa-checklist.md` with new pass/fail results.
5. If a new failure is introduced, fix it before merging.

### Automated Option

An optional Playwright helper script is documented in `docs/implementation/10-6-frontend-ux-visual-qa-baseline-and-responsive-regression-checklist.md`. It captures full-page screenshots for all routes and viewports at once. Run it after each significant redesign pass and diff the images visually.

### Regression Policy

Any of the following findings is a build-blocking regression, not a cosmetic follow-up:

- Overlap (elements covering each other)
- Clipped button text
- Page-level horizontal overflow (body scrollbar at mobile widths)
- Bottom-nav occlusion of interactive content
- Chart blankness (chart container with height 0)
- Long translated label overflow at any production breakpoint

### Known Exceptions

Known exceptions must be listed here and in the Exceptions table of `visual-qa-checklist.md` with owner-visible rationale and date. If no exceptions are accepted, write: `None accepted as of {date}`.

| Route | Viewport | Issue | Rationale | Accepted by | Date |
| ----- | -------- | ----- | --------- | ----------- | ---- |
| None accepted as of {date} | | | | | |
```

## Regression Fix Workflow

When a failure is found during QA:

1. **Create a fix:** Make the minimal change to the affected component to resolve the regression. Do not refactor adjacent code.

2. **Re-verify the fix:** Capture a new screenshot at the failing viewport/state and confirm the failure is gone.

3. **Document in checklist:** Update the row in `visual-qa-checklist.md` from ❌ FAIL to ✅ PASS and add the fix commit SHA in the Notes column.

4. **Confirm no new regressions:** After each fix, re-check adjacent rows in the matrix — layout fixes sometimes shift nearby elements.

**If a fix is not feasible before deadline**, document the failure as an exception:

- Record it in the Exceptions table with: route, viewport, failure description, rationale for accepting, your name, and today's date.
- The PR description must call out accepted exceptions explicitly.

## Definition of Done

- [ ] `npm run build` passes from `inex/ClientApp/` before starting QA (baseline clean build)
- [ ] All 10 routes covered by QA at applicable viewports and states (see QA matrix above)
- [ ] `docs/design/docs/visual-qa-checklist.md` exists, is fully filled in, and is committed to the repo
- [ ] Zero unresolved ❌ FAIL rows — all failures either fixed (with confirmation screenshot) or accepted as documented exceptions
- [ ] `docs/design/docs/design-implementation-guide.md` has a new **Section 18: Visual QA Workflow**
- [ ] `npm run build` passes from `inex/ClientApp/` with no new errors (regression fixes must not break the build)
- [ ] `npm run lint` passes from `inex/ClientApp/` with no new errors
- [ ] All user-visible strings added in any regression fixes are in `en/translation.json` and `ru/translation.json`
- [ ] No new `any` type usages introduced in regression fixes

## Notes and Guardrails

### This Story Has No Backend Changes

Do not touch any `.cs` files, migrations, services, or controllers. If a visual regression requires a data change (e.g., an API response shape needs updating), that is outside the scope of this story — log it as a finding and create a follow-up.

### Do Not Rebuild Pages as Part of This Story

If a page does not look right, make the minimal CSS/layout fix. Do not use this story as an opportunity to rebuild pages that were not built in earlier stories. Scope: layout fixes only.

### Locale Switching for RU QA

Switch to Russian locale via browser console to avoid changing the app settings and needing to reset:

```js
// Enable Russian locale (run in browser console while logged in):
localStorage.setItem("i18nextLng", "ru");
location.reload();

// Restore English after RU QA:
localStorage.setItem("i18nextLng", "en");
location.reload();
```

### Bottom-Nav Occlusion Check Method

At 390px and 360px, scroll each authenticated route to the bottom. Check that the last interactive element (last table row action, empty-state button, pagination control, drawer footer Save/Cancel) is fully visible above the bottom navigation bar. If the bottom nav covers any interactive element, it is a failure.

### Chart Blankness Check Method

For all chart-bearing routes (Dashboard month cards, Reports drill-down, net worth chart if applicable): wait for the page to fully load (network requests settle). Then inspect: right-click the chart → Inspect → check the chart container height in DevTools Elements panel. A height of 0 or a missing `height` style means the chart is blank — even if no error is shown.

### i18n Completeness Guard

If any regression fix adds new UI text, it must go through `useTranslation()` with keys added to both locale files. The `NFR-I18N-1` requirement is non-negotiable. Do not add hardcoded English strings to fix a layout regression.

### Security Note

The Playwright helper script (`qa-screenshots.mjs`) embeds test credentials. If you create this script, ensure:

- It is added to `.gitignore` before running
- It uses a dedicated test account, not your production account
- It is never committed with real credentials

If you want to commit the script for future use, replace credentials with environment variable reads:

```js
const EMAIL = process.env.QA_EMAIL;
const PASSWORD = process.env.QA_PASSWORD;
```
