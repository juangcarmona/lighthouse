---
title: Runtime view
arc42-section: "06"
description: Implemented verification interactions and target initialization and feature-test flows.
---

# 6. Runtime view

## Verify the current repository

```mermaid
sequenceDiagram
    accTitle: Current repository verification
    participant User as Developer or CI
    participant NPM as npm scripts
    participant Checks as Tests and validators
    participant Authorities as ProductShape and ArcShape
    participant Site as Public-site verifier
    User->>NPM: npm run verify
    NPM->>Checks: markdownlint, Node tests and link check
    NPM->>Authorities: generate product and architecture snapshots
    Authorities-->>Site: snapshot pages
    NPM->>Site: build and verify static output
    Checks-->>User: pass or failure evidence
    Site-->>User: pass or failure evidence
```

The current repository also exposes `npm run verify:dotnet` for the .NET reference profile and `npm run test:visual` for the browser gallery.

## Initialize a target project

```mermaid
sequenceDiagram
    accTitle: Target profile-aware initialization
    participant Adopter
    participant Init as Lighthouse init
    participant Selector as Profile selector
    participant SDLC as SDLC package
    participant Providers as ProductShape, ArcShape and OpenSpec
    participant Host as Aspire composition
    participant Checks as Profile checks
    Adopter->>Init: Declare application shape and stacks
    Init->>Selector: Resolve baseline and compatible profiles
    Selector-->>Init: Repository, UI and stack assets
    Init->>SDLC: Record selected package and project control plane
    Init->>Providers: Initialize or reconcile owned routes
    Init->>Host: Configure selected services
    Init->>Checks: Create deterministic checks and report gaps
    Checks-->>Adopter: Created, preserved and blocked paths
```

The current CLI executes the baseline and SDLC projection; profile selection, provider initialization and lifecycle execution remain separate integrations.

## Target delivery flow

```mermaid
flowchart LR
    accTitle: Target Lighthouse delivery stages
    triage[Triage] --> refine[Refine]
    refine --> propose[Propose]
    propose --> implement[Implement]
    implement --> integrate[Integrate]
    integrate --> review[Review]
    review -. learning .-> triage
```

The stages describe the target SDLC package. Labels expose the current handoff or route request, while ProductShape, ArcShape and verification evidence remain the authorities for their own content.

## Build and test a feature

```mermaid
sequenceDiagram
    accTitle: Target feature test progression
    participant Developer
    participant Unit as Unit tests
    participant Integration as Integration tests
    participant E2E as End-to-end tests
    participant Evidence as Bounded-context evidence
    Developer->>Unit: Write failing test
    Unit-->>Developer: Implement until green
    Developer->>Integration: Verify adapters and boundaries
    Integration-->>Developer: Record integration result
    Developer->>E2E: Verify user journey when applicable
    E2E->>Evidence: Catalog evidence by bounded context
```
