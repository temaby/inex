# Story 10.3b Categories Design vs Implementation Gap Review

Date: 2026-06-05
Method: BMad checkpoint-style UI review using the rendered Categories design in the controlled browser, Story 10.3b, implementation source, and existing visual QA screenshots.

## Scope And Evidence

- Story context: `docs/implementation/10-3b-frontend-ux-categories-management-redesign.md`.
- Design baseline: controlled browser at `http://localhost:5173/`, opened from root and navigated through the visible design navigation to Categories.
- Design source: `docs/design/Categories.jsx`, `docs/design/EmptyState.jsx`, `docs/design/responsive.css`, and `docs/design/docs/design-implementation-guide.md`.
- Design states inspected in the controlled browser: tree mode, By-spend mode, child-search ancestor preservation, expanded regular row, expanded system row, add drawer, empty first-use route, filter-empty search state, 390px mobile, and 360px mobile.
- Implementation source: `inex/ClientApp/src/pages/Categories.tsx`, `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx`, `CategoriesToolbar.tsx`, `CategoryRow.tsx`, `CategoryInlineEdit.tsx`, `categories.utils.ts`, and `categories.css`.
- Implementation visual evidence: `docs/implementation/visual-qa/10-3b/desktop-tree-populated.png`, `desktop-by-spend-populated.png`, `expanded-row-open.png`, `add-drawer-open.png`, `filter-empty.png`, `empty-first-use.png`, `search-ancestor-visible.png`, `all-disabled-visible.png`, `mobile-populated-390.png`, and `qa-summary.json`.
- Live implementation inspection note: a sandboxed Vite start from `inex/ClientApp` failed with `spawn EPERM`. An escalated hidden start on `127.0.0.1:5174` reached Vite startup but Windows returned `listen UNKNOWN: unknown error 127.0.0.1:5174`. The comparison therefore uses implementation source plus the existing visual QA screenshots for actual UI evidence.

## Summary

The Categories implementation has the main Story 10.3b structure in place: hierarchy-first rows, Tree and By-spend controls, search with ancestor preservation, Active/All scope, inactive and system-category row treatment, inline edit, add drawer, localized copy, shared empty/filter-empty primitives, and mobile overflow verification.

The remaining gaps are concentrated around data-bearing spend signals. The design preview shows transaction-derived April spend in the hero, category rows, By-spend ordering, and inline snapshot panels. Production currently renders the no-spend treatment and dash placeholders regardless of whether transaction or budget data is available. A second cluster is first-use empty-state fidelity: the implementation keeps the hero and toolbar above the empty state and does not expose the design's load-default-categories action.

## Differences To Implement

### 1. Composition Hero Does Not Render Populated Spend Or Distribution

Priority: P1

Design target evidence:
- `docs/design/Categories.jsx:47` through `docs/design/Categories.jsx:68` compute April category stats from transactions and roll child spend up to parents.
- `docs/design/Categories.jsx:80` through `docs/design/Categories.jsx:101` compute total expense spend, the top parent, top-5 parent distribution, and "Other".
- The controlled browser design rendered `April spend`, `360.60 USD`, `Most spent in Food & Drink`, and a distribution legend.
- Story 10.3b says the hero should read `state.transactions` if already available and otherwise degrade gracefully: `docs/implementation/10-3b-frontend-ux-categories-management-redesign.md:260`.

Current implementation evidence:
- `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx:15` through `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx:21` only derive active, parent, and child category counts.
- `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx:44` through `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx:49` hardcode a zero USD amount and no-spend note.
- `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx:67` through `inex/ClientApp/src/pages/Categories/CategoriesHero.tsx:69` always render the empty distribution treatment.
- `docs/implementation/visual-qa/10-3b/desktop-tree-populated.png` shows `0.00 USD` and `No spend recorded` with populated categories.

