# Personal transfer dashboard verification follow-up

The task stayed within individual Visual Dashboard reporting, including the existing selected-linked-user context. Family aggregation and navigation were not changed. Verification used isolated synthetic browser fixtures, mocked providers in tests, MySQL MCP read-only SQL for query translation/decimal aggregation, and independent review. No GitHub operations were performed.

Time loss came from sandbox restrictions on testhost/CDP connections and from reproducing four existing visual-check failures. The documented browser escalation resolved CDP access; single-node no-restore build and authorized testhost execution resolved backend validation. Existing guidance was sufficient; no AGENTS rule is needed. One introduced fractional-zero display issue was fixed and regression-tested.

### Add named-state baseline comparison to visual QA

Finding:
Distinguishing existing geometry failures from a new feature required an ad hoc four-state baseline loader after the full 94-state visual run. Two width assertions also assume the requested viewport width equals the actual available layout width.

Evidence:
`regression-comparison.json` records identical frame widths/page heights and the same four failures for baseline `a53194d` and the feature. Existing visual-checklist entries already request a named-state filter. Feature-specific fixtures have independent passing checks.

Durable fix:
Add an optional named-state filter and isolated baseline comparison to the shared runner, with separate output/cache directories and layout-width measurements. Preserve normal full-suite assertions and fixture API isolation. This follow-up is proposed, not implemented in the product change.

Recommended artifact: `script`

Priority: `medium`

Exact follow-up prompt:
```text
Extend the shared InEx visual QA runner with named-state selection and an optional isolated baseline source comparison. Use personal-dashboard-transfers-regression/regression-comparison.json as evidence. Keep outputs atomic and separate from canonical full-run baselines. Compare frame width against the measured available layout width while preserving overflow, bottom-navigation and compact-height checks. Do not change dashboard product styling or call real APIs/providers.
```

One-off notes:
- Sandbox connection restrictions are local environment behavior already covered by operations docs.
- Browser temporary-profile cleanup warnings did not affect captured evidence.
- Stale unrelated canonical screenshot summaries were not regenerated for this feature.

Safety check:
- Local environment fixes separated from repo changes: yes
- No local absolute paths, localhost URLs, credentials, or secrets included: yes
- Every durable fix is tied to repeated or likely-recurring evidence: yes
