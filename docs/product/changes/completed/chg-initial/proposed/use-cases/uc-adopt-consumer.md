---
id: UC-ADOPT-CONSUMER
type: use-case
title: Adopt Lighthouse in a consuming repository
status: draft
primary-actor: ACT-INTEGRATED-SYSTEM
supporting-actors: [ACT-MAINTAINER, ACT-ADOPTER]
bounded-context: BC-FOUNDATION
governed-by: [BR-DISTRIBUTION-BOUNDARY, BR-ADOPTER-CONSUMER, BR-OWNED-AUTHORITY, BR-FAIL-CLOSED]
uses-terms: [TERM-PACKAGE-ARTIFACT, TERM-ADOPTION-RELEASE, TERM-AUTHORITY-MAP, TERM-INTEGRATION]
---

## Goal

Prove Lighthouse 0.1.0 as a usable foundation by installing it in a consuming repository and running the same adoption and verification contract available to any adopter.

## Trigger

The maintainer selects a Lighthouse adoption release for a project, factory fixture or integration test.

## Preconditions

The release contains versioned artifacts with checksums, the consuming repository declares the source revision and package paths, and the ownership boundary is recorded.

## Main Flow

1. The consuming repository installs the exact Lighthouse CLI artifact and selected visual assets, including the visual design guide when that contract is selected.
2. The fixture runs `lighthouse init` and inspects the generated adopter paths.
3. The fixture runs `lighthouse verify` and its own ProductShape, ArcShape and repository checks.
4. The consuming repository records package versions, command output, managed paths and any adoption gap.
5. Lighthouse and the adopter retain their separate sources of truth and operational responsibilities.

## Alternative Flows

The adopter can consume a pinned Git revision while iterating, or install only the CLI when the UI package is not selected by the fixture.

## Failure Conditions

An artifact checksum differs, the package is incomplete, a managed projection drifts, a provider-owned path collides or a required verification command fails.

## Postconditions

The adopter has reproducible Lighthouse adoption evidence or a bounded report that identifies the package, path, command or authority gap.
