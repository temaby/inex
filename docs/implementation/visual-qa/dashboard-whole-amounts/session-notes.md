# Delivery environment notes

The task remained scoped to dashboard presentation, with frontend tests, build, lint, fixture browser evidence and independent review. No database validation was necessary; backend/provider calls were avoided. GitHub connector operations were preferred, with CLI fallback for branch protection and deployment status capabilities absent from the connector.

## Keep reviewer packets in the shared workspace

Finding: Sandbox temporary directories were isolated between executions and reviewers.

Evidence: Independent reviewers could not read the first diff packet. Copying by a later execution's temporary-directory environment variable also failed. Regenerating the packet under the shared workspace resolved access for every reviewer.

Durable fix: Document shared-workspace packet creation, explicit paths and removal of task-owned transient files after review.

Recommended artifact: doc

Priority: medium

Exact follow-up prompt:

```text
Update docs/operations/agent-prompt-templates.md to recommend creating review packets inside the shared workspace rather than execution-specific temporary directories. Include reading the packet from a fresh reviewer, keeping it out of commits, and removing only the task-owned packet after reviewers finish. Keep guidance public-safe and do not change implementation behavior.
```

One-off notes:
- GitHub CLI authentication worked outside the sandbox.
- Fixture browser startup required escalation and an alternate port, as documented by the project doctor guide.
- Temporary browser profile cleanup emitted a warning after successful screenshots; no product change was needed.

Safety check:
- Local environment fixes separated from repo changes: yes
- No local absolute paths, localhost URLs, credentials, or secrets included: yes
- Every durable fix is tied to repeated or likely-recurring evidence: yes
