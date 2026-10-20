---
id: UC-INITIALIZE-AUTHORITIES
type: use-case
title: Initialize product and architecture authorities
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-OWNED-AUTHORITY, BR-AUTHORITY-BOUNDARIES, BR-FAIL-CLOSED]
uses-terms: [TERM-AUTHORITY-MAP, TERM-INTEGRATION, TERM-MANAGED-PROJECTION]
---

## Goal

Prepare a greenfield project with the Lighthouse baseline and the owned ProductShape and ArcShape initialization routes so product and architecture work can begin when the project needs them.

## Trigger

The adopter initializes a new project from Lighthouse or asks Lighthouse to prepare an empty target.

## Preconditions

The target is new or empty enough for the selected initializer, the pinned ProductShape and ArcShape integrations are available, and their managed paths are known.

## Main Flow

1. Lighthouse creates the foundation manifest, baseline projection and selected profile surfaces.
2. Lighthouse initializes ProductShape in its owned product paths and records the product integration version and verification route.
3. Lighthouse initializes ArcShape in its owned architecture paths and records the architecture integration version and verification route.
4. The project may leave both authorities at their initial empty or draft state while still retaining their initialization and ownership contracts.
5. Lighthouse writes or links a concise first-use orientation that explains the lifecycle stages, available routes, gates, authority ownership and next action.
6. Lighthouse verifies the resulting authority map, managed paths and integration health, then reports what was created, preserved or deferred.

## Alternative Flows

An existing project may adopt the authority integrations incrementally after an ownership inventory; a missing integration is reported as an explicit adoption gap rather than silently replaced.

## Failure Conditions

An initializer cannot prove its managed paths, a pinned tool is unavailable, a target file is project-owned or a provider validator fails.

## Postconditions

The project has a Lighthouse baseline, initialized ProductShape and ArcShape integration contracts, recorded versions, first-use orientation and an explicit route for starting product, architecture and delivery work.
