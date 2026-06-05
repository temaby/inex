# Story 10.3a Accounts Design vs Implementation Gap Review

Date: 2026-06-05
Method: BMad checkpoint-style UI review using the rendered Accounts design in the controlled browser, Story 10.3a context, implementation source, and existing visual QA screenshots.

## Scope And Evidence

- Story intent: rebuild `/accounts` around balance scanning and currency groups so account balances are easy to compare on desktop and mobile (`docs/implementation/10-3a-frontend-ux-accounts-management-redesign.md:7` through `docs/implementation/10-3a-frontend-ux-accounts-management-redesign.md:16`).
- Design baseline: controlled browser at `http://localhost:5173/`, navigated through the visible design navigation to `#/accounts`.
- Design source: `docs/design/Accounts.jsx`.
- Design guide: `docs/design/docs/design-implementation-guide.md`, especially the Accounts layout and mobile contract.
- Story context: `docs/implementation/10-3a-frontend-ux-accounts-management-redesign.md`.
- Implementation source: `inex/ClientApp/src/pages/Accounts.tsx`, `inex/ClientApp/src/pages/Accounts/AccountCreateForm.tsx`, `inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx`, `inex/ClientApp/src/pages/Accounts/accounts.css`, shared primitives, and account API model source where needed.
- Implementation visual evidence: `docs/implementation/visual-qa/10-3a/desktop-populated.png`, `mobile-390-populated.png`, `mobile-360-populated.png`, `empty.png`, `filter-empty.png`, `drawer-open.png`, and `qa-summary-mobile-states.json`.
- Live implementation inspection note: `http://localhost:3000` did not respond, and starting the production Vite app was blocked by the local PowerShell environment before Vite stayed running. The comparison therefore uses implementation source plus existing visual QA captures for the actual UI.
- Controlled-browser design observations:
  - Desktop design renders net worth, USD-equivalent currency distribution, active/all scope, by-currency and flat-list modes, searchable rows, grouped currency headers, compact account rows, expandable inline edit, and add-account drawer.
  - Design filter-empty keeps the hero currency distribution visible while the account list reports no matches.
  - Design 390px and 360px viewports reported no page-level horizontal overflow in the controlled browser, with bottom navigation visible.

## Summary

The production Accounts implementation is structurally close to Story 10.3a: it uses the redesigned shell, hero, currency distribution, active/all scope, grouped and flat views, search, localized empty/filter-empty states, add drawer, inline edit panel, tabular money primitive, and mobile overflow QA.

The remaining gaps are mostly scan-fidelity and design-contract details: missing USD-equivalent amounts in distribution/group/row surfaces, balance-based ordering, inventory count context, first-use empty-state focus, row status treatment, and edit/create form parity. One important evidence conflict remains: current source appears to fix filter-empty hero distribution, while the existing filter-empty screenshot still shows the old broken state.

## Differences To Implement

### 1. Currency Distribution Omits USD-Equivalent Amounts

Priority: P1

Design target:
- `docs/design/Accounts.jsx:82` through `docs/design/Accounts.jsx:124` render a `By Currency` section with an `USD equivalent` label, percentage, and USD amount for each currency.
- The controlled browser desktop and mobile design show each currency legend entry with both percent and USD-equivalent value, for example `UZS 46.3% 15,730 USD`.

Current implementation:
- `inex/ClientApp/src/pages/Accounts.tsx:391` through `inex/ClientApp/src/pages/Accounts.tsx:399` render only dot, currency, percent, and bar.
- `docs/implementation/visual-qa/10-3a/desktop-populated.png` shows `EUR 29%` and `USD 68%` bars, but no equivalent amount beside the legend items.

Required change:
- Render the base-currency equivalent amount for each distribution group, matching the design's currency, percentage, amount, and bar structure.
- Keep the label localized, but preserve the design meaning of "USD equivalent" when the base currency is USD.

### 2. Group And Flat Ordering Do Not Prioritize Balance Scanning

Priority: P1

