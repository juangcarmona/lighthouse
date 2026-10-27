<!-- pdac-scope: none reason="Owner-authored issue 133 requests only a temporary documentation fixture, not a product behavior change." -->

# Tasks

## 1. Acceptance fixture

- [x] 1.1 Add only the requested fixture outside this proposal directory and verify its exact bytes against issue #133.

## 2. Candidate verification

- [x] 2.1 Run the configured dependency installation, repository verification, strict OpenSpec validation and citation verification; retain command results and review authored changes against the fixture-and-plan scope. The host independently verifies the final diff because this copy has no Git metadata.
- [x] 2.2 Deliver the implementation envelope, concise PR summary and retrospective under `/output/`; verify the envelope preserves the supplied identity and reports any incomplete evidence.

## Workflow follow-up

- The host validates and publishes a fresh PR for owner review. The operator intends to close it without merging; do not merge, close the issue or request another stage.
