# Verification integrity

<!-- pdac-scope: cited -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="BR-HOTFIX" digest="sha256:90546f4b1d108ddeea834851f0399ec600c261cd9f70186b144f315b515f039e" -->
<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->

## ADDED Requirements

### Requirement: Verification inputs remain under admitted authority

The host SHALL bind explicit verification input paths and exact-file correction reasons to implementation check policy. It SHALL reject unadmitted candidate changes to those inputs and validation-time changes to source bytes, independently of Git status. Unattended admission SHALL require declared verification inputs and a checkout matching the admitted revision. Legacy supervised policies SHALL remain compatible with unconfigured integrity evidence.

#### Scenario: A candidate weakens a transitive verification script

- **WHEN** a candidate edits a declared transitive wrapper without an admitted reason, including after committing the edit or hiding it with index flags
- **THEN** the host rejects the changed bytes before accepting verification

#### Scenario: Checks alter source while reporting success

- **WHEN** a command exits successfully after changing source, even with a clean Git status
- **THEN** the host records validation failure and prevents acceptance

### Requirement: Independent review evaluates behavior and intentional test corrections

The existing independent reviewer SHALL inspect the original acceptance criteria, actual changed files, admitted correction reasons and executed evidence in a separate read-only execution. A weak test passing SHALL NOT satisfy a violated criterion. A test correction SHALL retain its reason and require renewed current-candidate verification. Hotfix repair SHALL preserve RED test bytes; changing them requires another reproduction under a fresh authorized attempt.

#### Scenario: Weak tests hide an incorrect boundary

- **WHEN** a candidate passes its own test while excluding an explicitly required boundary value
- **THEN** the read-only reviewer rejects it against the original issue and bounded correction exhaustion prevents publication

#### Scenario: A legitimate test correction is admitted

- **WHEN** the policy records an exact-file reason, renewed host checks pass and fresh independent review confirms the criterion
- **THEN** the corrected test and its reason remain visible in the accepted candidate evidence

#### Scenario: Required checks or current review are absent

- **WHEN** an admitted command is absent or a reviewer result binds an older candidate
- **THEN** delivery stops before publication or merge
