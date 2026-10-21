---
id: ADR-0001
name: lighthouse-and-adopter-ownership
title: Lighthouse and adopters have separate ownership
description: Keep the Lighthouse baseline separate from each adopter's factory operations.
status: Accepted
date: "2026-10-20"
deciders: [juangcarmona]
tags: [ownership, adoption, architecture]
---

<!-- markdownlint-disable-next-line MD025 -->
# ADR-0001: Lighthouse and adopters have separate ownership

## Context

An adopting system may already have its own factory, product direction and operational needs. Putting adopter rules inside that system would make every product depend on one consumer's operation and leave the baseline without an independent home.

## Decision

Lighthouse owns the cross-product baseline, stack profiles and adoption contract. Each adopter consumes Lighthouse through the same package and integration contract while owning its factory orchestration, runners, infrastructure integrations and operational loops. Lighthouse supplies the lifecycle contract and does not duplicate consumer operations.

## Alternatives considered

- **Put the baseline inside each adopter's factory:** rejected because duplicated rules would drift between products.
- **Let Lighthouse own adopter runners and infrastructure:** rejected because those integrations depend on each consumer's environment and operating model.

## Consequences

- **Positive:** Repositories can evolve independently while sharing the same baseline contract.
- **Negative:** Lighthouse must not grow runner provisioning or factory automation without a new evidence-backed decision.
- **Neutral:** An adopter may test or recommend Lighthouse adoption, but it cannot silently redefine the baseline.

## References

- [System context and scope](../03-context-and-scope/README.md)
- [Harness package guide](../../../src/packages/cli/README.md)
