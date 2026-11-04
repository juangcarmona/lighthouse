<!-- pdac-scope: cited -->

# Trusted validation and bounded CI correction

## Why

Failed candidate CI currently stops automatic delivery without invoking the existing same-PR correction worker. Proposal publication can also precede the Markdown and local-link checks that later fail in CI.

## What changes

- Validate proposed Markdown and local links before signing or publishing a proposal or implementation candidate.
- Admit failed adopted CI only for a current repository-owned implementation PR and a retained implementation grant whose issue intent, scope and check policy still match.
- Reuse the existing correction worker with an explicit issue allowlist and at most two attempts for the PR identity, including across changed heads.
- Retain diagnostic evidence and stop on human objections, exhausted budgets, missing origins or unconfirmed effects. Product proposal repairs retain trusted provider revalidation and renewed owner decisions.

## Capabilities

### New capabilities

- `bounded-ci-correction`: authenticated, finite correction of the same implementation PR after failed CI.

### Modified capabilities

None.

## Impact

The SDLC publisher and router, repository Markdown link checker, adopted workflow projections and optional completion configuration change. The controlled native acceptance allowlist contains only disposable issue #353. Merge, product approval, interruption retry and resource cleanup authority are unchanged.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="QR-BOUNDED-AUTOMATION" digest="sha256:bcc08b11d7ab7ebf52669319710f57c9b32ec6b1c17c89c7ae8df6452249450f" -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->

## Product definition

FR-AUTHORIZED-WORKFLOW-ENTRY and BR-ENTRY-AUTHORITY already require bounded same-PR correction under current authority. BR-BOUNDED-WORKFLOW, QR-BOUNDED-AUTOMATION and FR-CHANGE-EVIDENCE require applicable checks, finite limits and visible stops. BR-PRODUCT-CHANGE-HANDOFF preserves product decisions. This implementation repairs those contracts and leaves the canonical model unchanged. Intake composition and separate release/deployment contracts were inspected as neighbours; their behavior is unchanged.
