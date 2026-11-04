# Bounded CI correction

## ADDED Requirements

### Requirement: Publication requires trusted applicable validation

The host SHALL validate proposed Markdown style and local links before successful publication, in addition to the owning provider and adopted implementation checks.

#### Scenario: Broken proposal without hooks

- **WHEN** a proposed Markdown file has an invalid local link or violates adopted style
- **THEN** trusted publication fails before signing or creating the candidate PR

### Requirement: Failed CI correction retains current authority and a finite budget

The router SHALL request correction only for explicitly selected issues with authenticated failed adopted CI on the current same-repository implementation PR and a matching original implementation grant. It SHALL consume at most two correction attempts for that PR identity across changing heads.

#### Scenario: Repairable current failure

- **WHEN** adopted CI fails on an eligible current candidate with unchanged intent, scope and checks
- **THEN** the existing correction worker updates that same PR and renews host checks and CI

#### Scenario: Duplicate or unknown effect

- **WHEN** a completion duplicates a handled head or an earlier dispatch has unconfirmed effects
- **THEN** no additional worker or candidate is created

#### Scenario: Exhausted correction chain

- **WHEN** two correction attempts have been consumed and the new current candidate still fails
- **THEN** the router retains the PR and identifies the failed CI and required maintainer action without another automatic correction

#### Scenario: Product decision is still required

- **WHEN** failed CI concerns a product proposal or current authority requires an owner decision
- **THEN** automatic implementation correction cannot approve, apply or silently rebind that proposal
