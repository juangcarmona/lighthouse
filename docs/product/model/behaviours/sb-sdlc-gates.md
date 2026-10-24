---
id: SB-SDLC-GATES
type: structured-behaviour
title: SDLC stages evaluate declared gates and continuation authority
status: draft
illustrates: [UC-RUN-SDLC, BR-STAGE-GATES]
given:
  - A project has an adopted authority map and a configured SDLC route.
  - The route declares the stage inputs, outputs, checks, gate and next decision.
when: The adopter or agent host runs one lifecycle stage.
then:
  - The stage reports its result at Ready, Planned or Done when that gate applies.
  - A failed check leaves the item at the current gate with evidence and a named decision owner.
  - The next stage is invoked only when the effective workflow authorization permits continuation and its evidence is complete; otherwise the responsible decision is named.
  - ProductShape and ArcShape citations remain attached to the delivery evidence.
uses-terms: [TERM-AUTHORITY-MAP, TERM-GATE, TERM-WORKFLOW-STAGE]
---

## Intent

Make the delivery flow predictable for people and agents while preserving authority boundaries.

## Boundaries

This example does not require a particular model provider, tracker, CI system, persistence store or merge policy.
