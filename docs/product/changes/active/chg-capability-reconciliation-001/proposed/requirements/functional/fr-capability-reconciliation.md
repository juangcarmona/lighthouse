---
id: FR-CAPABILITY-RECONCILIATION
type: functional-requirement
title: Reconcile selected foundation capabilities
status: draft
derived-from: [UC-ADOPT-PROFILE, UC-UPDATE-FOUNDATION, BR-OWNED-AUTHORITY]
verification:
  - scenario: A repository declares the label capability and receives a deterministic plan that classifies missing, unchanged, customized, conflicting and unsupported labels without writing to the tracker.
  - scenario: An explicit apply adds only missing labels, preserves existing names, colors and descriptions, records reconciliation evidence and produces an equivalent no-op plan when run again.
  - scenario: An ambiguous equivalence, ownership conflict or unverifiable provider state stops the plan and reports the decision required without partial mutation.
uses-terms: [TERM-FOUNDATION-CAPABILITY, TERM-MANAGED-PROJECTION, TERM-UPGRADE-PLAN, TERM-LABEL-STATE]
---

## Requirement

Lighthouse MUST let an adopter declare selected foundation capabilities and MUST expose each selected capability's prerequisites, provider, owned surface, verification method and apply boundary before a mutation.

The capability reconciler MUST produce a deterministic dry-run plan that classifies each requested surface as unchanged, missing, customized, conflicting or unsupported. It MUST preserve adopter-owned values and stop when equivalence, ownership or provider state cannot be established.

The first supported adapter MUST reconcile the configured tracker label vocabulary. An explicit apply MAY create missing labels using declared defaults, MUST preserve existing label customizations, MUST be idempotent and MUST record source, target, operations and verification evidence for later drift detection.

Agent assistance MAY propose an equivalence or interpretation, but the CLI MUST validate the proposal and perform the concrete provider mutation deterministically.

## Rationale

A shared capability contract keeps adoption predictable while allowing Lighthouse to add one provider adapter at a time. Separating interpretation from execution keeps mechanical updates repeatable and reviewable.
