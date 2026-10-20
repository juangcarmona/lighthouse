---
id: SB-VERIFY
type: structured-behaviour
title: Report foundation verification honestly
status: draft
illustrates: [UC-VERIFY-FOUNDATION, BR-FAIL-CLOSED]
given:
  - The project declares a Lighthouse foundation and selected profiles.
  - One configured guardrail has drifted or failed.
when: The adopter runs foundation verification
then:
  - The result identifies the failed or drifted guardrail.
  - The result does not report full compliance.
  - The result points to the evidence and documented repair or exception route.
uses-terms: [TERM-GUARDRAIL, TERM-MANAGED-PROJECTION]
---

## Intent

Make an actionable failure more trustworthy than an optimistic summary.

## Boundaries

This example does not decide whether the adopter accepts an exception or merges a change.
