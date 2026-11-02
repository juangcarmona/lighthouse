---
id: BR-MEMORY-BOUNDARY
type: business-rule
title: Memory has explicit scope and ownership
status: draft
applies-to: [BC-FOUNDATION, UC-RUN-AGENT, UC-CONTINUE-AGENT-RUN]
uses-terms: [TERM-AGENT-MEMORY, TERM-AGENT-RUN, TERM-AUTHORITY-MAP, TERM-GUARDRAIL]
---

## Rule

Lighthouse MUST distinguish private run memory, durable project memory and optional shared cross-project memory. Every record MUST declare its scope, owner, source/provenance, confidence, retention and sensitivity. Project findings MUST remain bound to their repository, originating run, work item and revision.

An explicitly operator-approved project policy MAY authorize automatic retention of eligible non-sensitive findings within that project without per-learning human approval. Findings without applicable retention authorization MUST NOT be retained as durable project learnings. Credentials, sensitive or personal data and agent transcripts MUST NOT be retained as learnings. Shared cross-project memory MUST remain disabled by default and MUST require separate explicit enablement; project retention authorization MUST NOT authorize cross-project sharing.

The host MUST enforce read and write scope. Recall MUST require explicit authorization for the requesting run, relevance to its current work and a bounded result; a project's records MUST NOT be exposed to another project through project scope. Prior conversations MUST NOT be injected wholesale. Authorized project owners MUST be able to review, correct or invalidate retained records. Stale, expired, invalidated or superseded findings MUST be excluded from recall.

Remembered text MUST be treated as contextual data, not instructions or accepted truth, and MUST NOT override ProductShape, ArcShape, OpenSpec, current code, change evidence or approval authority. Retention authorization MUST NOT confer delivery or protected-effect authority.

## Rationale

Policy-authorized, scoped retention permits simple project continuity without repeated approval interruptions. Provenance and correction keep recalled findings reviewable while host-enforced boundaries prevent private or cross-project leakage and preserve independent authorities.

## Examples

One isolated run retains an eligible non-sensitive project finding under an operator-approved policy. A second authorized run in that project recalls it with its source; a run in another project cannot. A corrected record replaces a stale finding for recall, while an invalidated finding is excluded. A private run record remains private unless an explicit scope-authorized handoff permits access.

## Exceptions

An adopter MAY disable memory or leave an optional provider unconfigured or unavailable; Lighthouse MUST report the missing capability and allow ordinary work to continue without recall. If an adopter explicitly requires memory for an operation, unavailable required memory MUST stop that dependent operation with an actionable report. Disabling shared memory MUST disable cross-project recall, not otherwise-authorized project recall between runs. These availability choices do not relax retention eligibility, scope or authority boundaries.
