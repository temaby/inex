# Transaction quick entry session retrospective

## Audit

- Time loss: default QA port could not bind; QA selectors still targeted the removed type dropdown; closing popovers and sticky actions interfered with scripted clicks. Review also exposed draft-expression and aborted-history races.
- Scope: one creation-form goal; P1/P2 delivered. Optional Save and add another omitted to preserve the close-on-success callback.
- Tools: project doctor, installed frontend tests/types, existing CDP fixture harness, and independent reviewers supplied the required evidence. No DB inspection, GitHub activity or live providers were needed.
- Rules: existing project guidance covered setup, permissions and isolation. No new AGENTS rule is justified.
- Verification: focused tests preceded full tests. All five creation modes, edits, account recommendations, hierarchy/search, arithmetic/precision, request cleanup, keyboard focus and EN/RU layouts were covered. Browser captures used intercepted fixture APIs.
- Automation: retain focused named-state runs and reliable overlay dismissal in existing scripts. Do not automate financial changes from this session.

### Keep targeted visual QA independent of imported runner filters

Finding:
A picker-state filter was rejected while importing the Transactions runner, before the picker runner could execute. Multi-state reruns also repeated already-passing captures to diagnose one scrolled field.

Evidence:
`mobile-transaction-pickers.mjs` imports the Transactions configuration, whose state filter accepts only Transactions state names. The scrolled-category check passed after using a picker-specific filter and centering its physical click away from the sticky save actions. The final complete picker run passed 17 states.

Durable fix:
This change adds `INEX_PICKER_QA_STATE_FILTER` and centers scripted picker clicks. Extend that separation to other composed QA runners if the same pattern recurs; avoid applying module-level filtering during config imports.

Recommended artifact: `script`
Priority: `medium`
Exact follow-up prompt:
```text
Review state filtering in the composed visual QA runners. Move filter validation to executable runner entry points so importing a fixture/config does not reject another runner's state names. Preserve full-run defaults, screenshot locations and request isolation. Add or run focused checks for both imported and directly executed runners; do not regenerate unrelated page baselines.
```

One-off notes:
- The documented alternate QA port worked; no firewall, global environment or application configuration change was needed.
- Installed RTK requires a subscribed initial request to return uncached query data. The creation hook releases that subscription and documents this locally; no global state migration is needed.
- Stale canonical visual baselines are separate from the passing feature and picker summaries.
- Independent review fixed arithmetic draft synchronization, date/menu focus, and immediate history-request remounts; regression tests preserve these behaviors.

Safety check:
- Local environment fixes separated from repo changes: yes.
- No local absolute paths, localhost URLs, credentials, or secrets included: yes.
- Every durable fix is tied to repeated or likely-recurring evidence: yes.
