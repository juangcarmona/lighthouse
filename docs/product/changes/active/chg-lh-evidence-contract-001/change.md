---
id: CHG-LH-EVIDENCE-CONTRACT-001
type: product-change
title: Make delivery evidence traceable across product and architecture authorities
status: proposed
base-revision: '2dca1ef'
operations:
  add:
    - TERM-EVIDENCE-RECORD
    - TERM-EVIDENCE-COVERAGE
    - FR-EVIDENCE-CONTRACT
    - FR-EVIDENCE-COVERAGE
  modify: []
  remove: []
---

## Problem

ProductShape can describe product intent and ArcShape can describe architecture, but neither authority can determine from its own model which requirements or decisions have implementation and verification evidence. Lighthouse already produces stage, browser and adoption results, but those results use separate contracts and cannot be related consistently to product or architecture subjects.

## Intended Product Outcome

Lighthouse provides a neutral, versioned evidence contract that can represent facts from delivery runs, product requirements, architecture decisions, guardrails, profiles and releases without taking ownership of those authorities. Evidence records can be assembled into a deterministic coverage index that reports whether a referenced subject is unverified, observed, verified, incomplete, conflicting or not applicable.

The contract supports references to ProductShape and ArcShape revisions, preserves existing stage-result and browser-e2e payloads through adapters, and keeps large artifacts in their owning tool while recording their paths and hashes. Verification reports evidence gaps and repair actions without treating incomplete evidence as a delivery failure by default.

## Rationale

Evidence is a cross-cutting delivery fact rather than a property of one Product Change. A large change may span several work items, commits and runs, while one product requirement may be covered by several changes. A neutral record and many-to-many coverage projection closes that traceability gap without turning Lighthouse into a product authority or a quality-scoring platform.

## Affected Product Areas

Delivery evidence, product and architecture authority references, foundation verification, SDLC package contracts, adopter reports and public evidence projections.

## Open Questions

None.

## Product Acceptance

The accepted definition names a versioned evidence record with a stable run identity, producer, scope, status, payload, optional subject, authority references, provenance and artifact references.

The accepted definition allows one evidence set to reference multiple product, architecture and delivery subjects, and allows one subject to be covered by multiple evidence records.

The accepted definition distinguishes absent evidence from unavailable checks, unconfigured checks, pending judgement, failed checks and valid results, and exposes a deterministic coverage projection without assigning a quality score.

The accepted definition preserves ProductShape and ArcShape ownership, does not require a new runtime or package, and leaves future quality evaluation to a separate product such as QuaShape if that boundary becomes necessary.

## Out of Scope

This change does not create a separate quality product, add quality scoring, mutate ProductShape or ArcShape, infer implementation from commits alone, require a release-wide health model, move existing reconciliation evidence, store transcripts, dispatch agents or perform implicit remote writes.
