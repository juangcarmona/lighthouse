---
id: CHG-ADOPTION-FOUNDATION-001
type: product-change
title: Define the adoptable repository foundation
status: applied
base-revision: '4dab29dfaff1efc3b1800a44348e4cb63902cbd4'
operations:
  add:
    - FR-REPOSITORY-CONVENTIONS
  modify:
    - UC-INITIALIZE-PROJECT
    - FR-INITIALIZE-FOUNDATION
    - FR-PUBLIC-SITE-PROJECTION
    - BR-PUBLIC-SITE-PROJECTION
    - FR-VERIFY-FOUNDATION
    - FR-CONSUMER-ADOPTION
  remove: []
---

## Problem

The Product Definition describes a Lighthouse foundation, but it does not yet state the repository conventions, installation ownership and public-site publication contract that an adopter receives from `lighthouse init`.

## Intended Product Outcome

Lighthouse gives an adopting repository a predictable source, documentation, infrastructure and automation layout, deterministic local and CI guardrails, and a public-site route that publishes a coherent ProductShape and ArcShape view when the site is enabled.

## Rationale

These rules are the smallest useful adoption contract for making projects look and behave consistently before adding more delivery capabilities. The public site is valuable only when it explains the same product and architecture that govern the repository, so a missing or invalid authority must stop publication with a clear next action.

## Affected Product Areas

Repository initialization, adoption planning, managed projections, repository conventions, hard and soft guardrails, GitHub delivery, ProductShape and ArcShape integration, public-site publication, CI verification and clean-consumer evidence.

## Open Questions

None.

## Product Acceptance

A greenfield initialization creates the baseline repository boundaries, enables the public-site route by default and reports the selected integrations, guardrails and managed paths. A brownfield initialization shows the proposed changes and preserves conflicting or project-owned files until a person resolves them. Conventional Commits, the configured branch convention, repository boundaries and selected profile checks have deterministic local and CI verification, while judgement-based guidance is available as agent and human instructions. When a public site is enabled, a valid ProductShape definition and valid ArcShape documentation are required before a new publication is built; a missing authority stops the build with a command-oriented hint and produces no partial deployment. A clean consumer can install the published package, run initialization and verification, exercise the guardrails, and publish the site after both authorities are present.

## Out of Scope

This change does not define the SDLC stages, agent roles, memory model, tracker operations, application stack templates or a hosted Lighthouse service. It does not replace ProductShape or ArcShape, and it does not make the public site a second source of product or architecture truth.
