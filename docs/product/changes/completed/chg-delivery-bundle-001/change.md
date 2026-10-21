---
id: CHG-DELIVERY-BUNDLE-001
type: product-change
title: 'Define the Lighthouse delivery bundle'
status: applied
base-revision: '3efd7d4d6f8612e79a7282f832c55dadc38f46fb'
operations:
  add:
    - TERM-DELIVERY-BUNDLE
  modify:
    - BC-FOUNDATION
    - UC-INITIALIZE-PROJECT
    - UC-VERIFY-FOUNDATION
    - FR-INITIALIZE-FOUNDATION
    - FR-VERIFY-FOUNDATION
  remove: []
---

## Problem

The current definition describes the foundation's parts, but it does not name the complete delivery contract that an adopter receives. The public story therefore risks sounding like Lighthouse delivers a CLI and some documentation instead of a usable engineering baseline.

## Intended Product Outcome

Lighthouse defines a delivery bundle with five visible outcomes: the adopter's product code, reusable engineering conventions, the versioned Lighthouse harness, executable delivery workflows and health evidence from deterministic checks. Lighthouse owns the baseline and evidence contract while the adopter owns product code and project decisions.

## Rationale

The bundle gives people and agents a clear view of what adoption provides without claiming that Lighthouse owns the application being built. It also gives the public site a compact explanation that matches the existing package, SDLC, guardrail and verification boundaries.

## Affected Product Areas

Foundation positioning, project initialization, foundation verification, package adoption and the public delivery story.

## Open Questions

None.

## Product Acceptance

The accepted definition names the five delivery outcomes, assigns ownership for each, and states that health is evidence from checks rather than a claim about the quality of application code. Initialization and verification describe the bundle without making the SDLC package part of the core CLI.

## Out of Scope

This change does not add a new runtime package, replace ProductShape or ArcShape, implement the SDLC workflows, or make Lighthouse responsible for an adopter's application code.

