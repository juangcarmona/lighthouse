---
id: BR-MEMORY-BOUNDARY
type: business-rule
title: Memory has explicit scope and ownership
status: draft
applies-to: [BC-FOUNDATION, UC-RUN-AGENT, UC-CONTINUE-AGENT-RUN]
uses-terms: [TERM-AGENT-MEMORY, TERM-AGENT-RUN, TERM-AUTHORITY-MAP, TERM-GUARDRAIL]
---

## Rule

Lighthouse MUST distinguish run memory, project memory and optional shared memory. Every record MUST declare its scope, owner, source, confidence, retention and sensitivity, and MUST NOT contain credentials or silently override ProductShape, ArcShape or change evidence.

## Rationale

Scoped typed memory lets agents reuse verified context without turning a repository into an opaque transcript or a shared service into an uncontrolled source of truth.

## Examples

A run can retain a tool result for its child runs, a project can retain an accepted decision reference, and an external provider can retain reusable facts only when the project explicitly enables that scope.

## Exceptions

An adopter may disable shared memory and keep only run and project records; the route MUST then report that cross-run recall is unavailable.
