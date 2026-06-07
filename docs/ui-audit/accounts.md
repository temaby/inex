# Accounts UI Mockup Audit

Investigation slug: `mockup-audit-accounts`

## Summary

The Accounts mockup at `http://127.0.0.1:5173/#/accounts` is a dense English management screen with a five-item app nav, `MANAGE` page eyebrow, net-worth hero, currency distribution, toolbar labels (`STATUS`, `VIEW`), column headers (`ACCOUNT`, `CURRENCY`, `SHARE`, `BALANCE`), grouped currency sections, compact large balances, and bottom nav without Dashboard.

The actual implementation inspected at `http://localhost:5000/accounts` is recognizably the same feature family, but it diverges in shared navigation, route model, locale/copy, live data, hero delta content, toolbar labeling, table header treatment, row density, compact number formatting, and mobile bottom navigation. The actual app was already authenticated in the browser session; credentials were not written to this file.

## Confirmed mismatches

### 1. Actual navigation includes Dashboard; mockup navigation does not

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: mockup top and bottom nav show Transactions, Accounts, Categories, Budgets, Reports. Actual top and bottom nav show Dashboard before Transactions.
- Implementation refs: `inex/ClientApp/src/layouts/AppShell.tsx:34`, `inex/ClientApp/src/layouts/AppShell.tsx:84`, `inex/ClientApp/src/layouts/AppShell.tsx:137`
- Classification: shared component/design-system change; routing/navigation change
- Implementation note: Decide whether the management-page nav should match the mockup's five-item IA or keep Dashboard as a post-mockup product change. If mockup is authoritative, remove Dashboard from `NAV_ITEMS` or gate it for pages covered by this audit.

### 2. Actual route model uses React routes; mockup uses hash prototype screens

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: mockup Accounts is addressed as a hash-state prototype screen. Actual Accounts is a protected React route at `/accounts`; `/` redirects to `/dashboard`.
- Implementation refs: `inex/ClientApp/src/App.tsx:85`, `inex/ClientApp/src/App.tsx:86`, `inex/ClientApp/src/App.tsx:89`
- Classification: routing/navigation change
- Implementation note: Keep actual production routes, but visual verification should cite mockup hash screens and app routes separately.

### 3. Actual shell exposes profile and sign-out controls not present in mockup

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: mockup header shows the `TE temaby` user pill only. Actual header includes the user pill and an additional sign-out icon button.
- Implementation refs: `inex/ClientApp/src/layouts/AppShell.tsx:104`, `inex/ClientApp/src/layouts/AppShell.tsx:115`
- Classification: shared component/design-system change; unclear/requires decision
- Implementation note: Decide whether sign-out remains a product requirement in the shell. If yes, document it as an intentional mockup deviation; if no, align the shell to the mockup.

### 4. Actual visible copy is Russian while the mockup is English

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: mockup visible copy includes `MANAGE`, `Accounts`, `Add account`, `NET WORTH`, `BY CURRENCY`, `Active`, `All`, `By currency`, `Flat list`. Actual browser state showed the Russian locale for the same surfaces.
- Implementation refs: `inex/ClientApp/src/i18n.ts:16`, `inex/ClientApp/public/locales/en/translation.json:203`, `inex/ClientApp/public/locales/ru/translation.json:205`
- Classification: unclear/requires decision; documentation update needed
- Implementation note: If the mockups are language-authoritative, force visual QA to English or reset `i18n_lang` before comparisons. If locale can vary by user, future implementation stories should specify which locale is the acceptance baseline.

### 5. Page title/workspace title copy differs from the mockup

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: mockup workspace section title is `Accounts`; English implementation resource uses `Account inventory`, and actual Russian locale renders the localized inventory label.
- Implementation refs: `inex/ClientApp/src/pages/Accounts.tsx:659`, `inex/ClientApp/src/pages/Accounts.tsx:662`, `inex/ClientApp/public/locales/en/translation.json:208`
- Classification: page-local UI change; documentation update needed
- Implementation note: Change `accounts.workspaceTitle` to match the mockup if the section title is intended to be `Accounts`.

