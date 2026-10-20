---
id: BR-LABEL-STATE
type: business-rule
title: Labels have one declared tracker role
status: draft
applies-to: [BC-FOUNDATION, UC-TRIAGE-WORK-ITEM, UC-RUN-SDLC]
uses-terms: [TERM-LABEL-STATE, TERM-GATE, TERM-DELIVERY-ROUTE]
---

## Rule

The configured tracker MUST expose a finite set of simple labels with one declared role per label: persistent work-item state or transient route command. Persistent labels MUST make the current handoff and human attention state unambiguous. A transition MUST validate its required evidence before changing labels.

## Rationale

Finite labels let the harness read state deterministically without repeatedly interpreting issue or pull-request prose.

## Examples

The first GitHub profile can map persistent state labels `triage`, `refine`, `refined`, `implement`, `wip`, `review`, `future`, `priority` and `bug` to the project's existing labels. `wip` is persistent human-visible state and does not claim an execution lease. Complexity, blast radius and risk belong in the triage record, not in prefixed label families.

## Exceptions

The configured tracker may use different label names, but the project MUST declare the mapping and preserve the same finite transition rules. A transient command label MUST be consumed after acceptance, while a state label MUST remain until a valid transition replaces it. Lighthouse MUST NOT add a namespace or silently create labels.
