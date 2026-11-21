# Spec Delta

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-PROFILE-CONTRACT" digest="sha256:17f929f382361372ad9c6cedef951d8639003afbbfe465477284601f4e09fdd2" -->

## Purpose

Give adopters an independently selected check of semantic-token use in a declared standalone CSS surface, without overstating coverage or changing existing visual-profile obligations.

## ADDED Requirements

### Requirement: Independent source checking selection

The verifier SHALL inspect consumer CSS only when separately enabled with a declared source inventory. An absent or disabled selection SHALL NOT block existing visual-profile compliance before or after a reviewed upgrade. Existing checks and consequences MUST remain unchanged.

#### Scenario: Existing adoption upgrades without selecting checking

- **WHEN** an adopter selects the visual profile and applies a reviewed upgrade without enabling source checking
- **THEN** consumer literals do not introduce a new blocking check and the existing visual guardrail still runs

#### Scenario: Selected empty inventory

- **WHEN** checking is enabled but no eligible source file is inspected
- **THEN** verification fails rather than reporting a successful zero-file scan

### Requirement: Adopted visual authority

The checker MUST resolve its guide and token authority from manifest adoption, managed projection ownership and installed UI metadata. Missing, ambiguous or drifted authority SHALL fail with repair information. A root design file SHALL NOT override the adopted authority.

#### Scenario: Root file conflicts with installed guide

- **WHEN** a root design file declares different tokens but the adopted authority is current
- **THEN** only the adopted installed token source defines supported roles

#### Scenario: Ownership or installed metadata has drifted

- **WHEN** a managed guide hash, package identity or source metadata disagrees with its adopted source
- **THEN** the checker identifies the conflict and does not choose another authority

### Requirement: Bounded declaration verification

Within its documented supported standalone CSS syntax, the checker SHALL reject undefined semantic roles, primitive references and prohibited raw presentation values outside canonical definitions or exact product exceptions. It MUST inspect nested and fallback references and MUST distinguish strings/comments and permitted structural literals.

#### Scenario: Fallback bypass

- **WHEN** a supported presentation declaration references a valid role with a prohibited raw fallback
- **THEN** verification fails even though the primary reference is valid

#### Scenario: Nested undefined role

- **WHEN** any supported declaration contains a nested or fallback reference to an undefined `--lh-*` role
- **THEN** verification fails regardless of an otherwise matching raw-value exception

#### Scenario: Canonical tokens and product geometry

- **WHEN** installed canonical definitions contain primitive values and consumer declarations use semantic roles alongside supported layout literals
- **THEN** the canonical definitions and intentional geometry are not rejected as component presentation violations

### Requirement: Reviewable product exceptions

Exceptions MUST identify an exact path, property and value with a reason, owner and review date. Optional selector and role constraints SHALL narrow their scope. A raw-value or token-override exception MUST NOT bypass undefined roles, primitive references, unrelated declarations or unsupported syntax.

#### Scenario: Scoped product override

- **WHEN** an exact role override matches its reviewed declaration and selector
- **THEN** that override passes while the same value outside the declared scope remains rejected

#### Scenario: Unrelated invalid declaration

- **WHEN** an exception permits one declaration but another property or value violates the contract
- **THEN** verification still reports the unrelated violation

### Requirement: Explicit coverage boundaries

Selected reports MUST identify inspected and excluded paths, unsupported syntax and unresolved imports, and uninspected inline/template/CSS-in-JS content. Unsupported selected inputs SHALL NOT establish complete inspected coverage. Exclusions MUST carry reasons; the checker SHALL make no arbitrary framework or CSS-engine claim.

#### Scenario: Unsupported selected source

- **WHEN** an inventoried file contains unsupported nesting, syntax, properties or unresolved imports
- **THEN** the report identifies the limitation and fails complete checking of that selected file

#### Scenario: Declared generated exclusion

- **WHEN** an inventory excludes a generated file with a reason while inspecting supported sources
- **THEN** the bounded report exposes the exclusion and uninspected surfaces without claiming those inputs passed

### Requirement: Distributed and rendered qualification

The capability SHALL be exercised from actual distributed CLI/UI artifacts with selected and unselected behavior. Qualification MUST preserve the gallery and cover effective semantic styles, contrast, keyboard/focus and reduced motion in light, dark and both system resolutions at wide and narrow viewports.

#### Scenario: Packed adopter selects source checking

- **WHEN** a clean packed-artifact adopter enables the checker and introduces an undefined role
- **THEN** its actual verification command fails and recovers after replacing the declaration with a supported semantic value

#### Scenario: Reference gallery remains unchanged

- **WHEN** the unchanged gallery runs at 1440x1000 and 390x844 in all required appearances
- **THEN** semantic styles resolve correctly and existing accessibility, dialog, literal-input and persistence checks continue to pass
