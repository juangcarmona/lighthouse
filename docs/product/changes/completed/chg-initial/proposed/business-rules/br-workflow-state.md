---
id: BR-WORKFLOW-STATE
type: business-rule
title: Workflow state is explicit and rebuildable
status: draft
applies-to: [BC-FOUNDATION, UC-RUN-SDLC, UC-CONTINUE-AGENT-RUN]
uses-terms: [TERM-WORKFLOW-STATE, TERM-AGENT-RUN, TERM-GATE, TERM-LABEL-STATE]
---

## Rule

Lighthouse MUST model each run as a finite state machine with legal transitions, append-only transition events and a rebuildable state report. An agent MUST NOT write an arbitrary state or advance a gate without its declared evidence.

## Rationale

Explicit state prevents chat context and free-form prose from becoming an untestable workflow engine.

## Examples

A run can move from `ready` to `running`, then to `waiting-human`, `succeeded`, `failed` or `cancelled`; a failed transition records the reason and leaves the prior state intact.

## Exceptions

A provider may keep its own execution state, but the adapter MUST project it into the Lighthouse states before reporting the route result.
