# Skill behavior

<!-- pdac-scope: cited -->

## Purpose

Distinguish bounded skill selection, protocol compliance and completed requester delivery without confusing simulated observations with real-provider qualification.

## ADDED Requirements

### Requirement: Independent bounded evaluations

The evaluator SHALL validate explicitly simulated traces for design advice, scoped refinement and scoped implementation, report selection, protocol and completion separately, and require all three for aggregate success. Unsupported or malformed input MUST NOT pass.

<!-- pdac:cite id="FR-SKILL-CONTRACTS" digest="sha256:9cc9969f26d71771ee0de0cd973841ad2f8fe33a5169594f4a8a88a052f48c9b" -->

#### Scenario: Valid simulation

- **WHEN** each supported scenario supplies its expected selection, required context, bounded behavior, structured result and requester delivery
- **THEN** all three dimensions pass and provider measurement remains unmeasured

#### Scenario: Wrong selection

- **WHEN** a complete trace selects a different skill
- **THEN** selection fails independently of protocol and completion

#### Scenario: Unsupported input

- **WHEN** a trace has unknown fields, unsupported event syntax, an unsafe path or an unlabeled simulation
- **THEN** validation rejects it and no dimension passes

### Requirement: Required protocol and preserved authority

The evaluator SHALL require context before work, forbid advice/refinement and out-of-scope implementation writes, and reject duplicate interviews or changes to accepted decisions.

<!-- pdac:cite id="FR-SKILL-CONTRACTS" digest="sha256:9cc9969f26d71771ee0de0cd973841ad2f8fe33a5169594f4a8a88a052f48c9b" -->

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:c07c375e4fa1788978ca5d900bc8f0ea9bc009bc71a1fff5d7602ebed6b00894" -->

#### Scenario: Unsolicited or out-of-scope writes

- **WHEN** otherwise complete advice writes any project path or a scoped trace writes outside its contract
- **THEN** protocol fails even if selection and requester delivery succeed

#### Scenario: Refinement preserves project files

- **WHEN** direct engineering refinement produces a valid bounded output but writes within its proposed future implementation scope
- **THEN** protocol fails independently while selection and otherwise valid completion remain observable
- **AND** proposed future implementation scope grants no refinement write permission

#### Scenario: Missing or late context

- **WHEN** required authority/context, including projected design authority for advice, is absent, has a different identity or is read only after work
- **THEN** protocol fails

#### Scenario: Accepted decisions already exist

- **WHEN** a trace re-interviews an accepted decision, repeats an interview or replaces an accepted decision without authorization
- **THEN** protocol fails

### Requirement: Observable completion and delivery

The evaluator SHALL require a structured scenario-appropriate result, all declared checks passed, and a later delivery of that result to the declared requester. Implementation MUST declare completion checks. Reference reads, file existence and phrase presence MUST NOT substitute for these observations.

<!-- pdac:cite id="FR-SKILL-CONTRACTS" digest="sha256:9cc9969f26d71771ee0de0cd973841ad2f8fe33a5169594f4a8a88a052f48c9b" -->

#### Scenario: Stops after reading references

- **WHEN** selection and required reads occur but no complete result is produced
- **THEN** completion fails

#### Scenario: Incomplete bounded refinement

- **WHEN** a refinement omits its bounded problem, criteria, scope, resolved dependencies, confirmed explained estimate or any caller-requested work
- **THEN** completion fails without requiring a triage predecessor or matching prose phrases

#### Scenario: Cross-request or cross-run delivery

- **WHEN** an otherwise valid delivery or result belongs to another request or run
- **THEN** completion fails independently of selection and protocol

### Requirement: Concrete bounded findings

Every assertion SHALL retain its stable identity and provide a bounded reason, relevant observation references and applicability. Missing evidence MUST be explicit, and inapplicable obligations MUST NOT be described as observed work. Structural rejection SHALL remain distinct from behavioral failure.

#### Scenario: Missing context observation

- **WHEN** a declared repository rule or supplied owner decision lacks a timely matching read
- **THEN** the protocol finding identifies the missing context and references the contract and relevant observations

#### Scenario: Generated but not delivered

- **WHEN** a valid result has no later delivery to its requester, or delivery refers to another result
- **THEN** completion fails

#### Scenario: Unsupported completion claim

- **WHEN** implementation lacks a required passed check or reports different changes from observed writes
- **THEN** completion fails

### Requirement: Offline distributed self-verification

Default verification SHALL be offline, credential-free simulation and test actual predicate mutants for every required assertion. The evaluator and schema MUST execute in an isolated packed consumer, preserve existing exports/assertions and never qualify a provider.

<!-- pdac:cite id="FR-SKILL-CONTRACTS" digest="sha256:9cc9969f26d71771ee0de0cd973841ad2f8fe33a5169594f4a8a88a052f48c9b" -->

#### Scenario: Disabled predicate

- **WHEN** each required evaluator predicate is independently replaced with unconditional success
- **THEN** its negative oracle detects the evaluator defect

#### Scenario: Packed consumer

- **WHEN** an isolated consumer imports the packed evaluator and schema without workspace imports
- **THEN** it evaluates a valid simulation and rejects malformed input without provider calls
