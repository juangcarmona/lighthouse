---
id: SB-CHANGE-FLOW-VERIFIED
type: structured-behaviour
title: A bounded change flow reports verifiable progress
status: draft
illustrates: [UC-RUN-SDLC, BR-BOUNDED-WORKFLOW]
given:
  - A project has a bounded change and declared product, architecture and workflow authorities.
  - The selected route declares its stages, permitted tools and verification commands.
when: The adopter or agent host runs the change flow.
then:
  - Each enabled stage reports its declared inputs, outputs and completion evidence.
  - A failed prerequisite or check stops advancement and identifies the responsible decision.
  - The final report distinguishes implementation evidence from human acceptance.
uses-terms: [TERM-CHANGE-FLOW, TERM-WORKFLOW-STAGE, TERM-GUARDRAIL]
---

## Intent

Make one complete change reviewable from its first scoped handoff through its verified result.

## Boundaries

This example does not require a persistent state store, a specific model provider or automatic approval of product, architecture, merge or release decisions.
