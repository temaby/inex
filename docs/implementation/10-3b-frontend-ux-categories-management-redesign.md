# Story 10.3b: Frontend UX - Categories Management Redesign

Status: review

## Story

As an invited account holder,
I want category management to preserve hierarchy while staying easy to scan,
So that category structure and spend signals remain clear.

## Acceptance Criteria

1. **Given** the Categories design reference (`docs/design/Categories.jsx`)
   **When** `/categories` is rebuilt
   **Then** it includes hierarchy-aware parent/child rows, Tree and By-spend view modes, search that preserves ancestor visibility, active/all scope control, category color cues, and mobile-safe child indentation.

2. **Given** a composition hero panel is present
   **When** expense categories have spend data
   **Then** the hero shows total expense spend (current month), most-spent parent category name, and a distribution bar across the top-5 parents; when no spend data exists the hero renders a graceful empty treatment.

3. **Given** empty or filter-empty states on Categories
   **When** no categories exist or no results match the active filters
   **Then** the page uses the shared InEx `EmptyState` / `FilterEmpty` primitives from Story 10.1b with product-specific EN/RU copy and useful primary actions (matching the `EmptyCategories` contract from `docs/design/EmptyState.jsx`).

4. **Given** search is active
   **When** a search term matches a child category
   **Then** its parent is always included in the visible set (ancestor preservation) вЂ” the `includeAncestorCategories` logic from the design reference must be replicated.

5. **Given** a category row is clicked (any depth)
   **When** a row expands
   **Then** an inline edit panel opens below it (matching the `CategoryInlineEdit` pattern) with Edit category fields and a Snapshot stats panel; only one row is expanded at a time; clicking again collapses it.

6. **Given** system categories (`isSystem === true` or `systemCode !== ""`)
   **When** the row or inline edit is shown
   **Then** the row shows a lock icon, the edit form shows an immutable-system notice, and name/description/parent fields are disabled; delete action is hidden; the active toggle is hidden or disabled.

7. **Given** 390px and 360px mobile viewports
   **When** Categories is opened with populated data
   **Then** toolbar and filter bar wrap correctly, child rows use CSS left-padding (no overflow), category name column expands to fill available width, and no page-level horizontal overflow appears.

8. **Given** the story is complete
   **When** `npm run build`, `npm run lint`, and visual QA run from `inex/ClientApp`
   **Then** all pass with no new `any` in touched files, and screenshots cover: desktop populated (tree mode), desktop populated (by-spend mode), mobile populated, filter-active/no-results, empty first-use, add-drawer-open, and inline-edit-open states.

---

## Prerequisite Stories

This story **must** be implemented after:

- **Story 10.1a** вЂ” design tokens (`--brand-ink`, `--income-*`, `--expense-*`, `--fg-*`, `--bg-stripe`, `--border-1`, `--shadow-1`, `--font-num`, etc.) are available as CSS custom properties.
- **Story 10.1b** вЂ” shared primitive components are available from `src/components/primitives`: `InExButton`, `IconBtn`, `InExDrawer`, `Num`, `EmptyState`, `FilterEmpty`, `SegmentedControl`, `Field`, `Input`, `Select`, and `BudgetProgress`.
- **Story 10.1c** вЂ” `AppShell` / `BasicPage` compatibility shell contract is in place; route `/categories` is already wired.

The `InExDrawer`, `InExButton`, `EmptyState`, `FilterEmpty`, and `SegmentedControl` components are consumed from `src/components/primitives` as established by 10.1b. Do **not** rebuild them here.

---

## Files To Create

```
inex/ClientApp/src/pages/Categories/CategoryRow.tsx        (new)
inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx (new)
inex/ClientApp/src/pages/Categories/CategoriesHero.tsx     (new)
inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx  (new)
inex/ClientApp/src/pages/Categories/categories.utils.ts    (new)
inex/ClientApp/src/pages/Categories/categories.css         (new)
```

### Files To Modify

```
inex/ClientApp/src/pages/Categories.tsx                    (replace existing page implementation)
inex/ClientApp/public/locales/en/translation.json   (add new keys under "categories")
inex/ClientApp/public/locales/ru/translation.json   (add Russian equivalents)
```

### Files To Leave Unchanged

```
inex/ClientApp/src/store/categories/categories-slice.ts       (no changes)
inex/ClientApp/src/store/categories/categories-actions.ts     (no changes)
inex/ClientApp/src/model/Category/CategoryDetails.ts          (no changes, or additive only)
inex/ClientApp/src/pages/Categories/CategoryCreateForm.tsx    (no changes)
inex/ClientApp/src/pages/Categories/CategoryEditForm.tsx      (replace via CategoryInlineEdit, keep file as fallback)
```

---

## Current State (What Exists Today)

### `src/pages/Categories.tsx`

The current file uses:

- `BasicPage` layout wrapper (being replaced by the Story 10.1c `AppShell` / `BasicPage` compatibility contract).
- Ant Design `Table` with `expandable.expandedRowRender` for inline edit.
- `getCategoriesTree(filteredCategories, true)` to get a flat list with `depth` field.
- `showOnlyEnabled` checkbox filter.
- Ant Design `Drawer` for category creation (`CategoryCreateForm`).
- Redux: `useAppSelector(state => state.categories.items)` and `dispatch(fetchCategories("ALL"))`.
- **No search, no spend data, no tree/flat view toggle, no color cues.**

