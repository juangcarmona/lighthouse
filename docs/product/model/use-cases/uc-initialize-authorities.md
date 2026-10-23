---
id: UC-INITIALIZE-AUTHORITIES
type: use-case
title: Initialize or adopt product and architecture authorities
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-OWNED-AUTHORITY, BR-AUTHORITY-BOUNDARIES, BR-FAIL-CLOSED]
uses-terms: [TERM-AUTHORITY-MAP, TERM-INTEGRATION, TERM-MANAGED-PROJECTION]
---

## Goal

Prepare a project to use ProductShape and ArcShape while preserving each provider's source of truth, whether the target is new or already contains valid authority documentation.

## Trigger

The adopter initializes a new Lighthouse project, or asks Lighthouse to inspect an existing project's product and architecture authorities.

## Preconditions

The pinned ProductShape and ArcShape integrations are available, their supported commands are discoverable, and the target's ownership and managed paths can be inspected.

## Main Flow

1. Lighthouse reads the target and chooses the greenfield initializer or the explicit brownfield adoption route.
2. For greenfield initialization, Lighthouse previews and then runs each provider's supported initializer through its owned route.
3. For brownfield adoption, Lighthouse discovers the canonical ProductShape and ArcShape surfaces and runs their read-only validators.
4. Lighthouse reports the authority status, provider version, inspected path, ownership boundary, evidence and next action for each authority.
5. The adopter reviews the dry-run plan and explicitly applies only a valid brownfield adoption or a conflict-free greenfield initialization.
6. Lighthouse records the adopted versions in its own manifest, verifies the authorities and reports what it created, preserved or deferred.

## Alternative Flows

An existing project may adopt either authority independently only when the manifest records the other as absent or out of scope; a missing or invalid authority never becomes adopted through an implicit initializer.

## Failure Conditions

An authority path is absent, its validator fails, its provider is unavailable, the Lighthouse projection has drifted or a target file is owned by another system.

## Postconditions

The project has either a recorded and verified authority adoption or a bounded report that identifies the provider, path, validator, conflict and next supported action. Provider-owned files remain unchanged by Lighthouse.
