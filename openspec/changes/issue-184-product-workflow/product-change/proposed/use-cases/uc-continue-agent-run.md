---
id: UC-CONTINUE-AGENT-RUN
type: use-case
title: Continue an agent run from recorded state
status: draft
primary-actor: ACT-AGENT-HOST
supporting-actors: [ACT-ADOPTER, ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-WORKFLOW-STATE, BR-MEMORY-BOUNDARY, BR-FAIL-CLOSED, BR-ENTRY-AUTHORITY, BR-PRODUCT-CHANGE-HANDOFF]
uses-terms: [TERM-AGENT-RUN, TERM-WORKFLOW-STATE, TERM-AGENT-MEMORY, TERM-GATE]
---

## Goal

Resume or inspect a bounded run after a process, chat or host interruption without reconstructing state from prose.

## Trigger

The adopter or host requests status or continuation for a known run ID, or an authenticated product answer, requested change or approval event targets that run's recorded product wait.

## Preconditions

The run's event history is available, its scope is still valid and any required human decision is recorded.

## Main Flow

1. Lighthouse rebuilds the run state from its transition events and validates the latest evidence.
2. Lighthouse loads only memory records visible to the run's declared scope.
3. For a product wait, the host validates the matching event, still-effective scope and authorization, identified Product Change, reviewed delta and relevant baseline. An answer or requested change resumes refinement of the same product change and cannot authorize apply.
4. An explicit authenticated human product approval permits the separate trusted provider dry-run and apply. The host validates the resulting definition, reports affected citations, refreshes dependent planning or evidence as needed and records the applied branch context without claiming baseline acceptance by merge.
5. The host continues the current role or reports the next required decision. A waiting parent resumes once only when its authorization, product apply evidence and applicable gates permit it; an already-authorized implementation request need not be repeated.
6. Lighthouse records the new event and resulting state. Duplicate events cannot repeat changes, PRs, applies or parent continuations.

## Alternative Flows

When no run record exists, Lighthouse reports that the route cannot resume and offers a new bounded run instead of guessing from tracker prose.

A run waiting for a human persists its checkpoint and releases execution resources. Recovery preserves the same product candidate and parent identity; another actor's branch updates require a current-head recheck before serialized publication. An uncertain apply result requires reconciliation before any retry or dependent continuation.

## Failure Conditions

The event history is corrupt, the run is claimed by another active lease, required memory is unavailable or the authority context has changed without an explicit decision. A stale product decision, unresolved question, revoked authorization, failed validation, failed or uncertain apply or publication, or conflicting branch update stops dependent work and preserves the checkpoint with an actionable outcome.

## Postconditions

The adopter receives a deterministic state report and a traceable continuation or a concrete restart decision.
