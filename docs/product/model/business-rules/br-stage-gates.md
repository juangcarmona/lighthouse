---
id: BR-STAGE-GATES
type: business-rule
title: Lifecycle stages stop at their gates
status: draft
applies-to: [BC-FOUNDATION, UC-RUN-SDLC]
uses-terms: [TERM-WORKFLOW-STAGE, TERM-GATE, TERM-GUARDRAIL]
---

## Rule

Each SDLC stage MUST evaluate its configured gate. A gate requires a human stop only when its policy names a human decision that has not been recorded. An explicitly authorized unattended workflow or `ff` composition MAY continue automatically when evidence, independent review, correction limits and current authorization permit it. A supervised invocation MUST retain its configured stops. Every composition MUST preserve human-only and forge-protected decisions.

## Rationale

Evaluating every gate preserves evidence while allowing a repository to delegate routine continuation without a human acknowledgement at every phase.

## Examples

`refine` produces the Definition of Ready and ends at Ready with semantic agent verification; `propose` produces the designed solution and ends at Planned with human or explicitly configured independent review; `implement` produces the Definition of Done evidence and ends at Done with deterministic checks and named judgement roles; `integrate` enforces Done and `review` records a retrospective without opening another gate.

## Exceptions

No exception permits a stage to waive a required deterministic check, a named human decision or repository protection.
