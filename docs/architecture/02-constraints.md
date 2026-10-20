---
title: Architecture constraints
arc42-section: "02"
description: Runtime, repository and ownership constraints that shape Lighthouse.
---

# 2. Architecture constraints

## Technical constraints

- Node.js 22 or newer runs the workspace tooling.
- The Lighthouse .NET profile uses the SDK declared by `src/dotnet/global.json`.
- npm workspaces and package source live under `src/packages/`.
- Verification must run locally without a hosted Lighthouse service.
- Build output, browser reports and generated ProductShape projections remain disposable.

## Ownership constraints

- Product intent belongs to ProductShape when a project adopts it.
- Architecture documentation belongs to ArcShape when a project adopts it.
- Lighthouse owns its source packages, repository checks and adoption guidance.
- An adopting project owns its application code, infrastructure and exceptions.
- Provider-owned generated files are changed through their provider.

## Current command constraint

The Lighthouse CLI exposes `init` and `verify`. Lifecycle stages, tracker operations, agent memory and CodeGraph checks remain proposed capabilities until source and tests implement them.
