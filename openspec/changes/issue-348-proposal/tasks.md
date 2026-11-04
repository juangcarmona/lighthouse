<!-- pdac-scope: none reason="Execution checklist for the owner-specified disposable fixture; no canonical product behavior is implemented or changed." -->

# Tasks

## 1. Initial candidate

- [x] 1.1 Deliver proposal, design and documentation-only metadata before the fixture; verify OpenSpec strict validation accepts the plan.
- [x] 1.2 Create the initial fixture and verify its exact bytes, including the issue-specified initial paragraph and trailing newline, with a managed assertion.

## 2. Candidate verification

- [x] 2.1 Run all four configured policy commands and retain successful terminal receipts, logs and a concise retrospective under `/output/evidence/`.
- [x] 2.2 Review the final changed paths and diff to confirm only the fixture and this plan changed and validators, tests and unrelated work remain untouched.

## Workflow follow-up

- The host independently checks and publishes one draft implementation PR under the original grant.
- Actual CI must report the intentional paragraph mismatch before the bounded correction replaces only the paragraph with `The current candidate passed its bounded CI correction.`
- The host collects same-PR corrected-head CI and duplicate-event evidence; the disposable PR remains unmerged and is retired after evidence collection.
