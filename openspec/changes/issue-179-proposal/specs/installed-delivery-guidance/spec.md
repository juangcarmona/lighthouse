# Spec Delta

<!-- pdac-scope: cited -->

## Purpose

Let adopters discover their installed delivery sources and follow concise operational instructions without a Lighthouse source checkout or implied permission to implement or merge.

## ADDED Requirements

### Requirement: Short installed workflow display names

Selected delivery workflows SHALL expose the display names `router`, `triage`, `refine`, `propose`, `implement`, `integrate`, `review` and `apply review` for their corresponding workers, without changing executable identities or selecting additional workers.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:8331c79365b9d40d8970a0821efaad3d961f1e07d7f78a7083b441937fbdabc8" -->

#### Scenario: Complete worker selection
- **WHEN** an adopter installs all seven agent workers and the router
- **THEN** package sources, compiler-generated locks where applicable and installed projections expose the eight exact corresponding top-level display names
- **AND** workflow filenames, dispatch paths, inputs, stage identifiers and effective permissions are unchanged.

#### Scenario: Partial worker selection
- **WHEN** an adopter installs the baseline, proposal or implementation subset
- **THEN** only the selected workflows receive their short names
- **AND** unselected workflows are neither installed nor deleted implicitly.

#### Scenario: Correction worker identity
- **WHEN** Actions displays `apply review`
- **THEN** executable workflow basenames and the worker identifier remain `lighthouse-sdlc-apply-review` and `apply-review`
- **AND** correction results retain their existing propose or implement lifecycle stage.

### Requirement: Independent installed identity discovery

The SDLC README and generated adopter guidance SHALL explain how to identify the selected package version, actual installed SDLC version and installed workflow source revision before explaining delivery behavior. They MUST NOT infer a workflow pin from a package version or product revision.

<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->

#### Scenario: Distinct package and workflow identities
- **WHEN** an adopter reads the README or generated entrypoint with installed workflows
- **THEN** version/source discovery precedes the behavior overview
- **AND** guidance identifies the selected package record, installed package metadata and immutable harness-source checkout pin in the installed workflow separately from its authorized product checkout.

#### Scenario: Foundation without workflows
- **WHEN** foundation initialization has installed packages but no optional delivery workflows
- **THEN** guidance says workflows are separately installed and no workflow revision is known from the package selection alone
- **AND** it does not imply every worker is available.

#### Scenario: Different or incomplete local evidence
- **WHEN** selected and installed package versions differ, workflow pins differ between files, or a selected workflow lacks a usable immutable source pin
- **THEN** guidance identifies the discrepancy and directs inspection of the actual installed sources and reviewed update route
- **AND** it does not silently substitute main, the product SHA, the package version or one workflow's pin for missing evidence.

### Requirement: Installation-safe entrypoint links

The packaged SDLC README SHALL be the operational entrypoint reached from generated adopter guidance. Its local documentation and executable-source links MUST resolve within installed artifacts. References that require repository-only content MUST explicitly identify the observed source revision rather than imply a checkout is installed.

<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->

#### Scenario: Packed adopter without source checkout
- **WHEN** a clean adopter has only the packed CLI/SDLC artifacts and selected workflows
- **THEN** its generated entrypoint reaches the packaged README, operator material and action source links without repository-relative escapes
- **AND** linked local files and anchors exist in those packed artifacts.

#### Scenario: Package and workflow source differ
- **WHEN** the package README's executable sources are not evidence of the installed workflow revision
- **THEN** instructions distinguish package-local reference sources from the installed files that govern execution
- **AND** any repository-only reference is explicitly qualified by the observed workflow pin, with an unknown pin reported rather than fabricated.

### Requirement: Operational action instructions

The README SHALL give each documented daily action a prerequisite, owner action, result, continuation or stop condition and executable-source link. Detailed deployment, host, environment, reporting and recovery instructions SHALL remain reachable without dominating the operational overview.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:8331c79365b9d40d8970a0821efaad3d961f1e07d7f78a7083b441937fbdabc8" -->

