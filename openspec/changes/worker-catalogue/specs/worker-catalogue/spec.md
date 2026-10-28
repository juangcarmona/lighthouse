# Spec

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## ADDED Requirements

### Requirement: Discover installed workers

The documentation SHALL expose each installed worker with its entry, bounded effects, steps and success, blocked and technical failure exits.

#### Scenario: Operator follows a route

- **WHEN** an operator opens the worker catalogue
- **THEN** the operator can follow the route to its worker and executable source without loading a combined execution graph.

#### Scenario: Worker inventory changes

- **WHEN** an installer-selected worker is absent from the catalogue
- **THEN** the coverage check fails.
