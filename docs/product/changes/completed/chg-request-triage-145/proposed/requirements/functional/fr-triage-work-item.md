---
id: FR-TRIAGE-WORK-ITEM
type: functional-requirement
title: Triage work items before delivery
status: draft
derived-from: [UC-TRIAGE-WORK-ITEM, BR-TRIAGE-CONTRACT]
verification:
  - scenario: The public form requires problem and desired result only, with optional context and no mandatory engineering criteria.
  - scenario: An external issue starts no agent until a verified owner requests triage; the bounded execution stops before refinement.
  - scenario: A native triage result preserves the original request, marks sourced inferences and unknowns, explains blocking questions and records provisional relative points with factor explanations, confidence and separate uncertainty.
  - scenario: Repeating triage against unchanged issue metadata, labels, links, repository evidence and configuration produces an equivalent structured result and does not mutate the tracker by default.
  - scenario: An explicit application request changes only a valid configured label transition, while an invalid or ambiguous transition leaves the previous labels unchanged and reports the reason.
  - scenario: Refinement reconsiders the initial estimate and preserves its prior value and revision reason; legacy classifiers do not fabricate point conversions.
uses-terms: [TERM-TRIAGE, TERM-WORK-ITEM-SIZE, TERM-BLAST-RADIUS, TERM-LABEL-STATE]
---

## Requirement

Lighthouse MUST provide simple public intake and owner-admitted bounded triage. The public form MUST ask only for the problem and desired result as required fields, with optional context. External requests MUST NOT start an agent without verified owner admission. That admission MUST authorize triage only.

Triage MUST read the work item and repository context, preserve the original request, distinguish evidence-backed inferences from unknowns and ask only outcome-blocking questions. Native triage MUST record provisional relative points from 1, 2, 3, 5, 8 or 13, with scope, dependency and verification explanations, confidence and separate uncertainty. Refinement MUST reconsider the initial estimate and retain the previous value and revision reason.

Triage MUST record urgency, impact, dependencies, risks and blast radius with confidence and evidence, select the next route and propose configured labels when classification is requested. Direct authorized engineering entry preserves downstream scope and risk checks without requiring a triage execution.

Triage MUST be read-only by default. An explicit application request or standing bounded intake authorization MAY permit a valid label transition. Insufficient evidence, ambiguous labels or illegal transitions MUST preserve the previous state. Lifecycle state MUST NOT be inferred from prose.

## Rationale

Early assessment makes the request and estimate understandable before solution design. Separating inference, uncertainty and authority prevents a simple public form from becoming unbounded automation.
