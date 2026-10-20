---
id: BR-ADOPTER-CONSUMER
type: business-rule
title: An adopter consumes Lighthouse without owning it
status: draft
applies-to: [BC-FOUNDATION, UC-ADOPT-CONSUMER]
uses-terms: [TERM-ADOPTION-RELEASE, TERM-AUTHORITY-MAP, TERM-INTEGRATION]
---

## Rule

An adopter MAY consume a Lighthouse adoption release and exercise its installation and verification route, but Lighthouse remains the authority for the baseline while the adopter remains the authority for its product, factory or operational loops.

## Rationale

The first real consumer proves the interface while preserving the ownership boundary between a reusable baseline and a consuming system.

## Examples

A consuming repository installs the pinned 0.1.0 CLI artifact, initializes a fixture, runs Lighthouse verification and records the result in its own lifecycle evidence.

## Exceptions

An adopter can temporarily consume a local workspace path while a release artifact is being prepared, but that route cannot be treated as adoption evidence until the packaged artifact passes.
