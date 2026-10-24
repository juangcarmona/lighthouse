---
name: host-execution-boundary
description: Separate repository delivery decisions from host execution and privileged publication.
status: Proposed
date: 2026-10-24
deciders: [juangcarmona]
tags: [sdlc, execution, ownership]
---

# ADR-0007: Separate delivery decisions, execution and publication

## Context

Lighthouse supplies provider-neutral lifecycle contracts and a GitHub Actions projection. The current projection invokes Copilot and uses source-repository paths. An adopter needs to run the same stages on its own execution host, with durable admission and recovery, without moving lifecycle policy into that host.

The current structural stage-result validator and successful GitHub job are insufficient evidence to advance a supervised route. The proposed architecture implements the existing bounded-agent and explicit-state intent; it does not grant autonomous merge authority.

## Decision

We will keep routes, stages, gates, role instructions, continuation rules and effect validation in the SDLC package. The host owns admission, process execution, isolation, limits and operational persistence. A trusted publisher applies only validated effects while both lifecycle authority and host lease authority remain valid.

We will distribute a versioned host-neutral execution request alongside the existing stage-result contract. The request binds an immutable revision, exact contract/package versions, run and attempt identities, predecessor evidence, role scope, deadline and policy reference. Credentials and host paths never come from agent output. The host returns operational status separately from the unchanged stage result.

The GitHub adapter owns triggers, authorization, package resolution and publication. Its external-host projection invokes the selected host; it does not embed that host's scheduler, database, model configuration or infrastructure identity. Engine selection belongs to the host. Keep the existing gh-aw projection available as a distinct path until an external-host path proves equivalent required controls.

## Consequences

- One package defines lifecycle behavior across interactive and unattended hosts; the factory does not create another stage machine.
- Engine replacement can preserve the repository contract, but each adapter must prove cancellation, isolation, output validation and evidence semantics.
- The external-host path needs its own enforced write boundary. gh-aw Safe Outputs and firewall behavior do not transfer merely because a workflow still has the same name.
- Installation stays independent of a running factory; execution reports an unavailable host instead of silently choosing another engine.

## Alternatives considered

- Put a persistent scheduler and database in Lighthouse: rejected because adopters own their factories and infrastructure.
- Let each host implement stages and labels: rejected because gates and recovery behavior would drift between hosts.
- Replace Copilot with another CLI inside generated YAML: rejected because engine substitution alone supplies neither admission nor validated publication.
- Create another package for every boundary now: deferred until independent consumers need separate release/versioning. Keep the current CLI and SDLC package boundaries.

## References

- [ADR-0001: adopter ownership](0001-lighthouse-and-factory-ownership.md)
- [Bounded agent use case](../../product/model/use-cases/uc-run-agent.md)
- [Runtime and proposed handoff](../06-runtime-view/README.md)
- [Implementation gaps and sequencing](../../roadmap/factory-reconciliation.md)