Design target:
- `docs/design/Accounts.jsx:411` through `docs/design/Accounts.jsx:418` order currency groups by USD total descending and sort accounts within each group by USD-equivalent balance descending.
- In controlled-browser flat mode, group headers disappear and rows are still ordered by balance value.

Current implementation:
- `inex/ClientApp/src/pages/Accounts.tsx:140` through `inex/ClientApp/src/pages/Accounts.tsx:153` sorts groups alphabetically by currency.
- `inex/ClientApp/src/pages/Accounts.tsx:307` through `inex/ClientApp/src/pages/Accounts.tsx:308` renders flat rows in `searchedAccounts` order, with no balance sort.
- `docs/implementation/visual-qa/10-3a/desktop-populated.png` shows the smaller EUR group before the larger USD group.

Required change:
- Sort currency groups by absolute base-currency subtotal descending.
- Sort rows inside both grouped and flat modes by absolute base-currency value descending, while keeping deterministic tie-breakers such as account name.

### 3. Currency Group Headers Miss Share, Base Equivalent, And Collapse Affordance

Priority: P1

Design target:
- `docs/design/Accounts.jsx:311` through `docs/design/Accounts.jsx:350` render group headers with chevron affordance, account count, share of net worth, native subtotal, and USD-equivalent subtotal.
- `docs/design/Accounts.jsx:536` through `docs/design/Accounts.jsx:541` wires group headers to collapsed/expanded state.

Current implementation:
- `inex/ClientApp/src/pages/Accounts.tsx:315` through `inex/ClientApp/src/pages/Accounts.tsx:331` render badge, count, native subtotal, and a bar only.
- There is no collapsed group state in `inex/ClientApp/src/pages/Accounts.tsx`; only row expansion state exists at `inex/ClientApp/src/pages/Accounts.tsx:87`.

Required change:
- Add group-header share text and base-currency subtotal.
- Add a chevron affordance and collapse/expand state for currency groups, or explicitly remove that interaction from the design contract.
- Keep the header compact on mobile without creating page-level overflow.

### 4. Account Rows Miss USD-Equivalent Sublines In Share And Balance Areas

Priority: P1

Design target:
- `docs/design/Accounts.jsx:187` through `docs/design/Accounts.jsx:199` render share percentage plus USD-equivalent value.
- `docs/design/Accounts.jsx:213` through `docs/design/Accounts.jsx:221` render native balance plus an approximate USD-equivalent subline.
- The controlled browser shows row values such as `46.3%`, `15,723 USD`, native balance, and `approx 15,723 USD`.

Current implementation:
- `inex/ClientApp/src/pages/Accounts.tsx:218` through `inex/ClientApp/src/pages/Accounts.tsx:225` render a share bar and localized percentage text only.
- `inex/ClientApp/src/pages/Accounts.tsx:226` through `inex/ClientApp/src/pages/Accounts.tsx:229` render the native balance only.
- `docs/implementation/visual-qa/10-3a/desktop-populated.png` shows share text and native balances, but no base-currency sublines in the row.

Required change:
- Add base-currency equivalent text under the share signal and under the native balance, using localized "approx" or equivalent copy.
- Continue using `Num` for tabular formatting and semantic color.

### 5. Row Grid And Status Treatment Diverge From The Compact Design

Priority: P2

Design target:
- `docs/design/docs/design-implementation-guide.md:323` specifies the account row grid as `1.8fr 100px 130px 130px 28px`.
- `docs/design/Accounts.jsx:144` uses that five-column grid.
- `docs/design/Accounts.jsx:168` through `docs/design/Accounts.jsx:172` show disabled state inline in account metadata only when the account is disabled.

Current implementation:
- `inex/ClientApp/src/pages/Accounts/accounts.css:325` through `inex/ClientApp/src/pages/Accounts/accounts.css:337` define a six-column grid including a separate status column.
- `inex/ClientApp/src/pages/Accounts.tsx:231` through `inex/ClientApp/src/pages/Accounts.tsx:234` render an `Active` or `Disabled` tag on every row.
- `docs/implementation/visual-qa/10-3a/desktop-populated.png` shows an `ACTIVE` tag for each visible row.

