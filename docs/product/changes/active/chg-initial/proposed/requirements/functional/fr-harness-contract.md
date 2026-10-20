---
id: FR-HARNESS-CONTRACT
type: functional-requirement
title: Expose the harness tool contract
status: draft
derived-from: [UC-RUN-SDLC, BR-AUTHORITY-BOUNDARIES]
verification:
  - scenario: An adopter can inspect every enabled Lighthouse tool and find its owner, purpose, inputs, outputs, evidence, failure behavior and integration boundary before invoking it.
uses-terms: [TERM-HARNESS, TERM-TOOL-CONTRACT, TERM-INTEGRATION, TERM-GUARDRAIL]
---

## Requirement

Lighthouse MUST expose a discoverable contract for every enabled tool and MUST compose owned integrations without copying their source of truth or silently replacing their managed files.

## Rationale

A harness becomes useful when an adopter can understand what each tool does and which system remains responsible for its result.
