---
title: System scope and context
arc42-section: "03"
description: Current and target boundaries between Lighthouse, adopters, authorities and external tooling.
---

# 3. System scope and context

## Current system context

```mermaid
flowchart LR
    accTitle: Current Lighthouse repository context
    maintainer[Maintainer] --> checkout[Lighthouse checkout]
    adopter[Adopting project] --> cli[Lighthouse CLI]
    checkout --> cli
    cli --> manifest[Project manifest]
    cli --> projection[LIGHTHOUSE.md]
    cli --> adoption[Capability adoption plan and evidence]
    checkout --> packages[Source packages and profiles]
    checkout --> site[Static public site]
    tools[Node, npm and .NET tools] --> checkout
    adoption --> provider[Provider API<br/>for example GitHub]
```

The current checkout is the implemented system boundary. The CLI reads a project manifest and writes the managed `LIGHTHOUSE.md` projection in a consuming repository.

## Target initialization context

The following context describes the product-defined initializer and its external authorities; it is a target view until the corresponding implementation is delivered.

```mermaid
flowchart LR
    accTitle: Target Lighthouse initialization context
    adopter[Adopter] --> init[Lighthouse init]
    init --> baseline[Repository baseline]
    init --> profiles[Selected stack profiles]
    profiles --> aspire[Aspire composition boundary]
    profiles --> guidance[Soft guidance and examples]
    profiles --> checks[Hard guardrails and checks]
    init --> product[ProductShape]
    init --> architecture[ArcShape]
    init --> changes[OpenSpec]
    init --> codegraph[External CodeGraph MCP]
    init --> result[Initialization report]
```

Lighthouse coordinates adoption and leaves product intent, architecture evidence, change artifacts and repository indexing with their owning tools or services.

## External boundaries

| External system | Current or target interaction | Owner |
| --- | --- | --- |
| Node and npm | Install workspace dependencies and run scripts | Project toolchain |
| .NET SDK | Build and verify the .NET reference profile and selected adopters | .NET profile or adopter |
| Aspire | Compose and run initialized application services | Initialized application |
| ProductShape | Author and validate product artifacts | ProductShape |
| ArcShape | Author, validate and render architecture artifacts | ArcShape |
| OpenSpec | Provide change schemas and change files | OpenSpec |
| CodeGraph MCP | Index repository and worktree context outside the checkout | External service |
| Capability provider | Supply and verify provider-owned state after explicit authorization | Provider, for example GitHub |
| GitHub Pages | Static hosting for the verified public-site output | Site operator |
