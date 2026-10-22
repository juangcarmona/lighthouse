---
id: FR-VERIFY-FOUNDATION
type: functional-requirement
title: Verify the adopted foundation and profiles
status: draft
derived-from: [UC-VERIFY-FOUNDATION, BR-FAIL-CLOSED]
verification:
  - scenario: A project with a valid manifest, passing applicable guardrails and passing selected profiles reports success with the inspected paths and evidence.
  - scenario: A project with drift, a failed guardrail, an unavailable dependency, an unconfigured integration or a pending semantic or human review reports the condition explicitly and does not report full compliance.
  - scenario: A project with a guardrail that does not apply to the selected baseline or profiles reports it as not-applicable rather than as a failure or success.
uses-terms: [TERM-GUARDRAIL, TERM-MANAGED-PROJECTION, TERM-PUBLIC-SITE-PROJECTION]
---

## Requirement

The product MUST provide deterministic verification for the declared foundation and profiles and MUST distinguish `passed`, `failed`, `drift`, `unavailable`, `unconfigured`, `pending-review` and `not-applicable` results.

The verifier MUST resolve the applicable existing guardrails from the selected baseline and profiles, preserve each guardrail's independent `level` and `kind`, and report the verification method, evidence and next supported action for every result.

`pending-review` MUST mean that a semantic or human judgement is required and has not been completed. `unconfigured` MUST mean that an applicable integration or check has not been declared or enabled. `unavailable` MUST mean that a declared check cannot currently run or produce its evidence. None of these states is a passing result for a required guardrail.

Verification MUST check the repository convention contract, selected hard guardrails, managed projections and public-site authority requirements when that route is enabled. A failure MUST include the affected surface and the next supported action.

The product MUST preserve the existing human-readable verification route and MUST provide an equivalent machine-readable result for the same verification run.

## Rationale

Verification is the mechanism that turns reusable guidance into an adoptable and trustworthy baseline. A catalog keeps existing guardrails discoverable, while explicit states keep people and agents from confusing an incomplete review with missing configuration or an unavailable tool.
