---
title: Lighthouse engineering roadmap
description: Reconciled implementation roadmap for the Lighthouse baseline and its packages.
---

# Lighthouse engineering roadmap

This document sequences implementation work; it is not a second product or architecture authority.

Product intent lives in [ProductShape](../product/README.md), architecture lives in [the ArcShape sections](../architecture/README.md), and package contracts live with their source under `src/`.

## Current baseline

The applied foundation change defines Lighthouse as a project-owned delivery harness that integrates ProductShape, ArcShape and OpenSpec without replacing them or becoming a factory runtime.

The applied adoption change defines repository boundaries, hard and soft guardrails, public-site projection, CI verification and non-destructive brownfield adoption.

The applied SDLC package change defines the independent lifecycle package, its stages, routes, gates, provider-neutral control-plane contracts and deterministic checks.

The current repository implements the CLI, UI and SDLC package boundaries, package verification, adoption fixtures, the React web, web BFF, PWA, Expo and .NET MAUI profiles and the generated public story; the published packages now include deterministic SDLC planning, execution contracts and the first capability-adoption vertical slice.

## Ownership boundary

Lighthouse distributes the baseline, profiles, lifecycle contracts, guardrails and adoption checks that a project can run locally or in CI.

An adopting project owns its product code, architecture decisions, infrastructure, exceptions and any local factory or operational tooling.

The `.lighthouse/` projection records configuration and evidence for the selected package; it is not a runtime database, transcript store or cross-repository orchestration service.

## Reconciled roadmap

| Slice | Status | Next result |
| --- | --- | --- |
| Foundation and ownership | Complete | Keep ProductShape, ArcShape, OpenSpec and factory boundaries explicit. |
| Adoption contract | Complete | Preserve non-destructive initialization, package ownership and public-site failure hints. |
| SDLC package contract | Complete baseline | Add host adapters and real execution only when a consumer requires them. |
| Standards registry and verification | Complete baseline | Keep the catalog extensible and verify existing guardrails without adding practices through implementation work. |
| Capability adoption and reconciliation | First vertical slice complete | Keep catalog, plan, explicit apply, verification and evidence stable; extend the contract only for a demonstrated adopter need. |
| SDLC contract and planning | Complete baseline | Keep stage results, route planning, deterministic state, memory, triage and decomposition contracts stable while adopters exercise them. |
| Tracker and forge projections | Complete baseline | Keep GitHub issue, label, dependency and pull-request projections read-only by default with explicit mutations. |
| Profiles and stack checks | Web, PWA and native mobile profiles complete | Keep React web, web BFF, PWA, Expo and .NET MAUI contracts explicit, mutually compatible and backed by deterministic consumer fixtures. Add another profile only for a real stack with an owned contract and verification path. |
| Distribution and adopter proof | First proof complete | Keep clean-consumer and package checks green and repeat the upgrade proof for future capabilities. |
| Evidence contract and coverage | First vertical slice in progress | Keep producer payloads compatible, relate evidence to ProductShape and ArcShape subjects and defer quality evaluation to a separate product until a second consumer justifies it. |
| Continuous improvement | Later | Measure adoption, failures and maintenance cost before adding more standards or automation. |

## Immediate implementation slice

The complete SDLC delivery plan is tracked in [the SDLC delivery plan](lighthouse-sdlc-delivery.md). Each slice adds a deterministic contract or projection to the existing packages, proves it with fixtures and keeps runtime ownership with the adopter's agent host.

Do not create `@juangcarmona/lighthouse-evidence` yet. Keep evidence contracts in the existing packages until a second consumer proves that independent versioning and installation are useful.

The active evidence change adds the common record and coverage projection inside the SDLC package. It deliberately does not create QuaShape, score quality or make incomplete evidence a delivery blocker.

## References

- [Foundation product change](../product/changes/completed/chg-initial/change.md)
- [Adoption foundation product change](../product/changes/completed/chg-adoption-foundation-001/change.md)
- [SDLC package product change](../product/changes/completed/chg-sdlc-package-001/change.md)
- [Lighthouse and adopter ownership](../architecture/09-architecture-decisions/0001-lighthouse-and-factory-ownership.md)
- [Distribution and versioning](../architecture/09-architecture-decisions/0002-distribution.md)
- [Source packages and adopter projections](../architecture/09-architecture-decisions/0005-source-packages-and-adopter-projections.md)
- [Evidence contract product change](../product/changes/active/chg-lh-evidence-contract-001/change.md)

## Real execution proof

The [factory integration roadmap](factory-reconciliation.md) owns the next execution slices. Contract/planning completion above means package and fixture completion. Automatic issue intake, complete continuation enforcement, external-host admission and real change delivery remain gaps until that roadmap's consumer evidence exists.
