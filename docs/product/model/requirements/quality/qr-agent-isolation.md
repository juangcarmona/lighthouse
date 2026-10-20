---
id: QR-AGENT-ISOLATION
type: quality-requirement
title: Isolate agent runs and memory scopes
status: draft
quality-attribute: controllability
applies-to: [UC-RUN-AGENT, UC-CONTINUE-AGENT-RUN, UC-CONFIGURE-AGENT-CONTROL-PLANE]
verification:
  - scenario: Two concurrent runs cannot read or write one another's private run memory, claim the same lease or advance one another's state without an explicit parent-child handoff.
---

## Requirement

Agent runs MUST use unique identifiers, explicit scopes and an atomic claim or lease, and memory providers MUST enforce the declared visibility boundary. A stale or conflicting claim MUST stop the route and report the owner instead of being overwritten.

## Measurement

Run two isolated fixtures concurrently, inject a stale claim and attempt an out-of-scope memory read; verify that each action is rejected with a deterministic report and no cross-run mutation.
