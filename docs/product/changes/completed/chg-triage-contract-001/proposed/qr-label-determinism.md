---
id: QR-LABEL-DETERMINISM
type: quality-requirement
title: Keep tracker label projections deterministic
status: draft
quality-attribute: determinism
applies-to: [UC-TRIAGE-WORK-ITEM, UC-RUN-SDLC, UC-MANAGE-STACKED-CHANGE]
verification:
  - scenario: Repeating triage and status against the same structured issue metadata, labels, links and verification evidence produces the same workflow state, classification projection and next action.
---

## Requirement

The tracker projection MUST be deterministic for the same structured inputs and MUST report a conflict instead of selecting a workflow state or classification from ambiguous labels or prose.

It MUST reject a label configuration that gives one label multiple roles or gives one classification dimension multiple active values.

## Measurement

Run the adapter twice against a fixture with stable issue metadata, labels, links and checks; compare the resulting state, classification, transition report and next action byte-for-byte, then verify that command labels are consumed and workflow-state and classification labels remain after the same accepted transition.
