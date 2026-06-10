# Accounts Visual QA Fixture Baseline

Status: active for Accounts mockup-alignment PRs.
Source issue: #199.

## Policy

- Fixture mode is the source of truth for Accounts mockup parity.
- Live account data is smoke/regression coverage only. Live values, account names, currencies, and user profile labels must not be used to accept or reject mockup value parity.
- Fixture data must stay outside production Accounts data flow. Production continues to read `/accounts?mode=ALL`, `/accounts/details?...`, `/currencies`, profile currency, and exchange-rate state.
- English is the parity locale. RU remains a responsive long-label stress pass.
- Dashboard navigation, sign-out, protected routes, API contracts, and accessible row expansion remain accepted production behavior unless a shared shell story changes them.

## Fixture Contract

The executable fixture lives in `inex/ClientApp/src/test/fixtures/accountsVisualFixture.ts`.

| Field | Value |
| --- | --- |
| `dataMode` | `fixture` |
| Base currency | `USD` |
| Net worth | `33,968.12 USD` |
| Currencies | `UZS`, `USD`, `PLN`, `RUB`, `BYN`, `GEL` |
| Comparison period label | `Mar 2026` |
| Default collapsed currencies | none |
| Collapsed-state coverage currency | `UZS` |

Concrete period labels may be rendered only when sourced from fixture metadata or reliable app data. Live mode must not invent `Mar 2026` or any other period label.

## Group Expansion Rule

Production Accounts groups default expanded. The component initializes collapsed groups as an empty set and preserves the existing accessible expand/collapse button behavior.

Visual QA must include both:

- `expanded-groups`: initial fixture render, all currency groups expanded.
- `collapsed-group`: fixture render after collapsing the `UZS` group; the group button must expose `aria-expanded="false"` and the group rows must be hidden.

## Required Accounts State Matrix

Every Accounts mockup-alignment PR must update or cite this matrix.

| State | Viewports | Data mode | Notes |
| --- | --- | --- | --- |
| populated grouped | 1440, 390, 360 | fixture | Default groups expanded. |
| populated flat | 1024 | fixture | Uses the same fixture, switched to flat view. |
| filter-empty | 390 | fixture | Hero/distribution context remains visible. |
| first-use empty | 390 | fixture | Empty account response; no unavailable hero chrome. |
| drawer-open | 390, 360 | fixture | Drawer stays inside viewport and actions remain visible. |
| expanded-row | 1440, 390 | fixture | Row expansion remains keyboard/screen-reader accessible. |
| collapsed-group | 1440, 390 | fixture | Collapse one currency group; rows hide without changing distribution. |
| live smoke | 1440, 390 | live-seed | Regression only; value parity is not asserted. |

## Verification

- `npm run test -- Accounts.empty-focus.test.tsx accounts-utils.test.ts` covers fixture value/order stability, default expanded groups, collapsed-state interaction, duplicate-description suppression, toolbar labels, headers, and active-scope count semantics.
- `npm run build`, `npm run lint`, and the Accounts-focused tests remain required from `inex/ClientApp`.
- Search touched TypeScript diffs for added `any`; none are allowed.