Required change:
- Return desktop rows to the design's five scan columns unless the extra status column is intentionally accepted as a product divergence.
- Show disabled state prominently for disabled accounts, but avoid repeating an active badge on every normal row.

### 6. Account Inventory Toolbar Lacks Visible Count And Scope Summary

Priority: P2

Design target:
- `docs/design/Accounts.jsx:441` through `docs/design/Accounts.jsx:445` render `visible of total accounts` plus the `active only` scope note under the card title.
- The controlled browser design shows `17 of 17 accounts - active only`.

Current implementation:
- `inex/ClientApp/src/pages/Accounts.tsx:408` through `inex/ClientApp/src/pages/Accounts.tsx:418` render the `Account inventory` title and partial-error retry only.
- `docs/implementation/visual-qa/10-3a/desktop-populated.png` shows `Account inventory` without the count/scope line.

Required change:
- Add localized toolbar summary text showing visible count, total count, and active-only scope where relevant.
- Keep the summary responsive and non-wrapping where possible; allow clean wrapping on 390px/360px.

### 7. Net-Worth Hero MoM Detail Is Less Specific Than The Design

Priority: P2

Design target:
- `docs/design/Accounts.jsx:59` through `docs/design/Accounts.jsx:71` render a signed absolute USD delta, percent delta, and reference text `Change from Mar 2026`.
- Controlled-browser design shows both `-218 USD (-0.6%)` and the comparison-period label.

Current implementation:
- `inex/ClientApp/src/pages/Accounts.tsx:129` through `inex/ClientApp/src/pages/Accounts.tsx:131` compute this-month net.
- `inex/ClientApp/src/pages/Accounts.tsx:366` through `inex/ClientApp/src/pages/Accounts.tsx:371` render only localized percent MoM text.
- `inex/ClientApp/public/locales/en/translation.json:215` through `inex/ClientApp/public/locales/en/translation.json:216` provide unavailable and percent-only MoM strings.
- `docs/implementation/visual-qa/10-3a/desktop-populated.png` shows `-0.2% MoM` without absolute amount or comparison-period context.

Required change:
- Render the signed base-currency delta and percent together, plus localized comparison-period context.
- If the product does not trust `thisMonthNet` as a real prior-period comparison, render the unavailable state from the story notes instead of a partial MoM signal.

### 8. First-Use Empty State Keeps Too Much Inventory Chrome

Priority: P2

Design target:
- `docs/design/Accounts.jsx:364` through `docs/design/Accounts.jsx:370` return the Accounts empty-state preview directly instead of rendering hero metrics and an empty inventory shell.
- `docs/design/docs/design-implementation-guide.md:479` through `docs/design/docs/design-implementation-guide.md:501` describe first-use empty states as product-specific surfaces with useful actions.

Current implementation:
- `inex/ClientApp/src/pages/Accounts.tsx:357` through `inex/ClientApp/src/pages/Accounts.tsx:406` always render the hero.
- `inex/ClientApp/src/pages/Accounts.tsx:278` through `inex/ClientApp/src/pages/Accounts.tsx:290` render the empty state inside the inventory card after the toolbar.
- `docs/implementation/visual-qa/10-3a/empty.png` and `docs/implementation/visual-qa/10-3a/qa-summary-mobile-states.json:39` through `docs/implementation/visual-qa/10-3a/qa-summary-mobile-states.json:53` show `Balance unavailable`, `0 active`, `0 currencies`, toolbar controls, and then the empty state.

Required change:
- For true first-use empty data, render a focused shared empty state with the add-account primary action and avoid showing unavailable hero metrics and inactive filter controls.
- Keep filter-empty distinct: filter-empty should preserve page context.

### 9. Inline Edit Panel Misses The Design Snapshot Area

Priority: P2

