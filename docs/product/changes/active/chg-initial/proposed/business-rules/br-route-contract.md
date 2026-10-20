---
id: BR-ROUTE-CONTRACT
type: business-rule
title: Every delivery route preserves the lifecycle contract
status: draft
applies-to: [BC-FOUNDATION, UC-RUN-SDLC]
uses-terms: [TERM-DELIVERY-ROUTE, TERM-GATE, TERM-TOOL-CONTRACT, TERM-LABEL-STATE, TERM-TRIAGE]
---

## Rule

Every delivery route MUST declare its stage composition, entry conditions, permitted tools, label transitions, gate policy, correction limit, evidence location and decision owners. A route MUST reuse the SDLC stage contracts and MUST NOT bypass triage, Ready, Planned or Done.

## Rationale

Several routes let a project choose the right level of supervision without creating several incompatible lifecycles.

## Examples

The supervised route invokes one stage at a time; the plan-only route stops after `propose`; the unattended route composes configured stages through `ff` with an independent review; the hotfix route uses bounded implementation after triage; the stacked route delivers ordered slices through the configured tracker and forge adapter.

## Exceptions

None. A project may omit a route, but it cannot rename a route to hide a missing gate or protected decision.
