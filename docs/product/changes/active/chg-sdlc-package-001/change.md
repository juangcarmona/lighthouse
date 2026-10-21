---
id: CHG-SDLC-PACKAGE-001
type: product-change
title: Define the Lighthouse SDLC package contract
status: proposed
base-revision: 'ec62d169a21adbd5a423f8a59a69ffaa60aee9df'
operations:
  add:
    - TERM-SDLC-PACKAGE
    - BR-SDLC-PACKAGE-BOUNDARY
  modify:
    - FR-SDLC-LIFECYCLE
    - FR-PACKAGE-DELIVERY
    - FR-AGENT-CONTROL-PLANE
  remove: []
---

## Problem

The Product Definition describes the lifecycle Lighthouse should expose, but it does not yet define the SDLC package as a stable product boundary or state which capabilities belong in that package instead of the core harness or an external factory.

## Intended Product Outcome

Lighthouse has a versioned, provider-neutral SDLC package contract that owns lifecycle skills, commands, meta-commands, route and gate descriptors, package schemas and deterministic checks while the core harness discovers and installs it without duplicating its definitions.

## Rationale

This boundary turns the existing lifecycle intent into an implementable package without making Lighthouse a hosted factory or a second authority for ProductShape, ArcShape or OpenSpec. It gives the first implementation slice a small surface that can be verified in a clean adopter before adding adapters or runtime capabilities.

## Affected Product Areas

The SDLC stage contract, package delivery, initialization discovery, repository-owned control-plane configuration, route and gate descriptions, provider-neutral state and handoff contracts, and the boundary between Lighthouse and an external software factory.

## Open Questions

None.

## Product Acceptance

The accepted model names the SDLC package, defines its owned artifacts and states that initialization records and projects the selected package without copying duplicate definitions. The package contract includes the required stages and optional routes, preserves the existing gates, allows provider-neutral state, memory and handoff schemas, and explicitly excludes cross-repository orchestration, fleet monitoring, budget management, provider runtime infrastructure and replacement of ProductShape, ArcShape or OpenSpec.

## Out of Scope

This change does not implement the package, select an agent host, choose a registry name, add a tracker adapter, create a workflow runtime or move software-factory responsibilities into Lighthouse. It does not change ProductShape or ArcShape ownership and does not apply the proposed artifacts to the canonical model.
