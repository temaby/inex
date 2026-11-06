---
title: Align dashboard width and page heading
type: bugfix
created: '2026-11-06'
status: done
route: one-shot
---

# Align dashboard width and page heading

## Intent

**Problem:** Dashboard uses the wider analytics frame, so its edges shift when navigating to management pages. The visual variant also compresses its page header and omits the shared subtitle, moving its title and first cards above the other pages.

**Approach:** Use the existing 1360px management frame in both Dashboard variants. Restore the shared localized subtitle and shell header spacing in the visual variant. Reduce money-card spacing only on desktop viewports at most 850px tall to retain the existing 1440x800 compact layout. Keep data loading, calculations, account scope, month controls and responsive grid behavior unchanged.

Validation: UI doctor passed all 21 checks; 135 Dashboard tests, frontend build/typecheck and lint passed. Focused fixture-only visual QA passed 12 states, including both variants at 1920px, English/Russian, 1440/1024/390/360px, historical months and 1440x800/900 compact layouts. Header/body edges and standard header padding are asserted. Screenshots at wide desktop, tablet and narrow Russian mobile widths were inspected. No live backend or exchange-rate provider was called.

Independent adversarial review inspected the five changed code/test files and wide/compact evidence; no actionable introduced defects were found (zero patches, deferrals or rejected findings).

QA environment: port 5211 returned EACCES even with escalation; the documented fallback INEX_VISUAL_QA_PORT=53147 worked. A durable follow-up would make the doctor probe actual port binding rather than listener presence alone.

## Suggested Review Order

- Align visual Dashboard with management-page width and shared heading.
  [VisualDashboard.tsx:156](../../inex/ClientApp/src/pages/Dashboard/VisualDashboard.tsx#L156)
- Apply the same width to the classic variant.
  [ClassicDashboard.tsx:242](../../inex/ClientApp/src/pages/Dashboard/ClassicDashboard.tsx#L242)
- Retain a full-height shared header while keeping short desktop layouts compact.
  [visual-dashboard.css:190](../../inex/ClientApp/src/pages/Dashboard/visual-dashboard.css#L190)
- Verify shared frame geometry, heading spacing and responsive fixture screenshots.
  [visual-dashboard.mjs:540](../../inex/ClientApp/visual-qa/visual-dashboard.mjs#L540)
  [qa-summary.json](visual-qa/dashboard-frame/qa-summary.json)
- Preserve concise card wording while restoring the shared subtitle.
  [Dashboard.test.tsx:440](../../inex/ClientApp/src/pages/Dashboard.test.tsx#L440)
