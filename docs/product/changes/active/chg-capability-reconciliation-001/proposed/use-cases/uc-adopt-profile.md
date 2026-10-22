---
id: UC-ADOPT-PROFILE
type: use-case
title: Adopt a Lighthouse technical profile
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-OWNED-AUTHORITY, BR-FAIL-CLOSED]
uses-terms: [TERM-PROFILE, TERM-ADOPTION, TERM-GUARDRAIL, TERM-FOUNDATION-CAPABILITY]
---

## Goal

Add a bounded technical capability to an existing project while making ownership, checks and exceptions visible.

## Trigger

The adopter selects the visual contract, a technical backend profile or another declared capability profile. The adopter may compose profiles only after their ownership and integration contract are declared.

## Preconditions

The profile declares its prerequisites, owned surfaces, verification commands and exception path, and the selected capability declarations are readable.

## Main Flow

1. Lighthouse inspects the target and identifies the profile and capability adoption routes.
2. The adopter reviews the proposed files, dependencies, checks and capability reconciliation plan.
3. Lighthouse applies only the profile-owned and capability-owned changes that the route permits.
4. The adopter resolves or records any reported conflict and runs verification.

## Alternative Flows

The adopter may enable guidance without enabling a required check, provided the project records that the check is recommended rather than configured. An ambiguous capability mapping remains pending for human review.

## Failure Conditions

Ownership cannot be proven, a prerequisite is missing, a capability provider is unavailable or a profile check fails.

## Postconditions

The project records the profile and capability state, their evidence and any explicit exception.
