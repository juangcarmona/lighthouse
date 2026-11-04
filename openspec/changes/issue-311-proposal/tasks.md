# CI correction tasks

## 1. Implementation

- [x] Add proposal/candidate Markdown and local-link validation before publication.
- [x] Authenticate failed adopted CI, current PR, original grant and policy.
- [x] Reuse the correction worker with same-head deduplication and a two-attempt chain budget.
- [x] Preserve bounded stops, product ownership and existing publication/head guards.

## 2. Verification

- [x] Exercise stale/unrelated runs, revoked intent, changed scope, duplicate events, lost acknowledgement and exhaustion.
- [x] Exercise hook-free malformed Markdown and broken-link publication rejection.
- [ ] Complete repository, package-consumer, workflow and provider checks.
- [ ] Retain the native failed-CI-to-corrected-same-PR trace and remove acceptance activation.
