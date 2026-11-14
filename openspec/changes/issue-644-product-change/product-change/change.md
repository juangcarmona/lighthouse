---
id: CHG-PDAC-V1ALPHA2-VERIFICATION
type: product-change
title: Require PDaC v1alpha2 and behaviour-derived verification
status: draft
base-revision: '384584a'
operations:
  add:
    - SB-LEGACY-PRODUCT-ADOPTION
    - SB-STALE-BEHAVIOUR-EVIDENCE
  modify:
    - BR-AUTHORITY-BOUNDARIES
    - UC-INITIALIZE-AUTHORITIES
    - JRN-ADOPT-AND-DELIVER
    - FR-AUTHORITY-INITIALIZATION
    - FR-AUTHORITY-ADOPTION
    - FR-VERIFY-FOUNDATION
    - FR-AUTHORITY-CONTEXT
    - FR-CHANGE-EVIDENCE
  remove: []
---

## Problem

The product definition permits product-authority omissions and does not require PDaC v1alpha2. Authority context and verification obligations do not distinguish lifecycle and behaviour coverage, executable test existence, actual execution and acceptance. Existing-adopter migration and stale evidence therefore lack an explicit common adoption contract.

## Intended Product Outcome

Every adopter, including Lighthouse itself, explicitly uses provider-validated PDaC v1alpha2 with a compatible provider recorded separately. Missing, legacy, conflicting or unsupported configuration produces an adoption gap and repair route. Reviewed migrations preserve product meaning and ownership across accepted models, active Product Changes and their consumers. Relevant domain lifecycles and structured behaviours guide delivery and traceable, behaviour-appropriate verification. External evidence is provider-verified, and stale citations preserve historical outcomes while requiring revalidation.

## Rationale

The requested outcome states verbatim: “Every Lighthouse adopter uses PDaC `v1alpha2` as its product-definition contract.” The issue also states: “A coverage association alone does not prove execution.” These select mandatory adoption and distinct evidence dimensions rather than an optional version upgrade or coverage-only verification.

The owner update states verbatim: “Prepare the Product Change for review and retain explicit approval of the concrete proposal before provider apply; source merge, release and adopter deployment keep their own evidence.” This draft preserves that separation and does not record approval.

## Affected Product Areas

Authority ownership and exceptions; initialization and brownfield adoption; incremental adoption completion; reconciliation and upgrades; foundation compliance; authority context in delivery; scenario derivation, test execution and evidence freshness; published-consumer verification. Two structured examples clarify legacy-authority rejection and stale-evidence reporting.

## Open Questions

None. The requested scope resolves the material alternatives recorded in the intent. Approval of this concrete draft remains a separate human decision.

## Product Acceptance

- The definition requires explicit v1alpha2 selection for every adopter and separates serialization version from compatible provider version. Omitting product context for a bounded change cannot waive adopter compliance.
- Adoption, reconciliation, upgrade and verification identify missing configuration, v1alpha1, version conflicts and unsupported providers in equivalent human-readable and JSON results, with an actionable repair route and no compliant result.
- A reviewed provider-owned migration route covers models, active Product Changes, consumers, citations and v1alpha2 relationship and scope changes; changing only the version declaration cannot prove migration.
- Packaged delivery guidance and worker evidence expose relevant lifecycle states, transitions, invariants, rules and structured behaviours without replacing delivery stages. Model gaps use the existing Product Change process.
- Applicable scenarios cover valid transitions, forbidden transitions, terminal states and invariants, use structured behaviour context, stimulus and observable outcomes, retain illustrates and relevant lifecycle coverage, and justify non-applicability.
- Behaviour-to-test traceability identifies appropriate end-to-end, integration or domain checks, actual execution and results, missing coverage and unexecuted scenarios. Model coverage, test existence, execution and acceptance remain distinct.
- Evidence retains source and model revisions and provider citations, uses supported external evidence verification for structured behaviour and functional and quality requirement targets, and links lifecycle transitions through structured behaviours. Staleness requires revalidation without rewriting history.
- Published-consumer demonstrations cover fresh adoption, reviewed legacy migration, incompatible and missing configuration, representative lifecycle-derived tests, passing and failing results, and stale evidence detection. Documentation, projections, examples and continuous-integration consumers express the same contract.

## Out of Scope

Approval, provider apply, accepted-model edits, implementation, branch publication, merge, release and deployment are not effects of this candidate. Domain lifecycle modelling for an adopter is not invented here. ProductShape still owns schemas, product artifacts, citations, validation and migration interfaces; architecture and adopter operational ownership remain unchanged.

Existing stage names, gates, entry authority, parent continuation, tool discovery, telemetry, CodeGraph, profiles, UI contracts and general ownership terms remain unchanged. Existing structured examples remain valid. Large-model handling is separate work. Exact compatible release selection, migration mechanics and executable test design belong to subsequent evidence-backed delivery, not new product semantics selected by this worker.