Required change:
- Add a read-only aggregation path that consumes available transaction cache/state without dispatching a Categories-page transaction fetch.
- Compute current-month expense spend by parent, most-spent parent, top-5 distribution, and "Other".
- Keep the current no-spend treatment only when transaction data is absent or the current month has no spend.

### 2. Category Row Activity And Spend Cells Are Static Placeholders

Priority: P1

Design target evidence:
- `docs/design/Categories.jsx:300` through `docs/design/Categories.jsx:325` render transaction count and last-active date from stats.
- `docs/design/Categories.jsx:407` through `docs/design/Categories.jsx:424` render activity and USD spend per row.
- Story 10.3b requires transaction count, last-active date, USD equivalent, month sublabel, and dash fallback only when transactions are unavailable: `docs/implementation/10-3b-frontend-ux-categories-management-redesign.md:281` through `docs/implementation/10-3b-frontend-ux-categories-management-redesign.md:294`.

Current implementation evidence:
- `inex/ClientApp/src/pages/Categories/CategoryRow.tsx:83` through `inex/ClientApp/src/pages/Categories/CategoryRow.tsx:89` always render dash placeholders and `categories.activity.noTransactions` / `categories.hero.usdEquiv`.
- The production screenshots show `No activity` and dash spend on every populated row, including `docs/implementation/visual-qa/10-3b/desktop-tree-populated.png`.

Required change:
- Pass computed per-category stats into `CategoryRow`.
- Render `N txn(s)`, `last Mon DD`, row spend, and `USD - [Month]` where stats exist.
- Preserve dash placeholders only for rows with no current-month activity or when transaction data is not available.

### 3. By-spend Mode Is Leaf-only But Not Actually Spend-sorted

Priority: P1

Design target evidence:
- `docs/design/Categories.jsx:768` through `docs/design/Categories.jsx:776` define By-spend as leaf categories only, excluding system categories, sorted by `stats[category.id].totalUsd`.
- The controlled browser design rendered By-spend order starting with active spend rows such as `Other income`, `Groceries`, and `Going out`, with zero-spend leaves trailing.

Current implementation evidence:
- `inex/ClientApp/src/pages/Categories.tsx:78` through `inex/ClientApp/src/pages/Categories.tsx:91` correctly filters to non-system leaves, but maps every row to `spend: 0`.
- `docs/implementation/visual-qa/10-3b/desktop-by-spend-populated.png` shows By-spend order matching fixture order rather than spend order, with every row showing placeholder spend.

Required change:
- Reuse the same computed per-category spend stats used by the hero and row cells.
- Sort non-system leaf rows by spend descending, then apply a stable secondary sort.
- Keep no-spend leaves visible at the bottom unless product decides By-spend should hide zero-spend leaves.

### 4. Inline Snapshot Panel Has No Real Metrics

Priority: P1

Design target evidence:
- `docs/design/Categories.jsx:515` through `docs/design/Categories.jsx:518` render Spent, Transactions, Budget, and Category ID from category stats and budget data.
- The controlled browser expanded `Gifts` row rendered `27.28 USD`, `1`, `Not set`, and `#20`.

Current implementation evidence:
- `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:165` through `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:180` render static dash values for spend, transactions, and budget while only Category ID is real.
- `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:183` through `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:188` render `View transactions` and `Set budget` as disabled placeholder actions.
- `docs/implementation/visual-qa/10-3b/expanded-row-open.png` confirms the snapshot panel is present but all business metrics are placeholders.

Required change:
- Pass category stats and budget linkage into `CategoryInlineEdit`.
- Render real month spend, transaction count, and budget status where available.
- Keep unsupported action buttons disabled only until their target workflows are intentionally wired, or remove them if the product does not want inert controls.

### 5. Budget Cue Is Replaced By A Parent Chip

Priority: P2

