---
title: Increase dashboard card spacing
type: feature
created: '2026-11-06'
status: done
route: one-shot
---

# Increase dashboard card spacing

## Intent

**Problem:** Visual Dashboard cards need slightly more separation to make the four areas easier to distinguish.

**Approach:** Use the existing 20px spacing token for the outer grid and nested right-column cards. Remove the mobile overrides that reduced the gaps to 16px. On desktop viewports at most 850px tall, reduce only the page's bottom padding from 12px to 8px, preserving the 1440x800 fit without compressing card contents.

Validation: UI doctor, frontend build/typecheck and lint passed. Nine fixture-only visual states passed at 1920/1440/1024/390/360px, including Russian and 800/900px desktop heights. Measured horizontal and vertical card gaps are 20px in the applicable layouts. No horizontal overflow or final-content bottom-nav occlusion was detected. Desktop and mobile screenshots were inspected; no backend or external provider was called.

Independent adversarial review found no actionable introduced defects; no patches or deferrals were required.

## Suggested Review Order

- Apply one shared spacing token across desktop, tablet and mobile card layouts.
  [visual-dashboard.css:21](../../inex/ClientApp/src/pages/Dashboard/visual-dashboard.css#L21)
- Preserve the existing short-desktop height using the surrounding page padding.
  [visual-dashboard.css:199](../../inex/ClientApp/src/pages/Dashboard/visual-dashboard.css#L199)
- Inspect fixture geometry and refreshed screenshot evidence.
  [qa-summary.json](visual-qa/dashboard-spacing/qa-summary.json)
