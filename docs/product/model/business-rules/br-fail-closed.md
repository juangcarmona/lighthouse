---
id: BR-FAIL-CLOSED
type: business-rule
title: Verification reports failure honestly
status: draft
applies-to: [BC-FOUNDATION, UC-VERIFY-FOUNDATION, UC-UPDATE-FOUNDATION]
uses-terms: [TERM-GUARDRAIL, TERM-MANAGED-PROJECTION]
---

## Rule

Lighthouse MUST report a failed, unavailable or drifted check explicitly and MUST NOT represent an
unverified project as compliant.

## Rationale

The foundation is useful only when people and agents can trust the difference between evidence,
absence of evidence and success.

## Examples

A stale managed projection is drift, a missing optional integration is unconfigured, and a failed
Roslyn rehearsal is a failure; none is reported as passing.

## Exceptions

None.
