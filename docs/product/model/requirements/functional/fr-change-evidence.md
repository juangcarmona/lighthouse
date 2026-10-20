---
id: FR-CHANGE-EVIDENCE
type: functional-requirement
title: Report evidence for a foundation-governed change
status: draft
derived-from: [UC-IMPLEMENT-CHANGE, BR-HUMAN-AUTHORITY]
verification:
  - scenario: A completed change report names the inspected scope, checks, findings, preserved human decisions and source paths needed to review the result.
uses-terms: [TERM-GUARDRAIL, TERM-INTEGRATION]
---

## Requirement

The product MUST provide a reviewable evidence report for a foundation-governed change and MUST
identify unresolved findings or owner decisions instead of treating them as implementation success.

## Rationale

People and agents need a shared account of what was checked and what remains their responsibility.
