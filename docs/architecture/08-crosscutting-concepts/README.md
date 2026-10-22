---
title: Crosscutting concepts
arc42-section: "08"
description: Ownership, profile, verification, visual and projection mechanisms shared by Lighthouse blocks.
---

# 8. Crosscutting concepts

## Authority ownership

ProductShape owns product intent, ArcShape owns architecture documentation and OpenSpec owns change artifacts.

Lighthouse owns its initializer, package contracts, repository checks and adopter projections.

The SDLC package owns lifecycle skills, commands, meta-commands, routes and gates. The CLI records its selected version and host adapters in `.lighthouse/sdlc.json`; the file is configuration and evidence, not agent runtime state.

## Profile selection

Initialization resolves a baseline plus compatible profiles from the declared application shape and stacks. The CLI publishes the profile catalog as data and exposes the same composition through `lighthouse profiles` and machine-readable verification output.

Profiles declare prerequisites, owned content, examples, verification commands, failure consequences and exception routes.

Profile verification layers are applicability metadata and do not make every test layer mandatory. Each layer carries its own level, kind and evidence method so a project can distinguish required deterministic checks from recommended semantic or human review.

## Soft and hard guardrails

Soft guardrails are skills, guides, `DESIGN.md` templates and examples that explain the expected practice.

Hard guardrails are deterministic linters, analyzers, hooks, tests or CI checks that can verify the practice.

An unsupported or non-deterministic check remains visible as an adoption gap instead of being reported as compliant.

The CLI package records these existing guardrails as data in its packaged catalog, including profile applicability, independent level and kind, verification method, evidence status and repair hint. The verifier reads catalog entries and preserves the default human-readable result while exposing the same result as JSON; adding a catalog entry does not require changing the CLI core.

## Capability adoption

The SDLC package publishes a versioned capability catalog. Every catalog entry names a registered adapter; package verification fails closed when a new entry has no adapter, so a future capability cannot become discoverable without an executable adoption route and its consumer fixture.

Capability adoption is dry-run first. The CLI reads provider state to build a deterministic plan, requires an explicit plan hash for external writes, applies only allowed operations, re-reads before writing, verifies the final state and records desired, observed, target and operation evidence under `.lighthouse/reconciliation/`.

The current adapter supports GitHub labels. It creates missing labels and preserves existing values; ambiguous equivalents, destructive operations, provider drift and partial failures stop or remain resumable. The provider remains the source of truth and no provider write occurs during package installation or ordinary upgrade discovery.

## Feature and bounded-context alignment

The full-stack profile keeps frontend feature areas, API boundaries, application handlers, domain behavior and evidence catalogues aligned with bounded contexts.

The mapping is a structural aid for maintenance and testing; it does not require a particular frontend framework.

## Test progression

The target .NET profile starts with red-green unit development, adds integration and other applicable layers, and records end-to-end evidence by bounded context.

NSubstitute is the default .NET test-double library where the profile applies.

## Managed projections

`LIGHTHOUSE.md` is generated from a consuming project's manifest and is not edited as an independent source.

ProductShape, ArcShape and OpenSpec generated files remain provider-owned and are changed through their provider routes.

## Visual contract

The UI package provides semantic tokens, native recipes and `DESIGN.md`; initialization can project a soft visual skill and a deterministic token verifier when the selected stack supports them.

## Current repository and target application

| Concern | Current Lighthouse repository | Target initialized application |
| --- | --- | --- |
| Source boundary | `src/packages/`, `src/dotnet/`, `src/gallery/` and `src/public-site/` | Product-owned `src/` with selected profiles and application code |
| Documentation authority | ProductShape and ArcShape sources in `docs/` | The adopter's initialized ProductShape and ArcShape routes |
| Composition | No hosted Lighthouse runtime | Aspire AppHost composes the selected application services |
| Verification | npm, .NET, link, visual and site checks | Profile checks plus project-owned unit, integration and end-to-end evidence |
| SDLC contract | `src/packages/sdlc/` and `.lighthouse/sdlc.json` projection | Selected package contract and host-specific adapters |
| Public explanation | Generated landing, ProductShape snapshot and ArcShape snapshot | Optional adopter documentation and package-owned guidance |