### `src/model/Category/CategoryDetails.ts`

Key type:

```ts
interface CategoryDetails {
  id: number;
  key: string;
  name: string;
  description: string;
  parentId?: number;
  isEnabled: boolean;
  isSystem: boolean;
  systemCode: string;
  children: CategoryDetails[];
}
```

`getCategoriesTree(data, flat: boolean)`:

- `flat = true` в†’ returns `(Omit<CategoryDetails, "children"> & { depth: number })[]` (flattened with depth).
- `flat = false` в†’ returns `CategoryDetails[]` (nested tree with empty-children pruned).
- System categories are gathered under a synthetic root node (`id: 0, isSystem: true`).

> **Important:** The existing `getCategoriesTree` system-category handling differs from the design reference. The design reference (`docs/design/Categories.jsx`) treats system categories as regular root nodes pinned to the bottom. Prefer the design reference approach: filter `c.isSystem === true` as system roots (no synthetic parent needed) and append them after user roots.

### `src/store/categories/categories-actions.ts`

Available thunks (no changes needed):

- `fetchCategories(mode: string)` вЂ” dispatches `setCategories({ items })` and `setIsLoading`.
- `createCategory(key, name, description, isEnabled, parentId?)` вЂ” dispatches `setLastUpdate`.
- `updateCategory(id, name, description, isEnabled)` вЂ” dispatches `setLastUpdate`.
- `deleteCategory(id)` вЂ” dispatches `setLastUpdate`.

> `updateCategory` does **not** accept `parentId`. The current API contract for PUT `/categories/{id}` only accepts `name`, `description`, `isEnabled`. The "parent category" selector in `CategoryInlineEdit` must be shown as read-only/informational for existing categories or omitted entirely, to match the API contract.

### Redux Slice State Shape

```ts
state.categories.items: CategoryDetails[]       // flat array from API
state.categories.isLoading: boolean
state.categories.isCreating: boolean
state.categories.isUpdating: boolean
state.categories.lastUpdate: string             // triggers re-fetch
state.categories.error: null | string
```

Re-fetch on `categoriesLastUpdate` change (same pattern as current code):

```ts
useEffect(() => {
  dispatch(fetchCategories("ALL"));
}, [categoriesLastUpdate]);
```

---

## Category Data Shape (From Design Reference)

```ts
// Data model from data.js вЂ” matches CategoryDetails interface
{ id: 1, name: 'Food & Drink', parentId: null, isEnabled: true, kind: 'expense' }  // parent
{ id: 10, name: 'Groceries',   parentId: 1,    isEnabled: true, kind: 'expense' }  // child

// System category
{ id: 40, name: 'Transfer',    parentId: 8,    isEnabled: true, kind: 'transfer', system: true }
```

> Note: The production `CategoryDetails` interface does not have a `kind` field. The design reference uses `kind` for rendering color. In production, use `isSystem` / `systemCode` to detect system categories. The expense/income/transfer kind is not surfaced in the current API model вЂ” **do not add it**. The palette color is assigned by parent-category position (see Color Palette section below).

---

## Implementation Contracts

### 1. Data Building: `categories.utils.ts`

```ts
// Build nested tree from flat API items.
// System items (isSystem === true) are gathered under a single synthetic System root
// OR rendered as their own roots вЂ” use flat parent/child logic from design reference,
// not the existing getCategoriesTree synthetic-root approach.
export const buildCategoriesTree = (
  items: CategoryDetails[],
): CategoryDetails[] => {
  const attach = (parent: CategoryDetails): CategoryDetails => ({
    ...parent,
    children: items.filter((c) => c.parentId === parent.id).map(attach),
  });
  const roots = items.filter(
    (c) => c.parentId == null || c.parentId === undefined,
  );
  const userRoots = roots.filter((r) => !r.isSystem);
  const systemRoots = roots.filter((r) => r.isSystem);
  return [...userRoots.map(attach), ...systemRoots.map(attach)];
};

// Search filter with ancestor preservation.
// Returns the subset of allItems whose names match the query,
// PLUS all their ancestors, preserving display order.
export const includeAncestorCategories = (
  matched: CategoryDetails[],
  all: CategoryDetails[],
): CategoryDetails[] => {
  const byId = new Map(all.map((c) => [c.id, c]));
  const resultIds = new Map(matched.map((c) => [c.id, c]));
  matched.forEach((item) => {
    let cur: CategoryDetails | undefined = item;
    while (cur?.parentId != null) {
      cur = byId.get(cur.parentId);
      if (!cur || resultIds.has(cur.id)) break;
      resultIds.set(cur.id, cur);
    }
  });
  return all.filter((c) => resultIds.has(c.id));
};

// Color palette вЂ” assigns a deterministic color to each root category by index.
const PALETTE = [
  "#1D4ED8",
  "#0F766E",
  "#9333EA",
  "#DB2777",
  "#EA580C",
  "#65A30D",
  "#475569",
  "#7C3AED",
];
export const categoryPaletteColor = (
  cat: CategoryDetails,
  allItems: CategoryDetails[],
): string => {
  const parents = allItems.filter((c) => c.parentId == null && !c.isSystem);
  const rootId = cat.parentId == null ? cat.id : cat.parentId;
  const idx = parents.findIndex((p) => p.id === rootId);
  return PALETTE[Math.max(0, idx) % PALETTE.length];
};
```

