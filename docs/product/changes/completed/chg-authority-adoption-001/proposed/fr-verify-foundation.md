---
id: FR-VERIFY-FOUNDATION
type: functional-requirement
title: Verify the adopted foundation, authorities and profiles
status: draft
derived-from: [UC-VERIFY-FOUNDATION, BR-FAIL-CLOSED, BR-AUTHORITY-BOUNDARIES]
verification:
  - scenario: A project with a valid manifest, passing applicable guardrails, passing recorded authorities and passing selected profiles reports success with the inspected paths and evidence.
  - scenario: A project with drift, a failed guardrail, an unavailable dependency, an unconfigured integration, an invalid recorded authority or a pending semantic or human review reports the condition explicitly and does not report full compliance.
  - scenario: A project with a guardrail or authority that does not apply to the selected baseline or profiles reports it as not-applicable rather than as a failure or success.
uses-terms: [TERM-GUARDRAIL, TERM-MANAGED-PROJECTION, TERM-PUBLIC-SITE-PROJECTION, TERM-AUTHORITY-MAP]
---

## Requirement

The product MUST provide deterministic verification for the declared foundation, recorded authorities and profiles and MUST distinguish `passed`, `failed`, `drift`, `unavailable`, `unconfigured`, `pending-review` and `not-applicable` results.

The verifier MUST resolve the applicable existing guardrails from the selected baseline and profiles, preserve each guardrail's independent `level` and `kind`, and report the verification method, evidence and next supported action for every result.

`pending-review` MUST mean that a semantic or human judgement is required and has not been completed. `unconfigured` MUST mean that an applicable integration or check has not been declared or enabled. `unavailable` MUST mean that a declared check cannot currently run or produce its evidence. None of these states is a passing result for a required guardrail or recorded authority.

Verification MUST check the repository convention contract, selected hard guardrails, managed projections, recorded ProductShape and ArcShape authorities and public-site authority requirements when that route is enabled. A failure MUST include the affected surface and the next supported action.

The product MUST preserve the existing human-readable verification route and MUST provide an equivalent machine-readable result for the same verification run.

## Rationale

Verification is the mechanism that turns reusable guidance into an adoptable and trustworthy baseline. Authority checks ensure that recording an integration is evidence of a valid provider surface rather than a stale manifest value.
