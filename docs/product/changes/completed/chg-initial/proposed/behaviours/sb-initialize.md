---
id: SB-INITIALIZE
type: structured-behaviour
title: Initialize a project from selected profiles
status: draft
illustrates: [UC-INITIALIZE-PROJECT]
given:
  - The target is new or an empty supported target.
  - The adopter selected the foundation and one or more profiles.
when: The adopter runs the Lighthouse initialization route
then:
  - The target contains a valid foundation manifest.
  - The selected profile surfaces and adoption guidance are present.
  - ProductShape and ArcShape initialization contracts and first-use orientation are present.
  - The command reports created, preserved and unresolved content.
uses-terms: [TERM-FOUNDATION, TERM-PROFILE]
---

## Intent

Make the first project state explicit, reviewable and understandable without prior knowledge of Lighthouse.

## Boundaries

This example does not assert that product intent, architecture or implementation has been accepted.