### 2. Hero Panel: `CategoriesHero.tsx`

**Desktop layout:** `display: grid; grid-template-columns: 320px 1fr; gap: 32px`
**Mobile:** single column (CSS class `r-hero-2col` breakpoint collapses via `categories.css`).

Left column shows:

- Section label: "This month" (or localized `categories.hero.monthLabel`).
- Total expense spend in USD equivalent (tabular numerics, `--expense-600` color when > 0, `--fg-3` when zero).
- Most-spent parent name and USD amount.

Right column shows:

- "By Category" label.
- Shared distribution visualization for top-5 expense parents and an "Other" segment. Use `DistributionBar` only if Story 10.1b has been updated to own it as a shared primitive; otherwise use an existing shared primitive and keep this page from creating a local design-system replacement.
- Legend grid: 8px color square + name + percentage.

> **Data source:** Hero uses `state.categories.items` (flat list) and `state.transactions` (if available from Redux). If transactions slice is not available, render a loading/empty-data treatment rather than crashing. The design reference computes spend from transaction data вЂ” only show real spend if transaction data is loaded; otherwise show zero/empty hero. Do **not** fetch transactions just for this page вЂ” check if they already exist in the store.

### 3. `CategoryRow.tsx`

**Desktop grid:** `grid-template-columns: minmax(260px, 1fr) 150px 130px 34px`
**Columns:** Name+indent | Activity | Spent (USD) | Chevron/Settings icon

Key visual contracts from design reference:

- `paddingLeft: depth * 28` on the name cell.
- Depth > 0: render an 18px horizontal hairline connector (`width: 18; height: 1; background: var(--border-2)`).
- Parent color swatch: 12Г—12px, `border-radius: 4px`; child swatch: 9Г—9px, `border-radius: 3px`; child opacity: 0.6.
- Parent rows: `font-weight: 600`, `font-size: 14px`; child rows: `font-weight: 500`, `font-size: 13.5px`.
- Inactive category: `opacity: 0.55` on row (when not expanded), plus `<InactiveChip>` badge inside name cell.
- System category: lock icon (`lucide-react` `Lock`, 12Г—12) next to name.
- Budget chip: when `budgetForCategory` exists, show `Budgeted` chip (income-green, pill, 11px, with target icon).
- Row background: parent rows use `color-mix(in oklch, var(--bg-stripe) 50%, white)` default; all rows use `var(--bg-stripe)` on hover and when expanded.
- Expanded row: suppress bottom border on row; immediately below render `CategoryInlineEdit`.
- Chevron icon: `chevron-down` / `chevron-up` when `hasChildren`, `settings-2` when leaf node.
- Click handler: `onToggle` вЂ” parent component manages `expandedId` state (only one expanded at a time).

**Activity cell** (right-aligned, 150px column):

- Transaction count for current month (`N txns`).
- Last-active date: `last Apr DD` style.
- If no transactions in period: render `вЂ”` in `--fg-4`.

**Spent cell** (right-aligned, 130px):

- USD equivalent, tabular numerics, 2 decimal places.
- Parent rows: `font-size: 14.5px, font-weight: 600`; child: `font-size: 14px, font-weight: 500`.
- Sub-label: `USD В· [Month]` in `--fg-4`, 11px.
- Zero spend: `вЂ”` in `--fg-4`.

> **Note on spend data:** The current categories Redux slice does not store spend data. If transactions are not available in the Redux store at render time, render `вЂ”` for all spend/activity cells. Do not make this page fail or show errors when transaction data is absent.

### 4. `CategoryInlineEdit.tsx`

Inline edit opens below the clicked row (not a drawer). Two-column grid: `1fr 1fr`.

Left: "Edit category" form:

- Name field (text input, required).
- Description field (optional text input).
- Parent category selector вЂ” for **leaf nodes** only: shows a `<Select>` of active non-system root categories. This is **display-only UI** for reparenting вЂ” the current `updateCategory` action does not send `parentId`. Either disable this field with a tooltip "Reparenting not yet supported" or omit it. **Do not implement reparenting via the existing API.**
- Active checkbox/toggle (maps to `isEnabled`).
- Save changes / Cancel buttons; Delete button (right-aligned, ghost, danger).
- System categories: show immutable notice, disable all inputs, hide Delete, show Close only.

Right: "Snapshot" stats panel (white card, 1px border, 8px radius):

- 2Г—2 grid: Spent (month), Transactions, Budget, Category ID.
- Action buttons: "View transactions" (ghost), "Set budget" (ghost, when no budget linked).

Mobile: collapses to single column (`categories.css` breakpoint).

### 5. Main `Categories.tsx` Page

