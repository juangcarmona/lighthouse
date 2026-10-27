---
id: CHG-REQUEST-TRIAGE-145
type: product-change
title: Simple requests and explained triage estimates
status: applied
base-revision: 'e54bce79fac65b4d1a87bcb05a7f015574b32c54'
operations:
  add: []
  modify: [BR-TRIAGE-CONTRACT, TERM-WORK-ITEM-SIZE, FR-TRIAGE-WORK-ITEM]
  remove: []
---

## Problem

Requester intake assumes engineering detail and native automation can enter refinement without an explained initial estimate.

## Intended Product Outcome

A short public form asks for the problem and desired result, plus optional context. Owner admission permits bounded triage of external requests. Triage preserves the original request, identifies sourced inferences and unknowns, asks only blocking questions and records a provisional explained relative estimate. Refinement reconsiders it.

## Rationale

Owner decisions on issue #145 approve the 1, 2, 3, 5, 8, 13 scale with uncertainty separate, require owner admission for external requests and authorize implementation of this agreed scope. The verified owner answer at https://github.com/juangcarmona/lighthouse/issues/145#issuecomment-6450027659 explicitly requests preparing, validating and applying this Product Change on the working branch. This approval records that existing decision, not an agent-created product decision or merge approval.

Host-supplied source provenance is `1daa7576f8874e3d039ed2fff305756a8d851861`. The disposable checkout represents that source with local baseline commit `e54bce79fac65b4d1a87bcb05a7f015574b32c54`; base-revision uses that resolvable local baseline for ProductShape apply, not as an independent authentication claim.

## Affected Product Areas

Requester intake, triage assessment, size terminology and refinement handoff.

## Open Questions

None.

## Product Acceptance

- Requesters supply no mandatory technical criteria, architecture, estimate or PR plan.
- No external request spends agent budget before owner admission; admission authorizes triage only.
- Original content remains visible, inferences cite evidence and each question names its blocking outcome.
- Estimates explain scope, dependencies and verification; uncertainty and confidence remain separate.
- Refinement rechecks estimates, without claiming initial anchors have already been calibrated.

## Out of Scope

Decomposition and aggregate delivery (#146), technical design, implementation state, release and merge approval.