Design target:
- `docs/design/Accounts.jsx:237` through `docs/design/Accounts.jsx:296` render an attached two-column inline edit panel with editable fields on the left and snapshot metrics on the right.
- Snapshot metrics include current balance, USD equivalent, rate to USD, and account ID.

Current implementation:
- `inex/ClientApp/src/pages/Accounts.tsx:240` through `inex/ClientApp/src/pages/Accounts.tsx:243` render only `AccountEditForm` in the expanded panel.
- `inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx:110` through `inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx:175` contain the edit form fields and actions but no balance/rate/account snapshot.

Required change:
- Add the snapshot area to the expanded edit panel using available `AccountSummary`, exchange-rate, and account-id data.
- Keep the snapshot attached to the row and collapse it to one column on mobile.

### 10. Create Drawer Is Missing Secondary Close Action And Design Footer Parity

Priority: P2

Design target:
- `docs/design/Accounts.jsx:594` through `docs/design/Accounts.jsx:596` render both `Cancel` and `Create account` actions in the drawer footer.

Current implementation:
- `inex/ClientApp/src/pages/Accounts/AccountCreateForm.tsx:99` through `inex/ClientApp/src/pages/Accounts/AccountCreateForm.tsx:107` render only a block primary submit button.
- `inex/ClientApp/src/pages/Accounts.tsx:340` through `inex/ClientApp/src/pages/Accounts.tsx:346` pass only `onCreated`, so the form cannot close the drawer without submitting.
- `docs/implementation/visual-qa/10-3a/drawer-open.png` shows only `Create Account`.

Required change:
- Add a localized secondary cancel action that closes the drawer without submitting.
- Align action casing with the page copy, for example `Create account`, unless the product intentionally uses title case for form submit buttons.

## Differences To Clarify Before Implementing

### A. Filter-Empty Hero Distribution Evidence Conflicts

Design target:
- Controlled-browser design filter-empty keeps the hero currency distribution visible and only empties the list area.

Current implementation evidence:
- Current source derives `distributionGroups` from `scopedAccounts`, not `searchedAccounts`, at `inex/ClientApp/src/pages/Accounts.tsx:161` through `inex/ClientApp/src/pages/Accounts.tsx:163`, which should preserve the hero distribution during search-empty states.
- Existing visual QA says otherwise: `docs/implementation/visual-qa/10-3a/qa-summary-mobile-states.json:56` through `docs/implementation/visual-qa/10-3a/qa-summary-mobile-states.json:70` records `filter-empty` text with `No currencies to display`.
- The Story 10.3a dev record says this exact issue was fixed after review at `docs/implementation/10-3a-frontend-ux-accounts-management-redesign.md:257` through `docs/implementation/10-3a-frontend-ux-accounts-management-redesign.md:260`.

Clarification needed:
- Recapture filter-empty visual QA from the current source. If the runtime still matches the screenshot, fix the hero distribution. If the source behavior is correct, replace the stale screenshot.

### B. Starting Balance, Update Balance, And View Transactions May Be Out Of Scope

Design target:
- `docs/design/Accounts.jsx:582` through `docs/design/Accounts.jsx:584` include a `Starting balance` field in the add drawer.
- `docs/design/Accounts.jsx:290` through `docs/design/Accounts.jsx:292` include `View transactions` and `Update balance` actions in the edit snapshot.

Current implementation evidence:
- `inex/ClientApp/src/store/accounts/accounts-api.ts:24` through `inex/ClientApp/src/store/accounts/accounts-api.ts:30` define create-account fields without starting balance.
- Story notes caution against backend/API changes for this story at `docs/implementation/10-3a-frontend-ux-accounts-management-redesign.md:102` through `docs/implementation/10-3a-frontend-ux-accounts-management-redesign.md:107`.

Clarification needed:
- Decide whether these design affordances are deferred to a balance-management or transaction-opening story. Do not add fake fields that cannot be persisted.

### C. Empty-State Secondary Content Conflicts With The No-Dead-Link Requirement

