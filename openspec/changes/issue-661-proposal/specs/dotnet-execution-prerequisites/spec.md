# Spec Delta

<!-- pdac-scope: cited -->

## Purpose

Ensure the declared .NET execution environment can build the accepted example without downloading missing execution tools or weakening workload isolation.

## ADDED Requirements

### Requirement: Compatible stable SDK is available

The .NET environment SHALL provide an installed stable SDK compatible with 10.0.112 and `latestPatch`: 10.0.1xx with patch at least 112. It MUST reject unavailable or incompatible SDKs before service allocation or agent work, with an explicit prerequisite failure.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:831781c37d7eb639a39dd1a6db84bca99996d4cbda99039524e28a41fd1cc015" -->

#### Scenario: Accepted patch is installed

- **WHEN** SDK 10.0.112 or 10.0.115 is installed, including alongside a different default SDK
- **THEN** SDK preflight passes without lowering the example requirement

#### Scenario: No compatible SDK is installed

- **WHEN** the SDK is missing, older than 10.0.112, from another feature band or a prerelease
- **THEN** preflight fails before services or agent work start

### Requirement: Pinned Aspire tooling is pre-provisioned

The .NET environment SHALL provide Aspire CLI 13.6.5 and its resolved bundle with usable DCP and dashboard components before workload startup. Preflight MUST reject missing tooling, incompatible CLI versions or an absent/incomplete bundle without source or credential mounts, network access or workload-time installation.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:831781c37d7eb639a39dd1a6db84bca99996d4cbda99039524e28a41fd1cc015" -->

#### Scenario: Complete image prerequisites

- **WHEN** a selected image supplies the compatible SDK, CLI 13.6.5 and its extracted readable bundle
- **THEN** preflight accepts it under the existing non-root, read-only restrictions
- **AND** the unchanged AppHost verifier receives the resolved bundle path

#### Scenario: Bundle or CLI is unusable

- **WHEN** the CLI is missing or incompatible, or a required bundle component is missing or unusable
- **THEN** preflight reports the failed prerequisite before service allocation or agent work

### Requirement: Build provenance does not imply rollout

The operator builder SHALL retain immutable source-image inputs, the pinned Aspire version, resolved tool/bundle provenance and resulting image IDs. Source delivery, image construction, installed configuration adoption and native qualification MUST remain separate evidence; no successful source check SHALL imply rollout or native acceptance.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:831781c37d7eb639a39dd1a6db84bca99996d4cbda99039524e28a41fd1cc015" -->

#### Scenario: Source verification completes

- **WHEN** repository checks pass without constructing or adopting an image
- **THEN** the result reports source verification only and names the remaining operator qualification steps
