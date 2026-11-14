---
id: BR-AUTHORITY-BOUNDARIES
type: business-rule
title: Each authority keeps its boundary
status: draft
applies-to: [BC-FOUNDATION]
uses-terms: [TERM-AUTHORITY-MAP, TERM-HARNESS, TERM-INTEGRATION]
---

## Rule

ProductShape MUST remain the authority for product intent, ArcShape MUST remain the authority for architecture evidence, and Lighthouse MUST remain the authority for the adopted delivery contracts and evidence. A downstream stage MUST record the upstream revision or an explicit exception instead of inventing upstream meaning.

Every Lighthouse adopter, including Lighthouse itself, MUST explicitly select PDaC v1alpha2 as its product-definition contract and use a compatible ProductShape provider. The PDaC serialization version and provider version MUST be recorded separately. Missing configuration, v1alpha1, conflicting versions and unsupported providers MUST remain actionable adoption gaps and MUST NOT count as compliant adoption. ProductShape MUST retain ownership of its schemas, model, citations and managed content.

## Rationale

Independent delivery speeds are useful when the handoff is explicit and traceable. A shared product-definition contract makes lifecycle and behaviour evidence usable without transferring product ownership to the delivery harness.

## Examples

A draft product definition may be initialized in v1alpha2 without claiming its product intent is approved. An existing provider-valid v1alpha1 model still requires reviewed migration before Lighthouse can report compliant adoption. A change with no relevant domain lifecycle records why lifecycle-derived verification does not apply.

## Exceptions

A project may omit an authority's context for a bounded change when its authority map records that the concern is out of scope and names the decision owner. That change-level exception MUST NOT waive the adopter's PDaC v1alpha2 requirement or make absent, legacy, conflicting or unsupported product authority compliant. Existing architecture-context exceptions remain unchanged.
