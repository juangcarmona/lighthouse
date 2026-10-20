---
id: UC-CONFIGURE-AGENT-CONTROL-PLANE
type: use-case
title: Configure the Lighthouse agent control plane
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-MAINTAINER, ACT-AGENT-HOST]
bounded-context: BC-FOUNDATION
governed-by: [BR-AGENT-LAUNCH, BR-MEMORY-BOUNDARY, BR-WORKFLOW-STATE, BR-LABEL-ROLES]
uses-terms: [TERM-HARNESS, TERM-AGENT-ROLE, TERM-AGENT-MEMORY, TERM-WORKFLOW-STATE, TERM-LABEL-STATE]
---

## Goal

Declare the small repository-owned control plane that connects Lighthouse routes to an agent host, memory provider and tracker.

## Trigger

The adopter initializes or updates an enabled Lighthouse profile.

## Preconditions

The project has an authority map, a supported host adapter or an explicit manual route, and a configured tracker when labels are enabled.

## Main Flow

1. Lighthouse writes or validates the provider-neutral control-plane declaration under `.lighthouse/`.
2. The declaration names role contracts, route transitions, memory scopes, state storage and tracker label roles without copying provider-owned files.
3. Lighthouse checks the declaration for missing owners, invalid transitions, overlapping write scopes and unsupported providers.
4. The adopter receives the enabled capabilities, limits and adoption gaps.

## Alternative Flows

An adopter can run without shared memory or without a tracker adapter while keeping local run state and reporting those capabilities as unavailable.

## Failure Conditions

The declaration attempts to own a provider-managed path, contains an illegal state transition, grants an unbounded role or assigns one label both roles.

## Postconditions

The repository has a small, reviewable control-plane contract or an explicit incomplete adoption state; it does not contain an agent provider database or opaque transcript cache.
