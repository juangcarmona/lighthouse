<!-- pdac-scope: cited -->

# Proposal

## Why

A worker can leave a continuation notice as the latest message after a failed attempt, or mark an issue for review when no reviewable result exists. People need an actionable chronological account of each handoff.

<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->

## What Changes

- Publish consistent, evidence-backed handoffs for lifecycle requests, questions, reviews and terminal outcomes.
- Correlate publication and labels with the current attempt, preserve answered questions and reconcile interrupted publication.
- Add the `execution-failed` label through the existing adoption contract without granting retry or review authority.
- Exercise the conversation through deterministic fixtures and a controlled GitHub issue or PR.

## Capabilities

### New Capabilities

- `workflow-handoffs`: Current, actionable lifecycle messages and recoverable tracker projection.

### Modified Capabilities

None.

## Impact

The SDLC package's host adapters, workflow templates, generated locks, label capability and adoption guidance change. Product intent is supplied by the applied CHG-WORKFLOW-HANDOFFS-001. Lifecycle stages, provider ownership, retry policy and human authority remain unchanged.
