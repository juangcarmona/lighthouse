---
id: FR-VERIFY-FOUNDATION
type: functional-requirement
title: Verify the adopted foundation and profiles
status: draft
derived-from: [UC-VERIFY-FOUNDATION, BR-FAIL-CLOSED]
verification:
  - scenario: A project with a valid manifest and passing configured checks reports success with the inspected profiles and evidence paths.
  - scenario: A project with drift, a failed guardrail or an unavailable dependency reports the condition explicitly and does not report full compliance.
uses-terms: [TERM-GUARDRAIL, TERM-MANAGED-PROJECTION]
---

## Requirement

The product MUST provide deterministic verification for the declared foundation and profiles and
MUST distinguish success, failure, drift, unavailable evidence and unconfigured recommendations.

## Rationale

Verification is the mechanism that turns reusable guidance into an adoptable and trustworthy
baseline.
