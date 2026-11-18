<!-- pdac-scope: cited -->

# risk-bound-continuation Specification

## Purpose

Keep optional FF/hotfix risk assessment inside existing source, scope, evidence and effect authority.

## Requirements

### Requirement: Restrictive current-scope assessment

An opted-in FF/hotfix host SHALL retain separate risk, defect and evidence assessments, enforce sensitive-surface stops and current assessed scope, and preserve separate effect authority.

<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->

#### Scenario: Routine continuation

- **WHEN** a routine reversible candidate stays inside assessed scope, host checks execute successfully and fresh independent review accepts
- **THEN** publication follows existing authority and merge remains separately delegated

#### Scenario: Sensitive change or scope growth

- **WHEN** an assessment is sensitive or irreversible, an actual changed file matches a project stop rule, or a candidate expands assessed scope
- **THEN** dependent continuation stops with a retained reason and owner action

#### Scenario: Unavailable evidence or exhausted repairs

- **WHEN** evidence is uncertain or unavailable, actual independent checks cannot be established, or the shared correction budget is exhausted
- **THEN** no candidate is published by that attempt

### Requirement: Separate current authority

The host SHALL recheck current entry authority before effects and preserve separate product, merge and protected decisions.

<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:23b079974fa943d0081d496a8ac59ce0502c4e5ff4cd5b4720d78d033eb0e93e" -->

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:404ea1496978d61bee268ee8dbd95709620c12725b2f65e8cd44bb450878e403" -->

#### Scenario: Authority changes

- **WHEN** source, owner intent, authorization or policy changes before a protected effect
- **THEN** the existing host recheck stops continuation and current evidence must be established again

#### Scenario: Existing policy

- **WHEN** a policy omits the optional assessment
- **THEN** existing admission and verification requirements retain their prior behavior
