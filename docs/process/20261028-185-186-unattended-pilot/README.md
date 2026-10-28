# Bounded unattended delivery pilot

The owner approved the [ProductShape change](../../product/changes/completed/chg-bounded-unattended-delivery-001/change.md). [PR #190](https://github.com/juangcarmona/lighthouse/pull/190) implemented the two compositions for [#185](https://github.com/juangcarmona/lighthouse/issues/185) and [#186](https://github.com/juangcarmona/lighthouse/issues/186). [PR #198](https://github.com/juangcarmona/lighthouse/pull/198) retained precise engine-startup diagnostics after the first native capacity stop.

## Observed verification

The repository and clean-consumer package checks passed before each implementation merge. ProductShape validation and strict OpenSpec validation passed. Focused checks cover native stage composition, process startup failures, late owner pauses and cancellation, merge recovery, and unavailable post-merge dispatch or notifications. A real Docker regression also verifies ownership recovery through private nested build directories. The separate read-only engineering reviewer found no remaining definite blocker in the reviewed code.

[Local Docker probe receipts](local-probes.json) retain the assertion RED against unchanged production source, GREEN with identical regression bytes, and acceptance by a separate configured reviewer. They also retain rejection of an incorrect implementation whose trivial test passed. These are local validation records, separate from authenticated native GitHub delivery receipts. Requested/resolved model settings were observed; provider-served model identity and billing remain unverified.

The [first native hotfix attempt](https://github.com/juangcarmona/lighthouse/actions/runs/40779638460) stopped at the shared engine-capacity limit before model startup. It produced no candidate or PR and released its reservation. Its [retained report](native-capacity-stop.json) is bound to the downloaded artifact digest. The actual job log records `Host engine capacity unavailable`. The [second attempt](https://github.com/juangcarmona/lighthouse/actions/runs/40781039122) also stopped before model startup and verified the corrected [precise failure receipt](native-capacity-diagnostic.json). Both reservations were released. No capacity, hosting or product gate was bypassed.

The [third native attempt](https://github.com/juangcarmona/lighthouse/actions/runs/40781884527) stopped during independent planning review because the reviewer requested evidence from later stages. Its [retained records](native-plan-phase-stop.json) show the phase mismatch. [PR #199](https://github.com/juangcarmona/lighthouse/pull/199) gave planning and candidate reviews distinct evidence requirements and aligned native PR readiness with existing CI reconciliation.

The [fourth attempt](https://github.com/juangcarmona/lighthouse/actions/runs/40784015362) passed planning review, behavioral RED, GREEN with unchanged test bytes, and all three host checks. It then stopped during cleanup of a private build directory owned by the container UID. No PR was published. Artifact upload failed on the same unreadable directory; [locally recovered original stage records](native-cleanup-stop.json) retain byte digests and explicitly identify their provenance. [PR #200](https://github.com/juangcarmona/lighthouse/pull/200) fixes this cleanup path and the late-effect and notification cases found by fault injection and independent review.

The [fifth attempt](https://github.com/juangcarmona/lighthouse/actions/runs/40786174632) stopped before implementation when the reviewer omitted the top-level envelope version. The host rejected the malformed result; [retained records](native-review-contract-stop.json) bind the uploaded artifact digest. [PR #201](https://github.com/juangcarmona/lighthouse/pull/201) requires the reviewer to copy the complete template, including both version fields, while preserving strict validation.

## Native acceptance

The controlled product-edit scope is `src/tests/fixtures/unattended/`; FF also writes its own required OpenSpec proposal. The regression runner and assertion-failure signal are project-owned. Owner dispatch and the explicit fixture-only merge policy are separate from the disabled policy template shipped to adopters.

- Hotfix: [issue #197](https://github.com/juangcarmona/lighthouse/issues/197), [native run](https://github.com/juangcarmona/lighthouse/actions/runs/40787092437), [PR #202](https://github.com/juangcarmona/lighthouse/pull/202). Assessment, independent planning/candidate review, RED/GREEN, host checks, separately dispatched CI and readiness reconciliation passed. GitHub reports the PR workflows as awaiting maintainer approval and keeps the PR blocked. The [hosting snapshot](native-hotfix-hosting-snapshot.json) records the exact head, scope and pending runs; it does not claim integration.
- Fast-forward: [issue #196](https://github.com/juangcarmona/lighthouse/issues/196), positive trace pending.

## Pilot limits

This controlled fixture does not establish production deployment, smoke-check success, an escaped-defect rate, cost savings or equivalence across providers. A measured supervised comparator is unavailable. Record actual successful-run elapsed time, correction rounds and human interventions from the native traces before considering wider delegation; unavailable cost and subscription measurements stay unknown. This pilot does not widen the accepted point, line, file or module bounds.

## Release

Changesets proposes Lighthouse 0.12.0 and SDLC 0.16.0. Publication remains pending native acceptance and the existing protected `npm-publish` environment decision. Merge, registry publication and deployment are separate observed outcomes.
