---
id: BR-STAGE-GATES
type: business-rule
title: Lifecycle stages stop at their gates
status: draft
applies-to: [BC-FOUNDATION, UC-RUN-SDLC]
uses-terms: [TERM-WORKFLOW-STAGE, TERM-GATE, TERM-GUARDRAIL]
---

## Rule

Each SDLC stage MUST stop at its configured gate and MUST NOT invoke the next stage by default. `ff` MAY compose configured stages only when its independent review, correction limit and durable evidence are present, and it MUST preserve human-only and forge-protected decisions.

## Rationale

Stopping at a gate keeps product, design and implementation decisions visible while still allowing a project to opt into a bounded fast-forward route.

## Examples

`refine` produces the Definition of Ready and ends at Ready with semantic agent verification; `propose` produces the designed solution and ends at Planned with human or explicitly configured independent review; `implement` produces the Definition of Done evidence and ends at Done with deterministic checks and named judgement roles; `integrate` enforces Done and `review` records a retrospective without opening another gate.

## Exceptions

No exception permits a stage to waive a required deterministic check, a named human decision or repository protection.