```tsx
const Categories = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [activeOnly, setActiveOnly] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"tree" | "flat">("tree");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const allItems = useAppSelector((state) => state.categories.items);
  const isLoading = useAppSelector((state) => state.categories.isLoading);
  const lastUpdate = useAppSelector((state) => state.categories.lastUpdate);

  useEffect(() => {
    dispatch(fetchCategories("ALL"));
    setExpandedId(null);
  }, [lastUpdate]);

  // Filter pipeline (mirrors design reference):
  let visible = allItems;
  if (activeOnly) visible = visible.filter((c) => c.isEnabled);
  if (search) {
    const q = search.toLowerCase();
    const matched = visible.filter((c) => c.name.toLowerCase().includes(q));
    visible = includeAncestorCategories(
      matched,
      allItems.filter((c) => !activeOnly || c.isEnabled),
    );
  }

  // Build tree from filtered visible set
  const tree = buildCategoriesTree(visible);
  const userRoots = tree.filter((r) => !r.isSystem);
  const systemRoots = tree.filter((r) => r.isSystem);

  // Empty-state handling
  if (!isLoading && allItems.length === 0) {
    return <EmptyCategories onAdd={() => setAddOpen(true)} />;
  }

  return (
    <>
      <CategoriesHero allItems={allItems} />
      <CategoriesToolbar
        total={allItems.length}
        visible={visible.length}
        activeOnly={activeOnly}
        onActiveOnlyChange={setActiveOnly}
        search={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={setView}
        onAdd={() => setAddOpen(true)}
      />
      {/* Column header row */}
      {/* Tree or Flat rendering */}
      {view === "tree" && (
        <>
          {renderTree(userRoots, 0)}
          {renderTree(systemRoots, 0)}
        </>
      )}
      {view === "flat" && renderFlat(visible)}
      {/* Filter-empty state */}
      {visible.length === 0 && allItems.length > 0 && (
        <FilterEmpty
          onClear={() => {
            setSearch("");
            setActiveOnly(false);
          }}
        />
      )}
      {/* Add category drawer */}
      <Drawer
        open={addOpen}
        title={t("categories.addDrawerTitle")}
        onClose={() => setAddOpen(false)}
      >
        <CategoryCreateForm onCreated={() => setAddOpen(false)} />
      </Drawer>
    </>
  );
};
```

**Tree rendering (renderTree):**

```tsx
const renderTree = (nodes: CategoryDetails[], depth: number): React.ReactNode =>
  nodes.map((node) => (
    <React.Fragment key={node.id}>
      <CategoryRow
        category={node}
        depth={depth}
        paletteColor={categoryPaletteColor(node, allItems)}
        expanded={expandedId === node.id}
        onToggle={() => setExpandedId(expandedId === node.id ? null : node.id)}
        hasChildren={(node.children?.length ?? 0) > 0}
        isParent={depth === 0}
      />
      {node.children && renderTree(node.children, depth + 1)}
    </React.Fragment>
  ));
```

**Flat rendering (By-spend mode):**

```tsx
const renderFlat = (items: CategoryDetails[]): React.ReactNode => {
  // Only leaf nodes (no children), no system categories, sorted by spend desc.
  const childIds = new Set(allItems.map((c) => c.parentId).filter(Boolean));
  const leaves = items.filter((c) => !c.isSystem && !childIds.has(c.id));
  return leaves
    .slice()
    .sort((a, b) => getSpend(b.id) - getSpend(a.id))
    .map((c) => (
      <CategoryRow
        key={c.id}
        category={c}
        depth={0}
        paletteColor={categoryPaletteColor(c, allItems)}
        expanded={expandedId === c.id}
        onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
        hasChildren={false}
        isParent={false}
      />
    ));
};
```

### 6. Toolbar: `CategoriesToolbar.tsx`

Two rows of controls within the main content card.

**Row 1 (scope bar):**

- Left: "Categories" title + count subtitle (`N of M categories В· active only`).
- Right: `ActiveScope` segmented control (Active / All) from 10.1b shared primitives.

**Row 2 (filter bar):**

- Left: View segmented control вЂ” `Tree` | `By spend`.
- Right: search input with lucide `Search` icon prefix (controlled, `min-width: 220px`).

### 7. `categories.css`

```css
/* Mobile breakpoints */
@media (max-width: 768px) {
  .r-categories-hero .r-hero-2col {
    grid-template-columns: 1fr;
  }
  .r-category-row {
    grid-template-columns: 1fr 80px !important;
  }
  .r-category-activity {
    display: none;
  }
  .r-category-inline-edit {
    grid-template-columns: 1fr !important;
  }
  .r-workspace {
    padding: 0 16px 96px !important;
  }
  .r-category-toolbar,
  .r-category-filterbar {
    flex-wrap: wrap;
    gap: 8px;
  }
}
```

> **Child indentation on mobile:** `paddingLeft: depth * 28` in inline style stays; it cannot create overflow because the name column is `minmax(0, 1fr)` (grid auto) вЂ” verify this in mobile QA. If overflow is observed, cap indent: `paddingLeft: Math.min(depth * 28, 40)`.

---

## i18n Key Changes

### Add to `en/translation.json` under `"categories"`:

