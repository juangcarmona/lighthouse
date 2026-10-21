---
id: BR-SDLC-PACKAGE-BOUNDARY
type: business-rule
title: Keep the SDLC package boundary explicit
status: draft
applies-to: [BC-FOUNDATION, UC-INITIALIZE-PROJECT, UC-RUN-SDLC, UC-ADOPT-CONSUMER]
uses-terms: [TERM-SDLC-PACKAGE, TERM-HARNESS, TERM-INTEGRATION, TERM-AUTHORITY-MAP]
---

## Rule

The SDLC package MUST own the lifecycle skills, commands, meta-commands, route and gate descriptors, provider-neutral schemas and deterministic checks that it distributes. It MAY declare contracts for state, memory, handoff and agent roles, but it MUST NOT run cross-repository orchestration, manage a fleet or shared budget, own provider runtime infrastructure or replace ProductShape, ArcShape, OpenSpec or the agent host.

## Rationale

An explicit boundary keeps the package useful as an adopter baseline while leaving software-factory coordination to the system that owns the repository fleet.

## Examples

The package can provide a `triage` command, a `propose` skill, a hotfix route descriptor, a gate schema and a verifier for the resulting evidence. A separate factory may consume those contracts to dispatch work across repositories.

## Exceptions

An adopter may add a provider adapter or a project-owned route when the adapter is declared in the control plane and does not silently replace an authority or introduce a hosted factory into the package.
