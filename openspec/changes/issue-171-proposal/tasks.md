# Tasks

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:8331c79365b9d40d8970a0821efaad3d961f1e07d7f78a7083b441937fbdabc8" -->

## 1. Documentation fixture

- [x] 1.1 Add one sentence explaining that a maintainer can return a ready implementation PR to draft while making a correction; verify the README diff contains only that sentence and preserves existing content.

## 2. Candidate verification

- [x] 2.1 Run configured dependency installation, repository verification and strict OpenSpec validation, plus product citation verification; retain check receipts and a concise retrospective under `/output/evidence/` and confirm only the README and this change directory differ.

## 3. Owner wording correction

- [x] 3.1 Replace the added README sentence with “A maintainer can return a ready implementation PR to draft for corrections.”; verify the exact sentence and otherwise unchanged README, then rerun the configured checks and retain evidence for the same PR #172.

## Workflow follow-up

- The owner traces draft/ready/correction transitions on the fixture PR and closes it without merging; these later actions are not implementation-stage evidence.
