# Authority initialization preview

## Purpose

Expose the existing provider-owned authority initialization plan and its actual preflight evidence to machine consumers without changing initialization authority.

<!-- pdac-scope: cited -->

## ADDED Requirements

### Requirement: JSON preview projects both provider outcomes

The CLI SHALL emit exactly one JSON document for authority initialization JSON previews, containing both provider package identities, exact installed versions, preview commands, repair commands and actual preflight results. Provider output MUST NOT appear outside that document on stdout.

<!-- pdac:cite id="FR-AUTHORITY-INITIALIZATION" digest="sha256:7c5a19c8c532b9725eeef1c037e7b604a799ed51f7ee5f2ef470f3770815ff4d" -->

#### Scenario: Initialized consumer previews authorities

- **WHEN** a clean initialized consumer runs `lighthouse authorities --dry-run --format json`
- **THEN** stdout is one parseable document with ProductShape and ArcShape identities, versions and their successful preflight evidence

#### Scenario: Provider fails or is missing

- **WHEN** either provider cannot execute, exits unsuccessfully or reports an initialization conflict
- **THEN** the document reports both actual outcomes, marks the plan blocked and the CLI exits unsuccessfully

### Requirement: Preview preserves ownership and compatibility

Previews SHALL preserve all consumer state, text compatibility and provider commands. JSON apply SHALL be rejected before provider execution.

<!-- pdac:cite id="BR-OWNED-AUTHORITY" digest="sha256:927ca94ef20deb83a84734978c82c5647cd1cd41eeaed9935eda7f4a6c61f611" -->
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

#### Scenario: Text and JSON preview are read-only

- **WHEN** either output format previews initialization with existing user hooks and guidance
- **THEN** target bytes, file modes and Git configuration remain unchanged and provider dry-run commands are retained

#### Scenario: JSON mutation is refused

- **WHEN** JSON format is combined with apply, including combined apply/dry-run flags
- **THEN** the CLI exits unsuccessfully before provider execution or writes
