# Investigation: Current Branch Uncommitted Changes

## Hand-off Brief

1. **What happened.** The branch that the user reports as deployed contains uncommitted workspace changes; their ownership and purpose require classification.
2. **Where the case stands.** Active; `git status --short` confirms modified visual-QA artifacts, documentation, and a generated XML file.
3. **What's needed next.** Compare each changed path with `HEAD` and recent commits to separate generated output from source changes.

## Case Info

| Field | Value |
| --- | --- |
| Ticket | N/A |
| Date opened | 2026-08-29 |
| Status | Active |
| System | Local Git worktree |
| Evidence sources | Git status, Git diff, commit history |

## Problem Statement

Determine the purpose of uncommitted changes on `feature/configurable-monthly-pdf-export`, which the user states has already been delivered to production.

## Evidence Inventory

| Source | Status | Notes |
| --- | --- | --- |
| Git worktree status | Available | Confirms all currently tracked and untracked paths. |
| Working-tree diff | Available | Classifies the changed files into generated QA output, generated XML documentation, and investigation notes. |
| GitHub PR #337 | Available | Confirms the branch's PR is merged. |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | - | - | - | - |
| 1 | Classify modified and untracked files by purpose | High | Done | No application source file is modified. |
| 2 | Compare changes with the branch tip and recent commits | High | Done | QA output comes from an August 28 fixture run; XML is compiler-generated. |
| 3 | Verify remote/PR state | Medium | Done | GitHub confirms PR #337 is merged. |

## Timeline of Events

| Time | Event | Source | Confidence |
| --- | --- | --- | --- |
| 2026-08-29 | Branch checked; uncommitted changes found. | `git status --short` | Confirmed |

## Confirmed Findings

### Finding 1: The working tree is not clean

**Evidence:** `git status --short` reports modified visual-QA files, `inex/inex.xml`, and untracked investigation documents.

**Detail:** The current branch is `feature/configurable-monthly-pdf-export`, at commit `bedfa9e`.

### Finding 2: The tracked changes are not application source changes

**Evidence:** `git diff --stat` lists 27 visual-QA artifacts under `docs/implementation/visual-qa/` and `inex/inex.xml`; no `inex/ClientApp/src` or backend source file appears.

**Detail:** The QA summaries carry August 28 generation timestamps and capture fixture/layout differences. `inex/inex.xml` adds XML documentation for controller and infrastructure members already in the compiled source, which identifies it as a build artifact.

### Finding 3: The delivery branch has already merged through PR #337

**Evidence:** GitHub connector search returns merged PR #337, `Configure monthly PDF account scope and summary signals`, with head `feature/configurable-monthly-pdf-export`.

**Detail:** The local `origin/master` ref does not contain `HEAD`, so the local remote-tracking ref is stale; it does not contradict the merged PR result.

## Hypothesized Paths

### Hypothesis 1: Most modifications are generated visual-QA output

**Status:** Confirmed

**Theory:** The visual-QA image and summary changes were produced by a local QA run after the delivered branch commit.

**Would confirm:** Diff metadata and content show capture timestamps or generated-output deltas only.

**Would refute:** Any modified image/summary documents an intentional source or acceptance-baseline change not represented in the branch history.

**Resolution:** The diffs contain fresh `generatedAt` timestamps, fixture capture ordering/layout deltas, and binary screenshots; no application source file is modified.

## Conclusion

**Confidence:** High

The delivered feature itself is committed and merged. The dirty state consists of 27 regenerated visual-QA artifacts, one compiler-generated XML documentation file, two pre-existing untracked investigation reports, and this investigation report created during the current diagnosis. The local `origin/master` ref is stale.

## Recommended Next Steps

### Fix direction

Discard only the generated QA artifacts and `inex/inex.xml` after user approval; keep or separately commit the investigation reports if they are intended deliverables. Refresh remote refs before relying on the local `origin/master` relationship.
