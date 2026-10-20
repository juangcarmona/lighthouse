---
id: QR-GATE-CONTROLLABILITY
type: quality-requirement
title: Keep lifecycle gates controllable
status: draft
quality-attribute: controllability
applies-to: [UC-RUN-SDLC]
verification:
  - scenario: A failed triage, Ready, Planned or Done check leaves the item at that state, records the missing evidence and prevents an implicit transition; an enabled `ff` run records its independent review and correction count.
---

## Requirement

The harness MUST make triage and gate results, label transitions, stop conditions, correction limits and human decisions observable and MUST prevent silent stage advancement.

## Measurement

Run a fixture with one failed check at triage and each gate and verify that the stage stops, reports the responsible decision, preserves its evidence and leaves labels unchanged; run one configured `ff` fixture and verify its durable run record and correction cap.