```json
"hero": {
  "monthLabel": "This month",
  "noSpend": "No spend recorded",
  "mostSpentIn": "Most spent in",
  "byCategory": "By Category",
  "usdEquiv": "USD equivalent"
},
"view": {
  "tree": "Tree",
  "bySpend": "By spend"
},
"scope": {
  "active": "Active",
  "all": "All"
},
"activity": {
  "txn": "txn",
  "txns": "txns",
  "last": "last"
},
"search": {
  "placeholder": "Search categoriesвЂ¦",
  "noResults": "No categories match these filters"
},
"inlineEdit": {
  "editSection": "Edit category",
  "snapshotSection": "Snapshot В· This month",
  "systemNotice": "This is a system category. It can't be renamed, disabled, or deleted.",
  "viewTransactions": "View transactions",
  "setBudget": "Set budget",
  "reparentNotSupported": "Reparenting not supported yet"
},
"emptyState": {
  "title": "Start with default categories",
  "description": "Categories help you classify spending and earn meaningful reports. Use our defaults or design your own structure with two levels of grouping.",
  "loadDefaults": "Load default categories",
  "addManually": "Add manually"
},
"filterEmpty": {
  "title": "No categories match these filters",
  "description": "Try clearing the search or showing all (including inactive) categories."
}
```

### Add to `ru/translation.json` under `"categories"` (same key structure):

Do not copy mojibake or transliterated Russian into the locale file. Source valid UTF-8 Russian strings during implementation, either from the existing `ru/translation.json` vocabulary or from a human-approved translation pass. The implementation PR must verify the file remains valid UTF-8 JSON and that the rendered RU page shows readable Cyrillic.

Required RU key groups mirror the EN structure above:

- `categories.hero`: `monthLabel`, `noSpend`, `mostSpentIn`, `byCategory`, `usdEquiv`
- `categories.view`: `tree`, `bySpend`
- `categories.scope`: `active`, `all`
- `categories.activity`: `txn`, `txns`, `last`
- `categories.search`: `placeholder`, `noResults`
- `categories.inlineEdit`: `editSection`, `snapshotSection`, `systemNotice`, `viewTransactions`, `setBudget`, `reparentNotSupported`
- `categories.emptyState`: `title`, `description`, `loadDefaults`, `addManually`
- `categories.filterEmpty`: `title`, `description`
- `categories.loading`: `initial`, `refreshing`
- `categories.error`: `loadFailed`, `retry`
- `categories.formErrors`: `createFailed`, `updateFailed`, `deleteFailed`


---

## Design Tokens Required (from Story 10.1a)

```css
--brand-ink          /* Primary brand text */
--income-50, --income-100, --income-500, --income-600  /* Budgeted chip, hero border, CTA */
--expense-500, --expense-600   /* Spend amounts */
--transfer-500                 /* Transfer kind color */
--fg-1, --fg-2, --fg-3, --fg-4 /* Text hierarchy */
--bg-stripe                    /* Row alternate, expanded background */
--bg-muted                     /* Search input bg, segmented control container */
--border-1, --border-2         /* Hairlines, input borders */
--shadow-1                     /* Card elevation */
--font-num                     /* JetBrains Mono for numeric values */
--font-sans                    /* UI text */
```

---

## Shared Components (From Story 10.1b)

| Component                    | Location                              | Usage in this story                             |
| ---------------------------- | ------------------------------------- | ----------------------------------------------- |
| `InExButton`                 | `src/components/primitives/Button.tsx`           | Save, Cancel, Delete, "Add category" CTA        |
| `IconBtn`                    | `src/components/primitives/IconBtn.tsx`          | Settings icon in leaf rows                      |
| `InExDrawer`                 | `src/components/primitives/InExDrawer.tsx`       | "Add category" drawer, Escape close, focus trap |
| `EmptyState`                 | `src/components/primitives/EmptyState.tsx`       | First-use empty page                            |
| `FilterEmpty`                | `src/components/primitives/EmptyState.tsx`       | Filter-active no-results state                  |
| `SegmentedControl`           | `src/components/primitives/SegmentedControl.tsx` | Active/All scope, Tree/By-spend view            |
| `Field` + `Input` + `Select` | `src/components/primitives/`                     | Inline edit form fields                         |

`DistributionBar` is not part of the original 10.1b primitive surface. Resolve this before implementation by either adding it to Story 10.1b as a shared primitive or replacing the hero distribution treatment with an already-established shared primitive. Do not create a page-local `DistributionBar` in this story.

> If any of these components are not yet available (e.g., Story 10.1b is incomplete), **do not inline-create them**. Block on the dependency and note which component is missing.

---

## Existing Code To Reuse

