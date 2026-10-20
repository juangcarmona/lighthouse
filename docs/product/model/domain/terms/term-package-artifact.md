---
id: TERM-PACKAGE-ARTIFACT
type: domain-term
title: Lighthouse package artifact
status: draft
defined-in: BC-FOUNDATION
synonyms: [release tarball]
uses-terms: [TERM-FOUNDATION, TERM-INTEGRATION, TERM-ADOPTION]
---

## Definition

A Lighthouse package artifact is a versioned npm tarball produced from a clean checkout and consumed by an adopter with its checksum and source revision recorded.

## Distinguish From

An artifact is not a public registry release, a copy of the whole repository or a generated adopter projection.

## Usage

The 0.1.0 adoption release contains the harness, SDLC and UI packages; provider-owned integrations and repository documentation remain outside the runtime packages.