### 6. Search placeholder differs

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: mockup placeholder is `Search accounts...`; English implementation resource is `Search name or currency`, and the actual Russian locale renders the localized variant.
- Implementation refs: `inex/ClientApp/src/pages/Accounts.tsx:700`, `inex/ClientApp/src/pages/Accounts.tsx:706`, `inex/ClientApp/public/locales/en/translation.json:210`
- Classification: page-local UI change; documentation update needed
- Implementation note: Align placeholder copy and ellipsis style with the mockup.

### 7. Toolbar group labels are missing in actual UI

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: mockup labels the segmented controls with `STATUS` and `VIEW`. Actual toolbar shows the segmented buttons but no visible labels above or beside them.
- Implementation refs: `inex/ClientApp/src/pages/Accounts.tsx:683`, `inex/ClientApp/src/pages/Accounts.tsx:692`
- Classification: page-local UI change; shared component/design-system change
- Implementation note: Add toolbar label affordances locally or extend `SegmentedControl` to accept a visible label when used in management toolbars.

### 8. Account table/list column headers are missing in actual UI

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: mockup includes `ACCOUNT`, `CURRENCY`, `SHARE`, `BALANCE` before rows. Actual grouped list begins directly with the first currency group.
- Implementation refs: `inex/ClientApp/src/pages/Accounts.tsx:479`, `inex/ClientApp/src/pages/Accounts.tsx:483`, `inex/ClientApp/src/pages/Accounts.tsx:535`
- Classification: page-local UI change
- Implementation note: Introduce a desktop-only header row for both grouped and flat list modes, while preserving mobile stacked rows.

### 9. Mockup inventory count is scoped to visible active accounts; actual exposes all-account total

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: mockup summary is `17 of 17 accounts - active only`. Actual summary showed `17 / 37` with an active-only note.
- Implementation refs: `inex/ClientApp/src/pages/Accounts.tsx:663`, `inex/ClientApp/src/pages/Accounts.tsx:665`, `inex/ClientApp/src/pages/Accounts.tsx:672`, `inex/ClientApp/public/locales/en/translation.json:230`
- Classification: page-local UI change; data/API/state dependency
- Implementation note: Decide whether the denominator should be scoped to the selected status or always total accounts. Mockup implies selected-scope denominator.

### 10. Net-worth hero delta content does not match

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: mockup shows absolute delta, percent delta, and supporting copy (`Change from Mar 2026`). Actual shows only the month-over-month percent string and the active/currency chips.
- Implementation refs: `inex/ClientApp/src/pages/Accounts.tsx:603`, `inex/ClientApp/src/pages/Accounts.tsx:610`, `inex/ClientApp/public/locales/en/translation.json:247`
- Classification: page-local UI change; data/API/state dependency
- Implementation note: Extend hero delta rendering to include absolute base-currency movement and the comparison month label, or document that the simplified MoM string is intentional.

### 11. Actual hero/distribution data differs from the mockup fixture

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: mockup net worth is `33,968.12 USD` and distribution has UZS, USD, PLN, BYN, RUB, GEL. Actual showed `34,072.20 USD`, different percentages, and an additional EUR group.
- Implementation refs: `inex/ClientApp/src/pages/Accounts.tsx:114`, `inex/ClientApp/src/pages/Accounts.tsx:117`, `inex/ClientApp/src/pages/Accounts.tsx:177`
- Classification: data/API/state dependency; unclear/requires decision
- Implementation note: If visual QA is expected to match the mockup exactly, seed the app with the same fixture data or provide a mock API mode for design comparison.

### 12. Row balances are not compacted like the mockup

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: mockup row balances compact very large UZS values, for example `199.03M`. Actual row rendering showed full formatted values such as `199,093,385.76 UZS`.
- Implementation refs: `inex/ClientApp/src/pages/Accounts.tsx:405`, `inex/ClientApp/src/pages/Accounts.tsx:410`, `inex/ClientApp/src/components/primitives/Num.tsx:14`, `inex/ClientApp/src/components/primitives/Num.tsx:33`
- Classification: page-local UI change; shared component/design-system change
- Implementation note: Pass `compact` for row primary balances where the mockup uses abbreviated large numbers, or add a row-specific money display helper.

