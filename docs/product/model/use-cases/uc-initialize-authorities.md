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

Prepare a project to use ProductShape and ArcShape while preserving each provider's source of truth, with explicit PDaC v1alpha2 product-authority compliance for new and existing adopters.

## Trigger

The adopter initializes a new Lighthouse project, or asks Lighthouse to inspect an existing project's product and architecture authorities.

## Preconditions

The pinned ProductShape and ArcShape integrations are available, their supported operations are discoverable, and the target's ownership and managed surfaces can be inspected.

## Main Flow

1. Lighthouse inspects the target and selects greenfield initialization or explicit brownfield adoption.
2. For greenfield initialization, Lighthouse previews each provider's supported initialization and explicitly selects PDaC v1alpha2 for ProductShape before the adopter authorizes application.
3. For brownfield adoption, Lighthouse discovers existing authority surfaces and runs supported read-only provider validation without reinitializing them.
4. Lighthouse checks the product configuration and provider compatibility, and reports status, serialization version, provider version, ownership, evidence and the next supported action for each authority.
5. The adopter reviews the dry-run plan and explicitly applies only a valid brownfield adoption or conflict-free greenfield initialization.
6. Lighthouse records adopted provider versions and the product serialization version separately, verifies the authorities and reports what it created, preserved or deferred.

## Alternative Flows

An existing project may adopt incrementally and record an authority as absent or out of scope, but missing or incompatible ProductShape remains an incomplete adoption and cannot satisfy the universal product contract. Architecture exceptions remain governed by the authority map. A legacy product model follows a reviewed, provider-owned migration route before adoption is re-evaluated; it is never repaired by implicit reinitialization.

## Failure Conditions

An authority is absent or invalid, a provider is unavailable or unsupported, the product configuration is missing, legacy or conflicting, a Lighthouse projection has drifted, or a target surface is owned by another system. Lighthouse reports the condition and repair route without recording compliant adoption or overwriting provider-owned content.

## Postconditions

The project has recorded and verified authority adoption under the required product contract, or an actionable bounded report identifying the authority, version gap, validation evidence and next action. Provider-owned content remains unchanged by Lighthouse's adoption recording.
