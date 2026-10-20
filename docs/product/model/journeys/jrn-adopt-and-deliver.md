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

An adopter has a project with a known Lighthouse baseline and can move a bounded change through its ProductShape context, ArcShape context and SDLC package delivery gates.

## Entry Conditions

The adopter has a project idea or repository and can select an initial technical profile.

## Journey Narrative

The adopter initializes or assesses the repository, checks external CodeGraph coverage, selects the smallest useful foundation profile, reviews ownership and checks, and verifies the result. ProductShape refines product intent and records a Product Change, ArcShape records the applicable architecture evidence, and Lighthouse triages the work item with complexity and blast-radius estimates before running the SDLC flow through OpenSpec or a manual route. Configured workflow labels carry the current handoff, while each stage stops at its configured gate before the next decision.

## Variants and Branches

An existing repository may adopt incrementally. ProductShape and ArcShape changes may progress at their own speed when the delivery records the revision or explicit exception it consumed. A project without one integration can use explicit project documents and adopt that authority later. A large item may branch into ordered child issues and stacked pull requests, while a confirmed defect may select the hotfix route. A failed check stops the journey at the evidence boundary that needs attention.

## Completion Conditions

The project has a recorded foundation state, a passing or explicitly excepted CodeGraph check, passing or explicitly excepted configured checks, and reviewable evidence for the completed change and its authority handoffs.
