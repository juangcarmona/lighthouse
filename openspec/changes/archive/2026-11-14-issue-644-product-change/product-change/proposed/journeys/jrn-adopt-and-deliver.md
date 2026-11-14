---
id: JRN-ADOPT-AND-DELIVER
type: journey
title: Adopt Lighthouse and deliver a verified project change
status: draft
primary-actor: ACT-ADOPTER
steps:
  - use-case: UC-INITIALIZE-PROJECT
  - use-case: UC-CHECK-CODEGRAPH
  - use-case: UC-INITIALIZE-AUTHORITIES
  - use-case: UC-ADOPT-PROFILE
  - use-case: UC-VERIFY-FOUNDATION
  - use-case: UC-TRIAGE-WORK-ITEM
  - use-case: UC-RUN-SDLC
  - use-case: UC-UPDATE-FOUNDATION
---

## Intended Outcome

An adopter has a known Lighthouse baseline, a compliant PDaC v1alpha2 product authority and reviewable evidence for bounded changes through applicable product and architecture context and delivery gates.

## Entry Conditions

The adopter has a project idea or repository and can select an initial technical profile.

## Journey Narrative

The adopter initializes or assesses the repository, checks external CodeGraph coverage, selects the smallest useful foundation profile, reviews ownership and checks, and verifies the result. New product authorities explicitly select PDaC v1alpha2; existing authorities are inspected and, when needed, migrated through a reviewed provider-owned route. ProductShape refines product intent and records Product Changes, ArcShape records applicable architecture evidence, and Lighthouse admits requester work through triage or accepts directly authorized engineering entry before delivery through the supported change flow or manual route.

Relevant domain lifecycles and structured behaviours guide refinement, planning, implementation and review. Verification traces applicable scenarios to executable tests and actual results without confusing model coverage with execution or acceptance. Workflow labels carry the current handoff, while each stage evaluates its own evidence and continuation authority.

## Variants and Branches

An existing repository may adopt incrementally. A project missing product authority may prepare explicit product documents and adopt that authority later, but remains incomplete and cannot claim compliant Lighthouse adoption until the PDaC v1alpha2 contract and compatible provider validate. Product and architecture changes may progress independently when delivery records the revision or explicit change-level exception consumed; architecture exceptions remain available. No change-level exception waives universal product-contract compliance.

A large item may branch into ordered child issues and stacked changes; a confirmed defect may select the hotfix route. A failed check stops at its evidence boundary. A change without applicable domain lifecycle coverage records a justified non-applicability rather than fabricating a lifecycle.

## Completion Conditions

The project has a recorded foundation state, compliant provider-validated PDaC v1alpha2 adoption, a passing or explicitly excepted CodeGraph check, passing or explicitly excepted applicable checks and reviewable evidence for the completed change and authority handoffs. Missing coverage, unexecuted scenarios, stale evidence and unresolved acceptance remain visible and cannot be represented as verified success.
