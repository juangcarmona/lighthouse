# Spec Delta

<!-- pdac-scope: cited -->

## Purpose

Define independently configurable model and reasoning selection for workers without transferring execution authority away from the operator. The applied Product Change is identified in proposal.md; implementation and acceptance are tracked separately in tasks.md.

## ADDED Requirements

### Requirement: Independent worker settings

Version 2 SHALL support complete direct worker model/effort settings and optional presets, without a three-combination limit. Invalid settings MUST fail.

<!-- pdac:cite id="FR-MODEL-PROFILES" digest="sha256:a16a1b44c11440550e6e17c4ad55656aaedcdd5dc73384df37d1148bbafddf36" -->
<!-- pdac:cite id="UC-CONFIGURE-AGENT-CONTROL-PLANE" digest="sha256:552d5971429dfc41af56702e249b9a75cb6f10519090d14e7ee8849aab2bb571" -->

#### Scenario: More than three combinations

- **WHEN** four installed workers declare allowed combinations including one model at medium/high effort and two models at the same effort
- **THEN** each worker resolves its exact configured combination without a three-name limit

#### Scenario: Invalid configuration

- **WHEN** a configuration uses an unsupported version, a direct selector omits effort, mixes a preset with direct fields, embeds a variant in a model, declares another provider or adds unknown fields
- **THEN** selection fails explicitly without inheriting a missing direct field or choosing another setting

### Requirement: Deterministic selection precedence

The system SHALL apply the precedence below and operator preset field overrides. All selections MUST satisfy operator capabilities and unchanged resource limits.

<!-- pdac:cite id="FR-MODEL-PROFILES" digest="sha256:a16a1b44c11440550e6e17c4ad55656aaedcdd5dc73384df37d1148bbafddf36" -->
<!-- pdac:cite id="BR-AGENT-LAUNCH" digest="sha256:10c5293cdbafffda987b287968e141daceed8a063da166faa339793ebe10c1ed" -->

#### Scenario: Execution overrides a worker default but not policy

- **WHEN** an authenticated owner selects a complete combination with operator opt-in while worker and default settings differ
- **THEN** that combination wins only if its exact model, effort and tool capability are operator-allowed and all resource limits remain in force

#### Scenario: No execution selector

- **WHEN** no execution selector is supplied
- **THEN** selection order is execution, operator worker, project worker, operator default, then project default; a selected preset uses operator definition fields before project definition fields

### Requirement: Authenticated execution selection

Execution selectors MUST require owner manual dispatch, explicit operator opt-in and authenticated dispatch binding. Untrusted inputs MUST NOT authorize selections.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
<!-- pdac:cite id="BR-AGENT-LAUNCH" digest="sha256:10c5293cdbafffda987b287968e141daceed8a063da166faa339793ebe10c1ed" -->

#### Scenario: Authorized owner choice

- **WHEN** an owner manual dispatch supplies an allowed selector and the operator enables execution selection
- **THEN** the authenticated artifact binds it and the selected ordinary worker receives exactly that selector

#### Scenario: Untrusted or changed choice

- **WHEN** issue text or direct worker inputs suggest a model, a non-owner requests a selector, dispatch contents change, replay/continuation carries a selector or operator opt-in is absent
- **THEN** no unauthorized selector launches; explicit invalid override attempts fail rather than silently falling back

### Requirement: Backward compatibility and rollback

The system MUST preserve version 1, legacy, delegation and receipt compatibility. Opt-out MUST restore exact legacy forwarding and reject explicit selectors.

<!-- pdac:cite id="FR-MODEL-PROFILES" digest="sha256:a16a1b44c11440550e6e17c4ad55656aaedcdd5dc73384df37d1148bbafddf36" -->
<!-- pdac:cite id="FR-PROFILE-DELEGATION" digest="sha256:dfe2874654b6e78de96b24d146fb944d966c6773a69d5a1d93a3f5eaadc8eb1b" -->

#### Scenario: Existing installation and delegation

- **WHEN** an existing version 1 worker or trusted delegated task uses plan/build/fast
- **THEN** resolution and bounded delegated behavior remain compatible and historical receipts require no rewrite

#### Scenario: Rollback

- **WHEN** the operator disables profile opt-in
- **THEN** ordinary workers without explicit selectors forward the original legacy model byte-for-byte and explicit selectors fail

#### Scenario: Unsupported downgrade

- **WHEN** a version 2 declaration is given to a version 1-only resolver
- **THEN** it fails explicitly rather than being silently reinterpreted

### Requirement: Explicit unavailable-setting failure

The system MUST reject unknown models, unsupported efforts and denied or unavailable operator capabilities before startup. Actual provider failures MUST fail execution without silently selecting another model, effort, provider or processing tier.

<!-- pdac:cite id="FR-MODEL-PROFILES" digest="sha256:a16a1b44c11440550e6e17c4ad55656aaedcdd5dc73384df37d1148bbafddf36" -->
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

#### Scenario: Operator capability denial

- **WHEN** the selected model or effort is unknown, unavailable or denied tool capability
- **THEN** no engine is launched and the error is explicit

#### Scenario: Provider rejects configured model

- **WHEN** the provider fails the one selected launch despite operator-declared availability
- **THEN** execution fails without attempting an alternative and the declaration is not reported as proven access

### Requirement: Honest execution evidence

Evidence MUST separate requested, resolved/provenance and provider-reported or unverified settings. Usage, charges and estimates MUST stay distinct; absent evidence MUST remain unknown.

<!-- pdac:cite id="FR-MODEL-PROFILES" digest="sha256:a16a1b44c11440550e6e17c4ad55656aaedcdd5dc73384df37d1148bbafddf36" -->
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

#### Scenario: Two ordinary workers retain distinct receipts

- **WHEN** two ordinary workers launch different models with independently selected efforts
- **THEN** each receipt records its requested selector, exact resolved setting and provenance; missing authenticated provider fields remain null and unverified

#### Scenario: Unknown account economics

- **WHEN** events expose token usage but no verified charge or subscription evidence
- **THEN** measured usage may be retained separately while actual charges, subscription usage and unsupported estimates remain unknown

### Requirement: Selection does not grant authority

Model settings MUST NOT change credentials, billing routes, tier, tools or limits, or enable Fast, Flex or Batch processing.

<!-- pdac:cite id="FR-MODEL-PROFILES" digest="sha256:a16a1b44c11440550e6e17c4ad55656aaedcdd5dc73384df37d1148bbafddf36" -->
<!-- pdac:cite id="BR-AGENT-LAUNCH" digest="sha256:10c5293cdbafffda987b287968e141daceed8a063da166faa339793ebe10c1ed" -->

#### Scenario: Allowed selection leaves controls unchanged

- **WHEN** an allowed model/effort selection replaces the worker default
- **THEN** only model execution arguments and evidence change, not authentication, billing, tier, permissions, limits or lifecycle admission

#### Scenario: Settings attempt to grant permissions

- **WHEN** a selector includes credential, service-tier, tool, resource-limit or approval fields
- **THEN** strict validation rejects the unsupported fields without changing authority

### Requirement: Lifecycle controls remain independent

Selection MUST NOT bypass human approval, review, merge or deployment controls. Routing and checks SHALL remain deterministic host work outside model execution.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->

#### Scenario: Same lifecycle admission for every selection

- **WHEN** an authenticated owner selects an allowed expensive combination
- **THEN** the host still enforces the same lifecycle gates and deterministic routing/checks without granting new approval or publication authority
