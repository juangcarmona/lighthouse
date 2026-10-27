# Proposal

<!-- pdac-scope: cited -->

## Why

An issue can still show `ready` after implementation has opened a draft PR. `waiting-review` does not say whether that PR is ready to inspect. The PR body can also close its issue at merge before the final review.

## What changes

Project the linked implementation PR as `pr-draft` or `pr-ready` on the issue. Keep the GitHub PR state and required checks authoritative, and return incomplete candidates to draft. Keep corrections on the same PR. Link both directions, use `Refs #...` until post-merge review, and publish short results with a reachable run.

This is a GitHub adapter change within the existing finite label and evidence contracts. It does not alter canonical product behavior, add a lifecycle stage, grant merge authority or require a new state store.

## Capabilities

### New Capabilities

- `implementation-pr-state`: project draft and ready PR states from authenticated candidate evidence and current checks.

### Modified Capabilities

None. The stage order and gates remain the same.

## Product impact

The change implements the configured label vocabulary and reviewable change-evidence requirements in the existing SDLC use case. ProductShape inspection and impact expansion covered FR-LABEL-STATE, FR-CHANGE-EVIDENCE, UC-RUN-SDLC, QR-LABEL-DETERMINISM and BR-HUMAN-AUTHORITY. BR-GITHUB-INTEGRATION, UC-TRIAGE-WORK-ITEM and FR-SDLC-LIFECYCLE were checked as neighbours and left unchanged: this work projects GitHub PR state after implementation and does not change triage, stage admission or the lifecycle contract. No product-definition drift was found.

<!-- pdac:cite id="FR-LABEL-STATE" digest="sha256:754d81137a03d3679e7213068b36a5377dd5aa02fe479be14ad720973bf2d705" -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->
<!-- pdac:cite id="UC-RUN-SDLC" digest="sha256:7e14cf16e302995183008043d95caf100bce023e9c8a3edf0e098ae87d740c02" -->
<!-- pdac:cite id="QR-LABEL-DETERMINISM" digest="sha256:73569634bd1ef7f981ded88c9567f96f2c128fc03cf494c6bb179f48d550fc6d" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

## Acceptance

Verify draft, ready, manual override, changed head, same-PR correction, duplicate event, navigation and non-closing behavior. Run repository checks, workflow compilation and a native issue-to-PR trace before release.