Design target:
- `docs/design/EmptyState.jsx:143` through `docs/design/EmptyState.jsx:161` include a secondary `Connect bank (soon)` action and account-type suggestions.

Current implementation evidence:
- Story implementation guidance says empty-state actions should map to real workflows and not expose dead links at `docs/implementation/10-3a-frontend-ux-accounts-management-redesign.md:42` through `docs/implementation/10-3a-frontend-ux-accounts-management-redesign.md:45`.
- Current implementation includes only the real add-account action at `inex/ClientApp/src/pages/Accounts.tsx:281` through `inex/ClientApp/src/pages/Accounts.tsx:290`.

Clarification needed:
- Keep the dead `Connect bank` action out unless a real flow exists. Decide separately whether to add non-clickable account-type suggestions to match the design's educational content.

## Already Aligned

- Page route and header action match the design route map: `inex/ClientApp/src/pages/Accounts.tsx:348` through `inex/ClientApp/src/pages/Accounts.tsx:355` render localized title, subtitle, and add-account action.
- Net-worth hero exists and uses the two-column desktop layout from the guide: `inex/ClientApp/src/pages/Accounts/accounts.css:17` through `inex/ClientApp/src/pages/Accounts/accounts.css:21`.
- Hero stacks at mobile: `inex/ClientApp/src/pages/Accounts/accounts.css:471` through `inex/ClientApp/src/pages/Accounts/accounts.css:483`.
- Active/all scope, by-currency/flat view mode, and search exist: `inex/ClientApp/src/pages/Accounts.tsx:420` through `inex/ClientApp/src/pages/Accounts.tsx:443`.
- Search covers account name, description, and currency: `inex/ClientApp/src/pages/Accounts.tsx:116` through `inex/ClientApp/src/pages/Accounts.tsx:122`.
- Empty and filter-empty states use shared primitives: `inex/ClientApp/src/pages/Accounts.tsx:281` through `inex/ClientApp/src/pages/Accounts.tsx:302`.
- Add drawer and inline row edit are present: `inex/ClientApp/src/pages/Accounts.tsx:340` through `inex/ClientApp/src/pages/Accounts.tsx:347`, and `inex/ClientApp/src/pages/Accounts.tsx:240` through `inex/ClientApp/src/pages/Accounts.tsx:243`.
- Money rendering uses the shared `Num` primitive with tabular numerics and semantic labels: `inex/ClientApp/src/components/primitives/Num.tsx:81` through `inex/ClientApp/src/components/primitives/Num.tsx:91`.
- EN/RU Accounts copy exists in locale files: `inex/ClientApp/public/locales/en/translation.json:187` through `inex/ClientApp/public/locales/en/translation.json:270`, and `inex/ClientApp/public/locales/ru/translation.json:189` through `inex/ClientApp/public/locales/ru/translation.json:272`.
- Existing mobile QA reports no page-level overflow at 390px and 360px populated states: `docs/implementation/visual-qa/10-3a/qa-summary-mobile-states.json:5` through `docs/implementation/visual-qa/10-3a/qa-summary-mobile-states.json:37`.
- Existing mobile QA also covers empty, filter-empty, and drawer-open states: `docs/implementation/visual-qa/10-3a/qa-summary-mobile-states.json:39` through `docs/implementation/visual-qa/10-3a/qa-summary-mobile-states.json:88`.

## Recommended Implementation Order

1. Row and group scan fidelity: add base-equivalent sublines, group-header share/equivalent values, and balance-based ordering.
2. Toolbar context: add inventory count and active-scope summary.
3. Hero fidelity: add distribution amounts and more specific MoM delta/period copy.
4. First-use empty state: suppress unavailable hero/filter chrome for true empty data.
5. Row status treatment: remove always-on active tags or document the deliberate divergence.
6. Inline edit parity: add the snapshot panel and responsive layout.
7. Drawer footer parity: add cancel action and align submit casing.
8. Recapture filter-empty visual QA from current source before accepting that state.
9. Product-clarify starting balance, update balance, view transactions, and empty-state secondary content before building those affordances.
