# Epic delivery

<!-- pdac-scope: cited -->

## Purpose

Turn oversized requests into accountable child outcomes and one aggregate reviewed change without weakening existing execution or merge authority.

## ADDED Requirements

### Requirement: Confirm oversized refinement before splitting

Refinement MUST reconsider the estimate and require useful decomposition planning only when the confirmed estimate is strictly greater than eight points. When no safe useful split exists, it MUST record why and ask the owner instead of inventing slices.

<!-- pdac:cite id="BR-DECOMPOSITION" digest="sha256:35124f644d4b43927a3045d1fbfc63858a5d63347dd3c24c5053630e1cb768b1" -->

#### Scenario: Boundary estimate

- **WHEN** refinement confirms eight points
- **THEN** decomposition is not mandatory

#### Scenario: Oversized estimate

- **WHEN** refinement confirms thirteen points
- **THEN** it supplies independently verifiable slices and explicit acyclic dependencies or returns blocked with the no-safe-split reason and owner question

### Requirement: Preserve independent child accountability

The system SHALL preserve parent content and create native child relationships with stable identities and explicit dependencies. Each child MUST receive its own bounded triage and subsequently authorized refinement, independent estimate and visible questions.

<!-- pdac:cite id="UC-DECOMPOSE-WORK-ITEM" digest="sha256:2413b31fdfc906532aa330c653c34701cabd2a2653342ec616a6dc1f6108c669" -->

#### Scenario: Child question

- **WHEN** a child has a blocking question
- **THEN** its state remains visible and dependent execution cannot proceed by copying the parent's readiness

### Requirement: Respect dependencies and current integration evidence

Child PRs SHALL target a dedicated shared epic branch. Independent children MAY run within configured capacity; dependent children MUST wait for accepted prerequisites. Changed bases MUST invalidate integration evidence before merges or dependent advancement.

<!-- pdac:cite id="BR-DECOMPOSITION" digest="sha256:35124f644d4b43927a3045d1fbfc63858a5d63347dd3c24c5053630e1cb768b1" -->

#### Scenario: Independent branches

- **WHEN** two children have no dependency edge
- **THEN** their PRs target the shared epic branch, not each other

#### Scenario: Base advances

- **WHEN** the epic branch advances after a child's checks
- **THEN** that child needs fresh integration evidence before merging

#### Scenario: Dependency rejected or cancelled

- **WHEN** a prerequisite is unmerged, cancelled, blocked or uncertain
- **THEN** the dependent child waits and reports the unmet dependency

### Requirement: Authenticate correlation and reconcile partial work

The system MUST retain versioned machine-readable parent, child, base and dependency correlations in issue/PR comments, authenticate them against retained host evidence and current GitHub state, and reconcile retries without duplicates. Copied or edited metadata MUST NOT grant execution or merge authority. Uncertain writes MUST stop recreation pending reconciliation.

<!-- pdac:cite id="BR-DECOMPOSITION" digest="sha256:35124f644d4b43927a3045d1fbfc63858a5d63347dd3c24c5053630e1cb768b1" -->

#### Scenario: Lost creation response

- **WHEN** a create may have succeeded but its response was lost
- **THEN** retry reconciles that identity or reports uncertainty instead of creating another resource

#### Scenario: Copied marker

- **WHEN** a marker lacks matching authenticated host evidence or current native relationships
- **THEN** it cannot authorize any dispatch or merge

### Requirement: Preserve owner decisions and aggregate acceptance

Each child merge MUST require explicit owner authorization bound to the current child head and current checks. The system SHALL publish one aggregate PR from the epic branch to main after children are accepted, preserve final owner approval and keep the parent open until aggregate acceptance.

<!-- pdac:cite id="UC-MANAGE-STACKED-CHANGE" digest="sha256:c4aa8990ece018886e19f98d7aaa4984f3f7fb0605abf4edf860074ffb3838ff" -->

#### Scenario: Approval becomes stale

- **WHEN** the child head changes after an owner decision
- **THEN** the previous decision cannot authorize merging the new head

#### Scenario: All children accepted

- **WHEN** every child outcome is accepted in the epic branch
- **THEN** one aggregate PR can be published while the parent remains open pending aggregate acceptance
