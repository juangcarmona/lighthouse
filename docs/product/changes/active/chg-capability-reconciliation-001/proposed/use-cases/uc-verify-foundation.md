---
id: UC-VERIFY-FOUNDATION
type: use-case
title: Verify an adopted foundation
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-AGENT-HOST]
bounded-context: BC-FOUNDATION
governed-by: [BR-FAIL-CLOSED]
uses-terms: [TERM-GUARDRAIL, TERM-MANAGED-PROJECTION, TERM-FOUNDATION-CAPABILITY]
---

## Goal

Know whether the selected Lighthouse foundation and profiles are present, coherent and verified.

## Trigger

The adopter or agent host runs the project's foundation verification command.

## Preconditions

The project contains a Lighthouse manifest or an adoption route that defines the inspected scope.

## Main Flow

1. Lighthouse reads the declared baseline and selected profiles.
2. It resolves the guardrails and installed capability catalog that apply to that baseline and profile selection.
3. It reads capability declarations and reconciliation evidence without writing to a provider.
4. It runs the available deterministic checks and records the declared method for semantic or human checks.
5. It reports `passed`, `failed`, `drift`, `unavailable`, `unconfigured`, `pending-review`, `pending-adoption`, `available` and `not-applicable` checks separately.
6. The adopter uses the report to repair, complete the pending adoption or review, accept an exception or escalate a decision.

## Alternative Flows

A project may verify one profile or an explicitly bounded route instead of the full foundation.

## Failure Conditions

The manifest is invalid, an owned projection drifts, a required guardrail fails, a required check is unavailable or unconfigured, or a required semantic or human review remains pending.

## Postconditions

The project has a deterministic verification result, a machine-readable equivalent and a clear list of evidence gaps and next actions, including the exact command for a pending capability adoption.
