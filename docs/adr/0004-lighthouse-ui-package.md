---
id: ADR-0004
name: lighthouse-ui-package
title: Deliver one Lighthouse UI package
description: Keep Lighthouse's visual contract in one independently distributable UI package.
status: Accepted
date: "2026-10-20"
deciders: [juangcarmona]
tags: [design-system, distribution, packaging]
---

<!-- markdownlint-disable-next-line MD025 -->
# ADR-0004: Deliver one Lighthouse UI package

## Context

Lighthouse needs a reusable visual contract that can be installed during initialization without making the core harness depend on a frontend framework. The contract includes semantic tokens, native recipes and the `DESIGN.md` guide used by humans and agents.

## Decision

Deliver one independent UI package under `src/packages/ui/`, separate from the Lighthouse CLI and SDLC package. The UI package owns the tokens, native CSS recipes, `DESIGN.md` and its package documentation. It does not provide a React or other framework runtime component library. Initialization may project a design skill and deterministic token verifier into an adopter when the selected stack supports them.

## Alternatives considered

- **Deliver a framework runtime component library:** rejected because Lighthouse must support adopters with different frontend stacks and retain framework-neutral visual guidance.
- **Put the visual contract in the CLI package:** rejected because adopters may need the UI package independently and the two packages have different ownership boundaries.

## Consequences

- **Positive:** Adopters can install the visual contract without installing the core harness runtime.
- **Positive:** Tokens, recipes and their design guide have one ownership and version boundary.
- **Negative:** The package leaves markup, state, routing and domain behavior to each product.
- **Neutral:** A future runtime component package requires evidence from repeated adopters and a separate decision.

## References

- [Visual contract](../../src/packages/ui/DESIGN.md)
- [UI package](../../src/packages/ui/README.md)
- [Quality requirements](../architecture/10-quality-requirements.md)
