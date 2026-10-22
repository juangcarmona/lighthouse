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

The current repository implements the CLI, UI and SDLC package boundaries, package verification, adoption fixtures and the generated public story; profile-aware initialization, full evidence contracts and host-specific execution remain incomplete.

## Ownership boundary

Lighthouse distributes the baseline, profiles, lifecycle contracts, guardrails and adoption checks that a project can run locally or in CI.

An adopting project owns its product code, architecture decisions, infrastructure, exceptions and any local factory or operational tooling.

SoFa is a planned first dogfooding consumer of Lighthouse. It is not a Lighthouse dependency, and its workers, scheduling, shared budgets, durable runtime state and fleet operations stay in SoFa.

The `.lighthouse/` projection records configuration and evidence for the selected package; it is not a runtime database, transcript store or cross-repository orchestration service.

## Reconciled roadmap

| Slice | Status | Next result |
| --- | --- | --- |
| Foundation and ownership | Complete | Keep ProductShape, ArcShape, OpenSpec and factory boundaries explicit. |
| Adoption contract | Complete | Preserve non-destructive initialization, package ownership and public-site failure hints. |
| SDLC package contract | Contract delivered | Add host adapters and real execution only when a consumer requires them. |
| Standards registry and verification | Next | Define applicable practices, profiles, exceptions and machine-readable verification without creating a package per concern. |
| Engineering profiles | Partial | Extend the .NET and UI reference material only when a real stack has an owned contract and deterministic checks. |
| Evidence engineering | Partial | Stabilize the evidence shape and validators from current checks before considering an independent evidence package. |
| Distribution and dogfooding | Deferred | Keep clean-consumer and package checks green; begin SoFa dogfooding only after the baseline provides useful standards and verification. |
| Continuous improvement | Later | Measure adoption, failures and maintenance cost before adding more standards or automation. |

## Immediate implementation slice

The next Lighthouse slice is a standards registry and verifier that can report applicability, evidence, unsupported checks and explicit exceptions without claiming that unavailable checks passed.

The slice should extend the existing CLI and package contracts only where the current product model permits it, and should prove its output in the clean consumer fixture before adding more profiles, runtime integrations or SoFa adoption work.

SoFa remains a later validation target. Its product change, execution prompt and runtime implementation should wait until Lighthouse has a stable verifier, usable profile applicability and a release that adds value to the consuming project.

Do not create `@juangcarmona/lighthouse-evidence` yet. Keep evidence contracts in the existing packages until a second consumer proves that independent versioning and installation are useful.

## References

- [Foundation product change](../product/changes/completed/chg-initial/change.md)
- [Adoption foundation product change](../product/changes/completed/chg-adoption-foundation-001/change.md)
- [SDLC package product change](../product/changes/completed/chg-sdlc-package-001/change.md)
- [Lighthouse and adopter ownership](../architecture/09-architecture-decisions/0001-lighthouse-and-factory-ownership.md)
- [Distribution and versioning](../architecture/09-architecture-decisions/0002-distribution.md)
- [Source packages and adopter projections](../architecture/09-architecture-decisions/0005-source-packages-and-adopter-projections.md)
