---
id: QR-DETERMINISTIC
type: quality-requirement
title: Produce repeatable verification results
status: draft
quality-attribute: determinism
applies-to: [BC-FOUNDATION, UC-VERIFY-FOUNDATION, UC-UPDATE-FOUNDATION]
verification:
  - scenario: Running the same verification command twice against an unchanged project produces byte-equivalent machine-readable results and no working-tree changes.
---

## Requirement

For the same repository state, configuration and tool versions, Lighthouse verification MUST
produce the same findings and MUST NOT mutate canonical project content.

## Measurement

Run each configured verifier twice in a clean checkout and compare structured output and the Git
working tree. Any unexplained difference is a failure.
