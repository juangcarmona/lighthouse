---
id: BR-TRIAGE-CONTRACT
type: business-rule
title: Every work item has an explicit triage result
status: draft
applies-to: [BC-FOUNDATION, UC-TRIAGE-WORK-ITEM, UC-RUN-SDLC]
uses-terms: [TERM-TRIAGE, TERM-WORK-ITEM-SIZE, TERM-BLAST-RADIUS, TERM-LABEL-STATE]
---

## Rule

Every work item entering a delivery route MUST have a triage result that records its type, size, urgency, impact, dependencies, risks, blast radius, next route, decision owner, confidence and supporting evidence, or an explicit out-of-scope reason.

The result MUST identify missing evidence and unresolved judgement separately, and MUST NOT derive lifecycle state from issue prose.

## Rationale

The harness needs a small structured intake result before an agent or developer spends time on solution design.

Separating evidence from judgement makes an incomplete assessment visible without treating it as a failed check or a valid route decision.

## Examples

A feature may proceed to refinement, a confirmed defect may select hotfix and a large item may select decomposition before refinement.

An issue with an unknown dependency records the dependency as unresolved and keeps the proposed route visible without pretending that the dependency is absent.

## Exceptions

An emergency may use the hotfix route with a reduced triage form, but it still records impact, blast radius, containment, owner and verification evidence.
