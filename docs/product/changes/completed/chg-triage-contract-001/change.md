---
id: CHG-TRIAGE-CONTRACT-001
type: product-change
title: Establish deterministic triage and classification labels
status: applied
base-revision: '46eddf9313222349ada859ae34f73770d3626c5b'
operations:
  add:
    - TERM-WORK-ITEM-SIZE
  modify:
    - BR-TRIAGE-CONTRACT
    - BR-LABEL-STATE
    - BR-LABEL-ROLES
    - UC-TRIAGE-WORK-ITEM
    - FR-TRIAGE-WORK-ITEM
    - FR-LABEL-STATE
    - FR-LABEL-ROLES
    - QR-LABEL-DETERMINISM
  remove: []
---

## Problem

The product model requires triage and deterministic tracker state, but it does not yet define the boundary between calculating a triage result, proposing a label transition and applying that transition to a tracker.

## Intended Product Outcome

Lighthouse provides a bounded triage result for one work item with size, urgency, impact, dependencies, risks, blast radius, route, owner, confidence and supporting evidence.

The result reports missing evidence and unresolved judgement explicitly, never derives workflow state from issue prose and proposes valid workflow and classification labels using the project's declared vocabulary.

Triage is read-only by default. Applying a label transition requires an explicit request and valid configured labels; an invalid or conflicting transition leaves the tracker unchanged.

The first classification projection uses one label per dimension with the syntax `size-*`, `urgency-*`, `impact-*`, `risk-*` and `blast-radius-*`. The triage record remains authoritative for evidence, confidence and unresolved values.

The suggested palette uses the Lighthouse blue family for size, a warm urgency scale, violet for impact, red and orange for risk and teal for blast radius. Adopters may map existing labels and retain their own colors.

## Rationale

The first delivery slice needs a useful decision surface before refinement or implementation starts, while keeping tracker mutations visible and reversible.

Separating the assessment, the proposed transition and the explicit application keeps the result deterministic and prevents a semantic loop from becoming the lifecycle authority.

## Affected Product Areas

Work-item triage, work-item size, tracker label roles and state, classification label projection, delivery-route selection, confidence and evidence reporting, human authority and the GitHub adapter contract.

## Open Questions

None.

## Product Acceptance

The accepted definition states the complete triage result and distinguishes evidence that is absent from judgement that is still pending.

The accepted definition makes read-only triage the default and requires an explicit request before a configured tracker label transition is written.

The accepted definition rejects ambiguous labels, illegal transitions and unconfigured labels without changing the prior tracker state.

The accepted definition keeps label names project-owned, uses no Lighthouse namespace and never infers lifecycle state from issue prose.

The accepted definition names `S`, `M`, `L` and `XL` as the first size values, `now`, `asap` and `normal` as urgency values and `low`, `medium` and `high` as impact, risk and blast-radius values.

The accepted definition gives classification labels the syntax `size-*`, `urgency-*`, `impact-*`, `risk-*` and `blast-radius-*`, requires at most one active label per dimension and keeps unknown values in the triage record instead of inventing an `unknown` label.

The accepted definition records the suggested color palette without making Lighthouse create labels or overwrite adopter-owned colors.

The accepted definition leaves decomposition, stacked pull requests, autonomous loops, agent dispatch, durable memory and scoring automation for later changes.

## Out of Scope

This change does not add new engineering practices, define a hosted service, implement an agent runtime, create tracker labels or select a scoring algorithm.

It does not implement decomposition, stacked changes, hotfix execution, autonomous retries, queue management, memory or software-factory integration.

It does not change ProductShape, ArcShape, OpenSpec or the ownership of managed projections.
