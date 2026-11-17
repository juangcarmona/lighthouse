<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:90af94bb73cab9bf61e3a4c6eb7d44f68b42513063adadaa629ba72e69150f69" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:404ea1496978d61bee268ee8dbd95709620c12725b2f65e8cd44bb450878e403" -->

# Product visual evidence

## ADDED Requirements

### Requirement: Stage-specific visual examples

Lighthouse SHALL require an explicit applicability assessment for newly admitted refinement, proposal and implementation requests. Applicable planning SHALL produce concrete proposed examples. Applicable implementation SHALL provide captures of the actual running candidate, with before comparisons for affected existing views. Missing required current-stage evidence SHALL remain blocked.

#### Scenario: Proposed experience

- **WHEN** refinement or proposal affects a product view or interaction
- **THEN** the result includes bounded proposed examples and the affected view, state and viewport
- **AND** the host labels the rendered image as proposed rather than implemented behavior

#### Scenario: Candidate review

- **WHEN** an implementation changes an existing view
- **THEN** its before and candidate captures identify matching views and relevant states and viewports
- **AND** retained candidate evidence binds to the independently checked tree and published candidate

#### Scenario: Nonvisual scope

- **WHEN** the inspected issue changes no product view or interaction
- **THEN** the worker records a concrete non-applicability reason without producing unrelated images

#### Scenario: Missing current-stage capture

- **WHEN** the required browser, file, renderer or current-stage visual evidence is unavailable
- **THEN** the stage does not pass and reports the concrete blocker and responsible recovery action

### Requirement: Durable reviewable images

The trusted host SHALL publish validated content-addressed PNGs and provenance on the adopter's explicitly adopted protected evidence branch and embed commit-pinned image links in the issue and delivery PR. Image production SHALL NOT grant design acceptance, implementation acceptance, merge or release authority.

#### Scenario: Workspace cleanup

- **WHEN** disposable execution resources are removed after successful publication
- **THEN** the image URLs and provenance report remain accessible subject to the repository's access controls

#### Scenario: Tampered or unsafe member

- **WHEN** a capture has an unsafe path, symlink, wrong dimensions, excessive size, changed bytes or mismatched candidate identity
- **THEN** collection or publication refuses it and does not claim successful visual verification

#### Scenario: Correction and duplicate publication

- **WHEN** owner feedback requests a correction on the same work item
- **THEN** new evidence identifies the current candidate and earlier images remain historical
- **AND** an identical publication is reused while conflicting content at its immutable destination is rejected
