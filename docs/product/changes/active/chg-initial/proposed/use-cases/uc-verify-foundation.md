---
id: UC-VERIFY-FOUNDATION
type: use-case
title: Verify an adopted foundation
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-AGENT-HOST]
bounded-context: BC-FOUNDATION
governed-by: [BR-FAIL-CLOSED]
uses-terms: [TERM-GUARDRAIL, TERM-MANAGED-PROJECTION]
---

## Goal

Know whether the selected Lighthouse foundation and profiles are present, coherent and verified.

## Trigger

The adopter or agent host runs the project's foundation verification command.

## Preconditions

The project contains a Lighthouse manifest or an adoption route that defines the inspected scope.

## Main Flow

1. Lighthouse reads the declared baseline and selected profiles.
2. It checks owned projections, documentation links, profile prerequisites and configured guardrails.
3. It reports passing, failing, drifted, unavailable and unconfigured checks separately.
4. The adopter uses the report to repair, accept an exception or escalate a decision.

## Alternative Flows

A project may verify one profile or an explicitly bounded route instead of the full foundation.

## Failure Conditions

The manifest is invalid, an owned projection drifts or a configured guardrail cannot be verified.

## Postconditions

The project has a deterministic verification result and a clear list of evidence gaps.