### 13. Actual rows can duplicate the account name as description

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: actual visible row text repeated account names in the name and description positions for several accounts. Mockup rows show one account name plus distinct supporting metadata.
- Implementation refs: `inex/ClientApp/src/pages/Accounts.tsx:380`, `inex/ClientApp/src/pages/Accounts.tsx:383`
- Classification: data/API/state dependency; page-local UI change
- Implementation note: Suppress duplicated descriptions when `description` equals `name`, or normalize the API data used for the Accounts list.

### 14. Group header punctuation and density differ

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: mockup group header uses compact text like `UZS - 3 accounts` with subtotal and equivalent on one dense band. Actual group header is a button with separate identity and metrics regions, larger padding, and collapsible chevron behavior.
- Implementation refs: `inex/ClientApp/src/pages/Accounts.tsx:492`, `inex/ClientApp/src/pages/Accounts.tsx:502`, `inex/ClientApp/src/pages/Accounts.tsx:511`, `inex/ClientApp/src/pages/Accounts/Accounts.css:337`
- Classification: page-local UI change
- Implementation note: Tighten group header layout and punctuation to match the mockup, while retaining accessibility for collapse/expand if that behavior remains.

### 15. Actual mobile Accounts rows are much taller than the mockup target

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts` at 390px viewport
- Actual app route or screen inspected: `http://localhost:5000/accounts` at 390px viewport
- Evidence: browser metrics at 390px showed an actual `.accounts-row` around 214px tall with balance, name, currency badge, share, and chevron stacked. The mockup mobile page uses a more compact row treatment and keeps more content visible above the bottom nav.
- Implementation refs: `inex/ClientApp/src/pages/Accounts/Accounts.css:714`, `inex/ClientApp/src/pages/Accounts/Accounts.css:720`, `inex/ClientApp/src/pages/Accounts/Accounts.css:738`
- Classification: page-local UI change; responsive behavior
- Implementation note: Rework mobile row grid order and vertical spacing so a row does not become a tall detail card unless expanded.

### 16. Actual mobile bottom nav has six items and narrower labels

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts` at 390px viewport
- Actual app route or screen inspected: `http://localhost:5000/accounts` at 390px viewport
- Evidence: mockup bottom nav has five items. Actual bottom nav at 390px has six equal columns because Dashboard is included.
- Implementation refs: `inex/ClientApp/src/layouts/AppShell.tsx:137`, `inex/ClientApp/src/layouts/AppShell.tsx:143`, `inex/ClientApp/src/layouts/AppShell.css:226`, `inex/ClientApp/src/layouts/AppShell.css:242`
- Classification: shared component/design-system change; routing/navigation change; responsive behavior
- Implementation note: Resolve together with the shared navigation decision in finding 1.

### 17. Actual account actions are hidden behind row expansion; mockup does not expose that interaction in the inspected state

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: actual `Accounts.tsx` expands a row to reveal `AccountEditForm` and an account snapshot. The mockup inspected state presents a dense inventory list without visible edit panel affordance beyond the list row itself.
- Implementation refs: `inex/ClientApp/src/pages/Accounts.tsx:426`, `inex/ClientApp/src/pages/Accounts.tsx:429`, `inex/ClientApp/src/pages/Accounts.tsx:336`
- Classification: page-local UI change; unclear/requires decision
- Implementation note: Verify whether row expansion is an intended implementation-only enhancement or whether the mockup expects inline row actions/drawer behavior.

### 18. Empty, loading, and error states are implemented but were not visible in the live browser state

- Page: Accounts
- Mockup route or screen inspected: `http://127.0.0.1:5173/#/accounts`
- Actual app route or screen inspected: `http://localhost:5000/accounts`
- Evidence: actual source implements loading skeletons, load failure, partial failure, initial empty state, and filter-empty state. Browser inspection did not trigger these states.
- Implementation refs: `inex/ClientApp/src/pages/Accounts.tsx:438`, `inex/ClientApp/src/pages/Accounts.tsx:449`, `inex/ClientApp/src/pages/Accounts.tsx:467`, `inex/ClientApp/src/pages/Accounts.tsx:560`, `inex/ClientApp/src/pages/Accounts/Accounts.css:292`
- Classification: unclear/requires decision; documentation update needed
- Implementation note: Later implementation verification needs controlled fixtures or network interception to compare Accounts empty/loading/error states against the mockup.

