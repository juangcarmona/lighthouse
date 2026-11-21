# Spec Delta

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-INSTRUCTION-BUDGETS" digest="sha256:94cbc9c2f8242c4f3ac2507ed575529d696d35cff3bbfa4ca1cb32250e1bb913" -->
<!-- pdac:cite id="QR-REPRODUCIBLE-DISTRIBUTION" digest="sha256:ac9c5b33405da493ab5cb1e65477b9be6c76b05ab59a71dd0fa384f30c7a13db" -->

## Purpose

Make fixed instruction growth reviewable for explicitly supported workflow branches while preserving authority, full evidence access and existing behavior.

## ADDED Requirements

### Requirement: Reproducible selected-input measurements

The system SHALL report entry, selected-reference and combined UTF-8 byte totals, source paths, content identities, measurement method and explicit reviewed caps for four named refinement and implementation branches.

#### Scenario: Repeated measurement

- **WHEN** the same supported source files and selections are measured twice
- **THEN** their identities and totals are identical, and each selected file is counted once per branch.

#### Scenario: Visual selection

- **WHEN** refinement proposes visual examples or implementation captures an existing view
- **THEN** visual guidance is selected in addition to the branch's product, audience and applicable planning guidance.

### Requirement: Fail closed on budget drift

The system MUST reject exceeded or missing caps, stale recorded identities or totals, missing supported files and added or removed selected references. Ordinary repository tests SHALL invoke the owning budget check without requiring a new root package command.

#### Scenario: Exceeded cap

- **WHEN** any entry, reference or combined total exceeds its cap
- **THEN** verification fails and identifies the branch and exceeded cap.

#### Scenario: Uncapped supported input

- **WHEN** a supported branch or one of its required caps is absent
- **THEN** verification fails rather than treating the input as uncovered.

#### Scenario: Stale or missing source

- **WHEN** a recorded source changes, including a same-byte-length edit, or disappears
- **THEN** verification fails with a source-specific diagnostic.

#### Scenario: Changed selection

- **WHEN** a selected reference is added or removed, even if observations and totals are updated
- **THEN** verification fails until the supported selection definition and its inventory are reviewed together.

#### Scenario: Source selection changes with refreshed observations

- **WHEN** an entry or selected transitive source adds or removes a required reference through a same-size edit and only its recorded content observation is refreshed
- **THEN** verification refuses the unreviewed selection independently of unchanged caps and totals, without claiming the new target was measured or consumed.

#### Scenario: Surrounding selection conditions change

- **WHEN** instruction context outside reference-bearing paragraphs changes while existing links, selections and caps remain unchanged and observations are refreshed
- **THEN** native verification refuses the unreviewed selection conditions rather than qualifying the former selection; synthetic byte-accounting reports do not qualify native source selection.

### Requirement: Explicit coverage and preserved authority

Budget reports MUST identify uncovered branches and exclude variable issue, model and project context from fixed-input claims. Bytes MUST NOT be called actual model tokens, billing or savings. Budget guidance MUST retain mandatory policy, exact decisions and access to full evidence; a pointer MUST NOT imply unread content was reviewed. Any instruction reduction MUST pass supported behavioral evaluator scenarios.

#### Scenario: Bounded coverage

- **WHEN** a budget report passes
- **THEN** it names triage, standalone proposal/integration/review, Product Change preparation/apply, corrections, unattended routes, browser-e2e and adopter-specific branches as uncovered, without claiming full-context fit or workflow completion.

### Requirement: Distributed offline verification

The SDLC package SHALL distribute the inventory, schema and measurement module through additive exports while preserving existing exports and checks. A clean packed consumer MUST resolve and execute these assets without relying on workspace source.

#### Scenario: Packed consumer

- **WHEN** an isolated consumer loads the actual package tarball
- **THEN** its inventory and schema resolve inside that package and its offline measurement reproduces all recorded branch totals.
