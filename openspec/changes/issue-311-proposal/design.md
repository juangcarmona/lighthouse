<!-- pdac-scope: cited -->

# CI correction design

## Context

The existing router authenticates workflow completions and preserves same-PR feedback correction. Its CI continuation handles successful checks only. The independent implementation host already runs adopted commands and OpenSpec; product and proposal publishers run their provider validators.

## Goals / Non-Goals

Authenticate failed CI as diagnostic input while retaining the original implementation request as authority. Catch publication-time Markdown/link defects and bound corrections independently of changing commits. Reuse existing dispatch receipts, issue leases and check receipts.

No new router, scheduler, store, review layer, automatic product decision or merge delegation is introduced.

## Decisions

Use a repository completion policy with explicit issue selection and a fixed two-attempt limit. Derive correction identity from the PR, implementation identity and failing head, so multiple failed runs on the same head coalesce. Authenticate prior correction requests and count them across heads. Unconfirmed dispatch remains a stop.

The publisher uses the adopted pinned Markdown CLI/configuration and the same local-link checker as repository verification. Proposed bytes form an overlay for link resolution. ProductShape/OpenSpec validation and signing occur afterward. Existing approval bindings are never rewritten after an external commit.

## Risks / Trade-offs

Missing or expired grant artifacts prevent automatic repair and produce an actionable stop. Unsupported proposal CI failures require the existing trusted revalidation/republication route. The first native test intentionally introduces a scoped intermediate fixture paragraph and a trusted CI assertion; it does not estimate general repair reliability.

## Migration plan

Regenerate managed projections with the immutable source commit. Enable only issue #346 for acceptance, record its original and corrected heads, CI runs and receipts, then remove the temporary activation and CI assertion. Adopters retain disabled behavior until their own policy is configured.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="QR-BOUNDED-AUTOMATION" digest="sha256:bcc08b11d7ab7ebf52669319710f57c9b32ec6b1c17c89c7ae8df6452249450f" -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
