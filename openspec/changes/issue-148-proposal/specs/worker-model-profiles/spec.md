# Worker model profiles

<!-- pdac-scope: cited -->

## Purpose

Let operators select work-specific OpenAI settings while preserving legacy behavior and honest execution evidence.

## ADDED Requirements

### Requirement: Explicit profile selection

Workers SHALL resolve plan, build and fast profiles from project defaults and worker assignments with explicit operator overrides. Model and reasoning SHALL be independent. Legacy single-model operation SHALL remain unchanged until operator opt-in.

<!-- pdac:cite id="FR-MODEL-PROFILES" digest="sha256:a16a1b44c11440550e6e17c4ad55656aaedcdd5dc73384df37d1148bbafddf36" -->

#### Scenario: Worker overrides

- **WHEN** project and operator configuration assign different settings to a worker
- **THEN** operator settings win and configuration provenance is recorded

#### Scenario: Legacy configuration

- **WHEN** the operator has not opted into profiles
- **THEN** its existing model is forwarded unchanged without an added reasoning or processing setting

### Requirement: Fail closed without billing changes

Selections MUST use host-permitted OpenAI settings and tools, fail without fallback and preserve authentication, billing, tier and authority. Fast MUST NOT enable premium processing.

<!-- pdac:cite id="FR-MODEL-PROFILES" digest="sha256:a16a1b44c11440550e6e17c4ad55656aaedcdd5dc73384df37d1148bbafddf36" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

#### Scenario: Unavailable capability

- **WHEN** the selected model or reasoning is not permitted by the operator inventory or fails at the provider
- **THEN** execution stops rather than selecting another model or tier

#### Scenario: Unsupported tier

- **WHEN** a profile declares Fast, Ultrafast, Flex, Batch or a processing-tier switch
- **THEN** configuration is rejected

### Requirement: Honest execution and evaluation evidence

Receipts MUST distinguish requested, configuration-derived and provider-reported settings. Unexposed usage, billing and settings MUST remain unknown. Candidate adoption MUST require repeatable accepted-task evidence and account economics, separating estimated API-equivalent and actual cost.

<!-- pdac:cite id="FR-MODEL-PROFILES" digest="sha256:a16a1b44c11440550e6e17c4ad55656aaedcdd5dc73384df37d1148bbafddf36" -->

#### Scenario: Missing provider fields

- **WHEN** a worker succeeds without provider-reported effort or usage
- **THEN** its receipt preserves requested settings and explicitly marks the missing fields unverified or unknown

#### Scenario: Candidate evaluation unavailable

- **WHEN** identical-revision candidate runs or account usage evidence cannot be obtained
- **THEN** no preset adoption or savings claim is made and acceptance evidence remains incomplete
