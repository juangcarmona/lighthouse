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

The SDLC package implements route, stage, gate, state, decomposition and provider-adapter validators. It also distributes gh-aw workflows that execute an agent in GitHub Actions. Lighthouse has no persistent execution service. The published router is manual-only, and its current `ff` job-success checks do not yet enforce the complete continuation boundary described below.

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

## Proposed supervised host execution

```mermaid
sequenceDiagram
    accTitle: Proposed delivery and execution authority boundaries
    participant GH as GitHub event
    participant Router as Lighthouse router
    participant Host as Factory admission and supervisor
    participant Agent as Scoped engine process
    participant Publish as Trusted publisher
    GH->>Router: Authorized event and current source state
    Router->>Router: Classify, deduplicate, validate route and policy
    Router->>Host: Versioned request for one stage
    Host->>Host: Check identity, capacity, lease and revision
    Host->>Agent: Scoped workspace, instructions and limits
    Agent-->>Host: Stage result and proposed effects
    Host-->>Publish: Result, evidence and current lease identity
    Publish->>Publish: Validate contract, effects, revision and authority
    Publish->>GH: Apply allowed effects and retain receipt
    Publish-->>Router: Committed evidence and continuation decision
    alt Human decision missing or evidence incomplete
        Router-->>GH: Waiting state with next action
    else Recorded policy permits next stage
        Router->>Host: New stage request with predecessor digest
    end
```

This is a proposed implementation of the bounded-role use case, not the current gh-aw execution path. The agent supplies candidate results; a deterministic validator interprets them and a separately credentialed publisher performs effects. Automated triage/refine may gather information and prepare artifacts while a required human gate prevents the next stage. Unattended progression requires an accepted policy for the named gate; setting `composition: ff` alone grants none.

<!-- pdac:cite id="UC-RUN-AGENT" digest="sha256:a36f45b77cc1a28f6222e3becc70832fc60e70f6857d36d0870154165d28c42e" -->

### Request and result boundary

The following is a design contract pending a packaged schema and compatibility tests. The SDLC package owns its wire shape; the host owns its operational result. Do not place these fields into `stage-result` v1, which remains unchanged.

| Request content | Validation and owner |
| --- | --- |
| Schema and package versions, contract digest | Adapter resolves exact installed artifacts; unsupported combinations stop before model use. |
| Repository ID, work-item reference, source and workflow revisions | Trusted ingress supplies identity; publisher rereads remote source before writing. |
| Delivery run ID, stage execution ID, attempt ID and idempotency key | Stable identities correlate events, retries and artifacts; duplicate submission returns the existing attempt. |
| Route, stage, role, predecessor result digests | Lighthouse validates membership, order, stage/gate pairing and predecessor lineage. |
| Authority references, tool capabilities, write scope and proposed effect types | Versioned role and adopter policy bound the request; the host may only narrow it. |
| Deadline, correction/recovery bounds and cancellation reference | Host enforces process/resource limits and stops on exhausted authority. |
| Policy revision and recorded approval references | Publisher verifies scope, actor and freshness; changed source or policy invalidates affected approvals. |

The response contains a separate operational outcome, the candidate stage result, proposed effects and evidence references. `completed` at the process boundary does not imply `passed` at the stage boundary. An interrupted run may have no stage result and still needs a durable operational record.

### Continuation and event handling

Continuation requires the expected run/stage/gate, successful stage status, complete required evidence, no unresolved blocker and the gate decisions required by the selected route. `ready` is preparation, not approval. The validator checks evidence content and provenance as well as JSON shape. The router must not use a model's `nextAction` as an executable command.

The event adapter rereads issue state and actor permission before admission and publication. It accepts at most one stage request for an event identity and ignores closed, duplicate, unauthorized or irrelevant events. Issue comments are task data, never workflow code. An answered clarification resumes only the matching waiting run with a fresh revision and bounded round count.

Persist validated transition events with correlation and source references. Rebuild lifecycle state using Lighthouse's transition rules; derive labels from that state and verify provider writes. The host stores those events without creating a different transition catalog.

<!-- pdac:cite id="BR-WORKFLOW-STATE" digest="sha256:d438b58d35667a01f2d0121554dc57681df8cd1f48d3eba07c0ee9b23035f1b8" -->

GitHub label writes made with `GITHUB_TOKEN` do not trigger another issue-label workflow. Use explicit reusable-workflow composition or an authorized dispatch for continuation, or a separately configured GitHub App when its event behavior is required. PR CI trigger/approval behavior must be tested with the actual publisher identity; a successful push is not evidence that required CI ran. See [GitHub workflow triggering](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).
