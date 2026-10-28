# Implementation PR state

<!-- pdac-scope: cited -->

## ADDED Requirements

### Requirement: Issue projection follows the current implementation PR

The issue SHALL use `ready` only for completed refinement. Starting implementation SHALL remove it. An open linked implementation PR SHALL project exactly one of `pr-draft` and `pr-ready` from its current GitHub draft state. A label edit SHALL NOT authorize a PR transition.

<!-- pdac:cite id="FR-LABEL-STATE" digest="sha256:754d81137a03d3679e7213068b36a5377dd5aa02fe479be14ad720973bf2d705" -->

#### Scenario: Complete candidate

- **WHEN** a bot-owned PR matches the published candidate head and required checks pass
- **THEN** the PR becomes ready and the issue projects `pr-ready` once

#### Scenario: Incomplete manual ready

- **WHEN** an owner marks a blocked, unchecked or stale-head PR ready
- **THEN** the host restores draft and reports the current blocker on the issue

#### Scenario: Correction

- **WHEN** owner feedback changes the same implementation PR
- **THEN** the PR returns to draft during correction and the new head requires fresh checks

### Requirement: Navigable result without early closure

The implementation result SHALL link to the exact PR and run. The PR description SHALL refer to the issue without closing it, summarize the current outcome and next action, and link to evidence. Only post-merge review SHALL close the issue.

<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->
<!-- pdac:cite id="UC-RUN-SDLC" digest="sha256:bf1ff365ec01cf2d4ced18899e1fbd86ffcd406b15b1f07b626ffab41a80f674" -->

#### Scenario: Draft PR merges only after review

- **WHEN** an implementation PR is created
- **THEN** its body uses `Refs #<issue>`, and its issue remains open through PR review and merge until the final review result
