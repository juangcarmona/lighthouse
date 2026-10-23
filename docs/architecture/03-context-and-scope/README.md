---
title: System scope and context
arc42-section: "03"
description: Current boundaries between Lighthouse, adopters, authority providers and external tooling.
---

# 3. System scope and context

## System context

```mermaid
flowchart LR
    accTitle: Current Lighthouse repository context
    maintainer[Maintainer] --> workspace[Lighthouse workspace]
    adopter[Adopter] --> cli[Lighthouse CLI]
    workspace --> packages[CLI, SDLC, UI and profile packages]
    cli --> manifest[lighthouse.json]
    cli --> projections[Managed projections and evidence]
    cli --> providers[ProductShape, ArcShape and provider adapters]
    sdlc[SDLC package] --> cli
    workspace --> site[Public-site build]
    tools[Node, npm and .NET tools] --> workspace
    providers --> remote[Provider-owned state]
```

The current system boundary is the Lighthouse workspace plus the package contracts it emits. In a consuming repository, the CLI reads `lighthouse.json`, loads installed package assets, plans owned changes and writes only declared Lighthouse-managed paths. Provider-owned paths and remote state remain outside the Lighthouse boundary.

<!-- pdac:cite id="BR-OWNED-AUTHORITY" digest="sha256:927ca94ef20deb83a84734978c82c5647cd1cd41eeaed9935eda7f4a6c61f611" -->

## External interfaces

| External system | Current interaction | Boundary owner |
| --- | --- | --- |
| Node and npm | Install packages and run CLI, tests and site scripts | Project toolchain |
| .NET SDK | Build and verify the reference profile and generated .NET starter | .NET profile or adopter |
| ProductShape | Validate product files and initialize or adopt `docs/product/model/` | ProductShape |
| ArcShape | Validate, link-check and render `docs/architecture/` | ArcShape |
| OpenSpec | Own change schemas and managed change files | OpenSpec |
| GitHub CLI and provider | Read or explicitly mutate labels, issues and child issues through SDLC adapters | Provider |
| GitHub Pages | Host the verified static site output | Site operator |

The product-defined CodeGraph MCP and Aspire application boundary are planned adopter integrations. No CodeGraph client or Lighthouse-hosted application runtime is present in this repository.
