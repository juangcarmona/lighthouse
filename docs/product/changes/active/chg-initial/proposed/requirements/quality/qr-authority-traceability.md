---
id: QR-AUTHORITY-TRACEABILITY
type: quality-requirement
title: Keep authority handoffs traceable
status: draft
quality-attribute: traceability
applies-to: [UC-RUN-SDLC]
verification:
  - scenario: An independent reviewer can follow a delivery artifact to its product and architecture context, revision or exception, responsible integration and gate evidence without reconstructing the history from chat.
---

## Requirement

Every delivery artifact MUST cite its applicable authority, revision or exception, owning integration and gate evidence.

## Measurement

Inspect one complete change in an adopter and verify that each proposal, design, implementation, review and integration report carries the required citations or an explicit not-applicable reason.
