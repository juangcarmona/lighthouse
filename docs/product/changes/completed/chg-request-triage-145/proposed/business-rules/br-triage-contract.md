---
id: BR-TRIAGE-CONTRACT
type: business-rule
title: Requester intake produces an explicit triage result
status: draft
applies-to: [BC-FOUNDATION, UC-TRIAGE-WORK-ITEM, UC-RUN-SDLC]
uses-terms: [TERM-TRIAGE, TERM-WORK-ITEM-SIZE, TERM-BLAST-RADIUS, TERM-LABEL-STATE]
---

## Rule

Every work item entering through requester intake MUST have a triage result that records its type, size, urgency, impact, dependencies, risks, blast radius, next route, decision owner, confidence and supporting evidence, or an explicit out-of-scope reason.

The public form MUST require only the problem and desired result, with optional examples or context. External requests MUST receive verified owner admission before any triage agent starts. Admission authorizes triage only, not refinement, implementation or merging. Opening an issue alone MUST NOT spend agent budget.

Triage MUST preserve the original request, mark each inference with its evidence source, distinguish unknowns and ask only questions that name a blocking outcome. The result MUST identify missing evidence and unresolved judgement separately, and MUST NOT derive lifecycle state from issue prose.

Native triage MUST record a provisional estimate from 1, 2, 3, 5, 8 or 13 relative points, explaining scope, dependencies and verification. Confidence and uncertainty MUST remain separate. Refinement MUST reconsider the estimate and preserve its prior value and revision reason.

## Rationale

Requesters describe needs, not engineering process. A preserved request and sourced analysis make inferred scope and initial sizing reviewable without inventing precision.

## Examples

A feature may proceed to refinement, a confirmed defect may select hotfix and a large item may select decomposition before refinement. An unknown dependency is recorded rather than treated as absent. A nonblocking detail is recorded as an assumption, not asked as a mandatory question.

## Exceptions

An engineer authorized under BR-ENTRY-AUTHORITY may enter refinement, implementation or planning without a triage run. The entry authorization and downstream prerequisite evidence remain explicit; neither is reported as a completed triage.

An emergency may use the hotfix route with a reduced triage form, but it still records impact, blast radius, containment, owner and verification evidence. Existing legacy classifier inputs remain supported without inventing a story-point conversion.
