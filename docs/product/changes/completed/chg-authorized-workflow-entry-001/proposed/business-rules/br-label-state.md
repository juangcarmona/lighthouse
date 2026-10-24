---
id: BR-LABEL-STATE
type: business-rule
title: Labels have one declared tracker role
status: draft
applies-to: [BC-FOUNDATION, UC-TRIAGE-WORK-ITEM, UC-RUN-SDLC]
uses-terms: [TERM-LABEL-STATE, TERM-GATE, TERM-DELIVERY-ROUTE, TERM-WORK-ITEM-SIZE]
---

## Rule

The configured tracker MUST expose a finite set of simple labels with one declared role per label: persistent work-item state, transient route command or persistent triage classification.

Triage MUST validate the current labels against that vocabulary and the legal transitions before proposing or applying a change.

Classification labels MUST use one configured value per dimension: `size`, `urgency`, `impact`, `risk` or `blast-radius`.

The default triage result MUST NOT mutate the tracker. An explicit application MAY change labels only after the required evidence is valid; an ambiguous or illegal transition MUST leave the prior labels unchanged.

Lighthouse MUST NOT infer label state from prose, create a namespace or silently create labels.

## Rationale

An explicit application request may be supplied by a still-effective bounded workflow authorization. A label requests or projects work; its presence does not grant permission. The deterministic publisher applies authorized transitions after result validation.

Finite labels let the harness read workflow state and triage classification deterministically without repeatedly interpreting issue or pull-request prose.

An explicit application boundary keeps human-visible changes reviewable and prevents a failed assessment from partially changing the work item.

## Examples

The first GitHub profile can map persistent state labels such as `triage`, `refine`, `implement`, `wip` and `review` to the project's existing labels.

A triage report can propose a transition from `triage` to `refine` and project `size-m` and `risk-low`, while the tracker remains unchanged until the adopter explicitly applies it.

## Exceptions

The configured tracker may use different label names, but the project MUST declare the mapping and preserve the same finite transition rules.

A tracker without transient labels can use explicit tool invocation for commands and retain only persistent state labels.

An adopter may retain its existing colors. Lighthouse's suggested colors are a projection default, not permission to overwrite adopter-owned labels.