## Implementation flow

1. Resolve shared navigation first. Decide whether Dashboard and sign-out belong in the audited management-page shell. This affects Accounts, Categories, Budgets, Transactions, and mobile bottom nav.
2. Lock the visual QA locale. Use English for audit parity unless product explicitly requires locale-specific visual acceptance.
3. Normalize design-comparison data. Either seed Accounts with the mockup fixture or document that live data values are allowed to differ while layout/copy must match.
4. Align Accounts page copy and toolbar structure: title, search placeholder, `STATUS`/`VIEW` labels, inventory count denominator, and table/list column headers.
5. Align hero content: absolute/percent delta, comparison month helper text, and distribution rows.
6. Align list density and number display: compact large balances, reduce mobile row height, and suppress duplicated account descriptions.
7. Verify desktop `/accounts` and mobile 390px after shared shell changes.
8. Add fixture-driven checks for empty, loading, error, filter-empty, and expanded-row states.

## File/component impact map

- `inex/ClientApp/src/layouts/AppShell.tsx`: shared nav items, profile/sign-out controls, top/bottom nav rendering.
- `inex/ClientApp/src/layouts/AppShell.css`: shared top nav and bottom nav responsive density.
- `inex/ClientApp/src/App.tsx`: production route mapping and `/` redirect behavior.
- `inex/ClientApp/src/pages/Accounts.tsx`: Accounts hero, toolbar, segmented controls, search, grouped list, row rendering, empty/loading/error branches, drawer wiring.
- `inex/ClientApp/src/pages/Accounts/Accounts.css`: Accounts hero/card/group/row/mobile layout and spacing.
- `inex/ClientApp/src/components/primitives/SegmentedControl.tsx`: shared segmented control label support may be needed.
- `inex/ClientApp/src/components/primitives/Num.tsx`: compact amount support exists, but Accounts does not use it for large row balances.
- `inex/ClientApp/public/locales/en/translation.json`: English copy alignment for Accounts and nav.
- `inex/ClientApp/public/locales/ru/translation.json`: locale-specific acceptance needs clarification if Russian remains user-selected during QA.
- `inex/ClientApp/src/store/accounts/accounts-api.ts`: data source for account list and summaries; fixture parity may require API seed/mocking rather than UI code changes.

## Documentation updates needed later

- Record the approved nav IA decision: five-item mockup nav or six-item production nav with Dashboard.
- Record the visual QA locale baseline and how to reset `i18n_lang`.
- Add Accounts visual QA fixture notes if mockup parity requires fixed account data.
- Add responsive acceptance notes for Accounts mobile rows and bottom nav.
- Document whether row expansion/edit panels are intentional deviations from the mockup.

## Open questions

- Should Dashboard remain in top and bottom navigation for audited management pages?
- Should sign-out be visible in the app shell, or moved behind the profile user pill to match the mockup?
- Is English the authoritative visual QA locale for this mockup audit?
- Should Accounts denominator be selected-scope total (`17 of 17`) or all-account total (`17 / 37`)?
- Should live data be allowed to differ from mockup fixture values during visual acceptance?
- Should Accounts rows compact large currency values everywhere the mockup does?
- Is row expansion the intended edit pattern, or should Accounts use a drawer/inline action model closer to the mockup?

## Verification checklist

- Desktop Accounts route: `http://localhost:5000/accounts`
- Mockup Accounts screen: `http://127.0.0.1:5173/#/accounts`
- Confirm nav item count and active Accounts state on desktop.
- Confirm mobile bottom nav item count and label fit at 390px.
- Confirm page copy in the chosen QA locale.
- Confirm hero delta includes the mockup-required absolute, percent, and comparison-month text.
- Confirm toolbar renders `STATUS` and `VIEW` labels.
- Confirm list renders `ACCOUNT`, `CURRENCY`, `SHARE`, `BALANCE` headers on desktop.
- Confirm grouped and flat list modes preserve density and compact large balances.
- Confirm duplicate account descriptions are suppressed or fixture data is normalized.
- Confirm empty, loading, error, filter-empty, drawer, and expanded-row states against controlled fixtures.
