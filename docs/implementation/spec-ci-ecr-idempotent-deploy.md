---
title: 'Make ECR SHA deployments idempotent'
type: 'bugfix'
created: '2026-09-13'
status: 'done'
baseline_commit: 'b0677b646c93886d76c883577065d2318603df5e'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/E-TRACK-EXPLAINED.md'
  - '{project-root}/.github/workflows/dotnet.yml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Re-running the `deploy` job for a commit whose ARM64 image is already present in ECR fails before deployment. The job unconditionally asks Buildx to push the immutable tag formed from `github.sha`, so ECR rejects the overwrite and the SSM image reference and EC2 rollout never run.

**Approach:** Make the image-publish portion of the master deployment idempotent. It must detect a manifest already tagged with the target commit SHA using the least-privilege read capability already documented for the GitHub Actions role, skip the Buildx push only in that case, and continue through the existing SSM and EC2 rollout unchanged.

## Boundaries & Constraints

**Always:** Preserve SHA-based immutable tagging, the existing arm64 Buildx command, OIDC authentication, SSM parameter name, EC2 Run Command payload, and the rule that deployment runs only for a `master` push after `build` succeeds. An existing image must still be selected explicitly in SSM before the existing rollout is invoked. A missing image must retain the present Buildx build-and-push behavior.

**Ask First:** Changing AWS IAM permissions, ECR repository settings, tag mutability, image names, image platform, SSM paths, EC2 command contents, deployment triggers, or runtime Compose configuration.

**Never:** Delete or overwrite an ECR image, introduce a mutable `latest` tag, expose AWS values or secrets, replace the existing SHA tag with run-number tags, bypass the build job, or change application/Docker source merely to work around deployment retry behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First deployment of a master commit | No ECR manifest has the `github.sha` tag | The workflow runs the existing arm64 Buildx command with `--push`, writes that SHA URI to SSM, and runs the existing EC2 deployment command. | Existing Buildx, SSM, and Run Command failures remain failures. |
| Retry after an image push succeeded but rollout did not | ECR contains a manifest tagged with `github.sha` | The workflow skips Buildx push, writes the existing SHA URI to SSM, and runs the existing EC2 deployment command. | The retry must not fail solely because the immutable tag exists. |
| ECR lookup cannot prove that a tag exists | Lookup returns a non-success result unrelated to a known existing manifest | The workflow follows the normal build-and-push path rather than selecting an unverified artifact. | A failed Buildx push remains visible and fails the deployment job. |

</frozen-after-approval>

## Code Map

- `.github/workflows/dotnet.yml` -- master-push deployment workflow; currently unconditionally pushes the SHA-tagged arm64 image before SSM and EC2 rollout.
- `docs/E-TRACK-EXPLAINED.md` -- documents immutable SHA image tags and the role's `ecr:BatchGetImage` capability, which is the permitted lookup primitive.

## Tasks & Acceptance

**Execution:**

- [x] `.github/workflows/dotnet.yml` -- add a pre-push ECR manifest check using `aws ecr batch-get-image` for the repository and `github.sha` tag; expose only a Boolean job-step output and guard the existing Buildx step with it -- allows retrying a previously built commit without attempting an immutable-tag overwrite.
- [x] `.github/workflows/dotnet.yml` -- keep the existing SSM update and EC2 Run Command steps unguarded after the image-publish decision -- ensures both a new image and an existing SHA-tagged image receive the same deployment path.
- [x] `.github/workflows/dotnet.yml` -- retain clear step names/log output for whether the image was reused or pushed -- makes a failed rollout distinguishable from an image-publish failure without logging sensitive registry values.

**Acceptance Criteria:**

- Given an ECR image tagged with the current `github.sha`, when the deploy job is retried, then the Buildx push is skipped and the workflow reaches the SSM update and EC2 deployment steps.
- Given no ECR image tagged with the current `github.sha`, when a master push reaches deploy, then the existing ARM64 Buildx command builds and pushes the SHA-tagged image before deployment.
- Given a pull-request workflow run, when it completes build, then no ECR lookup, image push, SSM write, or EC2 action is performed.
- Given an ECR image tag is present, when deployment is retried, then no existing image or tag is deleted or overwritten.

## Design Notes

The documented role already has `ecr:BatchGetImage`, and Buildx itself needs that capability to inspect ECR manifests. The workflow should use that operation instead of `describe-images`, which would add an unverified IAM dependency. Only a confirmed success marks the image reusable; every other outcome retains the current build-and-push path, preserving normal failure visibility for a genuinely broken build or registry connection.

## Verification

**Commands:**

- `git diff --check` -- expected: no whitespace errors.
- `rg -n -C 3 "batch-get-image|Build and push image|Update ECR image URI" .github/workflows/dotnet.yml` -- expected: one manifest check guards only the Buildx push; the SSM update remains unconditional after it.

**Manual checks:**

- Review the GitHub Actions diff to confirm the ECR lookup uses only repository/tag values already available to the job and no secret values are printed.
- After merge, inspect the master-push run: retrying an existing SHA shows the image-reuse decision, advances to SSM/EC2 deployment, and does not emit an immutable-tag overwrite error.

## Suggested Review Order

- Confirm the existing immutable SHA manifest is reused only after a successful ECR lookup.
  [`dotnet.yml:76`](../../.github/workflows/dotnet.yml#L76)

- Confirm only Buildx is conditional; SSM and EC2 rollout remain on the established path.
  [`dotnet.yml:92`](../../.github/workflows/dotnet.yml#L92)
