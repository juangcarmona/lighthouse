---
name: scoped-agent-memory-sqlite
description: Store opt-in scoped agent learnings in an operator-owned local SQLite database.
status: Accepted
date: 2026-11-02
deciders: [juangcarmona]
tags: [memory, sdlc, persistence]
---

# ADR-0011: Store scoped agent memory in local SQLite

## Context

The SDLC package needs an operator-owned persistent provider so isolated runs can reuse relevant project findings while retaining scope, provenance, expiry and correction history. Lighthouse has no hosted runtime, and the existing memory contract is provider-neutral. The first implementation needs transactional updates and project isolation without requiring adopters to operate a separate service.

## Decision

We will provide an optional host-side SQLite adapter for the existing memory session contract. The operator provisions its private database outside disposable execution roots and supplies authorized grants and eligibility checks. The adapter does not connect itself to a worker or inject findings into prompts; each host integration remains explicit. Shared cross-project memory stays disabled by default.

## Consequences

- **Positive:** A local host can retain and selectively recall bounded findings across processes without adding a remote service or changing the provider-neutral session API.
- **Negative:** SQLite availability depends on the host Node runtime, and each operator owns database placement, backup, access and lifecycle. The shipped workflow does not yet use the adapter automatically.
- **Neutral:** Another provider can implement the same injected provider contract if an adopter needs a managed AgentMemory service or different storage topology.

## Alternatives considered

- **Require an external AgentMemory service:** rejected for this first slice because no specific service integration or operator deployment was established, while the acceptance case needs transactional scoped records rather than semantic search.
- **Keep memory validation-only:** rejected because isolated runs need durable project findings to satisfy the cross-run outcome.
- **Make SQLite mandatory in the workflow:** rejected because the workflow host does not provision durable operator storage and ordinary work must remain available when optional memory is disabled.

## References

- [Issue #272](https://github.com/juangcarmona/lighthouse/issues/272)
- [Implementation PR #315](https://github.com/juangcarmona/lighthouse/pull/315)
- [Scoped memory contract and host integration](../../../src/packages/sdlc/commands/memory.md)
- [ADR-0007: host execution boundary](0007-host-execution-boundary.md)
