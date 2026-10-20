---
id: QR-BOUNDED-AUTOMATION
type: quality-requirement
title: Keep automated change work bounded
status: draft
quality-attribute: controllability
applies-to: [UC-IMPLEMENT-CHANGE, BC-FOUNDATION]
verification:
  - scenario: An unattended route declares its repository and path scope, permitted tools, maximum repair rounds and stop conditions, and a failed check leaves the change available for human review without advancing it.
---

## Requirement

Any Lighthouse route that performs automated change work MUST declare its scope, permitted tools, attempt or time limit, evidence output and human handoff conditions before it runs.

## Measurement

Inspect each automated route in a representative adopter and verify that the declaration exists, the limit is enforced, a failed check stops advancement and the resulting evidence identifies the next human decision.
