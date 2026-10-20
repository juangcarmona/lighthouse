---
id: QR-LABEL-DETERMINISM
type: quality-requirement
title: Keep tracker label projections deterministic
status: draft
quality-attribute: determinism
applies-to: [UC-TRIAGE-WORK-ITEM, UC-RUN-SDLC, UC-MANAGE-STACKED-CHANGE]
verification:
  - scenario: Repeating triage and status against the same issue metadata, labels, links and verification evidence produces the same state and next action.
---

## Requirement

The tracker state projection MUST be deterministic for the same structured inputs and MUST report a conflict instead of selecting a state from ambiguous labels or prose. It MUST also reject a label configuration that gives one label both command and persistent-state roles.

## Measurement

Run the adapter twice against a fixture with stable issue metadata, labels, links and checks; compare the resulting state, transition report and next action byte-for-byte, then verify that command labels are consumed and state labels remain after the same accepted transition.
