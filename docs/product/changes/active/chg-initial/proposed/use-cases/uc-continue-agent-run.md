---
id: UC-CONTINUE-AGENT-RUN
type: use-case
title: Continue an agent run from recorded state
status: draft
primary-actor: ACT-AGENT-HOST
supporting-actors: [ACT-ADOPTER, ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-WORKFLOW-STATE, BR-MEMORY-BOUNDARY, BR-FAIL-CLOSED]
uses-terms: [TERM-AGENT-RUN, TERM-WORKFLOW-STATE, TERM-AGENT-MEMORY, TERM-GATE]
---

## Goal

Resume or inspect a bounded run after a process, chat or host interruption without reconstructing state from prose.

## Trigger

The adopter or host requests status or continuation for a known run ID.

## Preconditions

The run's event history is available, its scope is still valid and any required human decision is recorded.

## Main Flow

1. Lighthouse rebuilds the run state from its transition events and validates the latest evidence.
2. Lighthouse loads only memory records visible to the run's declared scope.
3. The host continues the current role or reports the next required decision.
4. Lighthouse records the new event and resulting state.

## Alternative Flows

When no run record exists, Lighthouse reports that the route cannot resume and offers a new bounded run instead of guessing from tracker prose.

## Failure Conditions

The event history is corrupt, the run is claimed by another active lease, required memory is unavailable or the authority context has changed without an explicit decision.

## Postconditions

The adopter receives a deterministic state report and a traceable continuation or a concrete restart decision.
