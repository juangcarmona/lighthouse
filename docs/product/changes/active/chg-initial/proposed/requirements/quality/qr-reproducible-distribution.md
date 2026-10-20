---
id: QR-REPRODUCIBLE-DISTRIBUTION
type: quality-requirement
title: Make adoption artifacts reproducible
status: draft
quality-attribute: determinism
applies-to: [UC-ADOPT-CONSUMER, UC-BUILD-PUBLIC-STORY]
verification:
  - scenario: Building the same Lighthouse revision with the pinned toolchain produces equivalent package manifests, declared contents, source references and public-site verification results.
---

## Requirement

The adoption release and public-site projection MUST be reproducible from a pinned source revision and toolchain. Verification MUST report the source revision, package contents, checksums and generated output path, and MUST reject unreviewed files in the release output.

## Measurement

Build the package set and public site twice from the same clean revision, compare manifests and source references, then install the artifacts in a clean fixture and run the complete adoption checks.
