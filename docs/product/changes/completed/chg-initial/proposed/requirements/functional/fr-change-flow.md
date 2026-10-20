---
id: FR-CHANGE-FLOW
type: functional-requirement
title: Provide a bounded OpenSpec-compatible change flow
status: draft
derived-from: [UC-RUN-SDLC, BR-BOUNDED-WORKFLOW]
verification:
  - scenario: A representative scoped change can move from backlog through `triage`, `refine`, `propose`, `implement`, `integrate` and `review` with its required OpenSpec artifacts, dependency-ordered slices and review evidence, with each stage reporting its inputs, outputs and stop condition.
uses-terms: [TERM-CHANGE-FLOW, TERM-WORKFLOW-STAGE, TERM-INTEGRATION, TERM-TRIAGE, TERM-LABEL-STATE]
---

## Requirement

Lighthouse MUST define a reusable change flow that can be expressed through OpenSpec artifacts, supports a manual route, and exposes the evidence and decision boundary for every enabled stage.

## Rationale

The flow is the smallest useful way to turn shared engineering conventions into repeatable project delivery without making Lighthouse a second product or architecture authority.