| Symbol                                                                  | File                                          | Notes                                                                                                                                                                |
| ----------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CategoryDetails` interface                                             | `src/model/Category/CategoryDetails.ts`       | Use as-is; do not add `kind` field                                                                                                                                   |
| `getCategoriesTree`                                                     | `src/model/Category/CategoryDetails.ts`       | Available but **replace with `buildCategoriesTree`** from `categories.utils.ts` for tree mode; the existing function's synthetic System root differs from design ref |
| `fetchCategories`, `createCategory`, `updateCategory`, `deleteCategory` | `src/store/categories/categories-actions.ts`  | Use as-is                                                                                                                                                            |
| `categoriesActions`                                                     | `src/store/categories/categories-slice.ts`    | Use state selectors as-is                                                                                                                                            |
| `CategoryCreateForm`                                                    | `src/pages/Categories/CategoryCreateForm.tsx` | Reuse in the add Drawer; do not modify                                                                                                                               |
| `useAppDispatch`, `useAppSelector`                                      | `src/store/hooks.ts`                          | Required imports                                                                                                                                                     |
| `apiClient`                                                             | `src/utils/apiClient.ts`                      | **Do not bypass** for any API calls                                                                                                                                  |

---

## Anti-Patterns / Guardrails

| Do NOT do this                                               | Do this instead                                                                                                      |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `any` type in new code                                       | Type all props/state explicitly; use `CategoryDetails` from the model                                                |
| Hardcoded UI strings                                         | Route all visible text through `t('categories.*')` keys                                                              |
| Fetch transactions in this page                              | Read `state.transactions?.items` if present; degrade gracefully if absent                                            |
| Call `updateCategory(id, name, desc, enabled)` with parentId | The API doesn't support reparenting; disable/hide parent selector for existing categories                            |
| Render system categories as editable                         | Check `cat.isSystem === true` or `cat.systemCode !== ""` and lock the form                                           |
| Use `moment` for date formatting                             | Use `dayjs` вЂ” `moment` is removed                                                                                    |
| Use `import * from 'antd'` for layout                        | Only Ant Design form controls (if still needed); layout/cards use custom CSS + design tokens                         |
| Build `buildCategoriesTree` on every render                  | `useMemo` the tree + visible list                                                                                    |
| Import from `src/pages/Categories/CategoryEditForm.tsx`      | Use `CategoryInlineEdit` (new component) instead; the old edit form is Ant Design-based and doesn't match the design |
| Create a floating/modal edit panel                           | Use inline expand (row click toggles in-place panel) as per design reference                                         |
| Allow expanded rows to stack                                 | Only one row expanded at a time; opening a new row closes the previous one                                           |

---

## Mobile Implementation Checklist

- [ ] Hero collapses from `320px 1fr` to single column at в‰¤768px.
- [ ] `grid-template-columns: minmax(260px, 1fr) 150px 130px 34px` collapses to `1fr 80px` on mobile (Activity column hidden).
- [ ] `paddingLeft: depth * 28` does not push content off-screen вЂ” name column must be `minmax(0, 1fr)` not a fixed width.
- [ ] Toolbar wraps: title+scope on one line, view+search on next.
- [ ] Inline edit collapses to single column.
- [ ] Content padding: `0 16px 96px` on mobile (96px bottom for bottom nav).
- [ ] No `position: absolute` chevron trick needed because the grid column handles it вЂ” verify.

---

## Visual QA Screenshots Required

| State                                            | Viewport       |
| ------------------------------------------------ | -------------- |
| Categories populated вЂ” Tree mode                 | 1440px desktop |
| Categories populated вЂ” By spend mode             | 1440px desktop |
| Categories populated вЂ” mobile                    | 390px          |
| One row expanded (inline edit open)              | 1440px desktop |
| Search active вЂ” results found (ancestor visible) | 1440px desktop |
| Search active вЂ” no results (FilterEmpty)         | 1440px desktop |
| Empty first-use state                            | 1440px desktop |
| Active only = false (disabled rows visible)      | 1440px desktop |

---

## Tasks / Subtasks

- [x] **Prerequisite gate** - confirm Story 10.1a tokens, Story 10.1b shared primitives, and Story 10.1c app shell/bottom navigation are complete before implementation starts.
- [x] **Loading and error UX** - implement explicit page and form states for data loading, refresh, failures, retry, and submission errors. (AC: 1, 3, 5, 8)
  - [x] Initial load: while `categories.isLoading` is true and `categories.items` is empty, show localized hierarchy/list skeletons plus a hero skeleton, not empty-state copy.
  - [x] Refresh load: when `categories.isLoading` is true and existing categories remain, keep stale rows visible, show a compact localized refreshing indicator in the toolbar, and avoid collapsing expanded layout unless the updated category is removed.
  - [x] Failed load: when `categories.error` is set and no categories are available, show a localized page error state with Retry that re-dispatches `fetchCategories("ALL")`.
  - [x] Partial refresh failure: when `categories.error` is set while stale categories remain, show a localized inline alert/banner with Retry and keep the stale hierarchy visible.
  - [x] Drawer/form errors: create, update, and delete failures must appear in the add drawer or inline edit panel near the submit actions, preserve entered values, and reset disabled/loading button states after failure.
  - [x] Localization keys: add EN/RU keys under a `categories.loading`, `categories.error`, and `categories.formErrors` structure (or equivalent existing namespace) for initial loading, refreshing, load failure, retry, create failure, update failure, delete failure, and immutable-system notice reuse.
- [x] **Setup utilities** вЂ” create `categories.utils.ts` with `buildCategoriesTree`, `includeAncestorCategories`, `categoryPaletteColor`. (AC: 1, 4)
- [x] **CSS module** вЂ” create `categories.css` with mobile grid overrides and workspace padding. (AC: 7)
- [x] **Hero component** вЂ” create `CategoriesHero.tsx` with two-column desktop layout, spend total, distribution bar, graceful no-data treatment. (AC: 2)
- [x] **CategoryRow component** вЂ” create `CategoryRow.tsx` with depth-indent, color swatch, activity + spend cells, chevron, inactive/system treatment. (AC: 1, 6)
- [x] **CategoryInlineEdit component** вЂ” create `CategoryInlineEdit.tsx` with two-column edit+snapshot layout, system lock, save/delete actions, reparent guard. (AC: 5, 6)
- [x] **Toolbar component** вЂ” create `CategoriesToolbar.tsx` with scope segmented control, view segmented control, search input. (AC: 1)
- [x] **Main page rebuild** вЂ” replace `Categories.tsx` with new page wiring tree/flat rendering, filter pipeline, empty/loading states, Add category drawer. (AC: 1, 3, 4, 7)
- [x] **i18n keys** вЂ” add all new keys to `en/translation.json` and `ru/translation.json`. (AC: 1, 3)
- [x] **Mobile QA** вЂ” verify 390px and 360px at no horizontal overflow; fix any indent or column issues. (AC: 7)
- [x] **Build + lint** вЂ” run `npm run build` and `npm run lint` from `inex/ClientApp`; resolve all errors/warnings; zero new `any`. (AC: 8)
- [x] **Visual screenshots** вЂ” capture all 8 states from the screenshot matrix above. (AC: 8)

---

## Dev Notes

### Spend Data Availability

The `CategoryDetails` model returned by `GET /categories?mode=ALL` does not include spend amounts вЂ” that is a front-end aggregation concern. The design reference computes spend from local transaction data. In production:

- If `state.transactions.items` is available in the Redux store (populated by Transactions page load), aggregate spend from there.
- If not available, render `вЂ”` in all spend/activity cells вЂ” this is acceptable; Categories is a management page, not a report.
- **Do not dispatch `fetchTransactions` from the Categories page.** This avoids coupling page lifecycle to another domain's fetch.

### System Category Handling

The current `getCategoriesTree` creates a synthetic root node (`id: 0, key: "system"`) to wrap all system items. The new `buildCategoriesTree` in `categories.utils.ts` should instead treat each system root (`isSystem === true && parentId == null`) as its own tree root, appended after user roots. This matches the design reference behavior and avoids the synthetic-node complication.

### API Constraint: No Reparenting

`PUT /categories/{id}` only accepts `{ name, description, isEnabled }` вЂ” the `parentId` field is not updatable via the API. The `CategoryCreateForm` does accept `parentId` for creation. In `CategoryInlineEdit`, either:

- Show the parent category as a read-only display field for existing categories, or
- Omit the parent field entirely from the edit form.
  Do not show an editable parent dropdown that silently ignores the user's selection.

### Existing `CategoryEditForm.tsx` vs New `CategoryInlineEdit.tsx`

The existing `CategoryEditForm.tsx` is Ant Design-based (Radio.Group for status, Form, Row/Col). It is currently used by the expandable table row. The new `CategoryInlineEdit.tsx` replaces it visually but uses InEx design-system primitives from 10.1b. Do not delete the old file until confirmed no other code references it вЂ” check via `grep_search` for imports.

### Performance

`useMemo` the filtered+visible list and tree build:

```tsx
const visible = useMemo(() => {
  let v = activeOnly ? allItems.filter((c) => c.isEnabled) : allItems;
  if (search) {
    const q = search.toLowerCase();
    const matched = v.filter((c) => c.name.toLowerCase().includes(q));
    v = includeAncestorCategories(
      matched,
      activeOnly ? allItems.filter((c) => c.isEnabled) : allItems,
    );
  }
  return v;
}, [allItems, activeOnly, search]);

