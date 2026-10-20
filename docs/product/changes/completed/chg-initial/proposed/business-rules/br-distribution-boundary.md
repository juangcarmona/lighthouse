---
id: BR-DISTRIBUTION-BOUNDARY
type: business-rule
title: Keep the adoption release reproducible
status: draft
applies-to: [BC-FOUNDATION, UC-ADOPT-CONSUMER]
uses-terms: [TERM-PACKAGE-ARTIFACT, TERM-ADOPTION-RELEASE, TERM-ADOPTION]
---

## Rule

Lighthouse MUST produce the 0.1.0 adoption release from a clean revision, record the package versions and checksums, verify each tarball from a temporary consumer and defer registry publication until an adopter proves the interface.

## Rationale

An exact private artifact gives any adopter a stable integration point without committing Lighthouse to public support and registry operations before the contract is proven.

## Examples

The release pipeline produces the CLI, SDLC and UI tarballs, then installs them into a clean fixture and runs `init`, `verify` and package-content checks.

## Exceptions

An adopter may use a pinned Git revision during development when the same source revision and verification evidence are recorded.
