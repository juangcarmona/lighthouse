---
id: FR-VERIFY-FOUNDATION
type: functional-requirement
title: Verify the adopted foundation and profiles
status: draft
derived-from: [UC-VERIFY-FOUNDATION, BR-FAIL-CLOSED]
verification:
  - scenario: A project with a valid manifest, passing configured guardrails and passing selected profiles reports healthy bundle evidence with the inspected paths and evidence.
  - scenario: A project with drift, a failed guardrail, an unavailable dependency or an invalid public-site authority reports the condition explicitly and does not report full compliance.
  - scenario: A project with an unconfigured optional integration reports it as unconfigured rather than silently claiming that its checks passed.
uses-terms: [TERM-FOUNDATION, TERM-DELIVERY-BUNDLE, TERM-GUARDRAIL, TERM-MANAGED-PROJECTION, TERM-PUBLIC-SITE-PROJECTION]
---

## Requirement

The product MUST provide deterministic health evidence for the declared delivery bundle and profiles and MUST distinguish success, failure, drift, unavailable evidence and unconfigured recommendations. Verification MUST check the repository convention contract, selected hard guardrails, managed projections and public-site authority requirements when that route is enabled. A failure MUST include the affected surface and the next supported action.

## Rationale

Health evidence makes the delivery bundle reviewable. Clear failure categories keep an adopter from mistaking an absent integration or a failed public projection for a successful foundation.
