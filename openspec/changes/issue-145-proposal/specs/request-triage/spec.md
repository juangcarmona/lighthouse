# Request triage

## Purpose

Help requesters describe an outcome and give owners an evidence-backed triage assessment before deciding whether to refine it.

## ADDED Requirements

### Requirement: Simple public request

The public form SHALL require only a problem and desired result, with optional examples or context. It SHALL NOT require technical acceptance criteria, architecture, an estimate or a delivery plan.

#### Scenario: Nontechnical requester

- **WHEN** a person submits the form
- **THEN** the issue retains their original problem, desired result and optional context
- **AND** submission alone starts no agent

### Requirement: Owner admission

The native adapter SHALL allow the verified owner to admit an open issue, including an externally authored issue, to bounded triage by label or manual request. Admission SHALL authorize triage only. Unknown actors, closed issues, pull requests and reserved issues SHALL NOT start triage.

#### Scenario: External issue admitted

- **WHEN** the owner requests triage for an external issue
- **THEN** the authenticated dispatcher starts only triage with source and intent bindings
- **AND** publication stops at the triaged decision

#### Scenario: Unadmitted request

- **WHEN** an external author opens an issue, applies a label or comments
- **THEN** no agent starts

#### Scenario: Owner answers a pending question

- **WHEN** the owner answers the latest blocked triage report and the bound inputs remain current
- **THEN** only that triage stage resumes

### Requirement: Evidence-backed request analysis

Triage SHALL preserve the exact original request, distinguish sourced inferences from unknowns and ask only questions with an explicit blocking outcome. Missing required information SHALL prevent a passed assessment.

#### Scenario: Repository resolves a gap

- **WHEN** repository evidence supplies missing context
- **THEN** the output records the inference and its source without rewriting the original request

#### Scenario: Outcome remains ambiguous

- **WHEN** a missing decision changes the requested outcome
- **THEN** triage returns blocked with a concrete question and explains what it blocks

### Requirement: Explained relative estimate

Native triage SHALL record provisional points from 1, 2, 3, 5, 8 or 13, explanations for scope, dependencies and verification, confidence and separate uncertainty. Estimates SHALL NOT represent elapsed time or imply a legacy size conversion. Refinement SHALL reconsider a supplied estimate and retain its prior value and revision reason.

#### Scenario: Explained provisional size

- **WHEN** triage completes with enough evidence
- **THEN** the output includes valid provisional points and all three explanations
- **AND** uncertainty remains separate from points and confidence

#### Scenario: Incomplete estimate

- **WHEN** a passed native triage output lacks an estimate or a required explanation
- **THEN** validation rejects completion

#### Scenario: Reconsidered scope

- **WHEN** refinement changes a triaged estimate
- **THEN** its output retains the initial estimate, new estimate and reason for revision

#### Scenario: Legacy caller

- **WHEN** an existing caller submits a valid S/M/L/XL classifier input without numeric estimation
- **THEN** the classifier retains its existing behavior without inventing story points
