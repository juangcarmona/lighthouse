# Tasks

<!-- pdac-scope: cited -->

Prerequisite failures must remain explicit and stop dependent work.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:831781c37d7eb639a39dd1a6db84bca99996d4cbda99039524e28a41fd1cc015" -->

## 1. Align provisioning and preflight

- [x] 1.1 Share the accepted SDK/CLI/bundle checks between builder and preflight, provision the pinned Aspire bundle and retain build provenance; verify compatible, incompatible, missing-SDK and missing/incomplete-bundle fixtures plus existing isolation and lifecycle tests.
- [x] 1.2 Update operator guidance and opt-in Docker qualification for the accepted profile, keeping image construction, configuration adoption and native qualification separate; verify documentation links and opt-in test discovery without changing the example or verifier.

## 2. Verify the complete candidate

- [x] 2.1 Obtain passing admitted install, full repository verification, citation and strict plan checks; retain completed receipts, product traceability, writing review and retrospective in Actions evidence.

The original native attempt published a blocked candidate after the old SDK shim failed host verification; that outcome remains unchanged. Maintainer correction `c2fb8ce81fb7b6bab7e4292a288aeac12b04c961` corrected the remaining fixture, restored archived citation metadata and qualified the actual operator builder. Full repository verification passed (1,283 tests; 14 optional skips), citation verification has zero errors with unchanged baseline warnings, and strict plan validation passed. All four real Docker tests passed without skips, including cold npm plus unchanged local/separate .NET verification. [Retained report and receipts](../../../docs/process/20261114-661-image-qualification/README.md) bind the checked source and immutable image. Package publication, installed adoption and native acceptance remain separate.

## Workflow follow-up

- Trusted host: independently check the candidate and publish it for review; retain forge CI and current-head approval separately.
- Operator: build a pinned image, qualify unchanged cold installation and .NET verification under existing restrictions, adopt between runs and obtain native runtime receipts. These later gates are not implementation-task completion claims.
