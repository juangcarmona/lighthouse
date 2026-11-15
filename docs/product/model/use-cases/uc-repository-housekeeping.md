---
id: UC-REPOSITORY-HOUSEKEEPING
type: use-case
title: Review and reconcile repository housekeeping daily
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-INTEGRATED-SYSTEM, ACT-AGENT-HOST]
bounded-context: BC-FOUNDATION
governed-by: [BR-ENTRY-AUTHORITY, BR-HUMAN-AUTHORITY, BR-WORKFLOW-STATE, BR-FAIL-CLOSED, BR-DECOMPOSITION, BR-SDLC-PACKAGE-BOUNDARY, BR-OWNED-AUTHORITY]
uses-terms: [TERM-WORKFLOW-STATE, TERM-AGENT-RUN, TERM-GATE, TERM-LABEL-STATE, TERM-ADOPTION]
---

## Goal

Give the adopter a current, evidence-backed view of repository work and human blockers, reconcile eligible stale state safely, and make actual daily coverage observable independently of installation or activation.

## Trigger

The adopter's activated daily schedule requests a sweep, or the adopter requests a manual dry-run.

## Preconditions

The repository has the housekeeping capability and declared inspection scope. Mutating reconciliation additionally requires explicit activation, still-effective authorization and the owning lifecycle's evidence. Missing configuration or authority is reported rather than presumed.

## Main Flow

1. Lighthouse records the requested repository scope, mode, configuration and activation state separately from scan progress and effects.
2. Lighthouse deterministically inspects eligible issues, pull requests, associated runs and attempts, current reservations, dependency state and child/parent tracking, without requiring a model.
3. For each item, Lighthouse compares the original admitted request, retained evidence and current repository state, including already-published work. It distinguishes expected terminal transitions, valid actionable drift, active work, invalid authority and unavailable or ambiguous evidence.
4. Lighthouse determines whether labels or reservations may be reconciled, whether dependencies are resolved, and whether the owning lifecycle permits issue or parent completion. Age, inactivity, a merged pull request, closed children or a successful workflow alone do not establish completion or dead execution.
5. In an activated, authorized sweep, Lighthouse applies only eligible reconciliation effects through existing owned transitions and bounded recovery. Any continuation is independently admitted against current authority, pause state and reservations. Active or uncertain work remains protected.
6. Lighthouse records per-item dispositions and evidence links, continues inspecting remaining eligible items after an item failure, and reports failures, exclusions, unavailable evidence and incomplete coverage.
7. Lighthouse retains the actual completion time and covered scope of a complete scan separately from effect verification. It updates one stable repository summary or existing report index with unresolved blockers, each required question or next action, evidence links and the last complete sweep while preserving owner-written notes.
8. Existing freshness and reconciliation mechanisms compare actual complete-scan evidence with the daily expectation and expose overdue or prevented coverage with a responsible actor and supported next action.

## Alternative Flows

A manual dry-run records proposed dispositions and inspection evidence without changing tracker state, reservations or requesting continuation. It does not demonstrate scheduled execution or verified reconciliation effects.

An incomplete sweep records its inspected subset and failures without advancing the last complete sweep. A legitimate fully inspected empty scope is distinguishable from a discovery failure that returned no items.

A duplicate or delayed sweep reuses stable reporting and effect identities. It cannot repeat comments, recovery requests or effects, overwrite newer state, or retry an uncertain effect before reconciliation.

## Failure Conditions

Missing or disabled configuration, skipped execution, inaccessible evidence, failed item inspection, incomplete discovery, invalid authority, publication failure or uncertain effects remain explicit. No installed workflow, schedule declaration or successful workflow conclusion substitutes for complete coverage. A failed item does not suppress inspection of the remaining eligible items; an overall incomplete result cannot report a successful complete sweep.

## Postconditions

The adopter receives evidence of actual inspected scope and item dispositions, a complete or explicitly incomplete scan outcome, separately verified or uncertain effects, and a stable actionable summary that retains the last complete daily sweep. No lifecycle, implementation, merge or release authority has been created by housekeeping.
