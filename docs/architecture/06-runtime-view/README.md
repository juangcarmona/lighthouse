---
title: Runtime view
arc42-section: "06"
description: Representative initialization, authority, verification, upgrade and capability-adoption interactions.
---

# 6. Runtime view

## Initialize and verify an adopter

```mermaid
sequenceDiagram
    accTitle: Current repository verification
    participant User as Adopter
    participant CLI as Lighthouse CLI
    participant Files as Adopter files
    participant Checks as Guardrail evaluator
    User->>CLI: lighthouse init --dry-run
    CLI->>Files: Read lighthouse.json or build default manifest
    CLI->>Checks: Compose profiles and plan managed paths
    Checks-->>User: Operations, conflicts and authority gaps
    User->>CLI: lighthouse init
    CLI->>Files: Write only free managed paths and ownership state
    User->>CLI: lighthouse verify --format json
    CLI->>Checks: Validate manifest, conventions, projections and profiles
    Checks-->>User: Statuses, evidence and next actions
```

The repository also exposes `npm run verify`, `npm run verify:dotnet` and `npm run test:visual` for workspace, .NET and browser evidence respectively.

## Semantic initialization

```mermaid
sequenceDiagram
    accTitle: Current semantic initialization
    participant Adopter
    participant CLI as Lighthouse CLI
    participant Plan as Initialization plan
    participant Files as Adopter files
    Adopter->>CLI: lighthouse init --plan-file plan.json --dry-run
    CLI->>Plan: Validate shape, stacks, profiles and open questions
    Plan-->>Adopter: Plan or unresolved-question report
    Adopter->>CLI: lighthouse init --plan-file plan.json
    CLI->>Files: Materialize manifest and managed projections
    Files-->>Adopter: Created, preserved or blocked paths
```

The current CLI executes this plan for the baseline and selected profile assets. Aspire application creation and external CodeGraph checks remain outside this runtime.

## Adopt existing authorities

```mermaid
sequenceDiagram
    accTitle: Existing-authority adoption
    participant Adopter
    participant CLI as Lighthouse CLI
    participant Product as ProductShape validator
    participant Arc as ArcShape validator
    participant Manifest as lighthouse.json
    Adopter->>CLI: lighthouse authorities --adopt-existing
    CLI->>Product: Read-only validate docs/product/model
    CLI->>Arc: Read-only validate docs/architecture
    Product-->>CLI: Version, status and diagnostics
    Arc-->>CLI: Version, status and diagnostics
    CLI-->>Adopter: Dry-run adoption plan
    Adopter->>CLI: --apply
    CLI->>Manifest: Record exact provider versions
    CLI-->>Adopter: Revalidate and report adopted or blocked
```

Existing-authority adoption leaves provider-owned files unchanged. The same boundary applies to capability adoption: the package owns the catalog and adapter contract, the CLI owns local declaration and evidence, and the provider remains the authority for remote state.

<!-- pdac:cite id="UC-INITIALIZE-AUTHORITIES" digest="sha256:7243c8af149a2199dd2e9e9f9984a6b7a72de8d98b24917af07fa40861058a51" -->

## SDLC route planning

```mermaid
flowchart LR
    accTitle: Lighthouse SDLC route descriptors
    triage[Triage] --> refine[Refine]
    refine --> propose[Propose]
    propose --> implement[Implement]
    implement --> integrate[Integrate]
    integrate --> review[Review]
    review -. learning .-> triage
```

The SDLC package implements the route, stage, gate, state, decomposition and provider-adapter contracts as validators and projections. It does not execute agents or own a hosted delivery runtime.

## Verify package and site contracts

```mermaid
sequenceDiagram
    accTitle: Current package and public-site verification
    participant Maintainer
    participant NPM as npm scripts
    participant Tests as Node, link and package checks
    participant Authorities as ProductShape and ArcShape
    participant Site as Static-site verifier
    Maintainer->>NPM: npm run verify
    NPM->>Tests: markdownlint, tests and local links
    NPM->>Authorities: Validate product and architecture sources
    Authorities-->>Site: Validated source inputs
    NPM->>Site: Build and verify static output
    Site-->>Maintainer: Output paths and failures
```
