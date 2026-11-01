---
id: CHG-INDEPENDENT-MODEL-SELECTION-001
type: product-change
title: Select worker models and reasoning independently
status: applied
base-revision: 'd852dc8f70a81a1c807a132331ec1303084c486d'
operations:
  add: []
  modify: [FR-MODEL-PROFILES]
  remove: []
---

## Problem

The current Product Definition describes three named worker profiles but does not establish independent model and reasoning selections for more than three combinations or an owner selection for an individual ordinary execution.

## Intended Product Outcome

An adopter can configure each worker's model and reasoning independently, using direct settings or named presets. An operator may permit an authenticated owner to select an allowed combination for one execution. Every choice remains within operator capabilities and resource limits and is recorded with its provenance.

## Rationale

Workers have different cost and reasoning needs. Independent selection provides the requested flexibility while keeping configuration distinct from provider identity and execution authority.

## Affected Product Areas

Agent configuration, launch and execution evidence, including existing profile and delegated-task compatibility.

## Open Questions

None.

## Product Acceptance

The definition covers independent worker settings and optional owner selection, deterministic precedence, operator limits, explicit failure without fallback, compatibility and honest evidence. Model selection cannot alter credentials, billing, processing tier, permissions or lifecycle approvals.

## Out of Scope

New providers, automatic model selection, pricing or billing services, new tool permissions, resource-limit changes and lifecycle approval changes.
