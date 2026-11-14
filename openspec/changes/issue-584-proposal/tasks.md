# Tasks

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:90af94bb73cab9bf61e3a4c6eb7d44f68b42513063adadaa629ba72e69150f69" -->

## 1. Command-owned scratch lifecycle

- [x] 1.1 Implement opt-in disposable npm caches for managed commands and shared runtime activation; verify success, failure, cancellation, nested commands, overlap and unrelated-path preservation with focused process tests, and document lifecycle and capacity limits in the SDLC execution guide.
- [x] 1.2 Record scratch capacity and cleanup outcomes without hiding command failures; verify diagnostics and allocation/cleanup failures with focused tests.

## 2. Qualification and integration

- [x] 2.1 Exercise accumulated sequential demand with a bounded regression fixture and retain its completed result, distinguishing synthetic demand from native runtime qualification.
- [ ] 2.2 Reproduce cold npm installation followed by .NET restore/verification under current published runtime limits, retain local and independent results for the same candidate, and document observed byte demand and cleanup boundaries.
- [x] 2.3 Run all configured repository and provider checks, record product-derived traceability and writing reviews, and retain a concise retrospective and final assessment with missing evidence explicit.

## Workflow follow-up

- The trusted host independently verifies the final candidate before publication; integration, release and installed-runtime rollout retain their own authority.