#### Scenario: Choose an issue action
- **WHEN** an owner consults the action matrix
- **THEN** it distinguishes owner-admitted triage stopping for an owner decision, refinement readiness, independent proposal after current authenticated refinement, and implementation with planning included
- **AND** it identifies installed-policy continuation and the effective future pause rather than presenting proposal acceptance as an implementation prerequisite.

#### Scenario: Answer or correct work
- **WHEN** an owner needs to answer a blocked report or correct an existing PR
- **THEN** instructions direct the answer to the matching blocked stage and PR feedback to the existing proposal or implementation PR
- **AND** they distinguish apply-review correction from approval, integration and post-merge review.

#### Scenario: Locate operator details
- **WHEN** an operator needs installation, continuation receipts, runtime, maintenance or reporting details
- **THEN** concise links reach the package-owned detailed guides
- **AND** existing documented README deep links remain usable through updated targets or concise forwarding sections.

### Requirement: Operational label meanings and safe adoption

The catalog and affected guidance SHALL describe existing request, state and overlay meanings consistently, including propose, future and waiting-review. Catalog updates MUST retain explicit create/preserve-only adoption and MUST NOT silently overwrite adopter labels or create remote effects during installation or ordinary upgrade.

<!-- pdac:cite id="FR-LABEL-STATE" digest="sha256:754d81137a03d3679e7213068b36a5377dd5aa02fe479be14ad720973bf2d705" -->

#### Scenario: Interpret operational labels
- **WHEN** an owner reads catalog descriptions and package guidance
- **THEN** propose requests independent planning, future pauses implementation, and waiting-review points to the proposal/PR or blocked report rather than proving approval
- **AND** ready, pr-draft, pr-ready, needs-info and work overlays are distinguished from new authorization and durable host locks.

#### Scenario: Adopt missing labels and preserve customization
- **WHEN** an adopter explicitly applies a current authorized label plan
- **THEN** missing declared labels can be created and existing names, colors and descriptions are preserved
- **AND** the guide explains that revised catalog descriptions do not rewrite existing adopter-owned labels.

#### Scenario: Install or preview an upgrade
- **WHEN** packages are installed or an ordinary upgrade discovers the catalog
- **THEN** no remote label mutation occurs
- **AND** existing transition declarations and unsupported/destructive-operation blocks remain unchanged.

### Requirement: Authority-preserving delivery guidance

Instructions SHALL preserve the distinction between requesting, executing, reporting, accepting and merging work. A successful assessment or readiness label MUST NOT be presented as implementation or merge permission; published-result evidence MUST be distinguished from routing receipts.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

#### Scenario: Paused planning acceptance exercise
- **WHEN** the owner requests propose for a ready issue while future remains present, including when implement is also present
- **THEN** instructions describe authenticated independent proposal execution and subsequent owner review, not implementation or merge
- **AND** future remains the implementation pause at dispatch and admission.

#### Scenario: Published proposal rather than routing receipt
- **WHEN** live proposal acceptance is assessed for issue #179
- **THEN** evidence must include the real owner request, authenticated router/admission and linked published proposal result, with future retained and implementation observed paused
- **AND** a receipt or this un-published candidate alone is not described as successful delivery; an actual failure or blocker remains visible.

#### Scenario: Stale inputs or repeated events
- **WHEN** source, owner intent, accepted PR head or discussion changes, or an event repeats
- **THEN** guidance retains current-input checks, single-request execution and non-forced same-PR correction boundaries
- **AND** the presentation change does not alter authentication, reservations, continuation policy or effective permissions.

#### Scenario: Current-head merge decision
- **WHEN** a proposal is approved, implementation passes or a PR becomes ready for review
- **THEN** instructions do not treat those facts as implicit merge permission
- **AND** enabled integration still requires its separate explicit current-head owner authorization and enforced checks before merge, followed by the configured post-merge review.
