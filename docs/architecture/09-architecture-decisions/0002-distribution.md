---
id: ADR-0002
name: private-local-distribution
title: Start with a private local tool and defer publication
description: Keep the initial Lighthouse interface local and private until an adopter validates it.
status: Accepted
date: "2026-10-20"
deciders: [juangcarmona]
tags: [distribution, packaging, adoption]
---

<!-- markdownlint-disable-next-line MD025 -->
# ADR-0002: Start with a private local tool and defer publication

## Context

Candidate consumers use different mechanisms, including npm packages and CLIs for ProductShape and ArcShape, plus configured tracker, forge and agent hosts. A broad package suite would commit to APIs before cross-repository adoption has proved them.

## Decision

Use a private npm workspace and checked-in manifest, schema and scripts as the initial development interface. Keep the first command local and dependency-free. Do not publish public or private packages yet. After one existing product uses the interface, decide whether CLI distribution should be public, private registry or source-controlled local tooling. ADR-0005 refines the source layout without changing this local distribution decision.

## Alternatives considered

- **Public npm:** rejected for now because it creates public support, versioning and implementation-visibility obligations before the API is stable.
- **Private registry package:** rejected for now because credentials and registry availability would become adoption prerequisites without evidence that they are needed.
- **Copy templates and scripts into each repository:** rejected as the long-term source because fixes and rules would drift, although generated projections remain committed and drift-checked.
- **Git dependency or direct `npx` from GitHub:** deferred because repeatable installation requires pinning and a first consumer trial has not established the right distribution boundary.

## Consequences

- **Positive:** The first adopter can exercise the interface without registry setup or a public release.
- **Negative:** Consumers must use local workspace tooling until a later distribution decision is accepted.
- **Neutral:** Package publication remains an explicit follow-up decision after an adoption trial.

## References

- [Source packages and adopter projections](0005-source-packages-and-adopter-projections.md)
- [Harness package guide](../../../src/packages/cli/README.md)
- [Solution strategy](../04-solution-strategy/README.md)
