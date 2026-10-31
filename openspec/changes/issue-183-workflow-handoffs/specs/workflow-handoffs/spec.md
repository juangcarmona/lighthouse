<!-- pdac-scope: cited -->

# Workflow handoffs

## ADDED Requirements

### Requirement: Actionable stage handoffs

The host SHALL publish a visible status, stage, observed result, exact next action and subsequent trigger for each applicable lifecycle handoff. Question handoffs SHALL include the complete question and review handoffs SHALL link a confirmed target.

<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->

#### Scenario: Owner answers a question

- **WHEN** a worker requests information and the authorized person answers
- **THEN** the question and answer remain correlated, the answer is checked before continuation and no separate decision is approved implicitly

### Requirement: Truthful execution outcomes

The host SHALL distinguish pending, running, waiting, review, failed, cancelled, completed and unknown observations. A failure or cancellation without a valid agent result SHALL use trusted host evidence and SHALL NOT fabricate a stage result or review target.

#### Scenario: Resumed worker fails

- **WHEN** an authorized continuation fails before publishing a result
- **THEN** a fresh failure handoff follows the acknowledgement, retains the answer and names the configured recovery action

### Requirement: Correlated publication

The host SHALL update correlated labels before publishing the explanatory message, deduplicate repeated events and prevent stale attempts from changing current status. Interrupted label and comment publication SHALL be reconciled under existing authority and recovery bounds.

#### Scenario: Publication is interrupted

- **WHEN** a label update succeeds and its comment fails
- **THEN** bounded reconciliation detects and repairs the missing comment without repeating a result or dispatch

### Requirement: Explicit failure label adoption

The default failure projection SHALL use `execution-failed` through the existing capability adoption contract. Existing installations SHALL receive an explicit adoption or compatibility outcome before the host relies on the label.

#### Scenario: Failure label is unavailable

- **WHEN** the adopter has not adopted the failure label
- **THEN** the host reports the adoption gap without silently creating the label or projecting a review state
