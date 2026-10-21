---
title: Architecture constraints
arc42-section: "02"
description: Repository, runtime, ownership and profile constraints that shape Lighthouse.
---

# 2. Architecture constraints

## Technical constraints

- Node.js 22 or newer runs the workspace tooling.
- npm workspaces keep implementation packages under `src/packages/`.
- The .NET reference profile uses the SDK declared by `src/dotnet/global.json`.
- Repository documentation belongs under `docs/` and implementation belongs under `src/`.
- Verification must run locally without a hosted Lighthouse service.
- Build output, browser reports and generated ProductShape and ArcShape projections remain disposable.

## Initialization constraints

- Every initialized application includes Aspire as its composition and execution boundary.
- A frontend-only application does not receive a Lighthouse-owned backend by implication.
- A Lighthouse-owned backend uses the feature-aligned modular monolith profile by default.
- A requested microservice selects a service profile instead of the modular monolith profile.
- Other stacks contribute their own profiles, conventions and deterministic checks.

## Ownership constraints

- Product intent belongs to ProductShape when a project adopts it.
- Architecture documentation belongs to ArcShape when a project adopts it.
- OpenSpec owns change-artifact schemas and managed change files.
- Lighthouse owns its source packages, initializer, checks and adoption guidance.
- An adopting project owns its application code, infrastructure and explicit exceptions.
- Provider-owned generated files are changed through their provider.

## Current implementation constraint

The current Lighthouse CLI implements only manifest validation, initialization of the managed projection and verification of that projection; the profile-aware initializer described in the draft product change remains target architecture.
