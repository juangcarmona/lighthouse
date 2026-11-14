---
id: SB-LEGACY-PRODUCT-ADOPTION
type: structured-behaviour
title: A valid legacy product authority is not compliant adoption
status: draft
illustrates: [UC-INITIALIZE-AUTHORITIES, BR-AUTHORITY-BOUNDARIES]
given:
  - An existing adopter has an explicitly configured PDaC v1alpha1 product model.
  - The installed ProductShape provider validates that legacy model successfully.
when: The adopter requests existing-authority adoption
then:
  - The result identifies v1alpha1 as a product-contract adoption gap.
  - The result does not report compliant product authority adoption.
  - Human-readable and JSON results identify the reviewed provider-owned migration route to v1alpha2.
  - Adoption inspection leaves the existing product model unchanged.
uses-terms: [TERM-AUTHORITY-MAP, TERM-INTEGRATION]
---

## Intent

Successful provider validation of a legacy model does not satisfy Lighthouse's universal PDaC v1alpha2 contract. The adopter receives an actionable migration route without destructive reinitialization.

## Boundaries

This example does not perform migration, approve changed product meaning or declare architecture adoption successful. It does not define a domain lifecycle merely because adoption has delivery states.
