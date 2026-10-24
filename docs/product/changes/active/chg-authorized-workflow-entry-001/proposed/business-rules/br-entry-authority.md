---
id: BR-ENTRY-AUTHORITY
type: business-rule
title: Authorize entry and continuation independently from autonomy
status: draft
applies-to: [BC-FOUNDATION, UC-RUN-SDLC, UC-TRIAGE-WORK-ITEM, UC-CONTINUE-AGENT-RUN]
uses-terms: [TERM-DELIVERY-ROUTE, TERM-AGENT-RUN, TERM-GATE, TERM-WORKFLOW-STATE]
---

## Rule

Lighthouse MUST distinguish an admitted requester from an engineer authorized by the adopting repository. The adapter MUST supply verified actor identity and repository capabilities from trusted providers; issue prose, claimed roles, label presence and model output MUST NOT grant authority. Repository policy MUST define who may submit requests, authorize work, answer a pending question, cancel work, integrate changes or change policy. No GitHub organization is required.

An admitted request enters triage. An authorized engineer MAY request refinement, implementation or planning directly. Opening an engineer-authored issue alone MUST NOT spend an agent budget unless the repository explicitly opts into that behavior. Direct entry MUST check the selected workflow's actual prerequisites and record its authorization; it MUST NOT fabricate a triage result or skip required readiness, risk, scope or verification evidence.

Each authorization MUST identify requester, authorizer, repository, work item, permitted workflows and effects, scope, source and policy revisions, limits and revocation state. Supervised or unattended execution is selected separately from the entry point. Merge and release authority MUST be evaluated separately from permission to implement. Unattended work requires explicit bounded delegation and independent review; missing policy never implies permission.

A trusted continuation MUST bind the prior validated result and the still-effective authorization. A bot identity alone MUST NOT authorize arbitrary work. An admitted answer MAY resume only the matching pending question; it MUST NOT expand scope, change autonomy or approve integration. Changed or revoked authority MUST prevent dependent dispatch and publication.

## Rationale

An engineer can delegate defined work without repeating requester intake, while a requester can receive automated delivery under a previously authorized intake policy. Both need attributable authority through the complete run.

## Examples

A repository grants its owner direct refinement and implementation capabilities. A requester supplies an issue; passing triage continues under the repository's bounded policy. An engineer requests implementation of a defined issue; the harness prepares any required proposal before code changes. A reply to a clarification supplies information but grants no new capability.

## Exceptions

None. A repository may narrow these capabilities or keep every run supervised.
