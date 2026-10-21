---
title: Building block view
arc42-section: "05"
description: Static decomposition of the current Lighthouse workspace and target initialized application profiles.
---

# 5. Building block view

## Current Lighthouse workspace

| Building block | Source | Responsibility |
| --- | --- | --- |
| CLI package | `src/packages/cli/` | Initialize the baseline, record the selected SDLC package and verify generated projections |
| SDLC package | `src/packages/sdlc/` | Distribute lifecycle skills, commands, meta-commands, route and gate contracts and deterministic package checks |
| UI package | `src/packages/ui/` | Export semantic tokens, native recipes and `DESIGN.md` |
| .NET reference profile | `src/dotnet/` | Demonstrate modular monolith, CQRS/VSA, Aspire and Roslyn checks |
| Gallery | `src/gallery/` | Exercise the UI package in a browser |
| Public site | `src/public-site/` and `scripts/build-public-site.mjs` | Present the current Lighthouse story and publish ProductShape and ArcShape snapshots |
| Repository checks | `src/tests/` and `scripts/` | Verify package, link, adoption and site contracts |
| Product and architecture sources | `docs/product/` and `docs/architecture/` | Keep ProductShape and ArcShape sources reviewable |

```mermaid
flowchart LR
    accTitle: Current Lighthouse package and public-site surfaces
    cli[CLI package] --> verify[Repository verification]
    sdlc[SDLC package] --> verify
    ui[UI package] --> verify
    product[ProductShape source] --> site[Public-site build]
    architecture[ArcShape source] --> site
    ui --> site
    site --> model[Product snapshot]
    site --> arc[Architecture snapshot]
    site --> landing[Public landing]
```

## Target initialized application

The product-defined initializer composes the following blocks only when their profile is selected.

| Profile block | Responsibility |
| --- | --- |
| Repository baseline | Provide `src/`, `docs/`, automation and integration entrypoints |
| SDLC package and control plane | Provide lifecycle assets and record selected routes, gates, state, memory and adapters under `.lighthouse/` |
| Aspire AppHost | Compose and run the selected application services |
| Frontend feature areas | Implement user-facing features using the shared visual contract |
| Backend bounded contexts | Keep domain, application, contracts, infrastructure and tests aligned by feature |
| Service profile | Supply a selected microservice without creating the default backend |
| Stack profile | Supply language-specific conventions, examples and checks |
| Evidence catalog | Associate integration and end-to-end evidence with bounded contexts |

The target profile blocks are product decisions and templates. The current CLI projects the baseline and SDLC control plane; lifecycle execution remains a host-specific integration.

## Feature mapping

```mermaid
flowchart LR
    accTitle: Feature alignment in the target full-stack profile
    ui[Frontend feature] --> api[API boundary]
    api --> app[Application handler]
    app --> domain[Bounded-context behavior]
    domain --> data[Persistence or external port]
    ui -. tests .-> unit[Unit tests]
    api -. tests .-> integration[Integration tests]
    ui -. evidence .-> e2e[End-to-end evidence]
    domain --> evidence[Bounded-context evidence catalog]
```
