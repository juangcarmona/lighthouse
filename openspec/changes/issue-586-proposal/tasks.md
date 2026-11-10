# Tasks

<!-- pdac-scope: cited -->

These tasks repair the existing OpenSpec-compatible delivery flow without changing its authority boundaries.

<!-- pdac:cite id="FR-CHANGE-FLOW" digest="sha256:54e13b356ccefff812cd070c86511c6c2aba61499094e8f5b789e030fd5b5808" -->

## 1. Archive preparation and preservation

- [x] 1.1 Add a generic completed-archive regression through preparation and finalization; retain the assertion failure on the original implementation.
- [x] 1.2 Implement provider-validated archive selection and immutable finalization; verify valid, active, new, invalid, conflicting and ambiguous plan cases with focused tests and the real pinned provider.

## 2. Distribution and integration

- [x] 2.1 Document archive requalification and add an SDLC patch changeset; verify the owning package includes the correction through its normal package-content checks.
- [x] 2.2 Run the required repository, citation and strict proposal checks; retain receipts and a concise retrospective and mark only completed tasks.

## Workflow follow-up

- Trusted host reruns checks against a clean candidate and publishes the implementation PR for review.
- Release maintainer publishes the package; adopters update their installed package/workflow pin before any real requalification.
- Independent review, required forge checks, exact-tree completion proof and integration authorization remain separate requirements.
