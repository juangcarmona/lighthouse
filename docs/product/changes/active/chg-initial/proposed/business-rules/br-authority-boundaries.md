---
id: BR-AUTHORITY-BOUNDARIES
type: business-rule
title: Each authority keeps its boundary
status: draft
applies-to: [BC-FOUNDATION, UC-RUN-SDLC, UC-IMPLEMENT-CHANGE]
uses-terms: [TERM-AUTHORITY-MAP, TERM-HARNESS, TERM-INTEGRATION]
---

## Rule

ProductShape MUST remain the authority for product intent, ArcShape MUST remain the authority for architecture evidence, and Lighthouse MUST remain the authority for the adopted delivery contracts and evidence. A downstream stage MUST record the upstream revision or an explicit exception instead of inventing upstream meaning.

## Rationale

Independent delivery speeds are useful when the handoff is explicit and traceable.

## Examples

A Product Change can remain in draft while an adopter documents an architecture constraint; an implementation can proceed only when its product and architecture context is named or an exception is accepted by the responsible human.

## Exceptions

A project may omit an authority when its authority map records that the concern is out of scope for the change and names the decision owner.
