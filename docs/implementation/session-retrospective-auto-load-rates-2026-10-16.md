# Exchange-rate loading session retrospective

## Audit

- Time loss: sandbox process restrictions blocked esbuild startup and stalled the initial MSBuild test invocation. Approved process escalation and single-node MSBuild completed the same checks.
- Scope: one user-visible loading fix spanning a thin endpoint, frontend orchestration, and regression tests. No provider algorithm, schema, or layout changes.
- Tool choice: local source inspection and mocked tests were appropriate. Database inspection and GitHub operations were unnecessary.
- Documentation: project doctor confirmed Vite/browser startup, but did not establish that test workers could run under the same sandbox.
- Verification: focused service/frontend checks preceded full backend tests, build, and lint. Independent reviews caught request-generation and historical-placeholder eligibility boundaries.
- Visual QA: no visual changes or parity claims; behavior verified through mocked components and API tests.
- DB/GitHub hygiene: neither live DB access nor remote publication was required; no live rate provider was called.
- Automation opportunity: bounded test-worker readiness checks with clear process-permission failure messages.
- Avoid: new global agent rules for this one implementation, changing exchange-rate providers, or changing supported-currency policy.

### Detect test-worker startup restrictions before running suites

Finding:
Existing readiness checks did not detect restrictions affecting the test runtimes.

Evidence:
Vitest initially failed to start esbuild with EPERM. The initial .NET test invocation produced no output while worker processes remained idle. Escalated frontend checks and single-node .NET runs succeeded.

Durable fix:
Extend project doctor with bounded, non-networked test-runtime probes and document the appropriate escalation and single-node fallback. This is a proposed repository follow-up; local process permissions are an environment concern and should not be weakened by application changes.

Recommended artifact: `script`

Priority: `medium`

Exact follow-up prompt:
```text
Extend scripts/doctor.ps1 and docs/operations/project-doctor.md with bounded test-runtime readiness probes for frontend worker startup and .NET build/test startup. Use this session retrospective as evidence. Do not run complete suites, restore packages, contact external providers, print secrets, or terminate unrelated processes. Report blocked subprocess startup distinctly from application test failures. Document when approved escalation or single-node MSBuild is appropriate, and clean up only probe-owned resources.
```

One-off notes:
- A generated XML documentation file changed during builds; restore generated churn before committing.
- Required query dates correctly use the project's existing HTTP 422 validation response.

Safety check:
- Local environment fixes separated from repo changes: yes.
- No local absolute paths, localhost URLs, credentials, or secrets included: yes.
- Every durable fix is tied to repeated or likely-recurring evidence: yes.
