# Tasks

<!-- pdac-scope: cited -->

Prerequisite failures must remain explicit and stop dependent work.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:831781c37d7eb639a39dd1a6db84bca99996d4cbda99039524e28a41fd1cc015" -->

## 1. Align provisioning and preflight

- [x] 1.1 Share the accepted SDK/CLI/bundle checks between builder and preflight, provision the pinned Aspire bundle and retain build provenance; verify compatible, incompatible, missing-SDK and missing/incomplete-bundle fixtures plus existing isolation and lifecycle tests.
- [x] 1.2 Update operator guidance and opt-in Docker qualification for the accepted profile, keeping image construction, configuration adoption and native qualification separate; verify documentation links and opt-in test discovery without changing the example or verifier.

## 2. Verify the complete candidate

- [ ] 2.1 Obtain passing admitted install, full repository verification, citation and strict plan checks; retain completed receipts, product traceability, writing review and retrospective in Actions evidence.

All admitted commands ran. Installation, focused tests and strict plan validation passed. Full verification is blocked by the protected SDK 10.0.100 shim at `src/tests/opencode-execute.test.mjs:442`, which is not in #661's admitted correction list. Citation verification is blocked by the pre-existing missing scope declaration in `openspec/specs/managed-command-scratch/spec.md`; #661's six new citations are current. Neither protected fixture corrections nor unrelated spec edits were made. Documentation links and public-site verification passed separately after the full command stopped at the test failure.

## Workflow follow-up

- Trusted host: independently check the candidate and publish it for review; retain forge CI and current-head approval separately.
- Operator: build a pinned image, qualify unchanged cold installation and .NET verification under existing restrictions, adopt between runs and obtain native runtime receipts. These later gates are not implementation-task completion claims.
