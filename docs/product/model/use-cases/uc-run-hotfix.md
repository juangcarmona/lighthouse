---
id: UC-RUN-HOTFIX
type: use-case
title: Run a controlled hotfix
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-INTEGRATED-SYSTEM, ACT-AGENT-HOST]
bounded-context: BC-FOUNDATION
governed-by: [BR-HOTFIX, BR-TRIAGE-CONTRACT, BR-STAGE-GATES, BR-FAIL-CLOSED]
uses-terms: [TERM-HOTFIX-ROUTE, TERM-TRIAGE, TERM-GATE, TERM-LABEL-STATE]
---

## Goal

Correct a confirmed defect quickly while preserving scope, verification and integration evidence.

## Trigger

Triage confirms that a defect needs an expedited correction.

## Preconditions

The defect, impact or containment context, rollback plan, affected paths and decision owner are recorded.

## Main Flow

1. Lighthouse marks the item as a hotfix and records its bounded scope.
2. `implement` applies the smallest correction and runs the required focused checks.
3. Lighthouse verifies the result, updates the evidence and stops on any failed check.
4. `integrate` updates the tracker and repository or pull-request state, then `review` records the outcome.

## Alternative Flows

If the correction needs new product intent, broad design or unresolved architecture decisions, Lighthouse returns the item to the normal route.

## Failure Conditions

The defect is unconfirmed, the patch exceeds scope, verification fails or the rollback and integration owner are missing.

## Postconditions

The hotfix is integrated with labels, verification evidence, rollback context and review ownership, or remains stopped at the failing gate.