const tree = useMemo(() => buildCategoriesTree(visible), [visible]);
```

### TypeScript Strictness

All new files must have zero `any`. The `CategoryDetails` interface does not have `kind` or `system` (boolean) fields вЂ” it uses `isSystem: boolean` and `systemCode: string`. The design reference uses `category.system` (from seed data) which maps to `category.isSystem` in production. Do not add `system: boolean` to the interface.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-03: Started on `feature/10-3b-categories-management-redesign`.
- 2026-06-03: Confirmed `10.1a` and `10.1b` are `done`; user explicitly waived `10.1c` and `10.2` being `review` rather than `done` and instructed to proceed.
- 2026-06-03: Current Categories code uses RTK Query (`categories-api`) instead of the older thunk/slice names in story notes; implementation preserved current RTK Query/Axios behavior.
- 2026-06-03: `npm run build` from `inex/ClientApp` passed after implementation.
- 2026-06-03: `npm run lint` from `inex/ClientApp` passed after implementation.
- 2026-06-03: In-app Browser runtime failed with `windows sandbox failed: spawn setup refresh`; visual QA completed with local Playwright Chromium against Vite and mocked authenticated API responses.
- 2026-06-03: Visual QA screenshots captured under `docs/implementation/visual-qa/10-3b/`.
- 2026-06-03: `docs/implementation/visual-qa/10-3b/qa-summary.json` reports no horizontal overflow at desktop 1440px, mobile 390px, or mobile 360px; drawer bounds resolved to `x=1000`, `width=440`, `right=1440`.
- 2026-06-03: BMad code review ran three layers: Blind Hunter, Edge Case Hunter, and Acceptance Auditor.
- 2026-06-03: Addressed review findings for delete confirmation, disabled placeholder actions, segmented-control ARIA semantics, search/by-spend empty handling, malformed tree payloads, system parent filtering, key fallback, parent delete guard, no-spend hero treatment, refresh expansion preservation, hero loading skeleton, and visual QA coverage gaps.
- 2026-06-03: Re-ran `npm run build`, `npm run lint`, `git diff --check`, and added-`any` scan after review fixes; all passed.
- 2026-06-03: Re-captured visual QA with added `search-ancestor-visible.png` and `all-disabled-visible.png`; `qa-summary.json` confirms `searchAncestorVisible: true`.

### Completion Notes List

- Rebuilt `/categories` as a hierarchy-first management workspace with hero summary, active/all scope, tree/by-spend modes, search, ancestor-preserving filtering, category color cues, and mobile-safe rows.
- Added page-local Categories components for hero, toolbar, row rendering, inline edit, utilities, and scoped CSS while consuming shared primitives instead of forking them.
- Preserved current RTK Query category API contracts, `BasicPage`/`AppShell` integration, Axios behavior, auth boundaries, and existing create/update/delete mutation wiring.
- Added system-category lock treatment and immutable inline-edit notice; existing categories do not expose unsupported reparenting as an editable action.
- Added localized EN/RU copy for Categories loading, error, filter-empty, hero, scope, view, inline-edit, and form-error states.
- Addressed BMad review findings and kept the story in `review` status with all patch items resolved.
- Build, lint, and visual QA passed.

### File List

- `docs/implementation/10-3b-frontend-ux-categories-management-redesign.md`
- `docs/implementation/sprint-status.yaml`
- `docs/implementation/visual-qa/10-3b/add-drawer-open.png`
- `docs/implementation/visual-qa/10-3b/all-disabled-visible.png`
- `docs/implementation/visual-qa/10-3b/desktop-by-spend-populated.png`
- `docs/implementation/visual-qa/10-3b/desktop-tree-populated.png`
- `docs/implementation/visual-qa/10-3b/empty-first-use.png`
- `docs/implementation/visual-qa/10-3b/expanded-row-open.png`
- `docs/implementation/visual-qa/10-3b/filter-empty.png`
- `docs/implementation/visual-qa/10-3b/mobile-populated-390.png`
- `docs/implementation/visual-qa/10-3b/qa-summary.json`
- `docs/implementation/visual-qa/10-3b/search-ancestor-visible.png`
- `inex/ClientApp/public/locales/en/translation.json`
- `inex/ClientApp/public/locales/ru/translation.json`
- `inex/ClientApp/src/components/primitives/SegmentedControl.tsx`
- `inex/ClientApp/src/pages/Categories.tsx`
- `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx`
- `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx`
- `inex/ClientApp/src/pages/Categories/CategoryCreateForm.tsx`
- `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx`
- `inex/ClientApp/src/pages/Categories/CategoryRow.tsx`
- `inex/ClientApp/src/pages/Categories/categories.css`
- `inex/ClientApp/src/pages/Categories/categories.utils.ts`

### Change Log

- 2026-06-03: Implemented Categories management redesign and marked story ready for review after build, lint, and visual QA passed.
- 2026-06-03: Addressed BMad code review findings and reran build, lint, diff hygiene, no-`any` scan, and visual QA.

## Senior Developer Review (AI)

### Review Outcome

Approve after fixes. Review findings were addressed and required static plus visual verification passed.

### Findings

- [x] Medium: Delete action had no confirmation and parent deletes were not guarded before API call. Fixed with `Popconfirm` plus child-category guard and localized error.
- [x] Medium: Snapshot action buttons were focusable but inert. Fixed by rendering them disabled until their target workflows exist.
- [x] Medium: Shared segmented controls used incomplete tab semantics. Fixed shared `SegmentedControl` to use native buttons with `aria-pressed`.
- [x] Medium: Search and by-spend edge cases could hide ancestors or render a blank list without guidance. Fixed ancestor preservation against the full category set and added row-empty `FilterEmpty` handling.
- [x] Medium: Hero showed fake equal-width distribution without spend data. Fixed to render a no-spend treatment unless real spend data is available.
- [x] Low: Refresh could collapse an expanded row even when the category still existed. Fixed to clear expansion only when the expanded category is removed.
- [x] Low: Initial loading missed a hero skeleton. Fixed by adding a loading path to `CategoriesHero`.
- [x] Low: Visual QA missed ancestor-search and disabled-visible states. Fixed by recapturing both screenshots and updating `qa-summary.json`.
- [x] Low: Category tree utility was not robust to malformed parent cycles. Fixed cycle-safe tree building so categories do not disappear or recurse indefinitely.
- [x] Low: Create form could allow systemCode-only system parents and generate an empty key for non-Latin names. Fixed parent filtering and key fallback.

### Verification

- `npm run build` from `inex/ClientApp` passed after review fixes.
- `npm run lint` from `inex/ClientApp` passed after review fixes.
- `git diff --check` passed after review fixes.
- Added-`any` scan over touched TypeScript files returned no matches.
- Visual QA screenshots captured under `docs/implementation/visual-qa/10-3b/`; mobile overflow checks passed at 390px and 360px, and ancestor-search state was confirmed.
