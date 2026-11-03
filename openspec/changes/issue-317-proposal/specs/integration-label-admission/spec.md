<!-- pdac-scope: cited -->

# Integration label admission

## ADDED Requirements

### Requirement: Authenticated assessment

An owner integration-label request SHALL bind the current eligible PR and head and SHALL grant assessment without merge permission.
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->

#### Scenario: Candidate is eligible

- **WHEN** the issue has one complete non-draft implementation PR, current owner approval and passing required checks
- **THEN** the existing integration worker assesses the bound head with merge disabled

#### Scenario: Binding changes

- **WHEN** the selected PR, head, implementation identity or approval changes before admission or publication
- **THEN** the host refuses the stale assessment

### Requirement: Explicit outcomes and adoption

The router SHALL report denied or incomplete supported requests, and label adoption SHALL preserve customized labels while making the failure state available.
<!-- pdac:cite id="BR-LABEL-ROLES" digest="sha256:1c708a16c7730f0fe94cef9efa5f729e3d64a6b4943dcc06adf6759ce062725c" -->
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->

#### Scenario: Missing prerequisites

- **WHEN** a supported request cannot proceed
- **THEN** the issue identifies the missing prerequisite and next action without starting an unauthorized worker

#### Scenario: Repeated or unsupported events

- **WHEN** an identical request is replayed or a state label is added
- **THEN** existing duplicate receipts prevent duplicate effects and state labels start no worker

#### Scenario: Worker fails after adoption

- **WHEN** a real worker fails with a verified labels adoption record
- **THEN** the existing failure observer publishes its outcome and execution-failed state
