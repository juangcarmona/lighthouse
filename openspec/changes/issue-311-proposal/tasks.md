<!-- pdac-scope: cited -->

# CI correction tasks

## 1. Implementation

- [x] Add proposal/candidate Markdown and local-link validation before publication.
- [x] Authenticate failed adopted CI, current PR, original grant and policy.
- [x] Reuse the correction worker with same-head deduplication and a two-attempt chain budget.
- [x] Preserve bounded stops, product ownership and existing publication/head guards.

## 2. Verification

- [x] Exercise stale/unrelated runs, revoked intent, changed scope, duplicate events, lost acknowledgement and exhaustion.
- [x] Exercise hook-free malformed Markdown and broken-link publication rejection.
- [x] Complete repository, package-consumer, workflow and provider checks.
- [x] Retain the native failed-CI-to-corrected-same-PR trace and remove acceptance activation.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="QR-BOUNDED-AUTOMATION" digest="sha256:bcc08b11d7ab7ebf52669319710f57c9b32ec6b1c17c89c7ae8df6452249450f" -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
