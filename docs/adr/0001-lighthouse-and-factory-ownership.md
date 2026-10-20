# ADR 0001: Lighthouse and adopters have separate ownership

- Status: accepted for initial implementation
- Date: 2026-10-20

## Context

An adopting system may already have its own factory, product and workflow direction. Putting generic conventions and adopter rules inside that system would make every product depend on one consumer's operation and leave the baseline without an independent home.

## Decision

Lighthouse owns the cross-product baseline, stack profiles and adoption contract. Each adopter consumes Lighthouse through the same package and integration contract while owning its factory orchestration, runners, infrastructure integrations and operational loops. Lighthouse supplies the lifecycle contract and does not duplicate consumer operations.

## Consequences

The repositories can evolve independently. An adopter may test or recommend Lighthouse adoption, but cannot silently redefine the baseline. Lighthouse must not grow runner provisioning or factory automation without a new evidence-backed decision.
