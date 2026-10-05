---
title: 'Dashboard Compact Top Cards'
type: 'feature'
created: '2026-10-05'
status: 'done'
baseline_commit: '7a4c9279f49b7dab157843b1ae5476055a0eab55'
context:
  - '{project-root}/docs/implementation/spec-dashboard-four-area-layout.md'
  - '{project-root}/docs/planning/ux-design-specification.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Dashboard cash-flow and combined balance/accounts cards align to the same desktop row, but the dense account list makes both cards excessively tall while the cash-flow card leaves a large empty lower area. Repeated headings, decorative icons, nested summary chrome, and explicit positive signs add visual noise.

**Approach:** Compact both top cards around a shared vertical rhythm: simplify their headers and metadata, place the cash-flow totals above a full-width chart, collapse long desktop account lists, and let the equal-height row be determined by useful content rather than empty space.

## Boundaries & Constraints

**Always:** Keep the two desktop cards equal in height at 1200px and wider; retain the mobile DOM order of balance/accounts before cash flow; preserve account visibility, linked-user scope, complete-or-unavailable conversion, navigation, loading, empty, and error behavior. Show positive account balances without a plus sign; show negative balances in the expense color with a visible minus sign so color is not the only signal. Format Dashboard amounts with the active locale and retain tabular numerals, keyboard access, and screen-reader labels.

**Ask First:** Any API, data-contract, global theme, account-ordering, or Dashboard content-hierarchy change beyond these two cards.

**Never:** Add filler metrics merely to occupy space; hide a negative account below a collapsed list; remove accessible cash-flow controls; modify or revert `inex/inex.xml`; change the category cards.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Populated desktop | More than five visible accounts at 1200px or wider | Top cards have equal compact height; five accounts are shown initially with an expansion control; cash-flow totals precede a full-width chart | Expanding accounts grows the row without overlap |
| Negative account | Any native or converted balance below zero | Amount is red and retains a minus sign; positive values have no plus sign | Screen-reader text retains explicit financial semantics |
| Responsive | 1024px, 390px, or 360px | Cards stack in source order; mobile initially shows three accounts; summary controls and amounts do not clip or overflow | Existing panel-local states remain usable |
| Unavailable or empty | Missing rates, failed query, or no activity/accounts | Existing scoped state replaces only the affected content | No card introduces a fixed blank body merely to match another state |

</frozen-after-approval>

## Code Map

- `inex/ClientApp/src/pages/Dashboard.tsx` -- top-card headings, balance metadata, amount semantics, account expansion, and cash-flow content order.
- `inex/ClientApp/src/pages/Dashboard/dashboard.css` -- compact equal-height desktop layout, five/three-row collapse rules, inline summaries, and responsive reflow.
- `inex/ClientApp/src/components/primitives/Num.tsx` -- opt-in locale formatting and negative-only signage support.
- `inex/ClientApp/src/components/primitives/SignageContext.tsx` -- signage type accepted by `Num` without changing the stored user preference.
- `inex/ClientApp/public/locales/{en,ru}/translation.json` -- concise card labels and metadata.
- `inex/ClientApp/src/pages/Dashboard.test.tsx` and primitive tests -- semantic and formatting regression coverage.
- `inex/ClientApp/visual-qa/dashboard.mjs` -- desktop compactness/alignment and responsive account-count assertions.

## Tasks & Acceptance

**Execution:**
- [x] Dashboard markup and locales -- remove duplicated visible labels/icons, combine balance metadata, and move cash-flow totals ahead of the chart.
- [x] Dashboard CSS -- render a borderless two-item cash-flow summary, allow the chart to consume useful remaining height, and collapse accounts at five desktop/three mobile rows.
- [x] Numeric primitive -- support explicit locale formatting and a no-positive-plus/visible-negative-minus mode.
- [x] Tests and visual QA -- cover concise hierarchy, sign/color behavior, expansion limits, equal desktop height, responsive stacking, and overflow.

**Acceptance Criteria:**
- Given a populated 1440px Dashboard, when the top row renders collapsed, then both cards share top and bottom bounds and neither contains a large unused lower region.
- Given positive and negative account balances, when they render, then positives have no leading plus while negatives are red with a visible minus.
- Given a Russian locale, when Dashboard amounts render, then grouping and decimal separators follow the locale.
- Given 1024px, 390px, and 360px viewports, when cards stack, then the content order, controls, amounts, and charts remain readable without horizontal overflow.

## Spec Change Log

## Design Notes

The cash-flow card should use title plus period in one compact header, two native summary buttons in a borderless row, and a full-width chart below. The position card should use one title, one dominant total, one compact metadata row, then a simple Accounts header and list. Equal height remains a desktop grid contract; stacked cards use content height independently.

## Verification

**Commands:**
- `npm test -- --run Dashboard mockup-alignment-primitives` -- expected: focused component and primitive tests pass.
- `npm run build` -- expected: strict TypeScript and production build pass.
- `npm run lint` -- expected: no new lint findings.
- `npm run visual-qa:dashboard` -- expected: fixture states pass at 1440px, 1024px, 390px, and 360px with compact aligned top cards.
- `npm run visual-qa:verify` -- expected: Dashboard summary validates; unrelated stale summaries may remain separately reported.

## Suggested Review Order

**Card structure and behavior**

- Start here: compact hierarchy, safe account disclosure, and full-width cash-flow chart.
  [`Dashboard.tsx:553`](../../inex/ClientApp/src/pages/Dashboard.tsx#L553)

- Responsive collapse rules preserve negative accounts while limiting positive rows.
  [`Dashboard.tsx:604`](../../inex/ClientApp/src/pages/Dashboard.tsx#L604)

- Shared sizing and responsive reflow remove empty space without fixed filler.
  [`dashboard.css:187`](../../inex/ClientApp/src/pages/Dashboard/dashboard.css#L187)

**Financial formatting and accessibility**

- Opt-in signage removes positive pluses while retaining explicit negative signs.
  [`Num.tsx:60`](../../inex/ClientApp/src/components/primitives/Num.tsx#L60)

- Balance-specific labels prevent expense semantics leaking into screen-reader output.
  [`Num.tsx:94`](../../inex/ClientApp/src/components/primitives/Num.tsx#L94)

- Stored preferences remain restricted while components accept the local signage mode.
  [`SignageContext.tsx:3`](../../inex/ClientApp/src/components/primitives/SignageContext.tsx#L3)

**Verification evidence**

- Component coverage locks collapse limits, ordering, semantics, and disclosure wiring.
  [`Dashboard.test.tsx:196`](../../inex/ClientApp/src/pages/Dashboard.test.tsx#L196)

- Primitive coverage locks Russian formatting, negative signage, and accessible labels.
  [`mockup-alignment-primitives.test.tsx:99`](../../inex/ClientApp/src/components/primitives/mockup-alignment-primitives.test.tsx#L99)

- Browser assertions verify alignment, overflow, signs, and the exact negative token.
  [`dashboard.mjs:267`](../../inex/ClientApp/visual-qa/dashboard.mjs#L267)

- The visual-QA checklist records desktop and mobile evidence for the compact cards.
  [`visual-qa-checklist.md:115`](../design/docs/visual-qa-checklist.md#L115)
