---
id: FR-WORKFLOW-STATE
type: functional-requirement
title: Persist rebuildable workflow state
status: draft
derived-from: [UC-RUN-SDLC, UC-RUN-AGENT, UC-CONTINUE-AGENT-RUN, BR-WORKFLOW-STATE]
verification:
  - scenario: Rebuilding a run from its event history produces the same current state, evidence references and next decision as the live report, and an illegal transition leaves the previous state unchanged.
  - scenario: A run can pause for a human decision, resume with a new event and retain its parent, route, stage and evidence identity without interpreting free-form agent text as state.
  - scenario: Two runs with different identifiers cannot overwrite one another's events or current state.
uses-terms: [TERM-WORKFLOW-STATE, TERM-AGENT-RUN, TERM-GATE, TERM-CHANGE-FLOW]
---

## Requirement

Lighthouse MUST represent execution with a finite state machine and append-only transition events. It MUST support `ready`, `running`, `waiting-human`, `blocked`, `succeeded`, `failed` and `cancelled`, reject illegal transitions, isolate concurrent runs and derive status from recorded events rather than free-form agent text.

Each transition event MUST identify the run, parent run when present, route, stage, previous state, next state, timestamp, actor, evidence references and reason. A state projection MUST be rebuildable from the ordered event stream, and an invalid event MUST leave the prior projection unchanged.

## Rationale

Rebuildable state survives chat or process interruptions while keeping decisions and evidence inspectable without introducing a second product or architecture authority.
