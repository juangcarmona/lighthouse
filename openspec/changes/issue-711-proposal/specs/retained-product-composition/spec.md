# Spec Delta

<!-- pdac-scope: cited -->

## Purpose

Allow confined Product Change workers to reuse admitted retained text artifacts without retranscribing their contents or gaining general execution authority.

## ADDED Requirements

### Requirement: Bound retained composition to admitted inputs

The planning adapter SHALL expose deterministic inspection and composition of explicitly identified retained objects from the current admitted task. It MUST reject stale request, source, baseline or schema bindings, missing or changed hashes, ambiguous revisions and unsupported input forms.

#### Scenario: Inspect retained objects

- **WHEN** the worker inspects a valid retained draft from its admitted task
- **THEN** it receives source/path/hash references and measured counts and bytes without regenerating file contents

#### Scenario: Reject stale or foreign inputs

- **WHEN** a selection names an unknown source, changed hash, stale binding or conflicting revision
- **THEN** composition fails without reading another run or changing durable output

### Requirement: Compose one complete exact candidate

The operation SHALL require explicit latest-per-path selection or omission and acknowledgement of superseded objects. It MUST preserve selected UTF-8 text exactly and validate the final complete candidate using existing type, scope, count, size, status and schema rules, rejecting duplicate paths and artifact IDs.

#### Scenario: Compose the maximum file count

- **WHEN** 64 valid synthetic retained files within the current byte bounds are selected
- **THEN** the complete candidate contains exactly those paths and contents, with measured counts, byte totals and hashes

#### Scenario: Reject incomplete or oversized composition

- **WHEN** a path is unaccounted for, an older replacement is selected, or a current bound is exceeded
- **THEN** no partial candidate replaces the prior valid output

### Requirement: Preserve output and authority boundaries

The operation SHALL atomically write only the authorized stage envelope after complete validation. It MUST leave provider validation pending, preserve the supplied assessment rather than fabricate success, and expose no arbitrary filesystem, code, shell, network, GitHub, approval, apply or lease operation. Ordinary literal candidates and truthful blocked outcomes MUST remain compatible.

#### Scenario: Retained content contains instructions

- **WHEN** selected text contains instructions or executable-looking content
- **THEN** the text remains inert data and grants no additional effect

#### Scenario: Unsupported runtime capability

- **WHEN** the pinned runtime cannot expose the supported operation
- **THEN** the worker reports a technical blocker and installation/qualification recovery without broadening its tool permissions

#### Scenario: Failure preserves previous output

- **WHEN** input, candidate or envelope validation fails
- **THEN** the source and previous durable envelope remain unchanged

<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->
<!-- pdac:cite id="QR-AGENT-ISOLATION" digest="sha256:731985a0bf28b2715a594b54342c254017eabe0e41fc14e3d12144b82240208b" -->
