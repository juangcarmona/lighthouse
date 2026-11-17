---
id: FR-EVIDENCE-CONTRACT
type: functional-requirement
title: Provide a common evidence contract
status: draft
derived-from: [UC-RUN-SDLC, UC-VERIFY-FOUNDATION, BR-AUTHORITY-BOUNDARIES]
verification:
  - scenario: A stage result and a browser journey can be adapted into the common evidence contract while preserving their source payloads, producer identity, status and artifact references.
uses-terms: [TERM-EVIDENCE-RECORD, TERM-AUTHORITY-MAP, TERM-INTEGRATION]
---

## Requirement

Lighthouse MUST provide a versioned, provider-neutral evidence record contract with stable run identity, producer, scope, status, payload, provenance and optional subject, authority and artifact references. Existing producer contracts MUST remain valid and MUST be adaptable without moving ownership of their source files or provider state.

## Rationale

A shared envelope lets delivery tools produce evidence that can later be related to ProductShape and ArcShape without forcing those authorities to adopt Lighthouse's storage or lifecycle implementation.
