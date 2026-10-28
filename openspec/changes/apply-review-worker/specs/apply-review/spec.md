# Spec

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## ADDED Requirements

### Requirement: Bounded feedback correction

Authorized feedback SHALL execute once through apply-review, preserving the existing PR, lifecycle stage, permissions and verified source.

#### Scenario: Valid correction

- **WHEN** the owner requests a correction on an eligible bot PR
- **THEN** apply-review receives the bounded conversation and the publisher updates that PR after rechecking its head and feedback.

#### Scenario: Duplicate or stale feedback

- **WHEN** a feedback identity repeats or its source/head/discussion changes
- **THEN** no duplicate correction or stale publication is allowed.

#### Scenario: Ambiguous correction

- **WHEN** the agent cannot resolve the request within its authority
- **THEN** it reports the human decision and does not claim successful correction.
