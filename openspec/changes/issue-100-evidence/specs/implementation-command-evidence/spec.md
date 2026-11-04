# Spec delta

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->
<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->

## Purpose

Carry authenticated host command results from a tested implementation candidate into the existing integration assessment and invalidate results whose relevant inputs changed.

## ADDED Requirements

### Requirement: Bind commands to admitted and published inputs

The host MUST bind retained command results to repository, work item, native run/attempt, command argv, issue intent, applicable policy, planning reference, source and tested/published tree. The completion reader MUST authenticate producer execution through its host API and reject unsupported producer claims.

#### Scenario: Valid unchanged evidence

- **WHEN** the published candidate and relevant inputs match an authenticated retained receipt
- **THEN** the scoped command observations are available for assessment even after unrelated main commits

#### Scenario: Changed input or spoofed producer

- **WHEN** code, criteria, policy, plan, workflow, command, run/attempt, output or publication identity differs
- **THEN** the historical receipt cannot satisfy current acceptance and the reason remains explicit

#### Scenario: Shared authority input changes

- **WHEN** the accepted model or shared validation configuration changes beyond the admitted baseline and tested candidate
- **THEN** the previous command evidence is unavailable for current acceptance, including configured model roots

### Requirement: Preserve result and compatibility boundaries

The adapter MUST distinguish failed execution from unavailable/not-executed evidence, preserve stage-result v1 payloads, retain bounded outputs honestly and recheck cited passed receipts before effects. Additional observations MUST NOT create forge merge gates or establish independent test adequacy.

#### Scenario: Missing retained evidence

- **WHEN** the artifact or authenticated origin is missing, expired, inaccessible or malformed
- **THEN** the result is unavailable and an authorized revalidation is required

#### Scenario: Failure and unexecuted command

- **WHEN** one command fails and another was not run
- **THEN** the failed command remains failed and the unexecuted command remains unavailable

#### Scenario: Packaged consumer

- **WHEN** an installed tarball reads matching and spoofed receipts alongside a legacy result
- **THEN** it accepts only authenticated matching commands and preserves the original v1 payload