Design target evidence:
- `docs/design/Categories.jsx:393` through `docs/design/Categories.jsx:402` render a `Budgeted` chip only when a category has a linked budget.
- Story 10.3b lists the budget chip as part of the row contract: `docs/implementation/10-3b-frontend-ux-categories-management-redesign.md:273` through `docs/implementation/10-3b-frontend-ux-categories-management-redesign.md:275`.

Current implementation evidence:
- `inex/ClientApp/src/pages/Categories/CategoryRow.tsx:76` through `inex/ClientApp/src/pages/Categories/CategoryRow.tsx:79` render a target-icon chip labeled `categories.parent` for every depth-0 category with children.
- No budget data is passed into `CategoryRow`; row budget state cannot be represented.
- `docs/implementation/visual-qa/10-3b/desktop-tree-populated.png` shows `Parent` chips, not `Budgeted` chips.

Required change:
- Replace the parent chip with the design's `Budgeted` chip when a category is linked to a budget.
- If parent labeling is still useful, use a separate visual treatment that does not reuse the budget cue position or icon.
- Source budget linkage from available budget state/cache without adding an unrelated fetch.

### 6. First-use Empty State Does Not Match The EmptyCategories Contract

Priority: P2

Design target evidence:
- `docs/design/EmptyState.jsx:164` through `docs/design/EmptyState.jsx:172` define `EmptyCategories` with `Load default categories` and `Add manually`.
- The controlled browser empty route rendered only the page header and the `Start with default categories` empty state.
- Story 10.3b explicitly says empty and filter-empty states should match the `EmptyCategories` contract: `docs/implementation/10-3b-frontend-ux-categories-management-redesign.md:23`.

Current implementation evidence:
- `inex/ClientApp/src/pages/Categories.tsx:173` renders `CategoriesHero` before empty-state branching.
- `inex/ClientApp/src/pages/Categories.tsx:211` through `inex/ClientApp/src/pages/Categories.tsx:224` render an empty state with only an add-manually action.
- `docs/implementation/visual-qa/10-3b/empty-first-use.png` shows the hero and toolbar above the empty state, and no `Load default categories` action.

Required change:
- Short-circuit first-use empty before rendering the hero, toolbar, and list chrome, matching the design page composition.
- Add the default-categories action if a backend/default seeding path exists.
- If no load-defaults path exists, capture that product/API constraint and update the design/story contract rather than silently omitting the primary action.

## Differences To Clarify Before Implementing

### A. Reparenting Is Editable In The Mockup But Blocked By The Story/API

Design source renders an editable parent selector for non-parent, non-system categories at `docs/design/Categories.jsx:479` through `docs/design/Categories.jsx:485`.

Story 10.3b says the existing update API does not accept `parentId` and the field must be disabled or omitted: `docs/implementation/10-3b-frontend-ux-categories-management-redesign.md:621` through `docs/implementation/10-3b-frontend-ux-categories-management-redesign.md:622`.

Current implementation follows the story by rendering a disabled selector with a reparenting hint at `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:106` through `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:110`. Clarify whether reparenting should become a future API/UI story or remain intentionally unavailable.

### B. Header Primary Action Placement Differs From The Design Preview

The design guide route map lists `/categories` with primary action `Add category` at `docs/design/docs/design-implementation-guide.md:54`, and the rendered design preview shows `Add category` in the page header.

Current implementation opens the drawer from the toolbar action labeled from `common.add` at `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:61` through `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:66`, while `Categories.tsx` passes no `BasicPage` header action at `inex/ClientApp/src/pages/Categories.tsx:168` through `inex/ClientApp/src/pages/Categories.tsx:170`.

Clarify whether Categories should match the design header action exactly or whether the toolbar action is the accepted production placement.

## Already Aligned

