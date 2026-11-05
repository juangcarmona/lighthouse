# Tasks

<!-- pdac-scope: cited -->

The tasks preserve provider initialization, ownership and failure semantics.

<!-- pdac:cite id="FR-AUTHORITY-INITIALIZATION" digest="sha256:7c5a19c8c532b9725eeef1c037e7b604a799ed51f7ee5f2ef470f3770815ff4d" -->
<!-- pdac:cite id="BR-OWNED-AUTHORITY" digest="sha256:927ca94ef20deb83a84734978c82c5647cd1cd41eeaed9935eda7f4a6c61f611" -->
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

## 1. JSON projection and compatibility

- [x] 1.1 Implement quiet provider preflights, complete JSON projection and JSON apply guards; add CLI regressions for real provider outcomes, missing/failed/conflicting providers, text compatibility and file/mode/Git preservation; verify with focused CLI tests (42 passed).
- [x] 1.2 Add the CLI patch changeset with an H1 and document the delivered contract in this plan; verify release metadata and plan match implementation.

## 2. Candidate verification

- [x] 2.1 Run all configured checks including full repository verification (823 passed, nine skipped), citation verification and strict OpenSpec validation; retain terminal receipts and a concise retrospective, and mark only completed work done. Installation succeeded after a timeout retry; strict validation succeeded after shortening requirement prose.

## Workflow follow-up

- Host independently checks the clean candidate before publication; reviewers and forge CI assess the published candidate.
- Integration requires separate explicit authorization; installed-runtime acceptance and post-integration review remain later work.
