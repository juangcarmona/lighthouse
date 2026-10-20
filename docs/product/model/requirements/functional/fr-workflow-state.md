---
id: FR-WORKFLOW-STATE
type: functional-requirement
title: Persist rebuildable workflow state
status: draft
derived-from: [UC-RUN-SDLC, UC-RUN-AGENT, UC-CONTINUE-AGENT-RUN, BR-WORKFLOW-STATE]
verification:
  - scenario: Rebuilding a run from its event history produces the same current state, evidence references and next decision as the live report, and an illegal transition leaves the previous state unchanged.
uses-terms: [TERM-WORKFLOW-STATE, TERM-AGENT-RUN, TERM-GATE]
---

## Requirement

Lighthouse MUST represent execution with a finite state machine and append-only transition events. It MUST support `ready`, `running`, `waiting-human`, `blocked`, `succeeded`, `failed` and `cancelled`, reject illegal transitions, isolate concurrent runs and derive status from recorded events rather than free-form agent text.

## Rationale

Rebuildable state survives chat or process interruptions without introducing a second product or architecture authority.
