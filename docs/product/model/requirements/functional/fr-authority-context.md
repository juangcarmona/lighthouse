---
id: FR-AUTHORITY-CONTEXT
type: functional-requirement
title: Carry authority context into delivery
status: draft
derived-from: [UC-RUN-SDLC, BR-AUTHORITY-BOUNDARIES]
verification:
  - scenario: A representative delivery artifact identifies the ProductShape and ArcShape revisions or explicit out-of-scope decisions that its proposal and implementation consumed.
uses-terms: [TERM-AUTHORITY-MAP, TERM-INTEGRATION, TERM-CHANGE-FLOW]
---

## Requirement

The Lighthouse flow MUST record the applicable ProductShape product context, ArcShape architecture context and revision or exception before `propose` and `implement` produce delivery artifacts.

## Rationale

Explicit context lets ProductShape and ArcShape progress independently without losing the meaning of the delivery handoff.
