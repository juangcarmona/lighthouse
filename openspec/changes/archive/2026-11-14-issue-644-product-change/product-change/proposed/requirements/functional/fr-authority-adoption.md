---
id: FR-AUTHORITY-ADOPTION
type: functional-requirement
title: Adopt existing product and architecture authorities
status: draft
derived-from: [UC-INITIALIZE-AUTHORITIES, BR-AUTHORITY-BOUNDARIES, BR-OWNED-AUTHORITY]
verification:
  - scenario: An existing repository with valid product and architecture authorities and compliant PDaC v1alpha2 receives a dry-run adoption plan reporting ready authorities without changing content.
  - scenario: Missing, invalid or unavailable authority evidence blocks adoption application and names provider validation and the next supported action without changing provider-owned content or adoption records.
  - scenario-ref: SB-LEGACY-PRODUCT-ADOPTION
  - scenario: Missing product configuration, conflicting versions and an unsupported provider each produce equivalent human-readable and JSON explanations of the gap and repair route.
  - scenario: Already recorded, valid and compliant authorities produce an idempotent plan and verification result without reinitializing either provider.
  - scenario: Reconciliation and upgrade each report missing product configuration, v1alpha1, version conflicts and unsupported providers in equivalent human-readable and JSON results without claiming compliant adoption.
  - scenario: A reviewed migration preserves product meaning across accepted models, active Product Changes, consumers and citations, accounts for v1alpha2 relationship and scope changes, and validates the resulting authority through supported provider interfaces before compliant adoption is recorded.
  - scenario: Published-package consumers demonstrate reviewed legacy migration and failing missing, legacy, conflicting and unsupported configurations, retaining the reported repair routes and verification evidence.
uses-terms: [TERM-AUTHORITY-MAP, TERM-INTEGRATION, TERM-MANAGED-PROJECTION]
---

## Requirement

Lighthouse MUST provide a dry-run-first existing-authority adoption route for ProductShape and ArcShape. It MUST inspect canonical adopter surfaces and use supported read-only provider validators instead of initializers.

The plan MUST report absent, ready, adopted, drifted, invalid or unavailable authority state, together with installed provider version, validation operation, inspected scope and next action. Product authority readiness MUST additionally require explicit, provider-validated PDaC v1alpha2 and a compatible provider. Missing configuration, v1alpha1, conflicting serialization or provider versions and unsupported providers MUST be explained in human-readable and JSON results and MUST NOT count as compliant adoption, including for Lighthouse's own adoption.

Explicit application MUST record exact installed provider versions and the product serialization version separately and regenerate only Lighthouse-owned projections after required authorities validate and projection drift is resolved. Missing, invalid, incompatible or unavailable evidence MUST block successful adoption recording. The route MUST NOT write provider-owned content, run provider initialization or perform remote operations.

The route MUST be idempotent. Subsequent foundation verification MUST revalidate recorded authorities, distinguish adopted and compliant authority from absent, invalid, unavailable, legacy, conflicting or version-drifted authority, and name the supported adoption or reviewed migration route when adoption is incomplete.

The same required product-authority contract MUST be evaluated during reconciliation and upgrades. Both routes MUST expose missing configuration, v1alpha1, version conflicts and unsupported providers in equivalent human-readable and JSON results, with an actionable repair route. Deferring migration or selecting a bounded update scope MUST NOT make incompatible product authority compliant.

The published and reviewed v1alpha2 migration route MUST cover existing accepted models, active Product Changes, consumers and citations, including relationship and scope changes. It MUST preserve product meaning and provider ownership, use supported ProductShape interfaces for provider-owned migration and validation, identify affected consumers and citations, and require resulting-definition validation before compliant adoption is recorded. Changing only the serialization version declaration MUST NOT count as completed migration. Material product-meaning gaps MUST enter the Product Change process and retain explicit human approval before provider apply.

Published-package consumer evidence MUST demonstrate reviewed v1alpha1 migration and missing, legacy, conflicting and unsupported configurations, retaining failures and repair routes. Owning documentation, managed projections, examples and continuous-integration consumers MUST express this same contract without changing provider ownership or granting product approval, merge, release or deployment authority.

## Rationale

Existing authority documentation must be proven and recorded without destructive reinitialization. Provider validity alone cannot establish Lighthouse's required product serialization contract.
