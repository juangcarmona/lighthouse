---
id: BR-MEMORY-BOUNDARY
type: business-rule
title: Memory has explicit scope and ownership
status: draft
applies-to: [BC-FOUNDATION]
uses-terms: [TERM-AGENT-MEMORY, TERM-AGENT-RUN, TERM-AUTHORITY-MAP, TERM-GUARDRAIL]
---

## Rule

Lighthouse MUST distinguish run memory, project memory and optional shared memory. Every retained record MUST declare its identity, scope, owner, source and provenance, repository, work-item and revision binding, confidence, retention and sensitivity. Private run records MUST remain visible only within their authorized run scope; project records MUST NOT be visible to another project. Shared cross-project memory MUST remain disabled unless separately and explicitly enabled by project policy.

An explicitly operator-approved project policy MAY authorize automatic retention of eligible non-sensitive findings within that repository or project without human approval of each finding. The host MUST enforce the approved eligibility policy and read and write scope. Without that authorization, an execution MUST NOT automatically retain project findings. Credentials, sensitive or personal data and agent transcripts MUST NOT be retained as learnings.

Recall MUST be explicitly authorized for the requesting execution, relevant to its current task and limited to the declared result bound. Authorization to retain a record MUST NOT itself authorize every later retrieval. Operators MUST be able to correct or invalidate records; invalidated, expired and known-stale records MUST be excluded from subsequent recall.

Memory MUST NOT override ProductShape, ArcShape, OpenSpec, current code, change evidence or approval authority. Remembered instructions and claims MUST remain untrusted context, not permission to change scope, approve work or advance a lifecycle stage. Durable storage and provider credentials MUST remain operator-owned outside disposable execution environments; provider credentials MUST NOT become memory content.

## Rationale

Scoped, reviewable findings allow continuity across isolated executions without preserving conversations or promoting remembered text to accepted truth. Explicit policy approval makes bounded routine retention automatic while preserving human product decisions and host-enforced access.

## Examples

An approved project policy allows one execution to retain a non-sensitive finding with source and revision binding. Another authorized execution in the same project recalls only that relevant finding with its provenance. A different project cannot retrieve the project record.

An operator invalidates an obsolete finding and later recall excludes it. Disabling shared memory does not prevent authorized cross-run recall of project-scoped records.

## Exceptions

An adopter MAY disable memory entirely. Disabled or absent optional memory MUST be reported as unavailable recall and MUST NOT prevent ordinary work; when the adopter explicitly requires memory for the work, its absence MUST stop that work with an actionable explanation. Optional availability never relaxes privacy, scope or authority boundaries.