- Story status and acceptance criteria are documented under `docs/implementation/10-3b-frontend-ux-categories-management-redesign.md:3` and `docs/implementation/10-3b-frontend-ux-categories-management-redesign.md:11`.
- Tree hierarchy, flattened rendering, and system-root bottom placement are implemented via `buildCategoriesTree` / `flattenCategoryTree` at `inex/ClientApp/src/pages/Categories/categories.utils.ts:27` through `inex/ClientApp/src/pages/Categories/categories.utils.ts:75`.
- Search preserves ancestors: implementation uses `includeAncestorCategories` at `inex/ClientApp/src/pages/Categories.tsx:56` through `inex/ClientApp/src/pages/Categories.tsx:70`, and QA confirms `searchAncestorVisible: true` at `docs/implementation/visual-qa/10-3b/qa-summary.json:43`.
- Active/All scope is implemented in `CategoriesToolbar` at `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:53` through `inex/ClientApp/src/pages/Categories/CategoriesToolbar.tsx:59`; `all-disabled-visible.png` shows disabled categories visible in All scope.
- Row hierarchy cues are present: indentation, connectors, color swatches, inactive chip, system lock, and chevron/settings affordances are implemented in `inex/ClientApp/src/pages/Categories/CategoryRow.tsx:42` through `inex/ClientApp/src/pages/Categories/CategoryRow.tsx:98`.
- Inline edit opens under one row at a time: `expandedId` is single-valued in `inex/ClientApp/src/pages/Categories.tsx:39`, toggled at `inex/ClientApp/src/pages/Categories.tsx:126` through `inex/ClientApp/src/pages/Categories.tsx:131`, and rendered in `expanded-row-open.png`.
- System edit protection is implemented: system detection uses `isSystemCategory` at `inex/ClientApp/src/pages/Categories/categories.utils.ts:24` through `inex/ClientApp/src/pages/Categories/categories.utils.ts:25`, and system inline edit disables fields / hides delete through `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:84` through `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:160`.
- Delete guard is stronger than the mockup: parent delete is blocked at `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:65` through `inex/ClientApp/src/pages/Categories/CategoryInlineEdit.tsx:76`.
- Add drawer exists and uses the shared drawer wrapper at `inex/ClientApp/src/pages/Categories.tsx:143` through `inex/ClientApp/src/pages/Categories.tsx:167`; `add-drawer-open.png` verifies the rendered drawer.
- Filter-empty uses the shared `FilterEmpty` primitive with a clear action at `inex/ClientApp/src/pages/Categories.tsx:246` through `inex/ClientApp/src/pages/Categories.tsx:251`; `filter-empty.png` verifies the rendered state.
- Mobile overflow passed in QA: `docs/implementation/visual-qa/10-3b/qa-summary.json:20` through `docs/implementation/visual-qa/10-3b/qa-summary.json:30` report no horizontal overflow at 390px and 360px.
- App shell bottom-nav safe area is handled by `inex/ClientApp/src/layouts/AppShell.css:344` through `inex/ClientApp/src/layouts/AppShell.css:349` and `inex/ClientApp/src/layouts/AppShell.css:226` through `inex/ClientApp/src/layouts/AppShell.css:235`.
- EN/RU localization is present for Categories under `inex/ClientApp/public/locales/en/translation.json:271` and `inex/ClientApp/public/locales/ru/translation.json:273`, and the scoped components route visible copy through `t(...)`.

## Recommended Implementation Order

1. Build the shared current-month category stats selector/helper from available transaction cache/state, with no Categories-page transaction fetch.
2. Wire stats into `CategoriesHero`, `CategoryRow`, By-spend sorting, and `CategoryInlineEdit`.
3. Add budget linkage for row `Budgeted` chips and snapshot budget values from available budget state/cache.
4. Correct first-use empty composition and decide or implement the `Load default categories` action.
5. Resolve the header-vs-toolbar Add placement decision.
6. Re-run `npm run build`, `npm run lint`, and the visual QA matrix, including populated spend, By-spend sorted order, expanded snapshot metrics, empty first-use, filter-empty, 390px, and 360px.
