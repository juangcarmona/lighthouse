---
id: FR-VERIFY-FOUNDATION
type: functional-requirement
title: Verify the adopted foundation, authorities and profiles
status: draft
derived-from: [UC-VERIFY-FOUNDATION, BR-FAIL-CLOSED, BR-AUTHORITY-BOUNDARIES]
verification:
  - scenario: A valid foundation with passing applicable guardrails, compliant PDaC v1alpha2, compatible recorded authorities and passing selected profiles reports success with inspected scope and evidence.
  - scenario: Drift, failed guardrails, unavailable dependencies, unconfigured integrations, invalid authorities and pending semantic or human review remain explicit and do not report full compliance.
  - scenario: A guardrail outside the selected baseline or profiles reports justified non-applicability without exempting the universal product contract.
  - scenario: Missing product configuration, v1alpha1, conflicting versions and unsupported providers each prevent compliant adoption and yield equivalent human-readable and JSON evidence and supported repair routes, including for Lighthouse itself.
uses-terms: [TERM-GUARDRAIL, TERM-MANAGED-PROJECTION, TERM-PUBLIC-SITE-PROJECTION, TERM-AUTHORITY-MAP]
---

## Requirement

Lighthouse MUST provide deterministic verification for the declared foundation, authorities and profiles and distinguish passed, failed, drift, unavailable, unconfigured, pending-review and not-applicable results.

The verifier MUST resolve applicable existing guardrails from the selected baseline and profiles, preserve each guardrail's independent level and kind, and report verification method, evidence and the next supported action for every result. Pending-review MUST identify required unresolved semantic or human judgement; unconfigured MUST identify an applicable integration or check not declared or enabled; unavailable MUST identify a declared check that cannot run or produce evidence. None is passing evidence for a required obligation.

Verification MUST check repository conventions, selected hard guardrails, managed projections, recorded ProductShape and ArcShape authorities and public-site authority requirements when enabled. Every adopter, including Lighthouse, MUST also be checked for explicit provider-validated PDaC v1alpha2 and compatible ProductShape, even when product authority has not been recorded. Missing configuration, v1alpha1, version conflicts and unsupported providers MUST report an adoption gap and supported repair or reviewed migration route, never compliant adoption or a not-applicable product contract.

The product MUST preserve human-readable verification and provide an equivalent JSON result for the same run. A failure or evidence gap MUST identify the affected surface and next supported action.

## Rationale

Verification turns guidance into a trustworthy adoption contract. Recording an authority or selecting a profile cannot hide absent or incompatible product authority.
