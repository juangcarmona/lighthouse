# Spec Delta

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORITY-CONTEXT" digest="sha256:39d5fabc1afdaec4f779b28efcd21b86ec5c86635b13c1d6283c359ae67823a3" -->

## Purpose

Provide complete, baseline-bound ProductShape model fingerprints and read-only planning evidence without imposing an artifact-count ceiling.

## ADDED Requirements

### Requirement: Count-independent model fingerprints

Lighthouse SHALL fingerprint every accepted model file within the per-file and aggregate-byte budgets, without an artifact-count ceiling. Local and API fingerprints SHALL use the same deterministic path and content encoding, including proposed model overlays.

#### Scenario: Large accepted model

- **WHEN** an accepted model contains 640 artifacts within the byte budgets
- **THEN** local and API fingerprints include every artifact and agree
- **AND** changing an artifact beyond position 512 changes the fingerprint

#### Scenario: Overlay grows a model beyond 512 artifacts

- **WHEN** a proposed overlay grows a model from 512 to 640 artifacts within the byte budgets
- **THEN** the API fingerprint includes all overlaid artifacts and matches the local resulting model

### Requirement: Complete baseline-bound planning evidence

Lighthouse SHALL prepare, serialize and install inspection, impact and citation reports for every artifact in a valid ProductShape baseline within resource budgets, without an artifact-count ceiling. The index SHALL list every report exactly once, and installed evidence SHALL be read-only and bound to the expected baseline.

#### Scenario: Complete large-model evidence

- **WHEN** a valid 640-artifact model fits report, index and aggregate-byte budgets
- **THEN** preparation and installation preserve all 640 reports and their index entries
- **AND** every installed report contains the provider's inspection, impact and citation output

#### Scenario: Invalid or changed baseline

- **WHEN** the provider reports a blocking model diagnostic or the baseline fingerprint changes
- **THEN** Lighthouse rejects evidence preparation rather than presenting it as current accepted intent

### Requirement: Count-independent resource and validation safeguards

Lighthouse MUST enforce explicit per-model-file, aggregate-model, per-report, index and aggregate-evidence byte budgets independently of artifact count. Unsafe paths, nonregular files, mismatched baselines and incomplete or duplicate report inventories MUST remain rejected.

#### Scenario: Small inventory exceeds byte budget

- **WHEN** a model file, model aggregate, report, serialized index or evidence aggregate exceeds its respective byte budget
- **THEN** Lighthouse rejects it even when its artifact count is below 512

#### Scenario: Evidence inventory is invalid

- **WHEN** an evidence index duplicates or omits a report, names an unsafe report, or does not match the expected baseline
- **THEN** Lighthouse rejects installation
